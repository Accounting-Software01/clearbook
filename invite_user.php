<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->email) || !isset($data->role) || !isset($data->company_id)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid input. Email, role, and company_id are required."]);
    exit();
}

$email = $data->email;
$role = $data->role;
$companyId = $data->company_id;

// Basic validation
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid email format."]);
    exit();
}

// --- Database Interaction ---
$db = new DB_CONNECT();
$conn = $db->connect();

// 1. Check if user already exists in the system for this company
$checkSql = "SELECT user_id FROM users WHERE email = ? AND company_id = ?";
$checkStmt = $conn->prepare($checkSql);
$checkStmt->bind_param("ss", $email, $companyId);
$checkStmt->execute();
$checkResult = $checkStmt->get_result();

if ($checkResult->num_rows > 0) {
    http_response_code(409); // Conflict
    echo json_encode(["error" => "A user with this email already exists in this company."]);
    $checkStmt->close();
    $conn->close();
    exit();
}
$checkStmt->close();

// 2. Insert new user with a pending status
$invitationToken = bin2hex(random_bytes(32)); // Secure token for the invitation link
$status = 'Pending';
$userId = 'usr_' . uniqid(); // Generate a unique user ID

// The new user will not have a full_name until they accept the invitation
$insertSql = "INSERT INTO users (user_id, email, role, company_id, status, invitation_token, invitation_sent_at) VALUES (?, ?, ?, ?, ?, ?, NOW())";
$insertStmt = $conn->prepare($insertSql);
$insertStmt->bind_param("ssssss", $userId, $email, $role, $companyId, $status, $invitationToken);

if ($insertStmt->execute()) {
    // --- Simulate Sending Email ---
    // In a real application, you would use a library like PHPMailer or an email service (SendGrid, Mailgun)
    $invitationLink = "https://your-app-domain.com/accept-invitation?token=" . $invitationToken;
    $subject = "You have been invited to join ClearBook";
    $body = "Hello,\n\nYou have been invited to join the company on ClearBook. Please click the link below to accept the invitation and set up your account:\n\n" . $invitationLink . "\n\nThank you,\nThe ClearBook Team";
    $headers = "From: no-reply@clearbook.com";
    
    // The mail() function is notoriously unreliable. This is for demonstration.
    // A real implementation should log this and handle failures.
    // mail($email, $subject, $body, $headers);
    error_log("Invitation email sent to {$email} with link: {$invitationLink}"); // Log for debugging

    http_response_code(201); // Created
    echo json_encode([
        "message" => "Invitation sent successfully to {$email}.",
        // Return the new user object to update the UI instantly
        "newUser" => [
            'user_id' => $userId,
            'full_name' => 'Invited User', // Placeholder name
            'email' => $email,
            'role' => $role,
            'status' => $status
        ]
    ]);
} else {
    http_response_code(500);
    echo json_encode(["error" => "Failed to create user invitation: " . $insertStmt->error]);
}

$insertStmt->close();
$conn->close();

?>
