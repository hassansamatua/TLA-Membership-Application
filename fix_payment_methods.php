<?php
// Database connection
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'next_auth';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$database", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== FIXING PAYMENT METHODS ===\n\n";
    
    // Update NULL payment methods based on transaction ID patterns
    echo "1. Updating manual completion payments...\n";
    
    // Update payments with MANUAL- transaction IDs
    $stmt = $pdo->prepare("
        UPDATE payments 
        SET payment_method = 'Manual Completion', 
            updated_at = NOW()
        WHERE (payment_method IS NULL OR payment_method = '' OR payment_method = 'NULL')
        AND transaction_id LIKE 'MANUAL-%'
    ");
    $stmt->execute();
    $manualCount = $stmt->rowCount();
    echo "Updated {$manualCount} manual completion payments\n";
    
    // Update TEST payments
    echo "\n2. Updating test payments...\n";
    $stmt = $pdo->prepare("
        UPDATE payments 
        SET payment_method = 'Test Payment', 
            updated_at = NOW()
        WHERE (payment_method IS NULL OR payment_method = '' OR payment_method = 'NULL')
        AND reference LIKE 'TEST-%'
    ");
    $stmt->execute();
    $testCount = $stmt->rowCount();
    echo "Updated {$testCount} test payments\n";
    
    // Update remaining NULL payments with a default
    echo "\n3. Updating remaining NULL payments...\n";
    $stmt = $pdo->prepare("
        UPDATE payments 
        SET payment_method = 'Unknown', 
            updated_at = NOW()
        WHERE payment_method IS NULL OR payment_method = '' OR payment_method = 'NULL'
    ");
    $stmt->execute();
    $unknownCount = $stmt->rowCount();
    echo "Updated {$unknownCount} unknown payments\n";
    
    echo "\n=== VERIFICATION ===\n";
    
    // Check the results
    $stmt = $pdo->query("
        SELECT 
            payment_method,
            COUNT(*) as count
        FROM payments 
        GROUP BY payment_method
        ORDER BY count DESC
    ");
    $methodCounts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Updated payment method distribution:\n";
    foreach ($methodCounts as $method) {
        echo "- {$method['payment_method']}: {$method['count']} payments\n";
    }
    
    echo "\n=== SAMPLE PAYMENTS ===\n";
    
    // Show sample of updated payments
    $stmt = $pdo->query("
        SELECT 
            reference,
            transaction_id,
            payment_method,
            status,
            amount
        FROM payments 
        ORDER BY updated_at DESC 
        LIMIT 5
    ");
    $samples = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($samples as $sample) {
        echo "Ref: {$sample['reference']}, Method: '{$sample['payment_method']}', Status: {$sample['status']}, Amount: {$sample['amount']}\n";
    }
    
    echo "\n✅ Payment methods fixed!\n";
    echo "Reports should now show proper payment methods instead of N/A\n";
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
