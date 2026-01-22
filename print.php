<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once 'db_connect.php';

// --- Environment & Configuration ---
$env = "development";
$base_url = 'https://hariindustries.net/api/clearbook/'; 

// --- Input Validation ---
$company_id = filter_input(INPUT_GET, 'company_id', FILTER_SANITIZE_STRING);
$invoice_id = filter_input(INPUT_GET, 'invoice_id', FILTER_VALIDATE_INT);
$user_id = filter_input(INPUT_GET, 'user_id', FILTER_VALIDATE_INT);

if (!$company_id || !$invoice_id || !$user_id) {
    http_response_code(400);
    echo "<h1>Error: Missing Parameters</h1><p>Required: company_id, invoice_id, user_id</p>";
    exit;
}

try {
    // --- Step 1: Fetch all data ---
    
    // CORRECTED: Removed COLLATE clauses to match the working example you provided.
    $main_sql = "
        SELECT 
            si.id, si.public_token, si.invoice_number, si.invoice_date, si.due_date, si.status, 
            si.subtotal, si.tax_amount, si.total_amount, si.notes,
            cust.customer_id, cust.customer_name, cust.billing_address, cust.email_address, cust.primary_phone_number,
            cust.opening_balance_journal_id,
            co.name AS company_name, co.company_logo, co.address AS company_address, co.phone AS company_phone
        FROM sales_invoices si
        JOIN customers cust ON si.customer_id = cust.customer_id
        JOIN companies co ON si.company_id = co.company_id
        WHERE si.id = ? AND si.company_id = ?
        LIMIT 1
    ";
    $stmt = $conn->prepare($main_sql);
    if ($stmt === false) {
        // This will give a much clearer error message if the SQL is still wrong
        throw new Exception('SQL PREPARE FAILED (main_sql): ' . $conn->error);
    }
    $stmt->bind_param("is", $invoice_id, $company_id);
    $stmt->execute();
    $invoice = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$invoice) {
        http_response_code(404);
        echo "<h1>Error: Invoice Not Found (ID: $invoice_id, Company: $company_id)</h1>";
        exit;
    }

    // Invoice Items
    $items_sql = "SELECT item_name, quantity, unit_price, (quantity * unit_price) AS line_total FROM sales_invoice_items WHERE invoice_id = ? AND company_id = ?";
    $items_stmt = $conn->prepare($items_sql);
     if ($items_stmt === false) {
        throw new Exception('SQL PREPARE FAILED (items_sql): ' . $conn->error);
    }
    $items_stmt->bind_param("is", $invoice_id, $company_id);
    $items_stmt->execute();
    $items = $items_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $items_stmt->close();

    // --- Step 2: Customer Balance Calculation ---
    $opening_balance = 0;
    if (!empty($invoice['opening_balance_journal_id'])) {
        $ob_sql = "SELECT SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE -amount END) as balance FROM journal_voucher_lines WHERE journal_voucher_id = ?";
        $ob_stmt = $conn->prepare($ob_sql);
        $ob_stmt->bind_param("i", $invoice['opening_balance_journal_id']);
        $ob_stmt->execute();
        $ob_result = $ob_stmt->get_result()->fetch_assoc();
        $opening_balance = (float)($ob_result['balance'] ?? 0);
        $ob_stmt->close();
    }

    $prev_invoices_sql = "SELECT SUM(total_amount) as total FROM sales_invoices WHERE customer_id = ? AND company_id = ? AND status IN ('ISSUED', 'PARTIAL', 'OVERDUE') AND id < ?";
    $prev_stmt = $conn->prepare($prev_invoices_sql);
    $prev_stmt->bind_param("ssi", $invoice['customer_id'], $company_id, $invoice_id);
    $prev_stmt->execute();
    $prev_result = $prev_stmt->get_result()->fetch_assoc();
    $previous_invoiced_amount = (float)($prev_result['total'] ?? 0);
    $prev_stmt->close();



    $previous_balance = $opening_balance + $previous_invoiced_amount;

    $current_invoice_total = (float)$invoice['total_amount'];
    $total_balance = $previous_balance + $current_invoice_total;

    // --- Step 3: Fetch Footer User Data ---
    $users = ['admin' => 'N/A', 'accountant' => 'N/A'];
    $user_sql = "SELECT full_name, role FROM users WHERE company_id = ? AND role IN ('admin', 'accountant') LIMIT 2";
    $user_stmt = $conn->prepare($user_sql);
    $user_stmt->bind_param("s", $company_id);
    $user_stmt->execute();
    $user_result = $user_stmt->get_result();
    while ($user_row = $user_result->fetch_assoc()) {
        $users[$user_row['role']] = $user_row['full_name'];
    }
    $user_stmt->close();

    $preparer_sql = "SELECT full_name FROM users WHERE id = ? AND company_id = ? LIMIT 1";
    $preparer_stmt = $conn->prepare($preparer_sql);
    $preparer_stmt->bind_param("is", $user_id, $company_id);
    $preparer_stmt->execute();
    $preparer_user = $preparer_stmt->get_result()->fetch_assoc();
    $prepared_by = $preparer_user['full_name'] ?? 'N/A';
    $preparer_stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    echo "<h1>Error 500: Internal Server Error</h1>";
    if ($env === "development") {
        echo "<p>Details: " . htmlspecialchars($e->getMessage()) . "</p>";
    }
    exit;
} finally {
    if (isset($conn)) $conn->close();
}

