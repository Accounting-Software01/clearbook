
<?php
require_once 'db.php';
require_once 'notifications.php';

header('Content-Type: application/json');

// Get the posted data
$data = json_decode(file_get_contents("php://input"));

// Basic validation
if (!isset($data->company_id) || !isset($data->grn_id) || !isset($data->supplier_id) || !isset($data->purchase_order_id) || !isset($data->created_by)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid input. Required fields are missing.']);
    exit;
}

$company_id = $data->company_id;
$grn_id = $data->grn_id;
$supplier_id = $data->supplier_id;
$purchase_order_id = $data->purchase_order_id;
$created_by = $data->created_by;

// Start transaction
$mysqli->begin_transaction();

try {
    // 1. Check if an invoice already exists for this GRN
    $check_stmt = $mysqli->prepare("SELECT id FROM supplier_invoices WHERE grn_id = ? AND company_id = ?");
    $check_stmt->bind_param("is", $grn_id, $company_id);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();
    if ($check_result->num_rows > 0) {
        throw new Exception("An invoice for this GRN has already been created.");
    }
    $check_stmt->close();

    // 2. Get GRN items
    $grn_items_stmt = $mysqli->prepare("
        SELECT 
            grni.po_item_id, 
            grni.raw_material_id, 
            poi.description,
            grni.quantity_received,
            poi.unit_price, 
            (grni.quantity_received * poi.unit_price) as total_amount
        FROM goods_received_note_items grni
        JOIN purchase_order_items poi ON grni.po_item_id = poi.id
        WHERE grni.grn_id = ?
    ");
    $grn_items_stmt->bind_param("i", $grn_id);
    $grn_items_stmt->execute();
    $grn_items_result = $grn_items_stmt->get_result();
    $items = $grn_items_result->fetch_all(MYSQLI_ASSOC);
    $grn_items_stmt->close();

    if (count($items) === 0) {
        throw new Exception("No items found for this GRN to create an invoice.");
    }

    // 3. Calculate invoice total
    $total_invoice_amount = array_sum(array_column($items, 'total_amount'));

    // 4. Create the Supplier Invoice
    $invoice_number = "INV-" . time(); // Simple unique invoice number
    $invoice_date = date('Y-m-d');
    $due_date = date('Y-m-d', strtotime('+30 days')); // Example: Due in 30 days

    $insert_invoice_stmt = $mysqli->prepare("
        INSERT INTO supplier_invoices 
        (company_id, grn_id, purchase_order_id, supplier_id, invoice_number, invoice_date, due_date, total_amount, status, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Awaiting Approval', NOW(), NOW())
    ");
    $insert_invoice_stmt->bind_param("siissssd", $company_id, $grn_id, $purchase_order_id, $supplier_id, $invoice_number, $invoice_date, $due_date, $total_invoice_amount);
    $insert_invoice_stmt->execute();
    $invoice_id = $insert_invoice_stmt->insert_id;
    $insert_invoice_stmt->close();

    // 5. Create Supplier Invoice Items
    $insert_item_stmt = $mysqli->prepare("
        INSERT INTO supplier_invoice_items 
        (company_id, supplier_invoice_id, po_item_id, raw_material_id, description, quantity, unit_price, total_amount) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");

    foreach ($items as $item) {
        $insert_item_stmt->bind_param("siiisddd", $company_id, $invoice_id, $item['po_item_id'], $item['raw_material_id'], $item['description'], $item['quantity_received'], $item['unit_price'], $item['total_amount']);
        $insert_item_stmt->execute();
    }
    $insert_item_stmt->close();

    // 6. Create a notification for the admin
    // Find an admin user to notify
    $admin_stmt = $mysqli->prepare("SELECT id FROM users WHERE company_id = ? AND role = 'admin' LIMIT 1");
    $admin_stmt->bind_param("s", $company_id);
    $admin_stmt->execute();
    $admin_result = $admin_stmt->get_result();
    if ($admin_row = $admin_result->fetch_assoc()) {
        $admin_id = $admin_row['id'];
        $notification_message = "New Supplier Invoice #{$invoice_number} is awaiting your approval.";
        $notification_link = "/procurement/accounts-payable";
        
        // Use the function from notifications.php
        // This requires notifications.php to be included and to have a function for creating notifications
        $notification_data = new stdClass();
        $notification_data->company_id = $company_id;
        $notification_data->user_id = $admin_id;
        $notification_data->message = $notification_message;
        $notification_data->link = $notification_link;
        
        // Assuming notifications.php has a function `create_notification`
        // We will need to adjust this part based on the actual implementation in notifications.php
        // For now, let's assume direct insertion is handled within this script
        $notif_stmt = $mysqli->prepare("INSERT INTO notifications (company_id, user_id, message, link) VALUES (?, ?, ?, ?)");
        $notif_stmt->bind_param("siss", $company_id, $admin_id, $notification_message, $notification_link);
        $notif_stmt->execute();
        $notif_stmt->close();
    }
    $admin_stmt->close();

    // Commit the transaction
    $mysqli->commit();

    echo json_encode(['status' => 'success', 'message' => 'Invoice created successfully', 'invoice_id' => $invoice_id, 'invoice_number' => $invoice_number]);

} catch (Exception $e) {
    $mysqli->rollback();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}

$mysqli->close();
?>
