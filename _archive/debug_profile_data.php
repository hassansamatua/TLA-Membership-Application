<?php
// Simple debug script to check profile data without requiring Database.php
$host = 'localhost';
$dbname = 'next_auth';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Checking user_profiles table for user_id 25...\n\n";
    
    // Check if table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'user_profiles'");
    $tableExists = $stmt->rowCount() > 0;
    
    if (!$tableExists) {
        echo "ERROR: user_profiles table does not exist!\n";
        exit;
    }
    
    // Check if profile exists for user 25
    $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM user_profiles WHERE user_id = 25');
    $stmt->execute();
    $count = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "Profile records for user 25: " . $count['count'] . "\n\n";
    
    if ($count['count'] > 0) {
        // Get all data for user 25
        $stmt = $pdo->prepare('SELECT * FROM user_profiles WHERE user_id = 25');
        $stmt->execute();
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo "Profile data for user 25:\n";
        echo "========================\n";
        
        foreach ($profile as $key => $value) {
            if ($value !== null && $value !== '') {
                echo "$key: $value\n";
            } else {
                echo "$key: [NULL/EMPTY]\n";
            }
        }
    } else {
        echo "No profile found for user 25. Creating one...\n";
        
        // Insert basic profile
        $stmt = $pdo->prepare('
            INSERT INTO user_profiles (
                user_id, gender, date_of_birth, nationality, phone, address, city, country,
                job_title, company, industry, highest_degree, institution, field_of_study,
                year_of_graduation, skills, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ');
        
        $result = $stmt->execute([
            25, 'Male', '1990-05-15', 'Tanzanian', '0626776318', '123 Main Street', 
            'Dar es Salaam', 'Tanzania', 'Librarian', 'National Library', 'Education',
            'Bachelor of Library Science', 'University of Dar es Salaam', 'Library Science',
            '2020', 'Cataloging, Research, Digital Archives'
        ]);
        
        if ($result) {
            echo "Profile created successfully!\n";
            
            // Show the created data
            $stmt = $pdo->prepare('SELECT * FROM user_profiles WHERE user_id = 25');
            $stmt->execute();
            $profile = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo "\nCreated profile data:\n";
            echo "====================\n";
            foreach ($profile as $key => $value) {
                if ($value !== null && $value !== '') {
                    echo "$key: $value\n";
                }
            }
        } else {
            echo "Failed to create profile\n";
        }
    }
    
} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
}
?>
