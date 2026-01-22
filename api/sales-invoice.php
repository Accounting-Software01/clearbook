
<?php
ini_set('display_errors', 0); // Turn off display errors for production
error_reporting(E_ALL);

// --- CORS & Headers ---
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $allowed_origins = [
        'https://9003-firebase-studiogit-1765450741734.cluster-cbeiita7rbe7iuwhvjs5zww2i4.cloudworkstations.dev',
        'https://9000-firebase-clearbookgit-1767005762274.cluster-64pjnskmlbaxowh5lzq6i7v4ra.cloudworkstations.dev',
        'https://clearbook-olive.vercel.app',
        'https://hariindustries.net'
    ];
    $origin = $_SERVER['HTTP_ORIGIN'];
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
    }
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

// --- DB Connection & Transaction Management ---
require_once 'db_connect.php';
$in_transaction = false;

// Define statement variables to null
$stmt = $inv_stmt = $item_stmt = $jv_stmt = $jvl_stmt = $inv_update_stmt = $stmt_stock = null;

try {
    // --- Receive and Decode Input ---
    $data = json_decode(file_get_contents("php://input"));

    // --- Validate Input Data ---
    if (!isset($data->customer_id, $data->invoice_date, $data->sales_items, $data->grand_total, $data->status, $data->user_id, $data->company_id) || !is_array($data->sales_items) || empty($data->sales_items)) {
        throw new Exception("Incomplete invoice data provided.");
    }

    // --- Extract & Sanitize Data ---
    $company_id = (string)$data->company_id;
    $customer_id = (string)$data->customer_id;
    $user_id = (int)$data->user_id;
    $invoice_date = date('Y-m-d', strtotime($data->invoice_date));
    $due_date = !empty($data->due_date) ? date('Y-m-d', strtotime($data->due_date)) : date('Y-m-d', strtotime($invoice_date . ' +30 days'));
    $status = ($data->status === 'Posted') ? 'ISSUED' : 'DRAFT';
    $notes = $data->narration ?? 'Point of Sale Transaction';
    $subtotal = round((float)($data->sub_total ?? 0), 2);
    $discount_amount = round((float)($data->total_discount ?? 0), 2);
    $tax_amount = round((float)($data->total_vat ?? 0), 2);
    $total_amount = round((float)$data->grand_total, 2);
    $amount_due = $total_amount;
    $sales_items = $data->sales_items;

    // --- Start Database Transaction ---
    $conn->begin_transaction();
    $in_transaction = true;

    // --- Dynamic Account Code Fetching ---
    $required_roles = [
        'accounts_receivable_id' => 'ACCOUNTS_RECEIVABLE',
        'sales_revenue_id' => 'SALES_REVENUE',
        'vat_payable_id' => 'VAT_PAYABLE',
        'cogs_account_id' => 'COGS',
        'inventory_account_id' => 'INVENTORY_FINISHED_GOODS',
        'sales_discount_id' => 'SALES_RETURNS_ALLOWANCES'
    ];
    $placeholders = implode(',', array_fill(0, count($required_roles), '?'));
    $sql = "SELECT account_code, system_role FROM chart_of_accounts WHERE company_id = ? AND system_role IN ($placeholders)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s" . str_repeat('s', count($required_roles)), $company_id, ...array_values($required_roles));
    $stmt->execute();
    $result = $stmt->get_result();
    $accounts = [];
    while ($row = $result->fetch_assoc()) {
        $role_key = array_search($row['system_role'], $required_roles);
        if ($role_key) {
            $accounts[$role_key] = $row['account_code'];
        }
    }
    foreach ($required_roles as $key => $role) {
        if (!isset($accounts[$key])) {
            if ($key === 'sales_discount_id') continue;
            throw new Exception("Configuration Error: Account with system role '{$role}' not found.");
        }
    }
    
    // --- Stock Validation & COGS Calculation ---
    $total_cogs = 0;
    if ($status === 'ISSUED') {
        $stmt_stock = $conn->prepare("SELECT quantity_on_hand, average_unit_cost FROM products WHERE id=? AND company_id=?");
        foreach ($sales_items as $item) {
            $stmt_stock->bind_param("is", $item->item_id, $company_id);
            $stmt_stock->execute();
            $res = $stmt_stock->get_result()->fetch_assoc();
            if (!$res) throw new Exception("Product '{$item->item_name}' not found.");
            if ($item->quantity > $res['quantity_on_hand']) {
                throw new Exception("Insufficient stock for {$item->item_name}. Available: {$res['quantity_on_hand']}, Requested: {$item->quantity}");
            }
            $total_cogs += $item->quantity * $res['average_unit_cost'];
        }
    }

    // --- Create Sales Invoice ---
    $inv_stmt = $conn->prepare("INSERT INTO sales_invoices (company_id, customer_id, invoice_number, invoice_date, due_date, subtotal, tax_amount, discount_amount, total_amount, amount_due, status, notes) VALUES (?, ?, 'TEMP', ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $inv_stmt->bind_param("ssssdddddss", $company_id, $customer_id, $invoice_date, $due_date, $subtotal, $tax_amount, $discount_amount, $total_amount, $amount_due, $status, $notes);
    $inv_stmt->execute();
    $invoice_id = $conn->insert_id;
    $invoice_number = 'INV-' . str_pad($invoice_id, 5, '0', STR_PAD_LEFT);
    $conn->query("UPDATE sales_invoices SET invoice_number='$invoice_number' WHERE id=$invoice_id");

    // --- Create Sales Invoice Items ---
    $item_stmt = $conn->prepare("INSERT INTO sales_invoice_items (company_id, invoice_id, item_id, quantity, unit_price, discount, vat, item_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    foreach ($sales_items as $item) {
        $item_stmt->bind_param("siiiddds", $company_id, $invoice_id, $item->item_id, $item->quantity, $item->unit_price, $item->discount, $item->vat, $item->item_name);
        $item_stmt->execute();
    }

    // --- Create Journal Entries if Posted ---
    if ($status === 'ISSUED') {
        $jv_narration = "Sale and COGS for Invoice: $invoice_number";
        $jv_total = $total_amount + $total_cogs;
        $temp_voucher_number = 'TEMP-' . uniqid();

        $jv_stmt = $conn->prepare("INSERT INTO journal_vouchers (company_id, created_by_id, voucher_number, entry_date, source, voucher_type, reference_id, reference_type, narration, total_debits, total_credits, status) VALUES (?, ?, ?, ?, 'SALES', 'SALES_INVOICE', ?, 'sales_invoices', ?, ?, ?, 'posted')");
        $jv_stmt->bind_param("sissisdd", $company_id, $user_id, $temp_voucher_number, $invoice_date, $invoice_id, $jv_narration, $jv_total, $jv_total);
        $jv_stmt->execute();
        $voucher_id = $conn->insert_id;

        if ($voucher_id == 0) {
            throw new Exception("Failed to create journal voucher. DB error: " . $jv_stmt->error);
        }

        $year = date('Y', strtotime($invoice_date));
        $voucher_number = $company_id . '-' . $year . '-' . str_pad($voucher_id, 6, '0', STR_PAD_LEFT);
        $conn->query("UPDATE journal_vouchers SET voucher_number = '$voucher_number' WHERE id = $voucher_id");

        $jvl_stmt = $conn->prepare("INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, credit, payee_type, payee_id, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $lines = [];
        $lines[] = [$accounts['accounts_receivable_id'], $total_amount, 0, 'customer', $customer_id, "A/R for Invoice $invoice_number"];
        $lines[] = [$accounts['sales_revenue_id'], 0, $subtotal, '', null, "Sales revenue for $invoice_number"];
        
        if ($tax_amount > 0) {
            $lines[] = [$accounts['vat_payable_id'], 0, $tax_amount, '', null, "VAT for Invoice $invoice_number"];
        }

        if ($discount_amount > 0 && isset($accounts['sales_discount_id'])) {
            $lines[1][2] = $subtotal + $discount_amount;
            $lines[] = [$accounts['sales_discount_id'], $discount_amount, 0, '', null, "Discount for Invoice $invoice_number"];
        }

        if ($total_cogs > 0) {
            $lines[] = [$accounts['cogs_account_id'], $total_cogs, 0, '', null, "COGS for $invoice_number"];
            $lines[] = [$accounts['inventory_account_id'], 0, $total_cogs, '', null, "Inventory reduction for $invoice_number"];
        }
        
        foreach ($lines as $line) {
            $jvl_stmt->bind_param("siisddsis", $company_id, $user_id, $voucher_id, $line[0], $line[1], $line[2], $line[3], $line[4], $line[5]);
            $jvl_stmt->execute();
        }

        $inv_update_stmt = $conn->prepare("UPDATE products SET quantity_on_hand = quantity_on_hand - ? WHERE id = ? AND company_id = ?");
        foreach ($sales_items as $item) {
            $inv_update_stmt->bind_param("dis", $item->quantity, $item->item_id, $company_id);
            $inv_update_stmt->execute();
        }
    }

    // --- Commit Transaction ---
    $conn->commit();

    // --- Final JSON Response ---
    echo json_encode([
        "success" => true, 
        "invoice" => [
            "invoice_number" => $invoice_number, 
            "id" => $invoice_id
        ]
    ]);

} catch (Exception $e) {
    if ($in_transaction) {
        $conn->rollback();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);

} finally {
    // --- Close Connections Safely ---
    if ($stmt instanceof mysqli_stmt) $stmt->close();
    if ($stmt_stock instanceof mysqli_stmt) $stmt_stock->close();
    if ($inv_stmt instanceof mysqli_stmt) $inv_stmt->close();
    if ($item_stmt instanceof mysqli_stmt) $item_stmt->close();
    if ($jv_stmt instanceof mysqli_stmt) $jv_stmt->close();
    if ($jvl_stmt instanceof mysqli_stmt) $jvl_stmt->close();
    if ($inv_update_stmt instanceof mysqli_stmt) $inv_update_stmt->close();
    if ($conn instanceof mysqli) $conn->close();
}
?>
