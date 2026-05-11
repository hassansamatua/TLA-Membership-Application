<?php
require_once 'Database.php';

$database = new Database();
$db = $database->getConnection();

echo "=== USER_PROFILES TABLE STRUCTURE ===\n";

$stmt = $db->query("DESCRIBE user_profiles");
while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo $row['Field'] . " - " . $row['Type'] . " - " . $row['Null'] . " - " . $row['Default'] . "\n";
}

echo "\n=== CURRENT DATA ===\n";
$stmt2 = $db->query("SELECT * FROM user_profiles LIMIT 3");
while($row = $stmt2->fetch(PDO::FETCH_ASSOC)) {
    echo "User ID: " . $row['user_id'] . ", Membership Number: " . ($row['membership_number'] ?? 'NULL') . "\n";
}
?>
