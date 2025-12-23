<?php
// This file should be included at the VERY TOP of your API scripts.

// --- CORS & SESSION CONFIGURATION ---

// IMPORTANT: Your frontend domain must be explicitly whitelisted in production.
if (isset($_SERVER['HTTP_ORIGIN'])) {
    // For development, we are dynamically allowing the origin.
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
} else {
    // Fallback for same-origin or direct access
    header("Access-Control-Allow-Origin: *");
}

header("Access-Control-Allow-Credentials: true"); // Crucial for sessions/cookies
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE, PUT");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle preflight (OPTIONS) requests and exit immediately.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204); // No Content
    exit();
}

// Start or resume a session with secure, cross-domain compatible cookie settings.
if (session_status() == PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 86400, // 1 day
        'path' => '/',
        // CRITICAL FIX: Explicitly set the top-level domain for the cookie.
        // The leading dot . makes it valid for all subdomains.
        'domain' => '.hariindustries.net', 
        'secure' => true,      // Must be true for SameSite=None.
        'httponly' => true,    // Prevents client-side script access.
        'samesite' => 'None' // Required for cross-site cookie sending.
    ]);
    session_start();
}

/**
 * Retrieves the user session data.
 *
 * @return array|null The user data array if logged in, otherwise null.
 */
function get_user_session(): ?array {
    return $_SESSION['user'] ?? null;
}

/**
 * Checks for a valid user session and terminates with a 401 error if not found.
 * This function should be called at the top of any protected API file.
 *
 * @return array The user session data. Guaranteed to be a valid user.
 */
function require_auth(): array {
    $user = get_user_session();
    if (!$user) {
        http_response_code(401); // Unauthorized
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Authentication required. Please log in.']);
        exit(); // Stop script execution immediately.
    }
    return $user;
}
?>