<?php
$allowed_origins = [
    "https://9000-firebase-clearbookgit-1767005762274.cluster-64pjnskmlbaxowh5lzq6i7v4ra.cloudworkstations.dev",
    "https://clearbook-olive.vercel.app"
];

if (isset($_SERVER['HTTP_ORIGIN']) && in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
    header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
}

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

require_once __DIR__ . '/db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('HTTP/1.0 405 Method Not Allowed');
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

if (!isset($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Company ID is required.']);
    exit;
}

$company_id = $_GET['company_id'];

try {
    $query = "
        SELECT 
            mi.id,
            mi.issue_date,
            rm.name AS material_name,
            mi.quantity_issued,
            mi.total_cost,
            mi.reference
        FROM 
            material_issuances mi
        JOIN 
            raw_materials rm ON mi.raw_material_id = rm.id
        WHERE 
            mi.company_id = ?
        ORDER BY 
            mi.id DESC
    ";
    
    $stmt = $conn->prepare($query);
    if ($stmt === false) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }
    
    $stmt->bind_param("s", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $issues = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    
    http_response_code(200);
    echo json_encode(['success' => true, 'issues' => $issues]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>