<?php
require_once 'Database.php';

try {
    $db = new Database();
    $connection = $db->getConnection();
    
    // Fix membership status for user ID 2
    $sql = "UPDATE user_profiles SET membership_status = 'active', updated_at = NOW() WHERE user_id = 2";
    $result = $connection->query($sql);
    
    // Verify the update
    $sql = "SELECT membership_status, membership_expiry, join_date, updated_at FROM user_profiles WHERE user_id = 2";
    $result = $connection->query($sql);
    $row = $result->fetch_assoc();
    
    echo "Membership status updated to: " . $row['membership_status'] . "\n";
    echo "Membership expiry: " . ($row['membership_expiry'] ?? 'NULL') . "\n";
    echo "Join date: " . ($row['join_date'] ?? 'NULL') . "\n";
    echo "Updated at: " . $row['updated_at'] . "\n";
    
    $connection = null;
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
