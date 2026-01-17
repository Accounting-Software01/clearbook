<?php
// api/clearbook/drop_foreign_key.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/db_connect.php';

echo "<pre>";

// --- Drop the specific foreign key from bank_reconciliations ---
echo "<b>Attempting to drop foreign key 'bank_reconciliations_ibfk_1' from 'bank_reconciliations'...</b>\n";

$sql = "ALTER TABLE `bank_reconciliations` DROP FOREIGN KEY `bank_reconciliations_ibfk_1`;";

if ($conn->query($sql) === TRUE) {
    echo "Success: Dropped foreign key 'bank_reconciliations_ibfk_1'.\n";
    echo "You can now run 'update_reconciliation_tables.php' to modify the column type.\n";
} else {
    // Error 1091 means can't drop it because it doesn't exist, which is fine.
    if ($conn->errno == 1091) {
        echo "Notice: Foreign key 'bank_reconciliations_ibfk_1' does not exist. It may have been dropped already. No action needed.\n";
    } else {
        echo "Error: Could not drop foreign key. " . $conn->error . "\n";
        echo "(Please check the constraint name and table structure.)\n";
    }
}

$conn->close();

echo "</pre>";
?>