<?php
// --- STEP 1: Turn on full error reporting ---
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// --- STEP 2: Handle OPTIONS request for CORS preflight ---
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Handle preflight request
    $allowed_origins = [
        "https://9000-firebase-clearbookgit-1767005762274.cluster-64pjnskmlbaxowh5lzq6i7v4ra.cloudworkstations.dev",
        "https://clearbook-olive.vercel.app"
    ];
    
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: " . $origin);
    }
    
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Max-Age: 86400"); // 24 hours cache for preflight
    
    // Return 200 OK for preflight
    http_response_code(200);
    exit;
}

// --- STEP 3: Set up a "last resort" error handler to catch fatal errors ---
register_shutdown_function(function () {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR])) {
        if (!headers_sent()) {
            // Set CORS headers even for fatal errors
            $allowed_origins = [
                "https://9000-firebase-clearbookgit-1767005762274.cluster-64pjnskmlbaxowh5lzq6i7v4ra.cloudworkstations.dev",
                "https://clearbook-olive.vercel.app"
            ];
            
            $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
            
            if (in_array($origin, $allowed_origins)) {
                header("Access-Control-Allow-Origin: " . $origin);
            }
            header("Content-Type: application/json; charset=UTF-8");
            header("Access-Control-Allow-Credentials: true");
            http_response_code(500);
        }
        // Send a JSON response containing the details of the fatal error
        echo json_encode([
            'message' => 'A fatal PHP error occurred. This is the real error message.',
            'error_type' => 'FATAL_ERROR',
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

// --- STEP 4: Set CORS headers for actual requests ---
$allowed_origins = [
    "https://9000-firebase-clearbookgit-1767005762274.cluster-64pjnskmlbaxowh5lzq6i7v4ra.cloudworkstations.dev",
    "https://clearbook-olive.vercel.app"
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: " . $origin);
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

// --- STEP 5: Set custom error handler for non-fatal errors ---
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    // Don't execute PHP internal error handler
    return true;
});

// --- STEP 6: Enhanced main logic with better error detection ---
try {
    // Check if request method is POST (already handled OPTIONS above)
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception("Invalid request method. Only POST is allowed.", 405);
    }
    
    // Check if content type is JSON
    $contentType = isset($_SERVER["CONTENT_TYPE"]) ? trim($_SERVER["CONTENT_TYPE"]) : '';
    if (strpos($contentType, 'application/json') === false) {
        throw new Exception("Content-Type must be: application/json", 415);
    }
    
    // Get and validate JSON input
    $json_input = file_get_contents("php://input");
    if (empty($json_input)) {
        throw new Exception("No input data received", 400);
    }
    
    $data = json_decode($json_input);
    
    // Check for JSON decoding errors
    if (json_last_error() !== JSON_ERROR_NONE) {
        $json_errors = [
            JSON_ERROR_DEPTH => 'Maximum stack depth exceeded',
            JSON_ERROR_STATE_MISMATCH => 'Invalid or malformed JSON',
            JSON_ERROR_CTRL_CHAR => 'Control character error',
            JSON_ERROR_SYNTAX => 'Syntax error',
            JSON_ERROR_UTF8 => 'Malformed UTF-8 characters'
        ];
        $error_msg = $json_errors[json_last_error()] ?? 'Unknown JSON error';
        throw new Exception("JSON decode error: " . $error_msg, 400);
    }
    
    if ($data === null) {
        throw new Exception("Invalid JSON data received", 400);
    }
    
    // Include database connection
    if (!file_exists(__DIR__ . '/db_connect.php')) {
        throw new Exception("Database configuration file not found", 500);
    }
    
    require_once __DIR__ . '/db_connect.php';
    
    // Check if database connection was established
    if (!isset($conn) || !$conn) {
        throw new Exception("Failed to establish database connection", 500);
    }
    
    // Check database connection
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error, 500);
    }
    
    // Validate required fields
    $required_fields = ['company_id', 'pet_bom_id', 'quantity_to_produce', 'order_date'];
    foreach ($required_fields as $field) {
        if (!isset($data->$field) || empty($data->$field)) {
            throw new Exception("Missing required field: " . $field, 400);
        }
    }
    
    // Additional validation
    if (!is_numeric($data->quantity_to_produce) || $data->quantity_to_produce <= 0) {
        throw new Exception("quantity_to_produce must be a positive number", 400);
    }
    
    if (!strtotime($data->order_date)) {
        throw new Exception("Invalid order_date format", 400);
    }
    if (!isset($data->total_material_cost) || !is_numeric($data->total_material_cost)) {
        throw new Exception("total_material_cost is required and must be numeric", 400);
    }
    
    if (!isset($data->cost_per_unit_produced) || !is_numeric($data->cost_per_unit_produced)) {
        throw new Exception("cost_per_unit_produced is required and must be numeric", 400);
    }
    
    if (isset($data->quantity_defective) && !is_numeric($data->quantity_defective)) {
        throw new Exception("quantity_defective must be numeric", 400);
    }
    
    
    $conn->begin_transaction();

    // Gross quantity calculation
    $gross_quantity = 0;
    if (!empty($data->operations) && is_array($data->operations)) {
        foreach ($data->operations as $op) {
            if (!is_object($op)) {
                throw new Exception("Invalid operations data structure", 400);
            }
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
        throw new Exception("Calculated production quantity is zero or less.", 400);
    }

    // BOM Component Check
    $bom_comp_query = "SELECT component_item_id, quantity_required FROM pet_bom_components WHERE pet_bom_id = ?";
    $bom_stmt = $conn->prepare($bom_comp_query);
    if (!$bom_stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error, 500);
    }
    
    $bom_stmt->bind_param("s", $data->pet_bom_id);
    if (!$bom_stmt->execute()) {
        throw new Exception("Execute failed: " . $bom_stmt->error, 500);
    }
    
    $bom_result = $bom_stmt->get_result();
    if (!$bom_result) {
        throw new Exception("Get result failed: " . $bom_stmt->error, 500);
    }
    
    $components = $bom_result->fetch_all(MYSQLI_ASSOC);

    foreach ($components as $component) {
        $component_id = $component['component_item_id'];
        $required_qty = $gross_quantity * (float)$component['quantity_required'];
        
        $item_query = "SELECT name, quantity_on_hand FROM raw_materials WHERE id = ? AND company_id = ?";
        $item_stmt = $conn->prepare($item_query);
        if (!$item_stmt) {
            throw new Exception("Prepare statement failed for raw_materials: " . $conn->error, 500);
        }
        
        $item_stmt->bind_param("ss", $component_id, $data->company_id);
        if (!$item_stmt->execute()) {
            throw new Exception("Execute failed for raw_materials: " . $item_stmt->error, 500);
        }
        
        $item_result = $item_stmt->get_result();
        if (!$item_result) {
            throw new Exception("Get result failed for raw_materials: " . $item_stmt->error, 500);
        }
        
        $item_details = $item_result->fetch_assoc();

        if (!$item_details) {
            throw new Exception("Component with ID {$component_id} not found in raw_materials inventory.", 404);
        }
        if ((float)$item_details['quantity_on_hand'] < $required_qty) {
            throw new Exception(sprintf("Insufficient stock for '%s'. Required: %.2f, Available: %.2f.", $item_details['name'], $required_qty, (float)$item_details['quantity_on_hand']), 400);
        }
    }

    $planned_to_produced = isset($data->planned_to_produced)
    ? (float)$data->planned_to_produced
    : $gross_quantity; // sensible fallback

    // Insert Order
    $insert_query = "INSERT INTO pet_production_orders (company_id, pet_bom_id, quantity_to_produce, quantity_produced, quantity_defective, total_material_cost, cost_per_unit_produced, order_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Planned')";
    $insert_stmt = $conn->prepare($insert_query);
    if (!$insert_stmt) {
        throw new Exception("Prepare statement failed for order insertion: " . $conn->error, 500);
    }
    
    $quantity_defective = $data->quantity_defective ?? 0;

    $insert_stmt->bind_param(
        "siddddds",
        $data->company_id,            // s
        $data->pet_bom_id,            // i
        $data->quantity_to_produce,   // d
        $planned_to_produced,         // d
        $quantity_defective,          // d
        $data->total_material_cost,   // d
        $data->cost_per_unit_produced,// d
        $data->order_date             // s
    );
    
    if (!$insert_stmt->execute()) {
        throw new Exception("Database execution failed: " . $insert_stmt->error, 500);
    }

    $new_order_id = $conn->insert_id;
    $conn->commit();

    http_response_code(201);
    echo json_encode([
        "status" => "success",
        "message" => "Production order created successfully.", 
        "order_id" => $new_order_id
    ]);

} catch (Exception $e) {
    // Rollback transaction if it was started
    if (isset($conn) && $conn && method_exists($conn, 'rollback')) {
        try {
            $conn->rollback();
        } catch (Exception $rollback_exception) {
            // Log rollback error but don't override original error
            error_log("Rollback failed: " . $rollback_exception->getMessage());
        }
    }
    
    // Determine appropriate HTTP status code
    $response_code = $e->getCode();
    if ($response_code < 100 || $response_code >= 600) {
        $response_code = 500; // Default to 500 if invalid code
    }
    
    // Map common error codes
    $common_codes = [400, 401, 403, 404, 405, 415, 422, 500];
    if (!in_array($response_code, $common_codes)) {
        $response_code = 500;
    }
    
    http_response_code($response_code);
    
    // Log the error for debugging (but don't expose details to client in production)
    error_log("Production Order Error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
    
    // Return error response
    echo json_encode([
        "status" => "error",
        "error_type" => "EXCEPTION",
        "message" => $e->getMessage(),
        "error_details" => [
            "code" => $response_code,
            "message" => $e->getMessage(),
            "file" => $e->getFile(),
            "line" => $e->getLine()
        ]
    ]);
} finally {
    // Close database connection if it exists
    if (isset($conn) && $conn && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>