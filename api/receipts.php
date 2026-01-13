<?php
require_once '../config/database.php';
require_once '../models/Receipt.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

$database = new Database();
$db = $database->getConnection();

$receipt = new Receipt($db);

$request_method = $_SERVER["REQUEST_METHOD"];

switch ($request_method) {
    case 'GET':
        if (!empty($_GET['id'])) {
            $receipt->id = $_GET['id'];
            if ($receipt->read_single()) {
                $receipt_item = array(
                    "id" => $receipt->id,
                    "invoice_id" => $receipt->invoice_id,
                    "receipt_type" => $receipt->receipt_type,
                    "date" => $receipt->date,
                    "customer_id" => $receipt->customer_id,
                    "customer_name" => $receipt->customer_name,
                    "amount" => $receipt->amount,
                    "payment_method" => $receipt->payment_method,
                    "cash_bank_account" => $receipt->cash_bank_account,
                    "description" => $receipt->description,
                    "reference" => $receipt->reference,
                    "status" => $receipt->status
                );
                echo json_encode($receipt_item);
            } else {
                http_response_code(404);
                echo json_encode(array("message" => "Receipt not found."));
            }
        } else {
            $stmt = $receipt->read();
            $num = $stmt->rowCount();

            if ($num > 0) {
                $receipts_arr = array();
                $receipts_arr["data"] = array();

                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    extract($row);
                    $receipt_item = array(
                        "id" => $id,
                        "invoice_id" => $invoice_id,
                        "receipt_type" => $receipt_type,
                        "date" => $date,
                        "customer_id" => $customer_id,
                        "customer_name" => $customer_name,
                        "amount" => $amount,
                        "payment_method" => $payment_method,
                        "cash_bank_account" => $cash_bank_account,
                        "description" => $description,
                        "reference" => $reference,
                        "status" => $status
                    );
                    array_push($receipts_arr["data"], $receipt_item);
                }
                echo json_encode($receipts_arr);
            } else {
                echo json_encode(array("message" => "No Receipts found."));
            }
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data)) {
             http_response_code(400);
             echo json_encode(array("message" => "Unable to create receipt. Data is incomplete."));
             return;
        }

        $receipt->invoice_id = $data->invoice_id ?? null;
        $receipt->receipt_type = $data->receipt_type;
        $receipt->date = $data->date;
        $receipt->customer_id = $data->customer_id;
        $receipt->amount = $data->amount;
        $receipt->payment_method = $data->payment_method;
        $receipt->cash_bank_account = $data->cash_bank_account;
        $receipt->description = $data->description ?? null;

        if ($receipt->create()) {
            http_response_code(201);
            echo json_encode(array("message" => "Receipt was created."));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "Unable to create receipt."));
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents("php://input"));
        
        if (empty($data) || empty($data->id)) {
             http_response_code(400);
             echo json_encode(array("message" => "Unable to update receipt. Data is incomplete."));
             return;
        }

        $receipt->id = $data->id;
        $receipt->invoice_id = $data->invoice_id ?? null;
        $receipt->receipt_type = $data->receipt_type;
        $receipt->date = $data->date;
        $receipt->customer_id = $data->customer_id;
        $receipt->amount = $data->amount;
        $receipt->payment_method = $data->payment_method;
        $receipt->cash_bank_account = $data->cash_bank_account;
        $receipt->description = $data->description ?? null;
        $receipt->status = $data->status;

        if ($receipt->update()) {
            echo json_encode(array("message" => "Receipt was updated."));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "Unable to update receipt."));
        }
        break;
        
    case 'DELETE':
        if (!empty($_GET['id'])) {
            $receipt->id = $_GET['id'];
            if ($receipt->delete()) {
                echo json_encode(array("message" => "Receipt was deleted."));
            } else {
                http_response_code(503);
                echo json_encode(array("message" => "Unable to delete receipt."));
            }
        } else {
             http_response_code(400);
             echo json_encode(array("message" => "Unable to delete receipt. ID not provided."));
        }
        break;
}
