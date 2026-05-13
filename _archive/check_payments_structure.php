<?php
// Database connection
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'next_auth';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$database", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== PAYMENTS TABLE STRUCTURE ===\n\n";
    
    $stmt = $pdo->query("DESCRIBE payments");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Available columns in payments table:\n";
    foreach ($columns as $column) {
        echo "- {$column['Field']} ({$column['Type']})\n";
    }
    
    echo "\n=== CHECKING FOR SPECIFIC COLUMNS ===\n";
    $columnNames = array_column($columns, 'Field');
    
    $requiredColumns = ['id', 'user_id', 'transaction_id', 'amount', 'payment_method', 'status', 'created_at', 'description'];
    foreach ($requiredColumns as $col) {
        if (in_array($col, $columnNames)) {
            echo "✅ $col column exists\n";
        } else {
            echo "❌ $col column MISSING\n";
        }
    }
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
