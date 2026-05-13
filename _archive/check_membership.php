<?php
require_once 'config.php';
require_once 'Database.php';

$database = new Database();
$db = $database->getConnection();

echo "Checking membership for user ID 26...\n\n";

// Check if user has membership record
$stmt = $db->prepare("SELECT * FROM memberships WHERE user_id = ?");
$stmt->execute([26]);

if ($stmt->rowCount() > 0) {
    $membership = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "✓ Membership record found:\n";
    echo "========================\n";
    foreach ($membership as $key => $value) {
        echo "$key: $value\n";
    }
} else {
    echo "❌ No membership record found for user ID 26\n";
    echo "Creating membership record...\n";
    
    // Create a membership record
    $membershipNumber = 'TLA' . str_pad((string)rand(1, 9999), 4, '0', STR_PAD_LEFT);
    
    $stmt = $db->prepare('
        INSERT INTO memberships (
            user_id, membership_number, membership_type, status, join_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    ');
    
    $result = $stmt->execute([
        26,
        $membershipNumber,
        'personal',
        'active',
        date('Y-m-d')
    ]);
    
    if ($result) {
        echo "✓ Membership record created with number: $membershipNumber\n";
    } else {
        echo "❌ Failed to create membership record\n";
    }
}
?>
