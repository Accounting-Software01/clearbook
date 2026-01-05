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
        header("Access-Control-Allow-Headers: Content-Type, Authorization");
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
global $conn;

try {
    $query = "
        SELECT 
            mi.id,
            rm.name AS material_name,
            mi.quantity_issued,
            u.username AS issued_by,
            mi.unit_cost_at_issue,
            mi.issue_date
        FROM 
            material_issues mi
        JOIN 
            raw_materials rm ON mi.material_id = rm.id
        JOIN 
            users u ON mi.issued_by_user_id = u.id
        WHERE 
            mi.company_id = ?
        ORDER BY 
            mi.issue_date DESC
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
    echo json_encode(['status' => 'success', 'issues' => $issues]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to fetch material issues', 'details' => $e->getMessage()]);
}

$conn->close();
?>
