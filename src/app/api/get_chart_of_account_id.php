<?php
// A helper function to be included in other scripts.
// It is not meant to be called directly via an API request.

if (!function_exists('get_account_details')) {
    /**
     * Fetches account details from the database by various criteria.
     *
     * @param mysqli $conn The database connection.
     * @param string $company_id The company ID.
     * @param string|null $account_name The name of the account to find.
     * @param string|null $account_code The code of the account to find.
     * @param string|null $system_role The system role assigned to the account.
     * @return array|null An associative array with 'id', 'account_code', and 'account_name' or null if not found.
     */
    function get_account_details($conn, $company_id, $account_name = null, $account_code = null, $system_role = null) {
        if (!$account_name && !$account_code && !$system_role) {
            return null; // No criteria provided
        }

        // Select all the useful identifiers for the account.
        $sql = "SELECT id, account_code, account_name FROM chart_of_accounts WHERE company_id = ?";

        // Add the specific search criteria.
        if ($system_role) {
            $sql .= " AND system_role = ? LIMIT 1";
        } elseif ($account_name) {
            $sql .= " AND account_name = ? LIMIT 1";
        } else { // $account_code
            $sql .= " AND account_code = ? LIMIT 1";
        }

        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            error_log("Prepare failed in get_account_details: " . $conn->error);
            return null;
        }

        // Bind parameters based on the criteria used.
        if ($system_role) {
            $stmt->bind_param("ss", $company_id, $system_role);
        } elseif ($account_name) {
            $stmt->bind_param("ss", $company_id, $account_name);
        } else {
            $stmt->bind_param("ss", $company_id, $account_code);
        }

        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $stmt->close();
            // Return an array with all the account's key info.
            return [
                'id' => $row['id'], 
                'account_code' => $row['account_code'], 
                'account_name' => $row['account_name']
            ];
        }
        
        $stmt->close();
        return null; // Return null if no account was found.
    }
}
