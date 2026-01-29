<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: GET');

require_once __DIR__ .'/db_connect.php';

if (!isset($_GET['company_id']) || empty(trim($_GET['company_id']))) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Company ID is required.']);
    exit;
}

$company_id = trim($_GET['company_id']);

try {
    // The SQL has been updated to re-include `finished_good_id`
    $sql = "SELECT
                b.id,
                b.bom_code,
                b.finished_good_id, -- This field is required by the frontend
                p.name AS finished_good_name,
                b.bom_version,
                b.status,
                b.effective_from,
                b.created_at,
                b.total_standard_cost
            FROM boms AS b
            JOIN products AS p ON b.finished_good_id = p.id
            WHERE b.company_id = ?
            ORDER BY b.created_at DESC";

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        throw new Exception("Failed to prepare statement: " . $conn->error);
    }

    $stmt->bind_param("s", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $boms = [];
    while ($row = $result->fetch_assoc()) {
        $boms[] = $row;
    }

    $stmt->close();
    $conn->close();

    echo json_encode(['success' => true, 'boms' => $boms]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred while fetching BOMs: ' . $e->getMessage()
    ]);
}
?>