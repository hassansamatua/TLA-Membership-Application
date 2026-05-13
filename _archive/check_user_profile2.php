<?php
// Database connection
$host = 'localhost';
$dbname = 'next_auth';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== User Profile Check ===\n\n";
    
    // Check the specific user
    $email = 'name@gmail.com';
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        echo "User Details:\n";
        echo "ID: " . $user['id'] . "\n";
        echo "Name: " . $user['name'] . "\n";
        echo "Email: " . $user['email'] . "\n";
        echo "Is Admin: " . ($user['is_admin'] ? 'YES' : 'NO') . "\n";
        echo "Is Approved: " . ($user['is_approved'] ? 'YES' : 'NO') . "\n";
        echo "Created At: " . $user['created_at'] . "\n\n";
        
        // Check user profile
        echo "=== Checking User Profile ===\n";
        $profileStmt = $pdo->prepare("SELECT * FROM user_profiles WHERE user_id = ?");
        $profileStmt->execute([$user['id']]);
        $profile = $profileStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($profile) {
            echo "✅ User Profile Found:\n";
            echo "User ID: " . $profile['user_id'] . "\n";
            echo "Membership Number: " . ($profile['membership_number'] ?: 'NULL') . "\n";
            echo "Membership Status: " . ($profile['membership_status'] ?: 'NULL') . "\n";
        } else {
            echo "❌ No User Profile Found!\n";
            echo "This might be causing the authentication issue.\n\n";
            
            // Create a basic profile
            echo "Creating basic user profile...\n";
            $insertStmt = $pdo->prepare("
                INSERT INTO user_profiles (user_id, membership_number, membership_status, created_at) 
                VALUES (?, ?, ?, NOW())
            ");
            $membershipNumber = 'TLA' . str_pad($user['id'], 6, '0', STR_PAD_LEFT);
            $result = $insertStmt->execute([$user['id'], $membershipNumber, 'active']);
            
            if ($result) {
                echo "✅ Basic profile created with membership number: $membershipNumber\n";
            } else {
                echo "❌ Failed to create profile\n";
            }
        }
    } else {
        echo "❌ User not found!\n";
    }
    
} catch (PDOException $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
}
?>
