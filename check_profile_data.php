<?php
require_once 'config.php';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== Checking profile data for user ID 29 ===\n";
    
    $stmt = $pdo->prepare('SELECT employment, education, membership_number FROM user_profiles WHERE user_id = ?');
    $stmt->execute([29]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($profile) {
        echo "employment: " . $profile['employment'] . "\n";
        echo "education: " . $profile['education'] . "\n";
        echo "membership_number: " . $profile['membership_number'] . "\n";
        
        // Parse employment JSON
        if ($profile['employment']) {
            $employment = json_decode($profile['employment'], true);
            if ($employment) {
                echo "\n--- From employment JSON ---\n";
                echo "yearsOfExperience: " . ($employment['yearsOfExperience'] ?? 'not found') . "\n";
                echo "occupation: " . ($employment['occupation'] ?? 'not found') . "\n";
            }
        }
        
        // Parse education JSON
        if ($profile['education']) {
            $education = json_decode($profile['education'], true);
            if ($education && is_array($education) && count($education) > 0) {
                echo "\n--- From education JSON ---\n";
                $firstEducation = $education[0];
                echo "highestDegree: " . ($firstEducation['highestDegree'] ?? 'not found') . "\n";
                echo "institution: " . ($firstEducation['institution'] ?? 'not found') . "\n";
                echo "yearOfGraduation: " . ($firstEducation['yearOfGraduation'] ?? 'not found') . "\n";
            }
        }
    } else {
        echo "No profile found for user ID 29\n";
    }
    
} catch (PDOException $e) {
    echo 'Error: ' . $e->getMessage() . PHP_EOL;
}
?>
