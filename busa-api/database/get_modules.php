<?php
// ----- DATABASE CONNECTION -----
$host = "localhost";
$dbname = "hariindu_clearbook";
$username = "hariindu_clearbook";
$password = "hariindu_clearbook";

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "error" => "Database Connection Failed: " . $e->getMessage()]);
    exit;
}

// ----- API LOGIC -----

// In a real application, you might have a dedicated table for modules.
// For simplicity, we'll define them here.
$modules = [
    ["permission" => "view_dashboard", "name" => "Dashboard"],
    ["permission" => "manage_users", "name" => "Users & Roles"],
    ["permission" => "view_accounting", "name" => "Accounting"],
    ["permission" => "manage_settings", "name" => "Settings"],
    ["permission" => "view_production", "name" => "Production"],
    ["permission" => "view_inventory", "name" => "Inventory"],
    ["permission" => "view_procurement", "name" => "Procurement"],
    ["permission" => "view_sales", "name" => "Sales"],
];

header('Content-Type: application/json');
echo json_encode(["success" => true, "modules" => $modules]);
?>