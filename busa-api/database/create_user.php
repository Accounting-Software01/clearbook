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
    die("Database Connection Failed: " . $e->getMessage());
}

// ----- FORM HANDLING -----
$message = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $full_name     = trim($_POST['full_name']);
    $email         = trim($_POST['email']);
    $passwordInput = $_POST['password'];
    $role          = $_POST['role'];
    $job_title     = trim($_POST['job_title']);
    $user_type     = $_POST['user_type'];
    $company_type  = $_POST['company_type'];
    $status        = $_POST['status'];
    $company_id    = trim($_POST['company_id']);

    // ----- ENUM VALIDATION -----
    $allowedRoles = ['admin', 'accountant', 'staff', 'admin'];
    $allowedUserTypes = ['internal', 'external'];
    $allowedCompanyTypes = ['manufacturing','hospital','school','retail','services','ngo','other'];
    $allowedStatus = ['Active', 'Inactive', 'Suspended'];

    if (!in_array($role, $allowedRoles, true)) {
        $message = ["success" => false, "error" => "Invalid role selected."];
    } elseif (!in_array($user_type, $allowedUserTypes, true)) {
        $message = ["success" => false, "error" => "Invalid user type selected."];
    } elseif (!in_array($company_type, $allowedCompanyTypes, true)) {
        $message = ["success" => false, "error" => "Invalid company type selected."];
    } elseif (!in_array($status, $allowedStatus, true)) {
        $message = ["success" => false, "error" => "Invalid status selected."];
    } else {
        // ----- HASH PASSWORD -----
        $hashedPassword = password_hash($passwordInput, PASSWORD_DEFAULT);

        try {
            $stmt = $pdo->prepare("
                INSERT INTO users 
                (full_name, email, password_hash, role, job_title, user_type, company_type, status, company_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $full_name, 
                $email, 
                $hashedPassword, 
                $role, 
                $job_title, 
                $user_type, 
                $company_type, 
                $status, 
                $company_id
            ]);

            $message = ["success" => true, "message" => "User Registered Successfully!"];

        } catch (PDOException $e) {
            $message = ["success" => false, "error" => $e->getMessage()];
        }
    }
    header('Content-Type: application/json');
    echo json_encode($message);
    exit;
}
?>