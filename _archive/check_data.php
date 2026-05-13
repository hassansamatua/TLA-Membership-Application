<?php
$host = 'localhost';
$user = 'root';
$password = 'hansco123';
$database = 'tutorial2';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$database", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Checking users...\n";
    $stmt = $pdo->query("SELECT id, name, email, user_category FROM users");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($users)) {
        echo "❌ No users found\n";
    } else {
        foreach ($users as $user) {
            echo "User: {$user['id']} - {$user['name']} ({$user['email']}) - {$user['user_category']}\n";
        }
    }
    
    echo "\nChecking tokens...\n";
    $stmt = $pdo->query("SELECT user_id, token, expires_at FROM tokens");
    $tokens = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($tokens)) {
        echo "❌ No tokens found\n";
    } else {
        foreach ($tokens as $token) {
            echo "Token: User {$token['user_id']} - expires {$token['expires_at']}\n";
        }
    }
    
} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
}
?>
