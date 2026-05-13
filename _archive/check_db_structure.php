<?php
require_once 'config.php';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== user_profiles table structure ===" . PHP_EOL;
    $stmt = $pdo->query('DESCRIBE user_profiles');
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo $row['Field'] . ' - ' . $row['Type'] . PHP_EOL;
    }
    
    echo PHP_EOL . "=== Current user profile for ID 29 ===" . PHP_EOL;
    $stmt = $pdo->prepare('SELECT * FROM user_profiles WHERE user_id = ?');
    $stmt->execute([29]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($profile) {
        foreach ($profile as $key => $value) {
            echo "$key: $value" . PHP_EOL;
        }
    } else {
        echo "No profile found for user ID 29" . PHP_EOL;
    }
    
} catch (PDOException $e) {
    echo 'Error: ' . $e->getMessage() . PHP_EOL;
}
?>
