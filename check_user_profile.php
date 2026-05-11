<?php
require_once 'Database.php';

$db = new Database();
$conn = $db->getConnection();

// Check user_profile data for user ID 25
$stmt = $conn->prepare('SELECT * FROM user_profiles WHERE user_id = 25');
$stmt->execute();
$profile = $stmt->fetch(PDO::FETCH_ASSOC);

if ($profile) {
    echo "User Profile Data for ID 25:\n";
    echo "================================\n";
    foreach ($profile as $key => $value) {
        if ($value !== null && $value !== '') {
            echo "$key: $value\n";
        } else {
            echo "$key: NULL/EMPTY\n";
        }
    }
} else {
    echo "No profile found for user ID 25\n";
}

// Also check the users table
echo "\n\nUsers Table Data for ID 25:\n";
echo "================================\n";
$stmt = $conn->prepare('SELECT id, name, email, membership_number, is_approved FROM users WHERE id = 25');
$stmt->execute();
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user) {
    foreach ($user as $key => $value) {
        echo "$key: $value\n";
    }
} else {
    echo "No user found with ID 25\n";
}
?>
