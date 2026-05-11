<?php
$pdo = new PDO('mysql:host=localhost;dbname=next_auth', 'root', '');
$stmt = $pdo->query('DESCRIBE memberships');
$columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($columns as $col) {
    echo $col['Field'] . ' - ' . $col['Type'] . PHP_EOL;
}
?>
