<?php
$host = 'localhost';
$user = 'root';
$password = 'hansco123';
$database = 'next_auth';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$database", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Tables in next_auth database:\n";
    
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    foreach ($tables as $table) {
        echo "- $table\n";
        
        // Check if this table might contain tokens
        if (strpos($table, 'token') !== false || strpos($table, 'session') !== false || strpos($table, 'auth') !== false) {
            $stmt2 = $pdo->query("SELECT COUNT(*) as count FROM $table");
            $count = $stmt2->fetchColumn();
            echo "  Records: $count\n";
            
            if ($count > 0 && $count < 10) {
                $stmt2 = $pdo->query("SELECT * FROM $table LIMIT 3");
                $records = $stmt2->fetchAll(PDO::FETCH_ASSOC);
                foreach ($records as $record) {
                    echo "  " . json_encode($record, JSON_PRETTY_PRINT) . "\n";
                }
            }
        }
    }
    
} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
}
?>
