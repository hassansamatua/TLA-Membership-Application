<?php
// Database connection
$host = 'localhost';
$dbname = 'next_auth';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== Fix User ID Issue ===\n\n";
    
    // Find the problematic user
    $email = 'name@gmail.com';
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND id = 0");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        echo "Found user with ID 0:\n";
        echo "Email: " . $user['email'] . "\n";
        echo "Name: " . $user['name'] . "\n\n";
        
        // Get the next available ID
        $maxIdStmt = $pdo->query("SELECT MAX(id) as max_id FROM users");
        $maxId = $maxIdStmt->fetch(PDO::FETCH_ASSOC);
        $newId = ($maxId['max_id'] ?: 0) + 1;
        
        echo "Assigning new ID: $newId\n\n";
        
        // Update the user with the new ID
        $updateStmt = $pdo->prepare("UPDATE users SET id = ? WHERE email = ? AND id = 0");
        $result = $updateStmt->execute([$newId, $email]);
        
        if ($result) {
            echo "✅ User ID updated successfully!\n";
            
            // Update the user profile as well
            $updateProfileStmt = $pdo->prepare("UPDATE user_profiles SET user_id = ? WHERE user_id = 0");
            $profileResult = $updateProfileStmt->execute([$newId]);
            
            if ($profileResult) {
                echo "✅ User profile updated successfully!\n";
            } else {
                echo "⚠️ User profile update failed, but user was fixed\n";
            }
            
            // Verify the fix
            echo "\n=== Verification ===\n";
            $verifyStmt = $pdo->prepare("SELECT id, name, email, is_approved FROM users WHERE email = ?");
            $verifyStmt->execute([$email]);
            $verified = $verifyStmt->fetch(PDO::FETCH_ASSOC);
            
            echo "Updated User:\n";
            echo "ID: " . $verified['id'] . "\n";
            echo "Name: " . $verified['name'] . "\n";
            echo "Email: " . $verified['email'] . "\n";
            echo "Approved: " . ($verified['is_approved'] ? 'YES' : 'NO') . "\n";
            
            echo "\n✅ User should now be able to login successfully!\n";
            
        } else {
            echo "❌ Failed to update user ID\n";
        }
    } else {
        echo "❌ No user found with ID 0 and email: $email\n";
        
        // Show all users with ID 0
        echo "\n=== All Users with ID 0 ===\n";
        $zeroIdStmt = $pdo->query("SELECT id, name, email FROM users WHERE id = 0");
        $zeroUsers = $zeroIdStmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($zeroUsers) > 0) {
            foreach ($zeroUsers as $u) {
                echo "Name: {$u['name']}, Email: {$u['email']}\n";
            }
        } else {
            echo "No users with ID 0 found\n";
        }
    }
    
} catch (PDOException $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
}
?>
