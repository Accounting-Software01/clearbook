<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once 'db_connect.php';

// --- Input Validation ---
$company_id = filter_input(INPUT_GET, 'company_id', FILTER_SANITIZE_STRING);
$invoice_id = filter_input(INPUT_GET, 'invoice_id', FILTER_VALIDATE_INT);

if (!$company_id || !$invoice_id) {
    http_response_code(400);
    // Basic error for direct access
    echo "<!DOCTYPE html><html><head><title>Error</title><style>body { font-family: sans-serif; background-color: #f8d7da; color: #721c24; padding: 2rem; }</style></head><body><h1>Error: Missing Parameters</h1><p>Required parameters: company_id, invoice_id.</p></body></html>";
    exit;
}

try {
    // --- Fetch Company & Invoice Header ---
    $sql = "SELECT 
                si.id, si.invoice_number, si.invoice_date, si.due_date, si.notes, si.total_amount, si.payment_status,
                cust.customer_name, cust.billing_address, cust.primary_phone_number,
                co.name AS company_name, co.address AS company_address, co.phone AS company_phone, co.email AS company_email, co.company_logo
            FROM sales_invoices si
            JOIN customers cust ON si.customer_id = cust.customer_id
            JOIN companies co ON si.company_id = co.company_id
            WHERE si.id = ? AND si.company_id = ?
            LIMIT 1";
    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception("SQL Prepare Failed (Invoice Header): " . $conn->error);
    $stmt->bind_param("is", $invoice_id, $company_id);
    $stmt->execute();
    $invoice = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$invoice) {
        http_response_code(404);
        echo "<!DOCTYPE html><html><head><title>Not Found</title></head><body><h1>Invoice Not Found</h1></body></html>";
        exit;
    }

    // --- Fetch Invoice Items ---
    $items_sql = "SELECT item_name, quantity, unit_price, (quantity * unit_price) AS line_total 
                  FROM sales_invoice_items 
                  WHERE invoice_id = ? AND company_id = ?";
    $items_stmt = $conn->prepare($items_sql);
    if (!$items_stmt) throw new Exception("SQL Prepare Failed (Invoice Items): " . $conn->error);
    $items_stmt->bind_param("is", $invoice_id, $company_id);
    $items_stmt->execute();
    $items = $items_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $items_stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    echo "<h1>Internal Server Error</h1><p>" . htmlspecialchars($e->getMessage()) . "</p>";
    exit;
} finally {
    if (isset($conn)) $conn->close();
}

