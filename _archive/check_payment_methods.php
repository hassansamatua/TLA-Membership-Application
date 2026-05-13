<?php
// Database connection
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'next_auth';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$database", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== PAYMENT METHOD DATA ANALYSIS ===\n\n";
    
    // Check payment_method column data
    $stmt = $pdo->query("
        SELECT 
            id,
            reference,
            user_id,
            amount,
            status,
            payment_method,
            created_at,
            paid_at
        FROM payments 
        ORDER BY created_at DESC 
        LIMIT 10
    ");
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Recent payments with payment methods:\n";
    foreach ($payments as $payment) {
        $method = $payment['payment_method'];
        $display = $method ? $method : 'NULL/Empty';
        echo "ID: {$payment['id']}, Ref: {$payment['reference']}, Method: '{$display}', Status: {$payment['status']}\n";
    }
    
    echo "\n=== PAYMENT METHOD DISTRIBUTION ===\n";
    
    // Count payment methods
    $stmt = $pdo->query("
        SELECT 
            payment_method,
            COUNT(*) as count,
            SUM(amount) as total_amount
        FROM payments 
        GROUP BY payment_method
        ORDER BY count DESC
    ");
    $methodCounts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($methodCounts as $method) {
        $methodName = $method['payment_method'] ? $method['payment_method'] : 'NULL/Empty';
        echo "{$methodName}: {$method['count']} payments, Total: {$method['total_amount']} TZS\n";
    }
    
    echo "\n=== PAYMENTS BY STATUS ===\n";
    
    // Check payment methods by status
    $stmt = $pdo->query("
        SELECT 
            status,
            payment_method,
            COUNT(*) as count
        FROM payments 
        GROUP BY status, payment_method
        ORDER BY status, count DESC
    ");
    $statusMethods = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($statusMethods as $item) {
        $method = $item['payment_method'] ? $item['payment_method'] : 'NULL/Empty';
        echo "Status: {$item['status']}, Method: '{$method}', Count: {$item['count']}\n";
    }
    
    echo "\n=== ISSUE ANALYSIS ===\n";
    
    // Check for NULL or empty payment methods
    $stmt = $pdo->query("
        SELECT COUNT(*) as null_count
        FROM payments 
        WHERE payment_method IS NULL OR payment_method = '' OR payment_method = 'NULL'
    ");
    $nullCount = $stmt->fetch(PDO::FETCH_ASSOC)['null_count'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM payments");
    $totalCount = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    $nullPercentage = $totalCount > 0 ? round(($nullCount / $totalCount) * 100, 2) : 0;
    
    echo "Payments with NULL/Empty payment method: {$nullCount} out of {$totalCount} ({$nullPercentage}%)\n";
    
    if ($nullPercentage > 50) {
        echo "❌ MAJOR ISSUE: Most payments have no payment method\n";
    } elseif ($nullPercentage > 20) {
        echo "⚠️  MODERATE ISSUE: Many payments have no payment method\n";
    } else {
        echo "✅ MINOR ISSUE: Few payments have no payment method\n";
    }
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
