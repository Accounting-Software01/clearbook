<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

$env = "development";

if (isset($_SERVER['HTTP_ORIGIN'])) {
    $allowed_origins = [
        'https://9003-firebase-studiogit-1765450741734.cluster-cbeiita7rbe7iuwhvjs5zww2i4.cloudworkstations.dev',
        'https://9000-firebase-clearbookgit-1767005762274.cluster-64pjnskmlbaxowh5lzq6i7v4ra.cloudworkstations.dev',
        'https://clearbook-olive.vercel.app',
        'https://hariindustries.net'
    ];
    if (in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
        header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
    }
} else {
    header("Access-Control-Allow-Origin: https://hariindustries.net");
}

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once 'db_connect.php';

function respond($code, $data) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

$conn = null;

try {
    $conn = $db;
    
    // --- Step 1: Validate input ---
    $company_id = filter_input(INPUT_GET, 'company_id', FILTER_SANITIZE_STRING);
    $customer_id = filter_input(INPUT_GET, 'customer_id', FILTER_VALIDATE_INT);

    if (!$company_id || !$customer_id) {
        respond(400, ["success" => false, "error" => "Missing or invalid parameters. Required: company_id, customer_id"]);
    }

    // --- Step 2: Fetch all posted transactions for the customer from the journal ---
    // As per your instruction, we use the customer_id directly as the ledger_id.
    $ledger_sql = "
        SELECT
            jv.voucher_date AS date,
            jv.narration,
            jvl.type,
            jvl.amount
        FROM journal_voucher_lines AS jvl
        JOIN journal_vouchers AS jv ON jvl.journal_voucher_id = jv.id
        WHERE jvl.ledger_id = ? AND jv.company_id = ? AND jv.status = 'POSTED'
        ORDER BY jv.voucher_date ASC, jv.id ASC
    ";
    $stmt = $conn->prepare($ledger_sql);
    if (!$stmt) throw new Exception("Prepare failed (ledger query): " . $conn->error);
    // We bind the customer_id from the input directly to the ledger_id placeholder.
    $stmt->bind_param("is", $customer_id, $company_id);
    $stmt->execute();
    $transactions = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // --- Step 3: Process transactions to create a running balance ---
    $ledger_trail = [];
    $running_balance = 0.0;

    foreach ($transactions as $row) {
        $debit = 0.0;
        $credit = 0.0;

        if (strtoupper($row['type']) === 'DEBIT') {
            $debit = (float)$row['amount'];
            $running_balance += $debit;
        } else { // Assumes CREDIT
            $credit = (float)$row['amount'];
            $running_balance -= $credit;
        }

        $ledger_trail[] = [
            'date' => date("d-m-Y", strtotime($row['date'])),
            'narration' => $row['narration'],
            'debit' => $debit,
            'credit' => $credit,
            'balance' => $running_balance
        ];
    }

    respond(200, $ledger_trail);

} catch (Exception $e) {
    $error_details = ($env === "development") ? ["details" => $e->getMessage()] : [];
    respond(500, array_merge(["success" => false, "error" => "Internal server error"], $error_details));
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
