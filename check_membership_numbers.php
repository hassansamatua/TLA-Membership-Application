<?php
require_once 'Database.php';

$db = new Database();
$conn = $db->getConnection();

echo "Checking membership numbers in user_profiles table:\n";
echo "===============================================\n";

$stmt = $conn->query('SELECT u.id, u.name, u.email, up.membership_number FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id ORDER BY u.id LIMIT 10');

while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo 'User ID: ' . $row['id'] . ', Name: ' . $row['name'] . ', Email: ' . $row['email'] . ', Membership Number: ' . ($row['membership_number'] ?? 'NULL') . PHP_EOL;
}

echo "\nChecking if user_profiles table exists and has data:\n";
echo "================================================\n";

$stmt2 = $conn->query('SELECT COUNT(*) as total FROM user_profiles');
$count = $stmt2->fetch(PDO::FETCH_ASSOC);
echo 'Total records in user_profiles: ' . $count['total'] . PHP_EOL;

$stmt3 = $conn->query('SELECT COUNT(*) as null_count FROM user_profiles WHERE membership_number IS NULL OR membership_number = ""');
$nullCount = $stmt3->fetch(PDO::FETCH_ASSOC);
echo 'Records with NULL/empty membership_number: ' . $nullCount['null_count'] . PHP_EOL;
?>
