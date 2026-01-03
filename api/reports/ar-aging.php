<?php
// api/reports/ar-aging.php

// --- BASIC SETUP ---
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// --- INCLUDES ---
include_once dirname(__DIR__) . '/db_connect.php';

try {
    // --- VALIDATION ---
    if (!isset($_GET['company_id'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Company ID is required."]);
        exit();
    }

    $company_id = (string)$_GET['company_id'];
    $report_date = isset($_GET['report_date']) ? new DateTime($_GET['report_date']) : new DateTime();

    /************************************
     * FETCH OUTSTANDING INVOICES
     ************************************/
    $sql = "SELECT 
                c.id as customer_id, 
                c.name as customer_name, 
                si.invoice_number, 
                si.invoice_date, 
                si.due_date, 
                si.total_amount, 
                si.amount_due
            FROM sales_invoices si
            JOIN customers c ON si.customer_id = c.id
            WHERE si.company_id = ? 
            AND si.status NOT IN ('DRAFT', 'PAID', 'CANCELLED')
            AND si.amount_due > 0";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $company_id);
    $stmt->execute();
    $invoices = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    /************************************
     * PROCESS AGING
     ************************************/
    $report = [];
    $totals = [
        'Current' => 0, '1-30' => 0, '31-60' => 0, '61-90' => 0, '91+' => 0, 'Total' => 0
    ];

    foreach ($invoices as $invoice) {
        $customer_id = $invoice['customer_id'];
        $customer_name = $invoice['customer_name'];
        $amount_due = (float)$invoice['amount_due'];

        if (!isset($report[$customer_id])) {
            $report[$customer_id] = [
                'customer_name' => $customer_name,
                'buckets' => [
                    'Current' => 0, '1-30' => 0, '31-60' => 0, '61-90' => 0, '91+' => 0, 'Total' => 0
                ],
                'invoices' => []
            ];
        }

        $due_date = new DateTime($invoice['due_date']);
        $aging_bucket = '';

        if ($report_date <= $due_date) {
            $aging_bucket = 'Current';
        } else {
            $days_overdue = $report_date->diff($due_date)->days;
            if ($days_overdue <= 30) {
                $aging_bucket = '1-30';
            } else if ($days_overdue <= 60) {
                $aging_bucket = '31-60';
            } else if ($days_overdue <= 90) {
                $aging_bucket = '61-90';
            } else {
                $aging_bucket = '91+';
            }
        }

        // Add to customer bucket
        $report[$customer_id]['buckets'][$aging_bucket] += $amount_due;
        $report[$customer_id]['buckets']['Total'] += $amount_due;

        // Add to overall totals
        $totals[$aging_bucket] += $amount_due;
        $totals['Total'] += $amount_due;

        // Add invoice detail
        $invoice['aging_bucket'] = $aging_bucket;
        $report[$customer_id]['invoices'][] = $invoice;
    }

    /************************************
     * RESPOND
     ************************************/
    http_response_code(200);
    echo json_encode([
        "success" => true,
        "report_date" => $report_date->format('Y-m-d'),
        "company_id" => $company_id,
        "aging_summary_by_customer" => array_values($report), // Re-index for clean JSON array
        "overall_totals" => $totals
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "An internal server error occurred.", "details" => $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>