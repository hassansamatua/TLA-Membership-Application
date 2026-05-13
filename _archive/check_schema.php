<?php
$conn = new mysqli('localhost', 'root', '', 'next_auth');
if ($conn->connect_error) die('Connection failed: ' . $conn->connect_error);

echo "=== MEMBERSHIPS TABLE ===\n";
$result = $conn->query('DESCRIBE memberships');
while ($row = $result->fetch_assoc()) {
  echo $row['Field'] . ' | ' . $row['Type'] . ' | ' . $row['Null'] . ' | ' . $row['Default'] . "\n";
}

echo "\n=== PAYMENTS TABLE ===\n";
$result = $conn->query('DESCRIBE payments');
while ($row = $result->fetch_assoc()) {
  echo $row['Field'] . ' | ' . $row['Type'] . ' | ' . $row['Null'] . ' | ' . $row['Default'] . "\n";
}

echo "\n=== MEMBERSHIP_PAYMENTS TABLE ===\n";
$result = $conn->query('DESCRIBE membership_payments');
while ($row = $result->fetch_assoc()) {
  echo $row['Field'] . ' | ' . $row['Type'] . ' | ' . $row['Null'] . ' | ' . $row['Default'] . "\n";
}

$conn->close();
?>
