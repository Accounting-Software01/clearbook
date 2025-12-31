<?php
// ----- DATABASE CONNECTION -----
$host = "localhost";
$dbname = "hariindu_clearbook";
$username = "hariindu_clearbook";
$password = "hariindu_clearbook";

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    die("Database Connection Failed: " . $e->getMessage());
}

try {
    // ---- CREATE role_permissions TABLE ----
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `role_permissions` (
          `id` INT AUTO_INCREMENT PRIMARY KEY,
          `role` VARCHAR(255) NOT NULL,
          `permission` VARCHAR(255) NOT NULL,
          `company_type` VARCHAR(255) NOT NULL,
          UNIQUE KEY `role_permission_company_type` (`role`, `permission`, `company_type`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    echo "Table 'role_permissions' created successfully or already exists.<br>";

    // ---- DEFINE ALL AVAILABLE MODULES ----
    $modules = [
        ['permission' => 'view_dashboard', 'is_manufacturing_only' => false],
        ['permission' => 'manage_users', 'is_manufacturing_only' => false],
        ['permission' => 'view_accounting', 'is_manufacturing_only' => false],
        ['permission' => 'manage_settings', 'is_manufacturing_only' => false],
        ['permission' => 'view_inventory', 'is_manufacturing_only' => false],
        ['permission' => 'view_sales', 'is_manufacturing_only' => false],
        ['permission' => 'view_procurement', 'is_manufacturing_only' => false],
        ['permission' => 'view_production', 'is_manufacturing_only' => true],
    ];

    // ---- DEFINE PERMISSIONS BY ROLE ----
    $role_definitions = [
        'manufacturing' => [
            'admin' => array_column($modules, 'permission'), // Admin gets all modules
            'accountant' => ['view_dashboard', 'view_accounting'],
            'production_manager' => ['view_dashboard', 'view_production'],
            'store_manager' => ['view_dashboard', 'view_inventory'],
            'procurement_manager' => ['view_dashboard', 'view_procurement'],
            'sales_manager' => ['view_dashboard', 'view_sales'],
            'staff' => ['view_dashboard'],
        ],
        'services' => [
            // Admin gets all non-manufacturing modules
            'admin' => array_column(array_filter($modules, function($m) { return !$m['is_manufacturing_only']; }), 'permission'),
            'accountant' => ['view_dashboard', 'view_accounting'],
            'staff' => ['view_dashboard'],
        ],
    ];

    // ---- FLATTEN PERMISSIONS FOR INSERTION ----
    $permissions = [];
    foreach ($role_definitions as $company_type => $roles) {
        foreach ($roles as $role => $perms) {
            foreach ($perms as $perm) {
                $permissions[] = [$role, $perm, $company_type];
            }
        }
    }

    // ---- INSERT PERMISSIONS ----
    $stmt = $pdo->prepare("
        INSERT IGNORE INTO `role_permissions` (role, permission, company_type) VALUES (?, ?, ?)
    ");

    $count = 0;
    foreach ($permissions as $permission) {
        $stmt->execute($permission);
        $count += $stmt->rowCount();
    }

    echo "Inserted " . $count . " new permissions.<br>";

} catch(PDOException $e) {
    die("Error setting up permissions: " . $e->getMessage());
}
?>
