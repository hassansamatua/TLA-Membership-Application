<?php
require_once 'Database.php';

$database = new Database();
$db = $database->getConnection();

echo "=== GENERATING RANDOM MEMBERSHIP NUMBERS ===\n\n";

try {
    // Get all users with membership numbers that have sequential patterns
    $stmt = $db->query("
        SELECT u.id, u.name, u.email, u.membership_number,
               up.membership_number as profile_membership_number
        FROM users u 
        LEFT JOIN user_profiles up ON u.id = up.user_id 
        WHERE u.is_approved = 1 
        AND (u.membership_number LIKE '%0001' OR u.membership_number LIKE '%0002' OR u.membership_number LIKE '%0003' OR 
             u.membership_number LIKE '%0004' OR u.membership_number LIKE '%0005' OR u.membership_number LIKE '%0006' OR
             u.membership_number LIKE '%0007' OR u.membership_number LIKE '%0008' OR u.membership_number LIKE '%0009')
        ORDER BY u.id
    ");
    $usersWithSequentialNumbers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($usersWithSequentialNumbers)) {
        echo "No users with sequential membership numbers found.\n";
    } else {
        echo "Found " . count($usersWithSequentialNumbers) . " users with sequential membership numbers:\n\n";
        
        $year = date('y');
        
        foreach ($usersWithSequentialNumbers as $user) {
            echo "Processing user: {$user['name']} (ID: {$user['id']})\n";
            echo "  Current membership: " . ($user['membership_number'] ?? 'NULL') . "\n";
            
            try {
                // Generate random 5-digit number (10000-99999)
                $randomNumber = str_pad(rand(10000, 99999), 5, '0', STR_PAD_LEFT);
                $newMembershipNumber = "TLA{$year}{$randomNumber}";
                
                echo "  New membership number: {$newMembershipNumber}\n";
                
                // Update users table
                $updateUserStmt = $db->prepare("
                    UPDATE users 
                    SET membership_number = ? 
                    WHERE id = ?
                ");
                $updateUserStmt->execute([$newMembershipNumber, $user['id']]);
                
                // Update user_profiles table
                $updateProfileStmt = $db->prepare("
                    UPDATE user_profiles 
                    SET membership_number = ?, updated_at = NOW() 
                    WHERE user_id = ?
                ");
                $updateProfileStmt->execute([$newMembershipNumber, $user['id']]);
                
                echo "  ✓ Updated both tables with random membership number\n\n";
                
            } catch (Exception $e) {
                echo "  ✗ Error: " . $e->getMessage() . "\n\n";
            }
        }
    }
    
    echo "=== VERIFICATION ===\n";
    
    // Show updated membership numbers
    $verifyStmt = $db->query("
        SELECT u.id, u.name, u.membership_number
        FROM users u 
        WHERE u.is_approved = 1 
        ORDER BY u.id 
        LIMIT 10
    ");
    
    echo "Updated membership numbers (random 5-digit):\n";
    while($row = $verifyStmt->fetch(PDO::FETCH_ASSOC)) {
        echo "User {$row['id']} ({$row['name']}): {$row['membership_number']}\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
