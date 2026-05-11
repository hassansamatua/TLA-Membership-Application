<?php
require_once 'Database.php';

$db = new Database();
$conn = $db->getConnection();

echo "=== ENSURING ALL USERS HAVE MEMBERSHIP NUMBERS ===\n\n";

try {
    // Check users without membership numbers in user_profiles
    $stmt = $conn->query("
        SELECT u.id, u.name, u.email, up.membership_number 
        FROM users u 
        LEFT JOIN user_profiles up ON u.id = up.user_id 
        WHERE up.membership_number IS NULL OR up.membership_number = ''
        ORDER BY u.id
    ");
    $usersWithoutMembership = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($usersWithoutMembership)) {
        echo "All users already have membership numbers!\n";
        
        // Show current status
        $stmt = $conn->query("
            SELECT u.id, u.name, up.membership_number 
            FROM users u 
            LEFT JOIN user_profiles up ON u.id = up.user_id 
            ORDER BY u.id LIMIT 10
        ");
        echo "\nCurrent membership numbers:\n";
        while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            echo "User {$row['id']} ({$row['name']}): " . ($row['membership_number'] ?? 'NULL') . "\n";
        }
        exit;
    }
    
    echo "Found " . count($usersWithoutMembership) . " users without membership numbers.\n\n";
    
    // Get current year for sequence
    $year = date('y');
    
    foreach ($usersWithoutMembership as $user) {
        echo "Processing user: {$user['name']} (ID: {$user['id']})\n";
        
        try {
            // Check if user_profile exists
            $checkStmt = $conn->prepare("SELECT user_id FROM user_profiles WHERE user_id = ?");
            $checkStmt->execute([$user['id']]);
            $profileExists = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$profileExists) {
                // Create user_profile record
                $insertStmt = $conn->prepare("
                    INSERT INTO user_profiles (user_id, created_at, updated_at) 
                    VALUES (?, NOW(), NOW())
                ");
                $insertStmt->execute([$user['id']]);
                echo "  ✓ Created user profile record\n";
            }
            
            // Get next sequence number
            $seqStmt = $conn->prepare("SELECT last_number FROM membership_sequence WHERE year = ? FOR UPDATE");
            $seqStmt->execute([$year]);
            $seqResult = $seqStmt->fetch(PDO::FETCH_ASSOC);
            
            $nextNumber = $seqResult ? $seqResult['last_number'] + 1 : 1;
            $membershipNumber = "TLA{$year}" . str_pad($nextNumber, 5, '0', STR_PAD_LEFT);
            
            // Update sequence
            $upsertStmt = $conn->prepare("
                INSERT INTO membership_sequence (year, last_number) VALUES (?, ?)
                ON DUPLICATE KEY UPDATE last_number = ?
            ");
            $upsertStmt->execute([$year, $nextNumber, $nextNumber]);
            
            // Update user_profiles with membership number
            $updateStmt = $conn->prepare("
                UPDATE user_profiles 
                SET membership_number = ?, updated_at = NOW() 
                WHERE user_id = ?
            ");
            $updateStmt->execute([$membershipNumber, $user['id']]);
            
            echo "  ✓ Assigned membership number: {$membershipNumber}\n\n";
            
        } catch (Exception $e) {
            echo "  ✗ Error: " . $e->getMessage() . "\n\n";
        }
    }
    
    echo "=== VERIFICATION ===\n";
    
    // Show updated status
    $stmt = $conn->query("
        SELECT u.id, u.name, up.membership_number 
        FROM users u 
        LEFT JOIN user_profiles up ON u.id = up.user_id 
        ORDER BY u.id LIMIT 15
    ");
    
    echo "Updated membership numbers:\n";
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $status = $row['membership_number'] ? '✓' : '✗';
        echo "{$status} User {$row['id']} ({$row['name']}): " . ($row['membership_number'] ?? 'NULL') . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
