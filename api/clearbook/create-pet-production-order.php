<?php
// --- STEP 1: Turn on full error reporting ---
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// --- STEP 2: Set up a "last resort" error handler to catch fatal errors ---
register_shutdown_function(function () {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR])) {
        if (!headers_sent()) {
            header("Access-Control-Allow-Origin: *");
            header("Content-Type: application/json; charset=UTF-8");
            http_response_code(500);
        }
        // Send a JSON response containing the details of the fatal error
        echo json_encode([
            'message' => 'A fatal PHP error occurred. This is the real error message.',
            'error_details' => [
                'type'    => $error['type'],
                'message' => $error['message'],
                'file'    => $error['file'],
                'line'    => $error['line']
            ]
        ]);
        exit;
    }
});

// Standard headers
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// --- STEP 3: Run the original logic inside a try/catch block ---
// This code is my last "best guess" and likely contains the error the shutdown handler will catch.
try {
    require_once __DIR__ . '/db_connect.php';
    global $conn;

    $data = json_decode(file_get_contents("php://input"));

    if (empty($data->company_id) || empty($data->pet_bom_id) || !isset($data->quantity_to_produce) || empty($data->order_date)) {
        throw new Exception("Incomplete data provided.", 400);
    }
    
    $conn->begin_transaction();

    // Gross quantity calculation
    $gross_quantity = 0;
    if (!empty($data->operations) && is_array($data->operations)) {
        foreach ($data->operations as $op) {
            $cycle_time = (float)($op->cycle_time_seconds ?? 0);
            $cavities   = (float)($op->cavities_per_round ?? 0);
            $hours      = (float)($op->running_hours ?? 0);
            if ($cycle_time > 0) {
                $gross_quantity += (3600 / $cycle_time) * $hours * $cavities;
            }
        }
    } else {
        $gross_quantity = (float)$data->quantity_to_produce;
    }

    if ($gross_quantity <= 0) {
        throw new Exception("Calculated production quantity is zero or less.");
    }

    // BOM Component Check
    $bom_comp_query = "SELECT component_item_id, quantity_required FROM pet_bom_components WHERE pet_bom_id = ?";
    $bom_stmt = $conn->prepare($bom_comp_query);
    $bom_stmt->bind_param("s", $data->pet_bom_id);
    $bom_stmt->execute();
    $bom_result = $bom_stmt->get_result();
    $components = $bom_result->fetch_all(MYSQLI_ASSOC);

    foreach ($components as $component) {
        $component_id = $component['component_item_id'];
        $required_qty = $gross_quantity * (float)$component['quantity_required'];
        
        $item_query = "SELECT name, quantity_on_hand FROM raw_materials WHERE id = ? AND company_id = ?";
        $item_stmt = $conn->prepare($item_query);
        $item_stmt->bind_param("ss", $component_id, $data->company_id);
        $item_stmt->execute();
        $item_result = $item_stmt->get_result();
        $item_details = $item_result->fetch_assoc();

        if (!$item_details) {
            throw new Exception("Component with ID {$component_id} not found in raw_materials inventory.", 404);
        }
        if ((float)$item_details['quantity_on_hand'] < $required_qty) {
            throw new Exception(sprintf("Insufficient stock for '%s'. Required: %.2f, Available: %.2f.", $item_details['name'], $required_qty, (float)$item_details['quantity_on_hand']), 400);
        }
    }

    // Insert Order
    $insert_query = "INSERT INTO pet_production_orders (company_id, pet_bom_id, quantity_to_produce, order_date, status) VALUES (?, ?, ?, ?, 'Planned')";
    $insert_stmt = $conn->prepare($insert_query);
    $insert_stmt->bind_param("ssds", $data->company_id, $data->pet_bom_id, $data->quantity_to_produce, $data->order_date);

    if (!$insert_stmt->execute()) {
        throw new Exception("Database execution failed: " . $insert_stmt->error);
    }

    $new_order_id = $conn->insert_id;
    $conn->commit();

    http_response_code(201);
    echo json_encode(["message" => "Production order created successfully.", "order_id" => $new_order_id]);

} catch (Exception $e) {
    // This catches NON-fatal errors thrown inside the try block
    if ($conn && $conn->connect_errno) {
       $conn->rollback();
    }
    $response_code = in_array($e->getCode(), [400, 404]) ? $e->getCode() : 500;
    http_response_code($response_code);
    echo json_encode([
        "message" => "A non-fatal exception occurred.",
        "error_details" => [
            "message" => $e->getMessage(),
            "file" => $e->getFile(),
            "line" => $e->getLine()
        ]
    ]);
}
?>
