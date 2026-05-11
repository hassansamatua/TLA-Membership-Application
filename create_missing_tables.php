<?php
// Create missing tables for membership system
require_once 'Database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    echo "=== Creating Missing Membership Tables ===\n\n";
    
    // 1. Create membership_payments table
    echo "1. Creating membership_payments table...\n";
    $sql = "CREATE TABLE IF NOT EXISTS membership_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_reference VARCHAR(100) NOT NULL,
        payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
        cycle_year INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_user_id (user_id),
        INDEX idx_cycle_year (cycle_year),
        INDEX idx_status (status),
        INDEX idx_payment_date (payment_date),
        INDEX idx_payment_reference (payment_reference),
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )";
    
    try {
        $conn->exec($sql);
        echo "   ✅ membership_payments table created successfully\n";
    } catch (PDOException $e) {
        echo "   ❌ Error creating membership_payments: " . $e->getMessage() . "\n";
    }
    
    // 2. Create memberships table
    echo "\n2. Creating memberships table...\n";
    $sql = "CREATE TABLE IF NOT EXISTS memberships (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        membership_number VARCHAR(50) NOT NULL,
        membership_type ENUM('personal', 'organization') NOT NULL DEFAULT 'personal',
        status ENUM('active', 'expired', 'suspended', 'pending') NOT NULL DEFAULT 'pending',
        payment_status ENUM('paid', 'pending', 'overdue', 'cancelled') NOT NULL DEFAULT 'pending',
        payment_date DATETIME NULL,
        reference VARCHAR(100) NULL,
        payment_method VARCHAR(50) NULL,
        expiry_date DATE NOT NULL,
        amount_paid DECIMAL(10,2) DEFAULT 0.00,
        cycle_year INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_user_id (user_id),
        INDEX idx_membership_number (membership_number),
        INDEX idx_status (status),
        INDEX idx_payment_status (payment_status),
        INDEX idx_expiry_date (expiry_date),
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )";
    
    try {
        $conn->exec($sql);
        echo "   ✅ memberships table created successfully\n";
    } catch (PDOException $e) {
        echo "   ❌ Error creating memberships: " . $e->getMessage() . "\n";
    }
    
    // 3. Verify tables exist
    echo "\n3. Verifying tables exist...\n";
    $tables = ['payments', 'membership_payments', 'memberships', 'users'];
    foreach ($tables as $table) {
        $stmt = $conn->query("SHOW TABLES LIKE '$table'");
        $exists = $stmt->rowCount() > 0;
        echo "   - $table: " . ($exists ? "✅ EXISTS" : "❌ MISSING") . "\n";
    }
    
    // 4. Create a test payment if needed
    echo "\n4. Creating test payment record...\n";
    $testReference = 'TEST-' . time();
    $testUserId = 1;
    
    // First check if user 1 exists
    $stmt = $conn->query("SELECT id FROM users WHERE id = 1");
    if ($stmt->rowCount() > 0) {
        $stmt = $conn->query("SELECT id FROM payments WHERE reference = '$testReference'");
        if ($stmt->rowCount() == 0) {
            $sql = "INSERT INTO payments (user_id, amount, payment_method, reference, status, created_at) VALUES (?, ?, ?, ?, 'pending', NOW())";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$testUserId, 40000, 'test', $testReference]);
            echo "   ✅ Created test payment with reference: $testReference\n";
        } else {
            echo "   ℹ️ Test payment already exists\n";
        }
    } else {
        echo "   ⚠️ User ID 1 not found, cannot create test payment\n";
    }
    
    echo "\n=== TABLE CREATION COMPLETE ===\n";
    echo "You can now test the activate-test endpoint with reference: $testReference\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
