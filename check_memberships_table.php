<?php
require_once 'config.php';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== Checking memberships table specifically ===\n";
    
    // Check memberships table
    $stmt = $pdo->query('SHOW TABLES LIKE "memberships"');
    $tableExists = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($tableExists) {
        echo "Memberships table EXISTS\n";
        
        // Check if it has the required columns
        $stmt = $pdo->query('SHOW COLUMNS FROM memberships LIKE "expiry_date"');
        $expiryColumn = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$expiryColumn) {
            echo "❌ MISSING: expiry_date column\n";
            
            // Add the missing column
            echo "Adding expiry_date column...\n";
            $alterSql = "ALTER TABLE memberships ADD COLUMN expiry_date DATE NULL AFTER payment_date";
            $pdo->exec($alterSql);
            echo "✅ Added expiry_date column\n";
        } else {
            echo "✅ expiry_date column exists\n";
        }
        
        // Check other required columns
        $requiredColumns = ['membership_number', 'membership_type', 'status', 'payment_status', 'payment_date', 'reference', 'payment_method', 'amount_paid'];
        foreach ($requiredColumns as $column) {
            $stmt = $pdo->query("SHOW COLUMNS FROM memberships LIKE '$column'");
            $colExists = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$colExists) {
                echo "❌ MISSING: $column column\n";
            } else {
                echo "✅ $column column exists\n";
            }
        }
    } else {
        echo "❌ Memberships table MISSING\n";
        
        // Create the table
        $createSql = "
        CREATE TABLE memberships (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            membership_number VARCHAR(50) UNIQUE,
            membership_type ENUM('personal', 'organization') DEFAULT 'personal',
            status ENUM('active', 'expired', 'suspended', 'pending') DEFAULT 'pending',
            payment_status ENUM('paid', 'pending', 'overdue', 'cancelled') DEFAULT 'pending',
            payment_date DATE NULL,
            reference VARCHAR(100) NULL,
            payment_method VARCHAR(50) NULL,
            expiry_date DATE NULL,
            amount_paid DECIMAL(10,2) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        
        $pdo->exec($createSql);
        echo "✅ Created memberships table\n";
    }
    
} catch (PDOException $e) {
    echo 'Error: ' . $e->getMessage() . PHP_EOL;
}
?>
