<?php
$host = 'localhost';
$user = 'root';
$password = 'hansco123';

try {
    // Check old databases for users
    $pdo = new PDO("mysql:host=$host", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // List all databases
    $stmt = $pdo->query("SHOW DATABASES");
    $databases = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $foundUsers = false;
    
    foreach ($databases as $db) {
        if ($db !== 'information_schema' && $db !== 'mysql' && $db !== 'performance_schema' && $db !== 'phpmyadmin') {
            try {
                $tempPdo = new PDO("mysql:host=$host;dbname=$db", $user, $password);
                $tempPdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                
                // Check for users table
                $stmt = $tempPdo->query("SHOW TABLES LIKE 'users'");
                if ($stmt->rowCount() > 0) {
                    // Check for users
                    $stmt = $tempPdo->query("SELECT COUNT(*) as count FROM users");
                    $count = $stmt->fetchColumn();
                    
                    if ($count > 0) {
                        echo "Found $count users in database: $db\n";
                        $foundUsers = true;
                        
                        // Show sample users
                        $stmt = $tempPdo->query("SELECT id, name, email FROM users LIMIT 3");
                        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
                        
                        foreach ($users as $user) {
                            echo "  - User {$user['id']}: {$user['name']} ({$user['email']})\n";
                        }
                        
                        // Check for tokens
                        $stmt = $tempPdo->query("SHOW TABLES LIKE 'tokens'");
                        if ($stmt->rowCount() > 0) {
                            $stmt = $tempPdo->query("SELECT COUNT(*) as count FROM tokens");
                            $tokenCount = $stmt->fetchColumn();
                            echo "  Found $tokenCount tokens\n";
                        }
                    }
                }
            } catch (PDOException $e) {
                // Skip databases we can't access
            }
        }
    }
    
    if (!$foundUsers) {
        echo "No users found in any database. You need to register first.\n";
    }
    
} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
}
?>
