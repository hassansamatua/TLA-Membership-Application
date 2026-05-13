<?php
// Create test payment for existing user
require_once 'Database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    echo "=== Creating Test Payment ===\n\n";
    
    // 1. Find existing users
    echo "1. Finding existing users...\n";
    $stmt = $conn->query("SELECT id, name, email FROM users ORDER BY id LIMIT 5");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($users)) {
        echo "   ❌ No users found in database\n";
        exit;
    }
    
    foreach ($users as $user) {
        echo "   - User ID: {$user['id']}, Name: {$user['name']}, Email: {$user['email']}\n";
    }
    
    // Use the first user for testing
    $testUserId = $users[0]['id'];
    $testReference = 'TEST-' . time() . '-' . rand(1000, 9999);
    
    echo "\n2. Creating test payment for User ID: $testUserId\n";
    
    // Check if test payment already exists
    $stmt = $conn->prepare("SELECT id FROM payments WHERE reference = ?");
    $stmt->execute([$testReference]);
    if ($stmt->rowCount() > 0) {
        echo "   ℹ️ Test payment already exists\n";
    } else {
        // Create test payment
        $sql = "INSERT INTO payments (user_id, amount, membership_type, payment_method, reference, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', NOW())";
        $stmt = $conn->prepare($sql);
        $result = $stmt->execute([$testUserId, 40000, 'personal', 'test', $testReference]);
        
        if ($result) {
            echo "   ✅ Created test payment\n";
            echo "   - Reference: $testReference\n";
            echo "   - Amount: 40,000 TZS\n";
            echo "   - Status: pending\n";
        } else {
            echo "   ❌ Failed to create test payment\n";
        }
    }
    
    echo "\n=== TEST PAYMENT READY ===\n";
    echo "Use this reference to test the activate-test endpoint:\n";
    echo "REFERENCE: $testReference\n";
    echo "USER ID: $testUserId\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
