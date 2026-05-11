<?php
require_once 'config.php';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== Checking events table structure ===\n";
    
    $stmt = $pdo->query('DESCRIBE events');
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Table columns:\n";
    foreach ($columns as $column) {
        echo $column['Field'] . ' - ' . $column['Type'] . PHP_EOL;
    }
    
    echo "\n=== Checking if events table has data ===\n";
    $stmt = $pdo->query('SELECT COUNT(*) as count FROM events');
    $count = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Total events: " . $count['count'] . "\n";
    
    if ($count['count'] > 0) {
        echo "\n=== Sample event data ===\n";
        $stmt = $pdo->query('SELECT * FROM events LIMIT 3');
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($events as $event) {
            echo "Event ID: " . $event['id'] . "\n";
            foreach ($event as $key => $value) {
                echo "  $key: $value\n";
            }
            echo "\n";
        }
    }
    
} catch (PDOException $e) {
    echo 'Error: ' . $e->getMessage() . PHP_EOL;
}
?>
