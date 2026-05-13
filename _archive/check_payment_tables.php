<?php
$pdo = new PDO('mysql:host=localhost;dbname=next_auth', 'root', '');
echo "=== MEMBERSHIP_PAYMENTS COLUMNS ===\n";
$stmt = $pdo->query('DESCRIBE membership_payments');
$columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($columns as $col) {
    echo $col['Field'] . ' - ' . $col['Type'] . PHP_EOL;
}

echo "\n=== PAYMENTS COLUMNS ===\n";
$stmt = $pdo->query('DESCRIBE payments');
$columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($columns as $col) {
    echo $col['Field'] . ' - ' . $col['Type'] . PHP_EOL;
}
?>
