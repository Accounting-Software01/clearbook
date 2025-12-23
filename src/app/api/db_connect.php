<?php
// Centralized Database Connection

$host = "localhost";
$dbname = "hariindu_clearbook";
$username = "hariindu_clearbook";
$password = "hariindu_clearbook";

// Use a global variable for the connection
global $pdo, $conn;

// PDO connection (for login.php)
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
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database connection failed (PDO)"]);
    exit;
}

// MySQLi connection (for supplier.php)
try {
    $conn = new mysqli($host, $username, $password, $dbname);
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    $conn->set_charset("utf8mb4");
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection error (MySQLi)']);
    exit;
}

?>