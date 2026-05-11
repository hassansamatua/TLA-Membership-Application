<?php
// Database connection details
$host = 'localhost';
$username = 'root';
$password = '';
$database = 'next_auth';

try {
    // Create connection
    $conn = new mysqli($host, $username, $password, $database);
    
    // Check connection
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }
    
    // Fix membership status for user ID 2
    $sql = "UPDATE user_profiles SET membership_status = 'active', join_date = CURDATE(), updated_at = NOW() WHERE user_id = 2";
    $result = $conn->query($sql);
    
    if ($result) {
        echo "Membership status updated successfully!\n";
    } else {
        echo "Error updating membership status: " . $conn->error . "\n";
    }
    
    // Verify the update
    $sql = "SELECT membership_status, membership_expiry, join_date, updated_at FROM user_profiles WHERE user_id = 2";
    $result = $conn->query($sql);
    
    if ($result && $row = $result->fetch_assoc()) {
        echo "Current status:\n";
        echo "Membership status: " . $row['membership_status'] . "\n";
        echo "Membership expiry: " . ($row['membership_expiry'] ?? 'NULL') . "\n";
        echo "Join date: " . ($row['join_date'] ?? 'NULL') . "\n";
        echo "Updated at: " . $row['updated_at'] . "\n";
    }
    
    $conn->close();
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
