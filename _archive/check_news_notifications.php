<?php
require_once 'config.php';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== Checking news_notifications table ===\n";
    
    $stmt = $pdo->query('SELECT COUNT(*) as count FROM news_notifications');
    $count = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Total notifications: " . $count['count'] . "\n";
    
    if ($count['count'] > 0) {
        echo "\n=== Recent notifications ===\n";
        $stmt = $pdo->query('SELECT id, title, is_active, expires_at FROM news_notifications ORDER BY id DESC LIMIT 5');
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            echo "ID: " . $row['id'] . " - " . $row['title'] . " (Active: " . $row['is_active'] . ", Expires: " . $row['expires_at'] . ")\n";
        }
    } else {
        echo "❌ No notifications found in database\n";
        echo "Creating sample notification...\n";
        
        $insertSql = "
        INSERT INTO news_notifications (title, message, type, priority, sender_id, target_audience, is_active, sent_at) 
        VALUES ('Welcome to TLA', 'Thank you for joining the Tanzania Library Association!', 'announcement', 'medium', 1, 'all', 1, NOW())
        ";
        
        $pdo->exec($insertSql);
        echo "✅ Sample notification created\n";
    }
    
} catch (PDOException $e) {
    echo 'Error: ' . $e->getMessage() . PHP_EOL;
}
?>
