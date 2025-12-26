
<?php
require_once 'db.php';

header('Content-Type: application/json');

function create_notifications_table($mysqli) {
    $query = "
    CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id VARCHAR(255) NOT NULL,
        user_id INT NOT NULL,
        message VARCHAR(255) NOT NULL,
        link VARCHAR(255),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
    ";
    if (!$mysqli->query($query)) {
        throw new Exception("Failed to create notifications table: " . $mysqli->error);
    }
}

try {
    create_notifications_table($mysqli);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->company_id) || !isset($data->user_id) || !isset($data->message)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Invalid input.']);
            exit;
        }

        $company_id = $data->company_id;
        $user_id = $data->user_id;
        $message = $data->message;
        $link = $data->link ?? null;

        $stmt = $mysqli->prepare("INSERT INTO notifications (company_id, user_id, message, link) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("siss", $company_id, $user_id, $message, $link);
        $stmt->execute();
        $stmt->close();

        echo json_encode(['status' => 'success', 'message' => 'Notification created.']);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (!isset($_GET['user_id']) || !isset($_GET['company_id'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'User ID and Company ID are required.']);
            exit;
        }

        $user_id = $_GET['user_id'];
        $company_id = $_GET['company_id'];

        $stmt = $mysqli->prepare("SELECT * FROM notifications WHERE user_id = ? AND company_id = ? AND is_read = FALSE ORDER BY created_at DESC");
        $stmt->bind_param("is", $user_id, $company_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $notifications = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        echo json_encode($notifications);
    } else {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Method not allowed.']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}

$mysqli->close();
?>
