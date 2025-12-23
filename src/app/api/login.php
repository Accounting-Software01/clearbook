<?php
// Use the centralized authentication and session handler.
require_once 'auth_check.php';
// Use the centralized database connection.
require_once 'db_connect.php';

global $pdo; // Use the PDO connection from db_connect.php

/************************************
 * INPUT VALIDATION
 ************************************/
$data = json_decode(file_get_contents("php://input"), true);

if (empty($data['email']) || empty($data['password'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Email and password are required"]);
    exit;
}

$email = trim($data['email']);
$passwordInput = $data['password'];

/************************************
 * USER LOOKUP & AUTHENTICATION
 ************************************/
try {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        throw new Exception("Invalid email or password", 401);
    }

    // --- Account Lock Check ---
    if (!empty($user['account_locked_until']) && strtotime($user['account_locked_until']) > time()) {
        $remaining = strtotime($user['account_locked_until']) - time();
        throw new Exception("Account locked due to multiple failed login attempts. Try again in $remaining seconds.", 403);
    }

    // --- Password Verification ---
    if (!password_verify($passwordInput, $user['password_hash'])) {
        $failedAttempts = $user['failed_login_attempts'] + 1;
        $lockDuration = 300; // 5 minutes
        $lockedUntil = ($failedAttempts >= 5) ? date('Y-m-d H:i:s', time() + $lockDuration) : null;

        $updateStmt = $pdo->prepare("UPDATE users SET failed_login_attempts = ?, last_failed_login = NOW(), account_locked_until = ? WHERE id = ?");
        $updateStmt->execute([$failedAttempts, $lockedUntil, $user['id']]);

        $msg = $lockedUntil ? "Account locked. Try again in 5 minutes." : "Invalid email or password";
        throw new Exception($msg, 401);
    }

    // --- Status & Type Check ---
    if ($user['status'] !== 'Active') {
        throw new Exception("Account is not active", 403);
    }
    $allowedUserTypes = ['internal', 'external'];
    if (!in_array($user['user_type'], $allowedUserTypes)) {
        throw new Exception("Unauthorized user type", 403);
    }

    // --- Success: Reset failed attempts ---
    $resetStmt = $pdo->prepare("UPDATE users SET failed_login_attempts = 0, last_failed_login = NULL, account_locked_until = NULL WHERE id = ?");
    $resetStmt->execute([$user['id']]);

    // --- Store to Session ---
    $_SESSION['user'] = [
        'id' => $user['id'],
        'company_id' => $user['company_id'],
        'full_name' => $user['full_name'],
        'email' => $user['email'],
        'role' => $user['role'],
        'user_type' => $user['user_type'],
        'company_type' => $user['company_type']
    ];

    // --- Success Response ---
    http_response_code(200);
    echo json_encode([
        "status" => "success",
        "message" => "Login successful",
        "user" => $_SESSION['user']
    ]);

} catch (Exception $e) {
    $code = $e->getCode() >= 400 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}

exit;
?>