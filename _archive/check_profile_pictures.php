<?php
require_once 'config.php';

try {
    $conn = new mysqli('localhost', 'root', '', 'next_auth');
    
    $result = $conn->query('SELECT u.id, u.name, up.profile_picture FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id LIMIT 5');
    
    echo "=== Profile Picture Check ===\n";
    while($row = $result->fetch_assoc()) {
        echo "User ID: " . $row['id'] . ", Name: " . $row['name'] . ", Profile Picture: " . ($row['profile_picture'] ?? 'NULL') . "\n";
    }
    
    $conn->close();
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
