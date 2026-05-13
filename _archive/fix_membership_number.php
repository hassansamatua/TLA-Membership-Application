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
    
    echo "Fixing membership number format from MEM to TLA...\n\n";
    
    // Update user_profiles table - change MEM to TLA
    $sql = "UPDATE user_profiles 
             SET membership_number = REPLACE(membership_number, 'MEM', 'TLA') 
             WHERE membership_number LIKE 'MEM%'";
    $result = $conn->query($sql);
    
    if ($result) {
        echo "✅ Updated user_profiles table\n";
    } else {
        echo "❌ Failed to update user_profiles table\n";
    }
    
    // Update memberships table - change MEM to TLA
    $sql = "UPDATE memberships 
             SET membership_number = REPLACE(membership_number, 'MEM', 'TLA') 
             WHERE membership_number LIKE 'MEM%'";
    $result = $conn->query($sql);
    
    if ($result) {
        echo "✅ Updated memberships table\n";
    } else {
        echo "❌ Failed to update memberships table\n";
    }
    
    // Verify the updates
    echo "\nVerification:\n";
    echo "User profiles with TLA format:\n";
    $sql = "SELECT user_id, membership_number FROM user_profiles WHERE membership_number LIKE 'TLA%' ORDER BY user_id";
    $result = $conn->query($sql);
    
    if ($result->num_rows > 0) {
        echo "ID\tMembership Number\n";
        echo "------------------------\n";
        while ($row = $result->fetch_assoc()) {
            echo $row['user_id'] . "\t" . $row['membership_number'] . "\n";
        }
    }
    
    echo "\nMemberships with TLA format:\n";
    $sql = "SELECT user_id, membership_number FROM memberships WHERE membership_number LIKE 'TLA%' ORDER BY user_id";
    $result = $conn->query($sql);
    
    if ($result->num_rows > 0) {
        echo "ID\tMembership Number\n";
        echo "------------------------\n";
        while ($row = $result->fetch_assoc()) {
            echo $row['user_id'] . "\t" . $row['membership_number'] . "\n";
        }
    }
    
    $conn->close();
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
