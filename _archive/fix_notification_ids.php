<?php
require_once 'config.php';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== Fixing news notification IDs ===\n";
    
    // Get all notifications with ID 0
    $stmt = $pdo->query('SELECT * FROM news_notifications WHERE id = 0');
    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($notifications) > 0) {
        echo "Found " . count($notifications) . " notifications with ID 0\n";
        
        // Get the next available ID
        $stmt = $pdo->query('SELECT MAX(id) as max_id FROM news_notifications');
        $maxId = $stmt->fetch(PDO::FETCH_ASSOC);
        $nextId = ($maxId['max_id'] ?? 0) + 1;
        
        echo "Starting ID assignment from: " . $nextId . "\n";
        
        foreach ($notifications as $notification) {
            // Update the notification ID
            $updateStmt = $pdo->prepare('UPDATE news_notifications SET id = ? WHERE id = 0 AND title = ? AND message = ?');
            $updateStmt->execute([$nextId, $notification['title'], $notification['message']]);
            
            echo "Updated notification: " . $notification['title'] . " -> ID: " . $nextId . "\n";
            $nextId++;
        }
        
        echo "✅ All notification IDs fixed\n";
    } else {
        echo "✅ No notifications with ID 0 found\n";
    }
    
    // Show updated notifications
    echo "\n=== Updated notifications ===\n";
    $stmt = $pdo->query('SELECT id, title, is_active, expires_at FROM news_notifications ORDER BY id DESC');
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "ID: " . $row['id'] . " - " . $row['title'] . " (Active: " . $row['is_active'] . ")\n";
    }
    
} catch (PDOException $e) {
    echo 'Error: ' . $e->getMessage() . PHP_EOL;
}
?>
