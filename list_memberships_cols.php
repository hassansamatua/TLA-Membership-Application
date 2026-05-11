<?php
$pdo = new PDO('mysql:host=localhost;dbname=next_auth', 'root', '');
$stmt = $pdo->query('DESCRIBE memberships');
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo $row['Field'] . PHP_EOL;
}
?>
