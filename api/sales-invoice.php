<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

// --- CORS & headers ---
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $allowed_origins = [
        'https://9003-firebase-studiogit-1765450741734.cluster-cbeiita7rbe7iuwhvjs5zww2i4.cloudworkstations.dev',
        'https://9000-firebase-clearbookgit-1767005762274.cluster-64pjnskmlbaxowh5lzq6i7v4ra.cloudworkstations.dev',
        'https://clearbook-olive.vercel.app',
        'https://hariindustries.net'
    ];
    $origin = $_SERVER['HTTP_ORIGIN'];
    if (in_array($origin, $allowed_origins)) header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: https://hariindustries.net");
}
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- DB connection ---
include_once 'db_connect.php';
$in_transaction = false;

try {
    $data = json_decode(file_get_contents("php://input"));

    // --- Validate input ---
    if (!isset(
        $data->customer_id,
        $data->invoice_date,
        $data->sales_items,
        $data->grand_total,
        $data->status,
        $data->user_id,
        $data->company_id
    ) || !is_array($data->sales_items) || empty($data->sales_items)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Incomplete invoice data provided"]);
        exit();
    }

    // --- Extract & validate dates ---
    $invoice_date_str = $data->invoice_date;
    $invoice_date = date('Y-m-d', strtotime($invoice_date_str));
    if (!$invoice_date || $invoice_date_str != date('Y-m-d', strtotime($invoice_date_str))) {
        throw new Exception("Invalid invoice_date format. Expected YYYY-MM-DD.");
    }


    if (isset($data->due_date) && !empty($data->due_date)) {
        $due_date_str = $data->due_date;
        $due_date = date('Y-m-d', strtotime($due_date_str));
        if (!$due_date || $due_date_str != date('Y-m-d', strtotime($due_date_str))) {
            throw new Exception("Invalid due_date format. Expected YYYY-MM-DD.");
        }
    } else {
        $due_date = date('Y-m-d', strtotime($invoice_date . ' +30 days'));
    }

    // --- Extract other fields ---
    $customer_id = (string)$data->customer_id;
    $company_id = (string)$data->company_id;
    $user_id = (int)$data->user_id;
    $sales_items = $data->sales_items;
    $notes = $data->narration ?? 'Sales Invoice';
    $status = ($data->status === 'Posted') ? 'ISSUED' : 'DRAFT';
    $subtotal = (float)($data->sub_total ?? 0);
    $discount_amount = (float)($data->total_discount ?? 0);
    $tax_amount = (float)($data->total_vat ?? 0);
    $total_amount = (float)($data->grand_total ?? 0);
    $amount_due = $total_amount;

    // --- Account mapping ---
    $accounts_receivable_id = '101210';
    $sales_revenue_id = '401000';
    $sales_discount_id = '402000';
    $vat_payable_id = '201210';
    $cogs_account_id = '501000';
    $inventory_account_id = '101340';

    // --- Start transaction ---
    $conn->begin_transaction();
    $in_transaction = true;

    $total_cogs = 0;

    // --- STEP 0: Validate stock & calculate COGS if ISSUED ---
    if ($status === 'ISSUED') {
        $check_stock_sql = "SELECT quantity_on_hand, average_unit_cost FROM products WHERE id=? AND company_id=?";
        $check_stock_stmt = $conn->prepare($check_stock_sql);
        if (!$check_stock_stmt) throw new Exception("Prepare stock check failed: " . $conn->error);

        foreach ($sales_items as $key => $item) {
            if (!$check_stock_stmt->bind_param("is", $item->item_id, $company_id)) throw new Exception($check_stock_stmt->error);
            if (!$check_stock_stmt->execute()) throw new Exception($check_stock_stmt->error);

            $result = $check_stock_stmt->get_result();
            $product = $result->fetch_assoc();
            if (!$product) throw new Exception("Item '{$item->item_name}' not found");
            if ($item->quantity > $product['quantity_on_hand']) throw new Exception("Insufficient stock for '{$item->item_name}'");

            $sales_items[$key]->average_unit_cost = (float)$product['average_unit_cost'];
            $total_cogs += $item->quantity * $sales_items[$key]->average_unit_cost;
        }
        $check_stock_stmt->close();
    }

    // --- STEP 1: Insert invoice with temporary invoice_number ---
    $temp_invoice_number = 'TEMP';
    $inv_sql = "INSERT INTO sales_invoices
        (company_id, customer_id, invoice_number, invoice_date, due_date, subtotal, tax_amount, discount_amount, total_amount, amount_due, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $inv_stmt = $conn->prepare($inv_sql);
    if (!$inv_stmt) throw new Exception("Prepare invoice failed: " . $conn->error);

    if (!$inv_stmt->bind_param(
        "ssssdddddsss",
        $company_id,
        $customer_id,
        $temp_invoice_number,
        $invoice_date,
        $due_date,
        $subtotal,
        $tax_amount,
        $discount_amount,
        $total_amount,
        $amount_due,
        $status,
        $notes
    )) throw new Exception("Invoice bind failed: " . $inv_stmt->error);

    if (!$inv_stmt->execute()) throw new Exception("Invoice insert failed: " . $inv_stmt->error);
    $invoice_id = $conn->insert_id;

    // --- STEP 2: Update invoice_number ---
    $invoice_number = 'INV-' . str_pad($invoice_id, 5, '0', STR_PAD_LEFT);
    $update_inv_stmt = $conn->prepare("UPDATE sales_invoices SET invoice_number=? WHERE id=?");
    if (!$update_inv_stmt) throw new Exception("Prepare update invoice failed: " . $conn->error);
    $update_inv_stmt->bind_param("si", $invoice_number, $invoice_id);
    if (!$update_inv_stmt->execute()) throw new Exception("Update invoice_number failed: " . $update_inv_stmt->error);

    // --- STEP 3: Insert invoice items ---
    $item_sql = "INSERT INTO sales_invoice_items (invoice_id, item_id, quantity, unit_price, discount, vat, item_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)";
    $item_stmt = $conn->prepare($item_sql);
    if (!$item_stmt) throw new Exception("Prepare invoice items failed: " . $conn->error);

    foreach ($sales_items as $item) {
        if (!$item_stmt->bind_param(
            "iiiddds",
            $invoice_id,
            $item->item_id,
            $item->quantity,
            $item->unit_price,
            $item->discount,
            $item->vat,
            $item->item_name
        )) throw new Exception("Invoice item bind failed: " . $item_stmt->error);
        if (!$item_stmt->execute()) throw new Exception("Invoice item insert failed for {$item->item_name}: " . $item_stmt->error);
    }

    // --- STEP 4: Journal voucher & lines if ISSUED ---
    if ($status === 'ISSUED') {
        // 4a. Journal voucher
        $jv_sql = "INSERT INTO journal_vouchers (company_id, created_by_id, entry_date, source, voucher_type, reference_id, reference_type, narration, total_debits, total_credits, status)
            VALUES (?, ?, ?, 'SALES', 'SALES_INVOICE', ?, 'sales_invoices', ?, ?, ?, 'posted')";
        $jv_stmt = $conn->prepare($jv_sql);
        if (!$jv_stmt) throw new Exception("Prepare journal voucher failed: " . $conn->error);

        $jv_narration = "Sale and COGS for Invoice: $invoice_number";
        $jv_total = $subtotal + $tax_amount + $total_cogs;
        $jv_stmt->bind_param("sisisdd", $company_id, $user_id, $invoice_date, $invoice_id, $jv_narration, $jv_total, $jv_total);
        if (!$jv_stmt->execute()) throw new Exception("Journal voucher insert failed: " . $jv_stmt->error);
        $voucher_id = $conn->insert_id;

        // 4b. Journal lines
        $jvl_sql = "INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, credit, payee_type, payee_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $jvl_stmt = $conn->prepare($jvl_sql);
        if (!$jvl_stmt) throw new Exception("Prepare journal line failed: " . $conn->error);

        $lines = [
            ['account_id'=>$accounts_receivable_id,'debit'=>$total_amount,'credit'=>0,'payee_type'=>'customer','payee_id'=>$customer_id,'desc'=>"A/R for Invoice $invoice_number"],
        ];
        if($discount_amount>0) $lines[] = ['account_id'=>$sales_discount_id,'debit'=>$discount_amount,'credit'=>0,'payee_type'=>'','payee_id'=>0,'desc'=>"Discount for $invoice_number"];
        $lines[] = ['account_id'=>$sales_revenue_id,'debit'=>0,'credit'=>$subtotal,'payee_type'=>'','payee_id'=>0,'desc'=>"Sales revenue for $invoice_number"];
        if($tax_amount>0) $lines[] = ['account_id'=>$vat_payable_id,'debit'=>0,'credit'=>$tax_amount,'payee_type'=>'','payee_id'=>0,'desc'=>"VAT for $invoice_number"];
        if($total_cogs>0){
            $lines[] = ['account_id'=>$cogs_account_id,'debit'=>$total_cogs,'credit'=>0,'payee_type'=>'','payee_id'=>0,'desc'=>"COGS for $invoice_number"];
            $lines[] = ['account_id'=>$inventory_account_id,'debit'=>0,'credit'=>$total_cogs,'payee_type'=>'','payee_id'=>0,'desc'=>"Inventory reduction for $invoice_number"];
        }

        // Bind variables once
        $account_id = $debit = $credit = $payee_type = $payee_id = $description = null;
        $jvl_stmt->bind_param("siisddsis",$company_id,$user_id,$voucher_id,$account_id,$debit,$credit,$payee_type,$payee_id,$description);

        foreach($lines as $l){
            $account_id=$l['account_id']; $debit=$l['debit']; $credit=$l['credit'];
            $payee_type=$l['payee_type']; $payee_id=$l['payee_id']; $description=$l['desc'];
            if(!$jvl_stmt->execute()) throw new Exception("Journal line insert failed: " . $jvl_stmt->error);
        }

        // 4c. Update product quantities
        $inv_update_sql = "UPDATE products SET quantity_on_hand = quantity_on_hand - ? WHERE id=? AND company_id=?";
        $inv_update_stmt = $conn->prepare($inv_update_sql);
        if (!$inv_update_stmt) throw new Exception("Prepare inventory update failed: " . $conn->error);
        $update_qty = $update_product_id = 0;
        $inv_update_stmt->bind_param("dis", $update_qty, $update_product_id, $company_id);
        foreach($sales_items as $item){
            $update_qty = $item->quantity;
            $update_product_id = $item->item_id;
            if(!$inv_update_stmt->execute()) throw new Exception("Inventory update failed for {$item->item_name}: ".$inv_update_stmt->error);
        }
    }

    // --- Commit transaction ---
    $conn->commit();
    $in_transaction = false;

    // --- Fetch & return new invoice ---
    $select_stmt = $conn->prepare("SELECT si.*, c.name as customer_name FROM sales_invoices si JOIN customers c ON si.customer_id = c.customer_id WHERE si.id=?");
    $select_stmt->bind_param("i", $invoice_id);
    $select_stmt->execute();
    $result = $select_stmt->get_result();
    $new_invoice = $result->fetch_assoc();

    echo json_encode(["success"=>true,"invoice"=>$new_invoice]);

} catch (Exception $e) {
    if ($in_transaction) $conn->rollback();
    
    $errorMessage = $e->getMessage();

    // Check for user-correctable errors
    if (
        strpos($errorMessage, 'Insufficient stock') !== false ||
        strpos($errorMessage, 'Invalid invoice_date') !== false ||
        strpos($errorMessage, 'Invalid due_date') !== false ||
        strpos($errorMessage, 'not found') !== false
    ) {
        http_response_code(400); // Bad Request
        echo json_encode([
            "success" => false,
            "error" => $errorMessage
        ]);
    } else {
        // For all other exceptions, return a generic 500 error
        http_response_code(500); // Internal Server Error
        echo json_encode([
            "success" => false,
            "error" => "Internal server error",
            "details" => $errorMessage
        ]);
    }
} finally {
    foreach(['inv_stmt','update_inv_stmt','item_stmt','jv_stmt','jvl_stmt','inv_update_stmt','select_stmt'] as $stmt){
        if(isset($$stmt) && $$stmt instanceof mysqli_stmt) $$stmt->close();
    }
    if(isset($conn)) $conn->close();
}
?>