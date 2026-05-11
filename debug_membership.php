<?php
// Database connection
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'next_auth';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$database", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== MEMBERSHIP DEBUG REPORT ===\n\n";
    
    // Check users table
    echo "1. USERS TABLE:\n";
    $stmt = $pdo->query("SELECT id, name, email FROM users LIMIT 5");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($users as $user) {
        echo "ID: {$user['id']}, Name: {$user['name']}, Email: {$user['email']}\n\n";
    }
    
    // Check payments table
    echo "2. RECENT PAYMENTS:\n";
    $stmt = $pdo->query("SELECT * FROM payments ORDER BY created_at DESC LIMIT 10");
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($payments as $payment) {
        echo "Reference: {$payment['reference']}, User ID: {$payment['user_id']}, Status: {$payment['status']}, Amount: {$payment['amount']}, Type: {$payment['membership_type']}\n";
        echo "Created: {$payment['created_at']}, Paid: {$payment['paid_at']}\n\n";
    }
    
    // Check memberships table
    echo "3. MEMBERSHIPS TABLE:\n";
    $stmt = $pdo->query("SELECT * FROM memberships ORDER BY created_at DESC LIMIT 10");
    $memberships = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($memberships as $membership) {
        echo "User ID: {$membership['user_id']}, Number: {$membership['membership_number']}, Type: {$membership['membership_type']}\n";
        echo "Status: {$membership['status']}, Payment Status: {$membership['payment_status']}, Amount: {$membership['amount_paid']}\n";
        echo "Join Date: {$membership['join_date']}, Expiry: {$membership['expiry_date']}, Payment Date: {$membership['payment_date']}\n\n";
    }
    
    // Check for users with payments but no membership
    echo "4. USERS WITH PAYMENTS BUT NO MEMBERSHIP:\n";
    $stmt = $pdo->query("
        SELECT p.*, u.name, u.email 
        FROM payments p 
        LEFT JOIN memberships m ON p.user_id = m.user_id 
        JOIN users u ON p.user_id = u.id 
        WHERE m.user_id IS NULL AND p.status = 'completed'
        LIMIT 5
    ");
    $problemUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($problemUsers as $user) {
        echo "User: {$user['name']} ({$user['email']})\n";
        echo "Payment Reference: {$user['reference']}, Amount: {$user['amount']}, Status: {$user['status']}\n";
        echo "Created: {$user['created_at']}, Paid: {$user['paid_at']}\n\n";
    }
    
    // Check for users with completed payments but inactive membership
    echo "5. USERS WITH COMPLETED PAYMENTS BUT INACTIVE MEMBERSHIP:\n";
    $stmt = $pdo->query("
        SELECT p.*, m.*, u.name, u.email 
        FROM payments p 
        JOIN memberships m ON p.user_id = m.user_id 
        JOIN users u ON p.user_id = u.id 
        WHERE p.status = 'completed' AND (m.status != 'active' OR m.payment_status != 'paid')
        LIMIT 5
    ");
    $inactiveUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($inactiveUsers as $user) {
        echo "User: {$user['name']} ({$user['email']})\n";
        echo "Payment: {$user['reference']}, Amount: {$user['amount']}, Status: {$user['status']}\n";
        echo "Membership Status: {$user['status']}, Payment Status: {$user['payment_status']}\n";
        echo "Expiry: {$user['expiry_date']}, Payment Date: {$user['payment_date']}\n\n";
    }
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
