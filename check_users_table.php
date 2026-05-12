<?php
$host = 'localhost';
$user = 'root';
$password = 'hansco123';
$database = 'tutorial2';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$database", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Checking users table structure...\n";
    
    // Check if users table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'users'");
    if ($stmt->rowCount() > 0) {
        echo "✓ Users table exists\n";
        
        // Check columns
        $stmt = $pdo->query("DESCRIBE users");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "Columns in users table:\n";
        foreach ($columns as $column) {
            echo "- {$column['Field']} ({$column['Type']})\n";
        }
        
        // Check if user_category column exists
        $hasUserCategory = false;
        foreach ($columns as $column) {
            if ($column['Field'] === 'user_category') {
                $hasUserCategory = true;
                break;
            }
        }
        
        if ($hasUserCategory) {
            echo "✓ user_category column exists\n";
        } else {
            echo "❌ user_category column missing\n";
        }
        
    } else {
        echo "❌ Users table does not exist\n";
    }
    
    // Check tokens table
    echo "\nChecking tokens table...\n";
    $stmt = $pdo->query("SHOW TABLES LIKE 'tokens'");
    if ($stmt->rowCount() > 0) {
        echo "✓ Tokens table exists\n";
    } else {
        echo "❌ Tokens table does not exist\n";
    }
    
} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
}
?>
