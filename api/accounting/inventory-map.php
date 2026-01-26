<?php
// api/accounting/inventory-map.php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once 'db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$company_id = $_GET['company_id'] ?? null;
if (!$company_id) {
    http_response_code(400);
    echo json_encode(["error" => "Company ID is required."]);
    exit;
}

if ($method == 'GET') {
    fetch_inventory_map($pdo, $company_id);
} elseif ($method == 'POST') {
    save_inventory_map($pdo, $company_id);
} else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}

function fetch_inventory_map($pdo, $company_id) {
    try {
        $stmt = $pdo->prepare("SELECT category_name, system_role FROM inventory_category_map WHERE company_id = ?");
        $stmt->execute([$company_id]);
        $mappings = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($mappings);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

function save_inventory_map($pdo, $company_id) {
    $data = json_decode(file_get_contents('php://input'), true);
    $mappings = $data['mappings'] ?? null;

    if (!$mappings || !is_array($mappings)) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid or no inventory mappings provided."]);
        exit;
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("DELETE FROM inventory_category_map WHERE company_id = ?");
        $stmt->execute([$company_id]);

        $stmt = $pdo->prepare(
            "INSERT INTO inventory_category_map (company_id, category_name, system_role) VALUES (:company_id, :category_name, :system_role)"
        );

        foreach ($mappings as $map) {
            $stmt->execute([
                ':company_id' => $company_id,
                ':category_name' => $map['category_name'],
                ':system_role' => $map['system_role'],
            ]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Inventory Category Mappings saved successfully.']);

    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Database transaction failed: ' . $e->getMessage()]);
    }
}
?>