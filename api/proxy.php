<?php
// api/proxy.php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// 1. Get the requested endpoint from the query string
if (!isset($_GET['endpoint'])) {
    http_response_code(400);
    echo json_encode(["message" => "Endpoint parameter is required.", "status" => "error"]);
    exit();
}

$endpoint = $_GET['endpoint'];
$base_url = "https://hariindustries.net/api/clearbook/";

// 2. Build the full external URL based on the endpoint
$query_params = $_GET;
unset($query_params['endpoint']); // Remove our internal parameter

switch ($endpoint) {
    case 'supplier':
        // CORRECTED: Using suppliers.php to get the full list of suppliers.
        // The script get-supplier-details.php is for a single supplier and requires an 'id'.
        $external_api_url = $base_url . "suppliers.php?" . http_build_query($query_params);
        break;
    case 'supplier-details':
        $external_api_url = $base_url . "supplier-details-payment.php?" . http_build_query($query_params);
        break;
    case 'supplier-invoices':
        $external_api_url = $base_url . "get-supplier-invoices.php?" . http_build_query($query_params);
        break;
    default:
        http_response_code(400);
        echo json_encode(["message" => "Unknown endpoint: " . $endpoint, "status" => "error"]);
        exit();
}

// 3. Fetch data from the constructed URL
$response_body = @file_get_contents($external_api_url);

if ($response_body === false) {
    http_response_code(502); // Bad Gateway
    echo json_encode(["message" => "Failed to connect to the external API at: " . $endpoint . " URL: " . $external_api_url, "status" => "error"]);
    exit();
}

// 4. Validate and return the response
json_decode($response_body);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(500);
    echo json_encode(["message" => "Received an invalid JSON response from the external API: " . $endpoint, "status" => "error"]);
    exit();
}

echo $response_body;

?>