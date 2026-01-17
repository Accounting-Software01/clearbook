<?php
require_once __DIR__ . '/db_connect.php';


header("Content-Type: application/json");

// CORS Headers
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
}
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
        header("Access-Control-Allow-Methods: GET, OPTIONS");
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

if (empty($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Company ID is required']);
    exit;
}

$company_id = $_GET['company_id'];
$user_role = isset($_GET['user_role']) ? $_GET['user_role'] : 'staff'; // Default to staff
global $conn;

$response = [
    'products' => [],
    'raw_materials' => [],
    'finished_goods' => [],
    'work_in_progress' => [],
    'mro_supplies' => [],
    'packaging_materials' => [],
    'fuel_energy' => [],
    'returned_goods' => [],
    'obsolete_scrap' => [],
    'goods_in_transit' => [],
    'promotional_materials' => [],
    'safety_stock' => [],
    'quality_hold' => [],
    'consignment' => [],
];

// Function to fetch data from a table
function fetchData($conn, $tableName, $company_id, $itemType, $user_role) {
    try {
        $select_fields = "id, name, sku, category, unit_of_measure, unit_of_measure AS uom, quantity_on_hand AS quantity, '{$itemType}' as item_type";
        if($user_role !== 'staff') {
            $select_fields .= ", average_unit_cost AS unit_cost";
        }

        $query = "SELECT {$select_fields} FROM {$tableName} WHERE company_id = ?";
        if ($tableName === 'raw_materials') {
            $query .= " AND issuance_policy = 'manual'";
        }
        $stmt = $conn->prepare($query);
        if ($stmt === false) throw new Exception("Prepare failed ({$tableName}): " . $conn->error);

        $stmt->bind_param("s", $company_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $data = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $data;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => "Failed to fetch {$itemType}", 'details' => $e->getMessage()]);
        $conn->close();
        exit;
    }
}

// Fetch data for all categories
$response['products'] = fetchData($conn, 'products', $company_id, 'product', $user_role);
$response['raw_materials'] = fetchData($conn, 'raw_materials', $company_id, 'raw_material', $user_role);
$response['finished_goods'] = fetchData($conn, 'finished_goods', $company_id, 'finished_good', $user_role);
$response['work_in_progress'] = fetchData($conn, 'work_in_progress', $company_id, 'work_in_progress', $user_role);
$response['mro_supplies'] = fetchData($conn, 'mro_supplies', $company_id, 'mro_supply', $user_role);
$response['packaging_materials'] = fetchData($conn, 'packaging_materials', $company_id, 'packaging_material', $user_role);
$response['fuel_energy'] = fetchData($conn, 'fuel_energy', $company_id, 'fuel_energy', $user_role);
$response['returned_goods'] = fetchData($conn, 'returned_goods', $company_id, 'returned_good', $user_role);
$response['obsolete_scrap'] = fetchData($conn, 'obsolete_scrap', $company_id, 'obsolete_scrap', $user_role);
$response['goods_in_transit'] = fetchData($conn, 'goods_in_transit', $company_id, 'goods_in_transit', $user_role);
$response['promotional_materials'] = fetchData($conn, 'promotional_materials', $company_id, 'promotional_material', $user_role);
$response['safety_stock'] = fetchData($conn, 'safety_stock', $company_id, 'safety_stock', $user_role);
$response['quality_hold'] = fetchData($conn, 'quality_hold', $company_id, 'quality_hold', $user_role);
$response['consignment'] = fetchData($conn, 'consignment', $company_id, 'consignment', $user_role);


$conn->close();

http_response_code(200);
echo json_encode($response);
?>