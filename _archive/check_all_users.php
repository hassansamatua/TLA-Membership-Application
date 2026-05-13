<?php
// Database connection
$host = 'localhost';
$dbname = 'next_auth';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== All Users Check ===\n\n";
    
    // Check all users
    $stmt = $pdo->query("SELECT id, name, email, is_admin, is_approved, created_at FROM users ORDER BY created_at DESC");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Total Users: " . count($users) . "\n\n";
    
    foreach ($users as $user) {
        echo "ID: " . str_pad($user['id'], 3, ' ', STR_PAD_LEFT);
        echo " | Name: " . substr($user['name'], 0, 20);
        echo " | Email: " . substr($user['email'], 0, 25);
        echo " | Admin: " . ($user['is_admin'] ? 'YES' : 'NO');
        echo " | Approved: " . ($user['is_approved'] ? 'YES' : 'NO');
        echo " | Created: " . $user['created_at'];
        echo "\n";
    }
    
    echo "\n=== Problematic Users ===\n";
    
    // Check for users with ID 0 or NULL
    $problemStmt = $pdo->query("SELECT id, name, email, is_approved FROM users WHERE id = 0 OR id IS NULL");
    $problemUsers = $problemStmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($problemUsers) > 0) {
        echo "❌ Found users with invalid IDs:\n";
        foreach ($problemUsers as $user) {
            echo "ID: " . $user['id'] . " | Name: " . $user['name'] . " | Email: " . $user['email'] . "\n";
        }
    } else {
        echo "✅ No users with invalid IDs found\n";
    }
    
    // Check the specific user again
    echo "\n=== Specific User Check ===\n";
    $email = 'name@gmail.com';
    $specificStmt = $pdo->prepare("SELECT id, name, email, is_admin, is_approved FROM users WHERE email = ?");
    $specificStmt->execute([$email]);
    $specificUser = $specificStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($specificUser) {
        echo "User: name@gmail.com\n";
        echo "ID: " . $specificUser['id'] . "\n";
        echo "Name: " . $specificUser['name'] . "\n";
        echo "Approved: " . ($specificUser['is_approved'] ? 'YES' : 'NO') . "\n";
        
        if ($specificUser['id'] == 0) {
            echo "❌ User still has ID 0 - this is the problem!\n";
        } else {
            echo "✅ User has valid ID\n";
        }
    } else {
        echo "❌ User not found\n";
    }
    
} catch (PDOException $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
}
?>
