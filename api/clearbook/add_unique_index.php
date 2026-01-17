<?php
// api/clearbook/update_reconciliation_tables.php (was add_unique_index.php)
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/db_connect.php';

echo "<pre>";

// --- Step 1: Alter bank_reconciliations table ---
echo "<b>Altering 'bank_reconciliations' table...</b>\n";

// Note: This may fail if a foreign key constraint exists on the company_id column.
// If it fails, you may need to manually drop the foreign key, run this script, and then add it back.
$sql1 = "ALTER TABLE `bank_reconciliations` MODIFY COLUMN `company_id` VARCHAR(20) NOT NULL;";

if ($conn->query($sql1) === TRUE) {
    echo "Success: Modified 'company_id' in 'bank_reconciliations' to VARCHAR(20).\n";
} else {
    echo "Error: Could not modify 'bank_reconciliations'. " . $conn->error . "\n";
    echo "(This is often caused by an existing foreign key. You may need to drop it first.)\n";
}

echo "\n";

// --- Step 2: Alter bank_reconciliation_lines table ---
echo "<b>Altering 'bank_reconciliation_lines' table...</b>\n";

// Add the company_id column. The script checks if it already exists.
$sql2 = "ALTER TABLE `bank_reconciliation_lines` ADD COLUMN `company_id` VARCHAR(20) NOT NULL AFTER `reconciliation_id`;";

if ($conn->query($sql2) === TRUE) {
    echo "Success: Added 'company_id' column to 'bank_reconciliation_lines'.\n";
} else {
    if ($conn->errno == 1060) { // Error for 'Duplicate column name'
         echo "Notice: Column 'company_id' already exists in 'bank_reconciliation_lines'. No action needed.\n";
    } else {
        echo "Error: Could not modify 'bank_reconciliation_lines': " . $conn->error . "\n";
    }
}

echo "\n----------------\n";
echo "Script finished. Please manually verify foreign keys are set up correctly.\n";

$conn->close();

echo "</pre>";
?>