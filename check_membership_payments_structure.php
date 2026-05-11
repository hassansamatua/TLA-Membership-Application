<?php
// Check the actual structure of membership_payments table
require_once 'Database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    echo "=== Checking membership_payments Table Structure ===\n\n";
    
    $stmt = $conn->query("DESCRIBE membership_payments");
    echo "Current structure:\n";
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "   - {$row['Field']}: {$row['Type']} {$row['Null']} {$row['Key']} {$row['Default']}\n";
    }
    
    echo "\n=== Checking payments Table Structure ===\n\n";
    
    $stmt = $conn->query("DESCRIBE payments");
    echo "Current structure:\n";
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "   - {$row['Field']}: {$row['Type']} {$row['Null']} {$row['Key']} {$row['Default']}\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
