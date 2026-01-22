<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

include_once '../../../db_connect.php';

// Corrected: Treat company_id as a string
$company_id = isset($_GET['company_id']) ? $_GET['company_id'] : '';
$product_id = isset($_GET['product_id']) ? intval($_GET['product_id']) : 0;
$bom_id_param = isset($_GET['bom_id']) ? intval($_GET['bom_id']) : 0;

if (empty($company_id)) {
    http_response_code(400);
    echo json_encode(['message' => 'Company ID is required.']);
    exit;
}

if (!$product_id && !$bom_id_param) {
    http_response_code(400);
    echo json_encode(['message' => 'Either a Product ID or a BOM ID is required.']);
    exit;
}

try {
    $bom_id = 0;

    if ($bom_id_param) {
        $findBomSql = "SELECT id FROM boms WHERE id = ? AND company_id = ?";
        $stmt = $conn->prepare($findBomSql);
        // Corrected: Bind company_id as a string ('s')
        $stmt->bind_param("is", $bom_id_param, $company_id);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($bom = $result->fetch_assoc()) {
            $bom_id = $bom['id'];
        }
    } else if ($product_id) {
        $findBomSql = "SELECT id FROM boms WHERE finished_good_id = ? AND company_id = ? AND status = 'Active' ORDER BY bom_version DESC LIMIT 1";
        $stmt = $conn->prepare($findBomSql);
        // Corrected: Bind company_id as a string ('s')
        $stmt->bind_param("is", $product_id, $company_id);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($bom = $result->fetch_assoc()) {
            $bom_id = $bom['id'];
        }
    }

    if (!$bom_id) {
        http_response_code(404);
        $error_message = $bom_id_param ? "No BOM found with ID {$bom_id_param}." : "No active BOM found for product ID {$product_id}.";
        echo json_encode(['message' => $error_message, 'components' => []]);
        exit;
    }

    $getComponentsSql = "
        SELECT 
            bc.item_id AS id,
            i.name,
            bc.quantity,
            bc.component_type
        FROM bom_components bc
        JOIN items i ON bc.item_id = i.id
        WHERE bc.bom_id = ? AND bc.component_type IN ('raw-material', 'packaging')
    ";

    $stmt = $conn->prepare($getComponentsSql);
    $stmt->bind_param("i", $bom_id);
    $stmt->execute();
    $componentsResult = $stmt->get_result();
    
    $components = [];
    while ($row = $componentsResult->fetch_assoc()) {
        $components[] = [
            'id' => $row['id'],
            'name' => $row['name'],
            'quantity' => $row['quantity'],
        ];
    }

    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'bom_id' => $bom_id, 'components' => $components]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
} finally {
    if ($conn) {
        $conn->close();
    }
}
?>