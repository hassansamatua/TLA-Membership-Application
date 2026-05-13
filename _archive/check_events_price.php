<?php
require_once 'config.php';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== Checking events table for price data ===\n";
    
    $stmt = $pdo->query('SELECT id, title, price, is_free FROM events ORDER BY id DESC LIMIT 10');
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($events) > 0) {
        echo "Found " . count($events) . " events:\n\n";
        foreach ($events as $event) {
            echo "ID: " . $event['id'] . " - " . $event['title'] . "\n";
            echo "  Price: " . $event['price'] . "\n";
            echo "  Is Free: " . $event['is_free'] . "\n";
            echo "  Display: " . ($event['is_free'] ? 'Free' : 'TZS ' . number_format($event['price'])) . "\n\n";
        }
    } else {
        echo "❌ No events found in database\n";
        
        // Create sample event with proper price
        echo "Creating sample event...\n";
        $insertSql = "
        INSERT INTO events (title, description, date, time, location, max_attendees, price, is_free, status, start_time, end_time, created_at, updated_at) 
        VALUES (
            'Annual Library Conference 2026', 
            'Join us for the biggest library conference of the year featuring keynote speakers, workshops, and networking opportunities.', 
            '2026-06-15', 
            '09:00:00', 
            'Dar es Salaam International Conference Centre', 
            200, 
            50000, 
            0, 
            'upcoming', 
            '2026-06-15 09:00:00', 
            '2026-06-15 17:00:00', 
            NOW(), 
            NOW()
        )
        ";
        
        $pdo->exec($insertSql);
        echo "✅ Sample event created with price TZS 50,000\n";
    }
    
} catch (PDOException $e) {
    echo 'Error: ' . $e->getMessage() . PHP_EOL;
}
?>
