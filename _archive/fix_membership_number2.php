<?php
require_once 'config.php';

// Function to generate membership number in TLA YY XXXXX format
function generateMembershipNumber() {
    $year = date('y'); // Last two digits of current year
    $randomNumber = str_pad(mt_rand(1, 99999), 5, '0', STR_PAD_LEFT);
    return "TLA" . $year . $randomNumber;
}

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== Fixing membership number for user ID 29 ===\n";
    
    // Get current membership number
    $stmt = $pdo->prepare('SELECT membership_number FROM user_profiles WHERE user_id = ?');
    $stmt->execute([29]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($profile) {
        $currentNumber = $profile['membership_number'];
        echo "Current membership number: " . $currentNumber . "\n";
        
        // Generate new membership number
        $newNumber = generateMembershipNumber();
        echo "New membership number: " . $newNumber . "\n";
        
        // Update the membership number
        $updateStmt = $pdo->prepare('UPDATE user_profiles SET membership_number = ? WHERE user_id = ?');
        $updateStmt->execute([$newNumber, 29]);
        
        echo "✅ Membership number updated successfully!\n";
        
        // Also update the users table if it has membership_number column
        try {
            $userUpdateStmt = $pdo->prepare('UPDATE users SET membership_number = ? WHERE id = ?');
            $userUpdateStmt->execute([$newNumber, 29]);
            echo "✅ Users table updated too!\n";
        } catch (PDOException $e) {
            echo "Note: users table might not have membership_number column\n";
        }
        
        // Update membership_info JSON as well
        $stmt = $pdo->prepare('SELECT membership_info FROM user_profiles WHERE user_id = ?');
        $stmt->execute([29]);
        $profileData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($profileData && $profileData['membership_info']) {
            $membershipInfo = json_decode($profileData['membership_info'], true);
            if ($membershipInfo && isset($membershipInfo['membership'])) {
                $membershipInfo['membership']['membershipNumber'] = $newNumber;
                
                $updateJsonStmt = $pdo->prepare('UPDATE user_profiles SET membership_info = ? WHERE user_id = ?');
                $updateJsonStmt->execute([json_encode($membershipInfo), 29]);
                echo "✅ Membership info JSON updated too!\n";
            }
        }
        
    } else {
        echo "No profile found for user ID 29\n";
    }
    
} catch (PDOException $e) {
    echo 'Error: ' . $e->getMessage() . PHP_EOL;
}
?>
