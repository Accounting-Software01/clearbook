<?php
require_once 'api.php';
require_once 'db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (empty($data['company_id']) || empty($data['purchase_order_id']) || empty($data['grn_date']) || empty($data['lines']) || !is_array($data['lines'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing or invalid required fields.']);
    exit;
}

$company_id = $data['company_id'];
$po_id = $data['purchase_order_id'];
$grn_date = $data['grn_date'];
$lines = $data['lines'];
$user_id = $data['user_id'] ?? null;

$mysqli->begin_transaction();

try {
    // 1. Get PO and Supplier details
    $stmt_po = $mysqli->prepare("SELECT s.id as supplier_id, s.ap_account_id, p.po_number FROM purchase_orders p JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ? AND p.company_id = ?");
    $stmt_po->bind_param("is", $po_id, $company_id);
    $stmt_po->execute();
    $po_data = $stmt_po->get_result()->fetch_assoc();
    $stmt_po->close();

    if (!$po_data) throw new Exception("Purchase Order not found.");
    if (empty($po_data['ap_account_id'])) throw new Exception("Supplier's AP account is not configured.");
    
    $supplier_id = $po_data['supplier_id'];
    $ap_account_id = $po_data['ap_account_id'];
    $po_number = $po_data['po_number'];

    // 2. Get Company VAT Account
    $stmt_company = $mysqli->prepare("SELECT vat_input_account_id FROM companies WHERE id = ?");
    $stmt_company->bind_param("s", $company_id);
    $stmt_company->execute();
    $company_data = $stmt_company->get_result()->fetch_assoc();
    $stmt_company->close();
    if (!$company_data || empty($company_data['vat_input_account_id'])) {
        throw new Exception("Company's VAT Input account is not configured. Please set it in company settings.");
    }
    $vat_input_account_id = $company_data['vat_input_account_id'];

    // 3. Create GRN record
    $grn_number = 'GRN-' . time();
    $stmt_grn = $mysqli->prepare("INSERT INTO goods_received_notes (company_id, purchase_order_id, supplier_id, grn_number, received_date, status, created_by) VALUES (?, ?, ?, ?, ?, 'Completed', ?)");
    $stmt_grn->bind_param("siissi", $company_id, $po_id, $supplier_id, $grn_number, $grn_date, $user_id);
    $stmt_grn->execute();
    if ($stmt_grn->affected_rows === 0) throw new Exception("Failed to create GRN record.");
    $grn_id = $mysqli->insert_id;
    $stmt_grn->close();

    // 4. Initialize totals for journal voucher
    $total_sub_total = 0;
    $total_tax = 0;
    $inventory_debits = []; // Group debits by inventory account

    // 5. Process GRN lines
    foreach ($lines as $line) {
        $po_item_id = $line['po_item_id'];
        $quantity_received = $line['quantity_received'];

        if (empty($po_item_id) || !is_numeric($quantity_received) || $quantity_received <= 0) continue;

        $stmt_po_item = $mysqli->prepare("SELECT rm.inventory_account_id, poi.raw_material_id, poi.unit_price, poi.tax_rate, poi.quantity, poi.quantity_received as already_received FROM purchase_order_items poi JOIN raw_materials rm ON poi.raw_material_id = rm.id WHERE poi.id = ?");
        $stmt_po_item->bind_param("i", $po_item_id);
        $stmt_po_item->execute();
        $item_data = $stmt_po_item->get_result()->fetch_assoc();
        $stmt_po_item->close();

        if (!$item_data) throw new Exception("PO Item ID {$po_item_id} not found.");
        if (empty($item_data['inventory_account_id'])) throw new Exception("Inventory account for material ID {$item_data['raw_material_id']} is not set.");
        if (($item_data['already_received'] + $quantity_received) > $item_data['quantity']) throw new Exception("Quantity for item {$po_item_id} exceeds amount ordered.");

        // Calculate line values
        $line_sub_total = $quantity_received * $item_data['unit_price'];
        $line_tax = $line_sub_total * ($item_data['tax_rate'] / 100.0);

        // Aggregate totals
        $total_sub_total += $line_sub_total;
        $total_tax += $line_tax;

        // Aggregate debit value per inventory account (pre-tax)
        $inventory_account_id = $item_data['inventory_account_id'];
        if (!isset($inventory_debits[$inventory_account_id])) {
            $inventory_debits[$inventory_account_id] = 0;
        }
        $inventory_debits[$inventory_account_id] += $line_sub_total;

        // Create GRN item record
        $stmt_item = $mysqli->prepare("INSERT INTO goods_received_note_items (company_id, grn_id, po_item_id, raw_material_id, quantity_received, unit_price) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt_item->bind_param("siiidd", $company_id, $grn_id, $po_item_id, $item_data['raw_material_id'], $quantity_received, $item_data['unit_price']);
        $stmt_item->execute();
        $stmt_item->close();

        // Update received quantity on PO item
        $stmt_update_po = $mysqli->prepare("UPDATE purchase_order_items SET quantity_received = quantity_received + ? WHERE id = ?");
        $stmt_update_po->bind_param("di", $quantity_received, $po_item_id);
        $stmt_update_po->execute();
        $stmt_update_po->close();
    }
    
    $total_grand_total = $total_sub_total + $total_tax;
    if ($total_grand_total <= 0) throw new Exception("Total value of received items is zero.");

    // 6. Create Journal Voucher
    $jv_desc = "Goods received for PO {$po_number} (GRN: {$grn_number})";
    $stmt_jv = $mysqli->prepare("INSERT INTO journal_vouchers (company_id, voucher_date, voucher_type, reference_id, reference_type, description, status, created_by) VALUES (?, ?, 'GRN', ?, 'goods_received_notes', ?, 'posted', ?)");
    $stmt_jv->bind_param("ssisi", $company_id, $grn_date, $grn_id, $jv_desc, $user_id);
    $stmt_jv->execute();
    $jv_id = $mysqli->insert_id;
    $stmt_jv->close();

    // 7. Create Journal Voucher Lines
    // 7a. Debit Inventory Accounts
    foreach ($inventory_debits as $account_id => $amount) {
        $debit_desc = "Debit Inventory for GRN {$grn_number}";
        $stmt_jvl_debit = $mysqli->prepare("INSERT INTO journal_voucher_lines (company_id, journal_voucher_id, account_id, debit, credit, description) VALUES (?, ?, ?, ?, 0, ?)");
        $stmt_jvl_debit->bind_param("siids", $company_id, $jv_id, $account_id, $amount, $debit_desc);
        $stmt_jvl_debit->execute();
        $stmt_jvl_debit->close();
    }

    // 7b. Debit VAT Input Account
    if ($total_tax > 0) {
        $vat_desc = "VAT Input for GRN {$grn_number}";
        $stmt_jvl_vat = $mysqli->prepare("INSERT INTO journal_voucher_lines (company_id, journal_voucher_id, account_id, debit, credit, description) VALUES (?, ?, ?, ?, 0, ?)");
        $stmt_jvl_vat->bind_param("siids", $company_id, $jv_id, $vat_input_account_id, $total_tax, $vat_desc);
        $stmt_jvl_vat->execute();
        $stmt_jvl_vat->close();
    }

    // 7c. Credit Trade Creditors (AP)
    $credit_desc = "Credit AP for goods from supplier (GRN: {$grn_number})";
    $stmt_jvl_credit = $mysqli->prepare("INSERT INTO journal_voucher_lines (company_id, journal_voucher_id, account_id, debit, credit, description) VALUES (?, ?, ?, 0, ?, ?)");
    $stmt_jvl_credit->bind_param("siids", $company_id, $jv_id,, $ap_account_id, $total_grand_total, $credit_desc);
    $stmt_jvl_credit->execute();
    $stmt_jvl_credit->close();

    $mysqli->commit();
    echo json_encode([
        'status' => 'success',
        'message' => 'GRN and Journal Voucher created successfully with VAT.',
        'grn_id' => $grn_id,
        'journal_voucher_id' => $jv_id
    ]);

} catch (Exception $e) {
    $mysqli->rollback();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}

$mysqli->close();
