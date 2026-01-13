<?php
class Receipt {
    private $conn;
    private $table_name = "receipts";

    public $id;
    public $invoice_id;
    public $receipt_type;
    public $date;
    public $customer_id;
    public $amount;
    public $payment_method;
    public $cash_bank_account;
    public $description;
    public $reference;
    public $status;

    public function __construct($db) {
        $this->conn = $db;
    }

    function read() {
        // Updated to join with customers table to get customer name
        $query = "SELECT r.*, c.name as customer_name FROM " . $this->table_name . " r LEFT JOIN customers c ON r.customer_id = c.id ORDER BY r.date DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    function read_single() {
        $query = "SELECT r.*, c.name as customer_name FROM " . $this->table_name . " r LEFT JOIN customers c ON r.customer_id = c.id WHERE r.id = ? LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);
        $stmt->execute();
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if($row) {
            $this->invoice_id = $row['invoice_id'];
            $this->receipt_type = $row['receipt_type'];
            $this->date = $row['date'];
            $this->customer_id = $row['customer_id'];
            $this->customer_name = $row['customer_name']; // Add customer name
            $this->amount = $row['amount'];
            $this->payment_method = $row['payment_method'];
            $this->cash_bank_account = $row['cash_bank_account'];
            $this->description = $row['description'];
            $this->reference = $row['reference'];
            $this->status = $row['status'];
            return true;
        }
        return false;
    }

    function create() {
        $query = "INSERT INTO " . $this->table_name . " SET invoice_id=:invoice_id, receipt_type=:receipt_type, date=:date, customer_id=:customer_id, amount=:amount, payment_method=:payment_method, cash_bank_account=:cash_bank_account, description=:description, reference=:reference, status='Draft'";

        $stmt = $this->conn->prepare($query);
        
        // Generate reference number
        $this->reference = $this->generate_reference();

        $stmt->bindParam(":invoice_id", $this->invoice_id);
        $stmt->bindParam(":receipt_type", $this->receipt_type);
        $stmt->bindParam(":date", $this->date);
        $stmt->bindParam(":customer_id", $this->customer_id);
        $stmt->bindParam(":amount", $this->amount);
        $stmt->bindParam(":payment_method", $this->payment_method);
        $stmt->bindParam(":cash_bank_account", $this->cash_bank_account);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":reference", $this->reference);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }

    function update() {
        $query = "UPDATE " . $this->table_name . " SET invoice_id=:invoice_id, receipt_type=:receipt_type, date=:date, customer_id=:customer_id, amount=:amount, payment_method=:payment_method, cash_bank_account=:cash_bank_account, description=:description, status=:status WHERE id = :id";
        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(':id', $this->id);
        $stmt->bindParam(":invoice_id", $this->invoice_id);
        $stmt->bindParam(":receipt_type", $this->receipt_type);
        $stmt->bindParam(":date", $this->date);
        $stmt->bindParam(":customer_id", $this->customer_id);
        $stmt->bindParam(":amount", $this->amount);
        $stmt->bindParam(":payment_method", $this->payment_method);
        $stmt->bindParam(":cash_bank_account", $this->cash_bank_account);
        $stmt->bindParam(":description", $this->description);
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
        return 'RCT-' . date('Ymd') . '-' . str_pad($next_id, 4, '0', STR_PAD_LEFT);
    }
}
