<?php
require_once '../config/database.php';
require_once '../models/Expense.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

$database = new Database();
$db = $database->getConnection();

$expense = new Expense($db);

$request_method = $_SERVER["REQUEST_METHOD"];

switch ($request_method) {
    case 'GET':
        if (!empty($_GET['id'])) {
            $expense->id = $_GET['id'];
            $expense_data = $expense->read_single();
            if ($expense_data) {
                echo json_encode($expense_data);
            } else {
                http_response_code(404);
                echo json_encode(array("message" => "Expense not found."));
            }
        } else {
            $stmt = $expense->read();
            $num = $stmt->rowCount();

            if ($num > 0) {
                $expenses_arr = array();
                $expenses_arr["data"] = array();

                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    extract($row);
                    $expense_item = array(
                        "id" => $id,
                        "date" => $date,
                        "reference" => $reference,
                        "paid_to" => $paid_to,
                        "expense_account" => $expense_account,
                        "payment_account" => $payment_account,
                        "amount" => $amount,
                        "payment_method" => $payment_method,
                        "status" => $status,
                        "description" => $description
                    );
                    array_push($expenses_arr["data"], $expense_item);
                }
                echo json_encode($expenses_arr);
            } else {
                echo json_encode(array("message" => "No Expenses found."));
            }
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data)) {
             http_response_code(400);
             echo json_encode(array("message" => "Unable to create expense. Data is incomplete."));
             return;
        }

        $expense->date = $data->date;
        $expense->paid_to = $data->paid_to;
        $expense->expense_account = $data->expense_account;
        $expense->payment_account = $data->payment_account;
        $expense->amount = $data->amount;
        $expense->payment_method = $data->payment_method;
        $expense->description = $data->description;

        if ($expense->create()) {
            http_response_code(201);
            echo json_encode(array("message" => "Expense was created."));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "Unable to create expense."));
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents("php://input"));
        
        if (empty($data) || empty($data->id)) {
             http_response_code(400);
             echo json_encode(array("message" => "Unable to update expense. Data is incomplete."));
             return;
        }

        $expense->id = $data->id;
        $expense->date = $data->date;
        $expense->paid_to = $data->paid_to;
        $expense->expense_account = $data->expense_account;
        $expense->payment_account = $data->payment_account;
        $expense->amount = $data->amount;
        $expense->payment_method = $data->payment_method;
        $expense->description = $data->description;
        $expense->status = $data->status;

        if ($expense->update()) {
            echo json_encode(array("message" => "Expense was updated."));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "Unable to update expense."));
        }
        break;
        
    case 'DELETE':
        if (!empty($_GET['id'])) {
            $expense->id = $_GET['id'];
            if ($expense->delete()) {
                echo json_encode(array("message" => "Expense was deleted."));
            } else {
                http_response_code(503);
                echo json_encode(array("message" => "Unable to delete expense."));
            }
        } else {
             http_response_code(400);
             echo json_encode(array("message" => "Unable to delete expense. ID not provided."));
        }
        break;
}
