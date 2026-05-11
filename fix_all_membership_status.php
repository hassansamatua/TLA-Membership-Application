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
    
    echo "Fixing membership status for all approved users...\n\n";
    
    // Get all approved users
    $sql = "SELECT u.id, u.name, u.email, up.membership_status, up.join_date 
             FROM users u 
             LEFT JOIN user_profiles up ON u.id = up.user_id 
             WHERE u.is_approved = 1 AND u.id != 3";
    $result = $conn->query($sql);
    
    $updatedCount = 0;
    
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $userId = $row['id'];
            $userName = $row['name'];
            $currentStatus = $row['membership_status'];
            $currentJoinDate = $row['join_date'];
            
            echo "User ID: $userId, Name: $userName\n";
            echo "Current status: $currentStatus, Join date: $currentJoinDate\n";
            
            // Update membership status to 'active' and set join date if needed
            $updateSql = "UPDATE user_profiles 
                          SET membership_status = 'active', 
                              join_date = COALESCE(join_date, CURDATE()), 
                              updated_at = NOW() 
                          WHERE user_id = ?";
            
            $stmt = $conn->prepare($updateSql);
            $stmt->bind_param("i", $userId);
            $updateResult = $stmt->execute();
            $stmt->close();
            
            if ($updateResult) {
                echo "✅ Updated to: active\n";
                $updatedCount++;
            } else {
                echo "❌ Update failed: " . $conn->error . "\n";
            }
            echo "---\n";
        }
    } else {
        echo "No approved users found to update.\n";
    }
    
    echo "\nSummary: Updated $updatedCount user(s) to active membership status\n";
    
    // Verify the updates
    echo "\nVerification:\n";
    $verifySql = "SELECT u.id, u.name, u.email, up.membership_status, up.join_date, up.updated_at 
                   FROM users u 
                   LEFT JOIN user_profiles up ON u.id = up.user_id 
                   WHERE u.is_approved = 1 AND u.id != 3 
                   ORDER BY u.id";
    $verifyResult = $conn->query($verifySql);
    
    if ($verifyResult->num_rows > 0) {
        echo "ID\tName\t\tStatus\t\tJoin Date\t\tUpdated At\n";
        echo "--------------------------------------------------------\n";
        while ($row = $verifyResult->fetch_assoc()) {
            echo $row['id'] . "\t" . substr($row['name'], 0, 15) . "\t" . $row['membership_status'] . "\t" . $row['join_date'] . "\t" . $row['updated_at'] . "\n";
        }
    }
    
    $conn->close();
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
