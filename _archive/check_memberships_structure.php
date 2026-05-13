<?php
require_once 'Database.php';

try {
    $conn = new Database();
    $connection = $conn->getConnection();
    
    // Check if memberships table exists
    $result = $connection->query("DESCRIBE memberships");
    
    if ($result) {
        echo "Memberships table structure:\n";
        echo str_repeat("=", 50) . "\n";
        
        while ($row = $result->fetch_assoc()) {
            echo sprintf("%-20s %-15s %-15s %-10s\n", 
                $row['Field'], 
                $row['Type'], 
                $row['Null'], 
                $row['Key']
            );
        }
        
        echo "\n";
        
        // Check if there are any records
        $countResult = $connection->query("SELECT COUNT(*) as count FROM memberships");
        $countRow = $countResult->fetch_assoc();
        echo "Total records: " . $countRow['count'] . "\n\n";
        
        // Show recent records
        $recentResult = $connection->query("SELECT * FROM memberships ORDER BY created_at DESC LIMIT 3");
        if ($recentResult && $recentResult->num_rows > 0) {
            echo "Recent records:\n";
            echo str_repeat("-", 50) . "\n";
            while ($row = $recentResult->fetch_assoc()) {
                echo "ID: " . $row['id'] . "\n";
                echo "User ID: " . $row['user_id'] . "\n";
                echo "Status: " . $row['status'] . "\n";
                echo "Expiry Date: " . ($row['expiry_date'] ?? 'NULL') . "\n";
                echo "Created: " . $row['created_at'] . "\n";
                echo str_repeat("-", 30) . "\n";
            }
        }
        
    } else {
        echo "Memberships table does not exist!\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
