<?php
header('Content-Type: application/json');
include 'db_connect.php';
include 'auth_check.php';

$auth = new Auth();
$user_info = $auth->getUserInfo();

if ($_SERVER['REQUEST_METHOD'] == 'POST' && $user_info) {
    $data = json_decode(file_get_contents('php://input'));

    $company_id = $user_info->company_id;
    $user_id = $user_info->id;
    $supplier_id = $data->supplier_id;
    $bill_date = $data->bill_date;
    $due_date = $data->due_date;
    $notes = $data->notes ?? null;
    $terms = $data->terms ?? null;
    $items = $data->items;

    // Correctly calculate totals, separating net, vat, and gross amounts
    $total_net = 0;
    $total_vat = 0;
    $total_gross = 0;

    foreach ($items as $item) {
        $net_amount = round(
            $item->quantity * $item->unitPrice * (1 - $item->discount / 100),
            2
        );
        $vat_amount = round(
            $net_amount * ($item->taxRate / 100),
            2
        );
        $total_net += $net_amount;
        $total_vat += $vat_amount;
    }
    $total_gross = $total_net + $total_vat;


    $conn->begin_transaction();

    try {
        // 1. Insert into bills table with the GROSS total
        $bill_sql = "INSERT INTO bills (company_id, supplier_id, bill_date, due_date, notes, terms_and_conditions, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?)";
        $bill_stmt = $conn->prepare($bill_sql);
        $bill_stmt->bind_param("sissssd", $company_id, $supplier_id, $bill_date, $due_date, $notes, $terms, $total_gross);
        $bill_stmt->execute();
        $bill_id = $bill_stmt->insert_id;
        $bill_stmt->close();

        // 2. Insert into bill_items table
        $item_sql = "INSERT INTO bill_items (bill_id, description, quantity, unit_price, tax_rate, discount, line_total) VALUES (?, ?, ?, ?, ?, ?, ?)";
        $item_stmt = $conn->prepare($item_sql);

        foreach ($items as $item) {
            $net_amount = round(
                $item->quantity * $item->unitPrice * (1 - $item->discount / 100),
                2
            );
            $vat_amount = round(
                $net_amount * ($item->taxRate / 100),
                2
            );
            $gross_amount = $net_amount + $vat_amount;
            $item_stmt->bind_param("isddddd", $bill_id, $item->description, $item->quantity, $item->unitPrice, $item->taxRate, $item->discount, $gross_amount);
            $item_stmt->execute();
        }
        $item_stmt->close();

        // 3. Create Journal Voucher
        $jv_narration = "Bill #{$bill_id} from supplier {$supplier_id}";
        $jv_number = "BILL-" . $bill_id;
        $jv_sql = "INSERT INTO journal_vouchers (company_id, created_by_id, voucher_number, source, entry_date, voucher_type, reference_id, reference_type, narration, total_debits, total_credits, status) VALUES (?, ?, ?, 'Bill', ?, 'BILL', ?, 'bills', ?, ?, ?, 'posted')";
        $jv_stmt = $conn->prepare($jv_sql);
        $jv_stmt->bind_param("sisssisdd", $company_id, $user_id, $jv_number, $bill_date, $bill_id, $jv_narration, $total_gross, $total_gross);
        $jv_stmt->execute();
        $voucher_id = $jv_stmt->insert_id;
        $jv_stmt->close();

        // 4. Find System Accounts for Journaling
        $get_account = function($role) use ($conn, $company_id) {
            $sql = "SELECT id FROM chart_of_accounts WHERE company_id = ? AND system_role = ? LIMIT 1";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ss", $company_id, $role);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($result->num_rows == 0) {
                throw new Exception("Required system account with role '{$role}' not found.");
            }
            $account = $result->fetch_assoc();
            $stmt->close();
            return $account['id'];
        };

        $ap_account_id = $get_account('accounts_payable');
        $expense_account_id = $get_account('default_expense');
        $vat_account_id = $get_account('input_vat');


        // 5. Create Journal Voucher Lines

        // a) Credit Accounts Payable with the GROSS amount
        $line_sql_credit = "INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, credit, payee_id, payee_type, description) VALUES (?, ?, ?, ?, ?, ?, 'supplier', ?)";
        $line_stmt_credit = $conn->prepare($line_sql_credit);
        $line_stmt_credit->bind_param("siiidis", $company_id, $user_id, $voucher_id, $ap_account_id, $total_gross, $supplier_id, $jv_narration);
        $line_stmt_credit->execute();
        $line_stmt_credit->close();

        // b) Debit Expense and VAT accounts for each item
        $line_sql_debit = "INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, payee_id, payee_type, description) VALUES (?, ?, ?, ?, ?, ?, 'supplier', ?)";
        $line_stmt_debit = $conn->prepare($line_sql_debit);

        foreach ($items as $item) {
             $net_amount = round(
                $item->quantity * $item->unitPrice * (1 - $item->discount / 100),
                2
             );
             $vat_amount = round(
                $net_amount * ($item->taxRate / 100),
                2
             );
             
             // Debit Expense Account with NET amount
             if ($net_amount > 0) {
                $item_description = "Bill #{$bill_id}: {$item->description}";
                $line_stmt_debit->bind_param("siiidis", $company_id, $user_id, $voucher_id, $expense_account_id, $net_amount, $supplier_id, $item_description);
                $line_stmt_debit->execute();
             }

             // Debit Input VAT Account with VAT amount
             if ($vat_amount > 0) {
                $vat_description = "Input VAT for bill #{$bill_id}: {$item->description}";
                $line_stmt_debit->bind_param("siiidis", $company_id, $user_id, $voucher_id, $vat_account_id, $vat_amount, $supplier_id, $vat_description);
                $line_stmt_debit->execute();
             }
        }

        $line_stmt_debit->close();

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Bill and journal entries created successfully.', 'bill_id' => $bill_id]);

    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create bill: ' . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Invalid request method or not authenticated.']);
}

$conn->close();
?>