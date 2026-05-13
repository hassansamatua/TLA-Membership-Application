<?php
require_once 'Database.php';

$database = new Database();
$db = $database->getConnection();

echo "=== ENSURING APPROVED USERS HAVE MEMBERSHIP NUMBERS IN BOTH TABLES ===\n\n";

try {
    // Find all approved users who don't have membership numbers in users table
    $stmt = $db->query("
        SELECT u.id, u.name, u.email, u.is_approved, 
               u.membership_number as user_membership_number,
               up.membership_number as profile_membership_number
        FROM users u 
        LEFT JOIN user_profiles up ON u.id = up.user_id 
        WHERE u.is_approved = 1 
        AND (u.membership_number IS NULL OR u.membership_number = '')
        ORDER BY u.id
    ");
    $usersWithoutMembership = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($usersWithoutMembership)) {
        echo "All approved users already have membership numbers in users table!\n";
    } else {
        echo "Found " . count($usersWithoutMembership) . " approved users without membership numbers in users table:\n";
        
        $year = date('y');
        
        foreach ($usersWithoutMembership as $user) {
            echo "\nProcessing user: {$user['name']} (ID: {$user['id']})\n";
            echo "  User table membership: " . ($user['user_membership_number'] ?? 'NULL') . "\n";
            echo "  Profile table membership: " . ($user['profile_membership_number'] ?? 'NULL') . "\n";
            
            try {
                // Get membership number from profile table or generate new one
                $membershipNumber = $user['profile_membership_number'];
                
                if (!$membershipNumber) {
                    // Generate new membership number
                    $seqStmt = $db->prepare("SELECT last_number FROM membership_sequence WHERE year = ? FOR UPDATE");
                    $seqStmt->execute([$year]);
                    $seqResult = $seqStmt->fetch(PDO::FETCH_ASSOC);
                    
                    $nextNumber = $seqResult ? $seqResult['last_number'] + 1 : 1;
                    $membershipNumber = "TLA{$year}" . str_pad($nextNumber, 5, '0', STR_PAD_LEFT);
                    
                    // Update sequence
                    $upsertStmt = $db->prepare("
                        INSERT INTO membership_sequence (year, last_number) VALUES (?, ?)
                        ON DUPLICATE KEY UPDATE last_number = ?
                    ");
                    $upsertStmt->execute([$year, $nextNumber, $nextNumber]);
                    
                    // Update user_profiles table
                    $updateProfileStmt = $db->prepare("
                        UPDATE user_profiles 
                        SET membership_number = ?, updated_at = NOW() 
                        WHERE user_id = ?
                    ");
                    $updateProfileStmt->execute([$membershipNumber, $user['id']]);
                    
                    echo "  ✓ Generated new membership number: {$membershipNumber}\n";
                }
                
                // Update users table with membership number
                $updateUserStmt = $db->prepare("
                    UPDATE users 
                    SET membership_number = ? 
                    WHERE id = ?
                ");
                $updateUserStmt->execute([$membershipNumber, $user['id']]);
                
                echo "  ✓ Updated users table with: {$membershipNumber}\n";
                
            } catch (Exception $e) {
                echo "  ✗ Error: " . $e->getMessage() . "\n";
            }
        }
    }
    
    echo "\n=== VERIFICATION ===\n";
    
    // Verify all approved users now have membership numbers
    $verifyStmt = $db->query("
        SELECT u.id, u.name, u.membership_number as user_mem, up.membership_number as profile_mem
        FROM users u 
        LEFT JOIN user_profiles up ON u.id = up.user_id 
        WHERE u.is_approved = 1 
        ORDER BY u.id 
        LIMIT 10
    ");
    
    echo "Sample of approved users with membership numbers:\n";
    while($row = $verifyStmt->fetch(PDO::FETCH_ASSOC)) {
        $userStatus = ($row['user_mem'] && $row['profile_mem']) ? '✓' : '✗';
        echo "{$userStatus} User {$row['id']} ({$row['name']}): Users={$row['user_mem']}, Profile={$row['profile_mem']}\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