// --- Helper Functions ---
function formatDate($date) {
    return date("d M, Y", strtotime($date));
}
function formatCurrency($amount) {
    // A simple formatter, can be replaced with a more robust one if needed
    return '&#8358;' . number_format($amount, 2);
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Waybill #<?php echo htmlspecialchars($invoice['invoice_number']); ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --brand-color: #006400;
            --text-color: #333;
            --border-color: #e5e7eb;
            --background-light: #f9fafb;
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            background-color: #e9ecef;
            color: var(--text-color);
            margin: 0;
            padding: 1rem;
        }
        .container {
            max-width: 800px;
            margin: 2rem auto;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .waybill-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 2rem;
            border-bottom: 2px solid var(--brand-color);
        }
        .company-logo {
            max-height: 75px;
            width: auto;
        }
        .company-details {
            text-align: right;
            font-size: 0.9rem;
        }
        .company-details h2 {
            margin: 0;
            color: var(--brand-color);
            font-size: 1.5rem;
        }
        .waybill-title {
            background-color: var(--brand-color);
            color: white;
            text-align: center;
            padding: 0.75rem;
            font-size: 1.75rem;
            font-weight: 700;
            letter-spacing: 2px;
            margin: 0;
        }
        .waybill-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
            padding: 2rem;
            font-size: 0.9rem;
        }
        .waybill-info > div h4 {
            margin-top: 0;
            margin-bottom: 0.5rem;
            color: #555;
            font-weight: 500;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 0.25rem;
        }
        .waybill-info p { margin: 0.25rem 0; }
        .items-table {
            width: 100%;
            border-collapse: collapse;
        }
        .items-table thead {
            background-color: var(--background-light);
            color: #666;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.5px;
        }
        .items-table th, .items-table td {
            padding: 0.75rem 2rem;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }
        .items-table th.number, .items-table td.number {
            text-align: right;
        }
        .items-table tbody tr:last-child td {
            border-bottom: none;
        }
        .totals {
            padding: 2rem;
            text-align: right;
        }
        .totals-grid {
            display: inline-grid;
            grid-template-columns: auto auto;
            gap: 0.5rem 1.5rem;
            font-size: 1rem;
        }
        .totals-grid span { text-align: left; color: #555; }
        .totals-grid strong { text-align: right; }
        .grand-total {
            margin-top: 1rem;
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--brand-color);
        }
        .footer {
            padding: 2rem;
            border-top: 1px solid var(--border-color);
            font-size: 0.8rem;
            color: #777;
        }
        .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 3rem;
        }
        .signature-box {
            border-top: 1px solid #000;
            padding-top: 0.5rem;
            width: 200px;
            text-align: center;
        }
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: var(--brand-color);
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            font-weight: 500;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: background-color 0.2s;
        }
        .print-button:hover { background-color: #004d00; }
        
        @media print {
            body { background-color: #fff; margin: 0; padding: 0; }
            .container { margin: 0; box-shadow: none; border-radius: 0; max-width: 100%;}
            .print-button { display: none; }
        }
    </style>
</head>
<body>

<button onclick="window.print()" class="print-button">Print Waybill</button>

<div class="container">
    <h1 class="waybill-title">WAYBILL</h1>
    <header class="waybill-header">
        <img src="<?php echo htmlspecialchars($invoice['company_logo']); ?>" alt="Company Logo" class="company-logo">
        <div class="company-details">
            <h2><?php echo htmlspecialchars($invoice['company_name']); ?></h2>
            <p><?php echo nl2br(htmlspecialchars($invoice['company_address'])); ?></p>
            <p><?php echo htmlspecialchars($invoice['company_phone']); ?></p>
            <p><?php echo htmlspecialchars($invoice['company_email']); ?></p>
        </div>
    </header>

    <section class="waybill-info">
        <div>
            <h4>Bill To:</h4>
            <p><strong><?php echo htmlspecialchars($invoice['customer_name']); ?></strong></p>
            <p><?php echo nl2br(htmlspecialchars($invoice['billing_address'])); ?></p>
            <p><?php echo htmlspecialchars($invoice['primary_phone_number']); ?></p>
        </div>
        <div>
            <h4>Waybill Details:</h4>
            <p><strong>Waybill #:</strong> <?php echo htmlspecialchars($invoice['invoice_number']); ?></p>
            <p><strong>Date Issued:</strong> <?php echo formatDate($invoice['invoice_date']); ?></p>
        </div>
    </section>

    <table class="items-table">
        <thead>
            <tr>
                <th>Item Description</th>
                <th class="number">Quantity</th>
            </tr>
        </thead>
        <tbody>
            <?php if (empty($items)): ?>
                <tr><td colspan="4" style="text-align: center; padding: 2rem;">No items on this invoice.</td></tr>
            <?php else: ?>
                <?php foreach ($items as $item): ?>
                <tr>
                    <td><?php echo htmlspecialchars($item['item_name']); ?></td>
                    <td class="number"><?php echo number_format($item['quantity'], 2); ?></td>
                </tr>
                <?php endforeach; ?>
            <?php endif; ?>
        </tbody>
    </table>

    <footer class="footer">
        <?php if (!empty($invoice['notes'])): ?>
            <p><strong>Notes:</strong> <?php echo htmlspecialchars($invoice['notes']); ?></p>
        <?php endif; ?>
        <p>Please confirm receipt of goods in good condition.</p>
        <div class="signature-section">
            <div class="signature-box">Prepared By</div>
            <div class="signature-box">Received By (Name & Signature)</div>
        </div>
    </footer>
</div>

</body>
</html>
