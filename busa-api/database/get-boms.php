<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once '../config.php';
require_once '../auth.php';

$conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Database Connection Failed"]);
    exit();
}

$user = get_user_from_token();
if (!$user) {
    http_response_code(401);
    echo json_encode(["error" => "User not authenticated."]);
    exit();
}

$companyId = $user['company_id'];

// This query joins the boms table with the items table to get the name of the finished good.
$sql = "
    SELECT 
        b.id,
        b.name AS bomName,
        i.name AS finishedGoodName,
        i.code AS finishedGoodCode,
        b.createdAt
    FROM boms b
    JOIN items i ON b.finishedGoodId = i.id
    WHERE b.companyId = ?
    ORDER BY b.createdAt DESC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $companyId);
$stmt->execute();
$result = $stmt->get_result();

$boms = [];
while ($row = $result->fetch_assoc()) {
    $boms[] = $row;
}

echo json_encode($boms);

$stmt->close();
$conn->close();
?>