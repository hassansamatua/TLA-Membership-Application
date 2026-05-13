<?php
require_once 'config.php';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== Checking if user_notification_reads table exists ===\n";
    
    $stmt = $pdo->query('SHOW TABLES LIKE "user_notification_reads"');
    $table = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($table) {
        echo "✅ user_notification_reads table exists\n";
        
        echo "\n=== Table structure ===\n";
        $stmt = $pdo->query('DESCRIBE user_notification_reads');
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            echo $row['Field'] . ' - ' . $row['Type'] . PHP_EOL;
        }
    } else {
        echo "❌ user_notification_reads table does not exist\n";
        echo "Creating table...\n";
        
        $createTableSql = "
        CREATE TABLE user_notification_reads (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            notification_id INT NOT NULL,
            read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_notification (user_id, notification_id),
            KEY idx_user_id (user_id),
            KEY idx_notification_id (notification_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (notification_id) REFERENCES news_notifications(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        $pdo->exec($createTableSql);
        echo "✅ user_notification_reads table created successfully\n";
    }
    
} catch (PDOException $e) {
    echo 'Error: ' . $e->getMessage() . PHP_EOL;
}
?>
