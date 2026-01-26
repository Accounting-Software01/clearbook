<?php
// api/accounting/coa.php

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
    fetch_chart_of_accounts($pdo, $company_id);
} elseif ($method == 'POST') {
    save_chart_of_accounts($pdo, $company_id);
} else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}

function fetch_chart_of_accounts($pdo, $company_id) {
    try {
        $stmt = $pdo->prepare("SELECT account_code, account_name, account_type, system_role, parent_account_code, is_control_account, is_active FROM chart_of_accounts WHERE company_id = ? ORDER BY account_code ASC");
        $stmt->execute([$company_id]);
        $accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($accounts);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

function save_chart_of_accounts($pdo, $company_id) {
    $data = json_decode(file_get_contents('php://input'), true);
    $accounts = $data['accounts'] ?? null;

    if (!$accounts || !is_array($accounts)) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid or no accounts data provided."]);
        exit;
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("DELETE FROM chart_of_accounts WHERE company_id = ?");
        $stmt->execute([$company_id]);

        $stmt = $pdo->prepare(
            "INSERT INTO chart_of_accounts (company_id, account_code, account_name, account_type, system_role, parent_account_code, is_control_account, is_active) 
             VALUES (:company_id, :account_code, :account_name, :account_type, :system_role, :parent_account_code, :is_control_account, :is_active)"
        );

        foreach ($accounts as $acc) {
            $stmt->execute([
                ':company_id' => $company_id,
                ':account_code' => $acc['account_code'],
                ':account_name' => $acc['account_name'],
                ':account_type' => $acc['account_type'],
                ':system_role' => empty($acc['system_role']) ? null : $acc['system_role'],
                ':parent_account_code' => empty($acc['parent_account_code']) ? null : $acc['parent_account_code'],
                ':is_control_account' => (int)(isset($acc['is_control_account']) ? filter_var($acc['is_control_account'], FILTER_VALIDATE_BOOLEAN) : 0),
                ':is_active' => (int)(isset($acc['is_active']) ? filter_var($acc['is_active'], FILTER_VALIDATE_BOOLEAN) : 1)
            ]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Chart of Accounts saved successfully.']);

    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Database transaction failed: ' . $e->getMessage()]);
    }
}
?>