// --- Helper Functions ---
function format_currency($amount, $currency = 'NGN') {
    $symbol = '₦';
    return $symbol . number_format($amount, 2);
}

function format_date($date) {
    return date("d F, Y", strtotime($date));
}

// --- QR Code ---
$public_url = "https://hariindustries.net/invoice/view/{$invoice['public_token']}";
$qr_code_url = "https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=" . urlencode($public_url);

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice #<?php echo htmlspecialchars($invoice['invoice_number']); ?></title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.5; color: #333; background-color: #f4f4f4; margin: 0; }
        .invoice-box { max-width: 800px; margin: 20px auto; padding: 30px; border: 1px solid #eee; background: #fff; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #006400; }
        .header .company-details { text-align: right; }
        .header .company-details h1 { margin: 0; font-size: 24px; color: #006400; }
        .header .company-logo { max-height: 80px; }
        .invoice-title { text-align: center; font-size: 28px; font-weight: bold; color: #333; margin: 20px 0; }
        .details-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .details-section .invoice-details, .details-section .customer-details { width: 48%; }
        .details-section p { margin: 0 0 5px 0; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .items-table th { background-color: #f2f2f2; font-weight: bold; }
        .items-table .number { text-align: right; }
        .summary-section { display: flex; justify-content: flex-end; }
        .summary-section .summary-table { width: 50%; }
        .summary-table td { padding: 5px 8px; }
        .summary-table .label { font-weight: bold; }
        .summary-table .total { font-size: 1.2em; font-weight: bold; border-top: 2px solid #333; }
        .qr-section { float: left; margin-right: 20px; }
        .footer { border-top: 1px solid #ddd; padding-top: 20px; margin-top: 40px; display: flex; justify-content: space-between; text-align: center; }
        .footer .signature-col { width: 30%; }
        .footer .signature-line { border-bottom: 1px solid #333; margin-top: 40px; }
        .print-button { display: block; width: 150px; margin: 20px auto; padding: 10px; background: #006400; color: #fff; text-align: center; text-decoration: none; border-radius: 5px; }

        @media print {
            body { background-color: #fff; margin: 0; }
            .invoice-box { box-shadow: none; border: none; margin: 0; max-width: 100%; }
            .print-button { display: none; }
        }
    </style>
</head>
<body>

    <a href="javascript:window.print()" class="print-button">Print Invoice</a>

    <div class="invoice-box">
        <div class="header">
            <img src="<?php echo htmlspecialchars($base_url . ltrim($invoice['company_logo'], '/')); ?>" alt="Company Logo" class="company-logo">
            <div class="company-details">
                <h1><?php echo htmlspecialchars($invoice['company_name']); ?></h1>
                <p><?php echo htmlspecialchars($invoice['company_address']); ?></p>
                <p><?php echo htmlspecialchars($invoice['company_phone']); ?></p>
            </div>
        </div>

        <h2 class="invoice-title">SALES INVOICE</h2>

        <div class="details-section">
            <div class="invoice-details">
                <p><strong>Invoice #:</strong> <?php echo htmlspecialchars($invoice['invoice_number']); ?></p>
                <p><strong>Invoice Date:</strong> <?php echo format_date($invoice['invoice_date']); ?></p>
                <p><strong>Due Date:</strong> <?php echo format_date($invoice['due_date']); ?></p>
                <p><strong>Status:</strong> <span style="font-weight:bold; color: <?php echo $invoice['status'] === 'PAID' ? 'green' : 'red'; ?>;"><?php echo htmlspecialchars($invoice['status']); ?></span></p>
            </div>
            <div class="customer-details">
                <strong>Bill To:</strong>
                <p><strong><?php echo htmlspecialchars($invoice['customer_name']); ?></strong></p>
                <p><?php echo htmlspecialchars($invoice['billing_address']); ?></p>
                <p><?php echo htmlspecialchars($invoice['primary_phone_number']); ?></p>
                <p><?php echo htmlspecialchars($invoice['email_address']); ?></p>
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Product / Service</th>
                    <th class="number">Quantity</th>
                    <th class="number">Unit Price</th>
                    <th class="number">Line Total</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($items as $i => $item): ?>
                <tr>
                    <td><?php echo $i + 1; ?></td>
                    <td><?php echo htmlspecialchars($item['item_name']); ?></td>
                    <td class="number"><?php echo number_format($item['quantity'], 2); ?></td>
                    <td class="number"><?php echo format_currency($item['unit_price']); ?></td>
                    <td class="number"><?php echo format_currency($item['line_total']); ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>

        <div class="summary-section">
             <div class="qr-section">
                <img src="<?php echo $qr_code_url; ?>" alt="QR Code">
                <p style="font-size: 10px; text-align: center; max-width: 100px;">Scan for details</p>
            </div>
            <table class="summary-table">
                <tr>
                    <td class="label">Subtotal</td>
                    <td class="number"><?php echo format_currency($invoice['subtotal']); ?></td>
                </tr>
                <tr>
                    <td class="label">Tax (VAT)</td>
                    <td class="number"><?php echo format_currency($invoice['tax_amount']); ?></td>
                </tr>
                <tr class="total">
                    <td class="label">Invoice Total</td>
                    <td class="number"><?php echo format_currency($current_invoice_total); ?></td>
                </tr>
                 <tr><td colspan="2">&nbsp;</td></tr>
                <tr>
                    <td class="label">Previous Balance</td>
                    <td class="number"><?php echo format_currency($previous_balance); ?></td>
                </tr>
                <tr class="total">
                    <td class="label">Total Amount Due</td>
                    <td class="number"><?php echo format_currency($total_balance); ?></td>
                </tr>
            </table>
        </div>

        <div class="footer">
            <div class="signature-col">
                <div class="signature-line"></div>
                <p><strong>Prepared by:</strong><br><?php echo htmlspecialchars($prepared_by); ?></p>
            </div>
            <div class="signature-col">
                <div class="signature-line"></div>
                <p><strong>Verified by:</strong><br><?php echo htmlspecialchars($users['accountant']); ?></p>
            </div>
             <div class="signature-col">
                <div class="signature-line"></div>
                <p><strong>Customer Signature</strong></p>
            </div>
        </div>
         <div style="text-align:center; margin-top:20px; font-size:12px;">
            <p>Thank you for your patronage!</p>
            <p>Notes: <?php echo htmlspecialchars($invoice['notes'] ?? 'N/A'); ?></p>
        </div>
    </div>

</body>
</html>
