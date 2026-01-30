<?php
// A helper function to be included in other scripts.
// It is not meant to be called directly via an API request.

if (!function_exists('get_chart_of_account_id_by_name')) {
    function get_chart_of_account_id_by_name($conn, $company_id, $account_name = null, $account_code = null) {
        if (!$account_name && !$account_code) {
            return null;
        }

        if ($account_name) {
            $sql = "SELECT account_code, account_name FROM chart_of_accounts WHERE company_id = ? AND account_name = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ss", $company_id, $account_name);
        } else {
            $sql = "SELECT account_code, account_name FROM chart_of_accounts WHERE company_id = ? AND account_code = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ss", $company_id, $account_code);
        }

        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $stmt->close();
            return ['id' => $row['id'], 'account_name' => $row['account_name']];
        }
        
        $stmt->close();
        return null;
    }
}
