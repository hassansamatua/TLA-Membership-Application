<?php
// Debug script to test activate-test endpoint issues
require_once 'Database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    echo "=== DEBUG: Activate Test Membership Issues ===\n\n";
    
    // 1. Check if required tables exist
    echo "1. Checking table existence...\n";
    $tables = ['payments', 'membership_payments', 'memberships', 'users'];
    foreach ($tables as $table) {
        $result = $conn->query("SHOW TABLES LIKE '$table'");
        $exists = $result->num_rows > 0;
        echo "   - $table: " . ($exists ? "✅ EXISTS" : "❌ MISSING") . "\n";
    }
    echo "\n";
    
    // 2. Check membership_payments table structure
    echo "2. Checking membership_payments table structure...\n";
    $result = $conn->query("DESCRIBE membership_payments");
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            echo "   - {$row['Field']}: {$row['Type']} {$row['Null']} {$row['Key']}\n";
        }
    } else {
        echo "   ❌ Could not describe membership_payments table\n";
    }
    echo "\n";
    
    // 3. Check for any test payments
    echo "3. Checking for test payments...\n";
    $result = $conn->query("SELECT id, user_id, reference, amount, status FROM payments WHERE reference LIKE 'TEST%' OR payment_method = 'test' ORDER BY created_at DESC LIMIT 5");
    if ($result && $result->num_rows > 0) {
        echo "   Found test payments:\n";
        while ($row = $result->fetch_assoc()) {
            echo "   - ID: {$row['id']}, User: {$row['user_id']}, Ref: {$row['reference']}, Amount: {$row['amount']}, Status: {$row['status']}\n";
        }
    } else {
        echo "   ❌ No test payments found\n";
    }
    echo "\n";
    
    // 4. Test a simple membership_payments insert
    echo "4. Testing membership_payments insert...\n";
    $testReference = 'TEST-' . time();
    $testUserId = 1; // Assuming user 1 exists
    $testAmount = 40000;
    $testYear = date('Y');
    
    try {
        $stmt = $conn->prepare("INSERT INTO membership_payments (user_id, amount, payment_method, payment_reference, payment_date, status, cycle_year, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), 'completed', ?, NOW(), NOW())");
        $stmt->bind_param("idssii", $testUserId, $testAmount, 'test', $testReference, $testYear);
        $result = $stmt->execute();
        
        if ($result) {
            echo "   ✅ Successfully inserted test membership payment\n";
            echo "   - Reference: $testReference\n";
            echo "   - Insert ID: " . $conn->insert_id . "\n";
            
            // Clean up the test record
            $conn->query("DELETE FROM membership_payments WHERE payment_reference = '$testReference'");
            echo "   🧹 Cleaned up test record\n";
        } else {
            echo "   ❌ Failed to insert test membership payment\n";
            echo "   - Error: " . $stmt->error . "\n";
        }
    } catch (Exception $e) {
        echo "   ❌ Exception during insert: " . $e->getMessage() . "\n";
    }
    echo "\n";
    
    // 5. Check if there are any foreign key constraints
    echo "5. Checking foreign key constraints...\n";
    $result = $conn->query("SELECT 
        TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME IN ('membership_payments', 'memberships')
        AND REFERENCED_TABLE_NAME IS NOT NULL");
    
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            echo "   - {$row['TABLE_NAME']}.{$row['COLUMN_NAME']} -> {$row['REFERENCED_TABLE_NAME']}.{$row['REFERENCED_COLUMN_NAME']} ({$row['CONSTRAINT_NAME']})\n";
        }
    } else {
        echo "   ℹ️ No foreign key constraints found\n";
    }
    echo "\n";
    
    echo "=== DEBUG COMPLETE ===\n";
    
} catch (Exception $e) {
    echo "❌ Database connection error: " . $e->getMessage() . "\n";
}
?>
