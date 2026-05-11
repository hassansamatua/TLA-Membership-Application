<?php
require_once 'Database.php';

$database = new Database();
$db = $database->getConnection();

echo "=== DEBUGGING USER 26 (eg eg eg) ===\n";

// Check user 26 data
$stmt = $db->prepare('SELECT u.id, u.name, u.email, u.is_admin, u.is_approved, up.membership_number, up.membership_type, up.membership_status, up.join_date, up.membership_expiry FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = ? LIMIT 1');
$stmt->execute([26]);

if ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "User ID: {$row['id']}\n";
    echo "Name: {$row['name']}\n";
    echo "Email: {$row['email']}\n";
    echo "Membership Number: " . ($row['membership_number'] ?? 'NULL') . "\n";
    echo "Membership Type: " . ($row['membership_type'] ?? 'NULL') . "\n";
    echo "Membership Status: " . ($row['membership_status'] ?? 'NULL') . "\n";
    echo "Join Date: " . ($row['join_date'] ?? 'NULL') . "\n";
    echo "Membership Expiry: " . ($row['membership_expiry'] ?? 'NULL') . "\n";
    
    // Simulate exact API response
    $apiResponse = [
        'id' => $row['id'],
        'name' => $row['name'],
        'email' => $row['email'],
        'isAdmin' => (bool)$row['is_admin'],
        'isApproved' => (bool)$row['is_approved'],
        'membershipNumber' => $row['membership_number'] ?: null,
        'membershipType' => $row['membership_type'] ?: null,
        'membershipStatus' => $row['membership_status'] ?: null,
        'joinDate' => $row['join_date'] ?: null,
        'expiryDate' => $row['membership_expiry'] ?: null
    ];
    
    echo "\nAPI Response that would be sent:\n";
    echo json_encode($apiResponse, JSON_PRETTY_PRINT);
    echo "\n\nSpecifically membershipNumber: " . ($apiResponse['membershipNumber'] ?? 'NULL') . "\n";
} else {
    echo "User 26 not found!\n";
}
?>
