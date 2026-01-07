<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Use the correct DB connection file path and query
require_once 'db_connect.php'; 
require_once 'number-to-words-converter.php';

function formatNaira($amount) {
    if (!is_numeric($amount)) {
        return '₦0.00';
    }
    $fmt = new NumberFormatter('en_NG', NumberFormatter::CURRENCY);
    return $fmt->formatCurrency($amount, 'NGN');
}

// --- Step 1: Validate input ---
$invoice_token = filter_input(INPUT_GET, 'token', FILTER_SANITIZE_STRING);

if (!$invoice_token || $invoice_token === 'undefined') {
    http_response_code(400);
    die('<h1>Invalid Invoice Token</h1>');
}

// --- Step 2: Fetch Data ---
try {
    // --- Main Invoice, Customer, and Company Data ---
    $sql = "
        SELECT 
            si.id, si.invoice_number, si.invoice_date, si.due_date, si.status, si.total_amount, 
            cust.customer_name AS customer_name,
            co.name AS company_name,
            co.company_logo AS company_logo,
            co.address AS company_address,
            co.phone AS company_phone
        FROM sales_invoices si
        JOIN customers cust ON si.customer_id = cust.customer_id
        JOIN companies co ON si.company_id = co.company_id
        WHERE si.public_token = ?
        LIMIT 1
    ";
    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception("Prepare failed (main query): " . $conn->error);
    $stmt->bind_param("s", $invoice_token);
    $stmt->execute();
    $invoice = $stmt->get_result()->fetch_assoc();

    if (!$invoice) {
        http_response_code(404);
        die('<h1>Invoice not found</h1>');
    }
    
    $BASE_URL = 'https://hariindustries.net/api/clearbook/';
    if (!empty($invoice['company_logo'])) {
        $invoice['company_logo'] = $BASE_URL . ltrim($invoice['company_logo'], '/');
    }

    // --- Invoice Items ---
    $items_sql = "SELECT id, item_name, quantity, unit_price, (quantity * unit_price) as total_amount FROM sales_invoice_items WHERE invoice_id = ?";
    $items_stmt = $conn->prepare($items_sql);
    if (!$items_stmt) throw new Exception("Prepare failed (items query): " . $conn->error);
    $items_stmt->bind_param("i", $invoice['id']);
    $items_stmt->execute();
    $items_result = $items_stmt->get_result();
    $items = [];
    while ($row = $items_result->fetch_assoc()) {
        $items[] = $row;
    }
    $invoice['items'] = $items;

} catch (Exception $e) {
    http_response_code(500);
    die('<h1>Error</h1><p>' . $e->getMessage() . '</p>');
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($items_stmt)) $items_stmt->close();
    if (isset($conn)) $conn->close();
}

$status_color = 'bg-yellow-200 text-yellow-800';
if ($invoice['status'] === 'PAID') {
     $status_color = 'bg-green-200 text-green-800';
} elseif (in_array($invoice['status'], ['CANCELLED', 'OVERDUE'])) {
     $status_color = 'bg-red-200 text-red-800';
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - <?php echo htmlspecialchars($invoice['invoice_number']); ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 font-sans">
    <div class="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto my-10">
        <header class="border-b-2 border-gray-800 pb-4 mb-8">
            <div class="flex justify-between items-start">
                <div class="flex items-center">
                    <?php if ($invoice['company_logo']): ?>
                        <img src="<?php echo htmlspecialchars($invoice['company_logo']); ?>" alt="Company Logo" class="w-20 h-20 mr-4 object-contain">
                    <?php endif; ?>
                    <div>
                        <h1 class="text-3xl font-bold text-gray-800"><?php echo htmlspecialchars($invoice['company_name']); ?></h1>
                        <p class="text-sm text-gray-600"><?php echo htmlspecialchars($invoice['company_address']); ?></p>
                        <p class="text-sm text-gray-600"><?php echo htmlspecialchars($invoice['company_phone']); ?></p>
                    </div>
                </div>
                <div class="text-right flex-shrink-0">
                    <h2 class="text-4xl font-bold uppercase text-gray-800">Invoice</h2>
                </div>
            </div>
        </header>

        <section class="grid grid-cols-2 gap-x-12 mb-8">
            <div class="border border-gray-200 rounded p-4">
                <h3 class="font-semibold text-gray-500 mb-2">BILLED TO:</h3>
                <p class="font-bold text-lg text-gray-800"><?php echo htmlspecialchars($invoice['customer_name']); ?></p>
            </div>
            <div class="border border-gray-200 rounded p-4 grid grid-cols-2 gap-4 text-sm">
                <div><p class='font-semibold text-gray-500'>Invoice No.:</p><p class="text-gray-800"><?php echo htmlspecialchars($invoice['invoice_number']); ?></p></div>
                <div><p class='font-semibold text-gray-500'>Invoice Date:</p><p class="text-gray-800"><?php echo date("F j, Y", strtotime($invoice['invoice_date'])); ?></p></div>
                <div><p class='font-semibold text-gray-500'>Due Date:</p><p class="text-gray-800"><?php echo date("F j, Y", strtotime($invoice['due_date'])); ?></p></div>
                <div><p class='font-semibold text-gray-500'>Status:</p><span class="px-2.5 py-1 text-xs font-bold rounded-full <?php echo $status_color; ?>"><?php echo htmlspecialchars($invoice['status']); ?></span></div>
            </div>
        </section>

        <section class="mb-8">
            <table class="w-full">
                <thead class="bg-gray-800">
                    <tr>
                        <th class="text-white text-left font-semibold p-3">S/No</th>
                        <th class="text-white text-left font-semibold p-3">Item Description</th>
                        <th class="text-white text-right font-semibold p-3">Quantity</th>
                        <th class="text-white text-right font-semibold p-3">Rate</th>
                        <th class="text-white text-right font-semibold p-3">Amount</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    <?php foreach ($invoice['items'] as $index => $item): ?>
                        <tr class="even:bg-gray-50">
                            <td class="p-3 text-gray-600"><?php echo $index + 1; ?></td>
                            <td class="font-medium p-3 text-gray-800"><?php echo htmlspecialchars($item['item_name']); ?></td>
                            <td class="text-right p-3 text-gray-600"><?php echo htmlspecialchars($item['quantity']); ?></td>
                            <td class="text-right p-3 text-gray-600"><?php echo formatNaira($item['unit_price']); ?></td>
                            <td class="text-right font-semibold p-3 text-gray-800"><?php echo formatNaira($item['total_amount']); ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </section>
        
        <section class="grid grid-cols-5 gap-8 mt-12">
             <div class='col-span-3 space-y-4 pr-8'>
                 <div>
                    <p class='font-semibold text-gray-500'>AMOUNT IN WORDS:</p>
                    <p class="capitalize text-md font-semibold text-gray-800"><?php echo numberToWords(floatval($invoice['total_amount'])); ?> Naira Only</p>
                </div>
             </div>
             <div class='col-span-2 border-l-4 border-gray-800 pl-6 flex flex-col justify-center'>
                <p class='text-lg font-semibold text-gray-500'>INVOICE TOTAL</p>
                <p class="text-4xl font-bold text-gray-900"><?php echo formatNaira($invoice['total_amount']); ?></p>
             </div>
        </section>

        <footer class="border-t-2 border-gray-200 pt-6 mt-12 text-center text-sm text-gray-500">
            <p>This is a legally binding invoice from <?php echo htmlspecialchars($invoice['company_name']); ?>.</p>
            <p class="mt-2">Thank you for your business!</p>
        </footer>
    </div>
</body>
</html>