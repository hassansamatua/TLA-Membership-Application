<?php
// Database connection
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'next_auth';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$database", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== RECENT PAYMENTS (Last 10) ===\n\n";
    
    // Get recent payments
    $stmt = $pdo->query("
        SELECT p.*, u.name, u.email 
        FROM payments p 
        JOIN users u ON p.user_id = u.id 
        ORDER BY p.created_at DESC 
        LIMIT 10
    ");
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($payments)) {
        echo "No payments found.\n";
        exit;
    }
    
    foreach ($payments as $payment) {
        echo "Reference: {$payment['reference']}\n";
        echo "User: {$payment['name']} ({$payment['email']})\n";
        echo "Amount: {$payment['amount']} TZS\n";
        echo "Status: {$payment['status']}\n";
        echo "Created: {$payment['created_at']}\n";
        echo "Paid: {$payment['paid_at']}\n";
        echo "Method: {$payment['payment_method']}\n";
        echo "Transaction ID: {$payment['transaction_id']}\n";
        echo "---\n";
    }
    
    echo "\n=== LOOKING FOR TEST PAYMENTS ===\n";
    
    // Look for any TEST payments
    $stmt = $pdo->query("
        SELECT p.*, u.name, u.email 
        FROM payments p 
        JOIN users u ON p.user_id = u.id 
        WHERE p.reference LIKE 'TEST-%'
        ORDER BY p.created_at DESC
    ");
    $testPayments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($testPayments)) {
        echo "No TEST payments found.\n";
    } else {
        foreach ($testPayments as $payment) {
            echo "TEST Payment Found:\n";
            echo "Reference: {$payment['reference']}\n";
            echo "User: {$payment['name']}\n";
            echo "Status: {$payment['status']}\n";
            echo "Created: {$payment['created_at']}\n";
            echo "---\n";
        }
    }
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
