<?php
// Database connection
$host = 'localhost';
$dbname = 'next_auth';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== User Approval Status Check ===\n\n";
    
    // Check the specific user
    $email = 'name@gmail.com';
    $stmt = $pdo->prepare("SELECT id, name, email, is_admin, is_approved, created_at FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        echo "User Found:\n";
        echo "ID: " . $user['id'] . "\n";
        echo "Name: " . $user['name'] . "\n";
        echo "Email: " . $user['email'] . "\n";
        echo "Is Admin: " . ($user['is_admin'] ? 'YES' : 'NO') . "\n";
        echo "Is Approved: " . ($user['is_approved'] ? 'YES' : 'NO') . "\n";
        echo "Created At: " . $user['created_at'] . "\n\n";
        
        if (!$user['is_approved']) {
            echo "❌ ISSUE: User is NOT APPROVED!\n";
            echo "This explains why login redirects back to login page.\n\n";
            
            // Approve the user
            echo "Attempting to approve user...\n";
            $updateStmt = $pdo->prepare("UPDATE users SET is_approved = 1 WHERE email = ?");
            $result = $updateStmt->execute([$email]);
            
            if ($result) {
                echo "✅ User has been APPROVED successfully!\n";
                
                // Verify the update
                $verifyStmt = $pdo->prepare("SELECT is_approved FROM users WHERE email = ?");
                $verifyStmt->execute([$email]);
                $verified = $verifyStmt->fetch(PDO::FETCH_ASSOC);
                
                echo "New approval status: " . ($verified['is_approved'] ? 'APPROVED' : 'NOT APPROVED') . "\n";
            } else {
                echo "❌ Failed to approve user\n";
            }
        } else {
            echo "✅ User is already APPROVED\n";
            echo "The issue might be elsewhere...\n";
        }
    } else {
        echo "❌ User with email '$email' not found!\n";
        
        // Show all users for debugging
        echo "\n=== All Users ===\n";
        $allStmt = $pdo->query("SELECT id, name, email, is_approved FROM users ORDER BY created_at DESC LIMIT 10");
        $users = $allStmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($users as $u) {
            echo "ID: {$u['id']}, Name: {$u['name']}, Email: {$u['email']}, Approved: " . ($u['is_approved'] ? 'YES' : 'NO') . "\n";
        }
    }
    
} catch (PDOException $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
}
?>
