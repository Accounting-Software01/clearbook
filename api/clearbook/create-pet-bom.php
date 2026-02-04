<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Set headers for CORS and JSON response
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Include the database connection script
require_once __DIR__ . '/db_connect.php';

// Function to send a standardized JSON response and exit
function send_json_response($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Get the posted data
$data = json_decode(file_get_contents("php://input"));

// Validate incoming data
if (
    !isset($data->company_id) ||
    !isset($data->bom_name) ||
    !isset($data->output_item_id) ||
    !isset($data->production_stage) ||
    !isset($data->components) ||
    !is_array($data->components) ||
    empty($data->components)
) {
    send_json_response(['message' => 'Incomplete or invalid data for BOM creation.'], 400);
}

// Begin transaction for atomicity
$conn->begin_transaction();

try {
    // 1. Insert into the main pet_boms table
    $bom_query = "INSERT INTO pet_boms (company_id, bom_name, output_item_id, production_stage) VALUES (?, ?, ?, ?)";
    $bom_stmt = $conn->prepare($bom_query);
    // Corrected bind_param types: company_id is an integer (i)
    $bom_stmt->bind_param("ssss", $data->company_id, $data->bom_name, $data->output_item_id, $data->production_stage);

    if (!$bom_stmt->execute()) {
        throw new Exception("Failed to create BOM: " . $bom_stmt->error);
    }

    $pet_bom_id = $conn->insert_id;
    $bom_stmt->close();

    // 2. Insert into the pet_bom_components table
    // Added unit_of_measure column
    $comp_query = "INSERT INTO pet_bom_components (pet_bom_id, component_item_id, quantity_required, unit_of_measure) VALUES (?, ?, ?, ?)";
    $comp_stmt = $conn->prepare($comp_query);

    foreach ($data->components as $component) {
        // Validate each component object
        if (!isset($component->component_item_id) || !isset($component->quantity_required) || !isset($component->unit_of_measure)) {
            throw new Exception("Incomplete data for a component. All fields are required.");
        }
        // Corrected bind_param types: pet_bom_id is integer, component_item_id is string, quantity is double, unit is string
        $comp_stmt->bind_param("isds", $pet_bom_id, $component->component_item_id, $component->quantity_required, $component->unit_of_measure);

        if (!$comp_stmt->execute()) {
            throw new Exception("Failed to add component: " . $comp_stmt->error);
        }
    }
    $comp_stmt->close();

    // If everything was successful, commit the transaction
    $conn->commit();

    send_json_response(['message' => 'PET BOM created successfully.', 'bom_id' => $pet_bom_id], 201);

} catch (Exception $e) {
    // If any step fails, roll back the entire transaction
    $conn->rollback();
    send_json_response(['message' => 'BOM creation failed: ' . $e->getMessage()], 500);
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
