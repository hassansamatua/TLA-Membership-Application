<?php
require_once 'config.php';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== Checking date_of_birth for user ID 29 ===\n";
    
    $stmt = $pdo->prepare('SELECT date_of_birth, place_of_birth, personal_info FROM user_profiles WHERE user_id = ?');
    $stmt->execute([29]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($profile) {
        echo "date_of_birth: " . $profile['date_of_birth'] . "\n";
        echo "place_of_birth: " . $profile['place_of_birth'] . "\n";
        echo "personal_info: " . $profile['personal_info'] . "\n";
        
        // Parse the personal_info JSON
        if ($profile['personal_info']) {
            $personalInfo = json_decode($profile['personal_info'], true);
            if ($personalInfo) {
                echo "\n--- From personal_info JSON ---\n";
                echo "dateOfBirth: " . ($personalInfo['dateOfBirth'] ?? 'not found') . "\n";
                echo "date_of_birth: " . ($personalInfo['date_of_birth'] ?? 'not found') . "\n";
                echo "placeOfBirth: " . ($personalInfo['placeOfBirth'] ?? 'not found') . "\n";
            }
        }
    } else {
        echo "No profile found for user ID 29\n";
    }
    
} catch (PDOException $e) {
    echo 'Error: ' . $e->getMessage() . PHP_EOL;
}
?>
