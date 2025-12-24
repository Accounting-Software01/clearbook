<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/src/app/api/db_connect.php';

if (!isset($conn) || $conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database connection failed"]);
    exit();
}

$company_id = $_GET['company_id'] ?? null;
$status = $_GET['status'] ?? null;

if (!$company_id) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Company ID is required."]);
    exit();
}

try {
    // For now, we will return an empty array as the GRN approval functionality is not fully implemented.
    // In the future, this will be replaced with a database query to fetch pending GRNs.
    $grns = [];

    if ($status === 'Pending') {
        // Example of what the query might look like in the future:
        /*
        $sql = "
            SELECT 
                grn.id, 
                grn.grn_number, 
                po.po_number, 
                s.name as supplier_name, 
                grn.grn_date, 
                grn.status
            FROM 
                goods_received_notes grn
            JOIN 
                purchase_orders po ON grn.purchase_order_id = po.id
            JOIN 
                suppliers s ON po.supplier_id = s.id
            WHERE 
                grn.company_id = ? AND grn.status = ?
            ORDER BY 
                grn.grn_date DESC
        ";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ss", $company_id, $status);
        $stmt->execute();
        $result = $stmt->get_result();
        
        while ($row = $result->fetch_assoc()) {
            $grns[] = $row;
        }
        $stmt->close();
        */
    }

    http_response_code(200);
    echo json_encode(['success' => true, 'grns' => $grns]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "An error occurred while fetching Goods Received Notes.",
        "details" => $e->getMessage()
    ]);
}

$conn->close();
?>
