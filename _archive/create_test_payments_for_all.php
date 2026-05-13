<?php
// Create test payments for all users
require_once 'Database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    echo "=== Creating Test Payments for All Users ===\n\n";
    
    // Get all users
    echo "1. Getting all users...\n";
    $stmt = $conn->query("SELECT id, name, email FROM users ORDER BY id");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($users)) {
        echo "   ❌ No users found\n";
        exit;
    }
    
    echo "   Found " . count($users) . " users\n";
    
    // Create test payment for each user that doesn't have one
    foreach ($users as $user) {
        echo "\n2. Processing user: {$user['name']} (ID: {$user['id']})\n";
        
        // Check if user already has a test payment
        $stmt = $conn->prepare("SELECT id, reference FROM payments WHERE user_id = ? AND reference LIKE 'TEST-%'");
        $stmt->execute([$user['id']]);
        $existingPayment = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existingPayment) {
            echo "   ✅ Already has test payment: {$existingPayment['reference']}\n";
            continue;
        }
        
        // Create new test payment
        $reference = 'TEST-' . time() . '-' . $user['id'];
        $stmt = $conn->prepare("INSERT INTO payments (user_id, amount, membership_type, payment_method, reference, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', NOW())");
        $result = $stmt->execute([$user['id'], 40000, 'personal', 'test', $reference]);
        
        if ($result) {
            echo "   ✅ Created test payment: {$reference}\n";
        } else {
            echo "   ❌ Failed to create test payment\n";
        }
    }
    
    echo "\n=== Summary ===\n";
    
    // List all test payments
    $stmt = $conn->query("SELECT p.id, p.user_id, p.reference, u.name, u.email FROM payments p JOIN users u ON p.user_id = u.id WHERE p.reference LIKE 'TEST-%' ORDER BY p.user_id");
    $testPayments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "All test payments:\n";
    foreach ($testPayments as $payment) {
        echo "   - User {$payment['user_id']} ({$payment['name']}): {$payment['reference']}\n";
    }
    
    echo "\n=== COMPLETE ===\n";
    echo "You can now test the activate-test endpoint with any of these references.\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
