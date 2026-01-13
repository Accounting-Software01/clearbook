<?php
class Expense {
    private $conn;
    private $table_name = "expenses";

    public $id;
    public $date;
    public $reference;
    public $paid_to;
    public $expense_account;
    public $payment_account;
    public $amount;
    public $payment_method;
    public $status;
    public $description;

    public function __construct($db) {
        $this->conn = $db;
    }

    function read() {
        $query = "SELECT * FROM " . $this->table_name . " ORDER BY date DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    function read_single() {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = ? LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);
        $stmt->execute();
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if($row) {
            $this->date = $row['date'];
            $this->reference = $row['reference'];
            $this->paid_to = $row['paid_to'];
            $this->expense_account = $row['expense_account'];
            $this->payment_account = $row['payment_account'];
            $this->amount = $row['amount'];
            $this->payment_method = $row['payment_method'];
            $this->status = $row['status'];
            $this->description = $row['description'];
            return true;
        }
        return false;
    }

    function create() {
        $query = "INSERT INTO " . $this->table_name . " SET date=:date, paid_to=:paid_to, expense_account=:expense_account, payment_account=:payment_account, amount=:amount, payment_method=:payment_method, description=:description, reference=:reference, status='Draft'";

        $stmt = $this->conn->prepare($query);

        $this->reference = $this->generate_reference();

        $stmt->bindParam(":date", $this->date);
        $stmt->bindParam(":paid_to", $this->paid_to);
        $stmt->bindParam(":expense_account", $this->expense_account);
        $stmt->bindParam(":payment_account", $this->payment_account);
        $stmt->bindParam(":amount", $this->amount);
        $stmt->bindParam(":payment_method", $this->payment_method);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":reference", $this->reference);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }

    function update() {
        $query = "UPDATE " . $this->table_name . " SET date = :date, paid_to = :paid_to, expense_account = :expense_account, payment_account = :payment_account, amount = :amount, payment_method = :payment_method, description = :description, status = :status WHERE id = :id";
        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(':id', $this->id);
        $stmt->bindParam(':date', $this->date);
        $stmt->bindParam(':paid_to', $this->paid_to);
        $stmt->bindParam(':expense_account', $this->expense_account);
        $stmt->bindParam(':payment_account', $this->payment_account);
        $stmt->bindParam(':amount', $this->amount);
        $stmt->bindParam(':payment_method', $this->payment_method);
        $stmt->bindParam(':description', $this->description);
        $stmt->bindParam(':status', $this->status);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }

    function delete() {
        $query = "DELETE FROM " . $this->table_name . " WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }

    private function generate_reference() {
        $query = "SELECT id FROM " . $this->table_name . " ORDER BY id DESC LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $last_id = $stmt->fetchColumn();
        $next_id = ($last_id) ? $last_id + 1 : 1;
        return 'EXP-' . date('Ymd') . '-' . str_pad($next_id, 4, '0', STR_PAD_LEFT);
    }
}
