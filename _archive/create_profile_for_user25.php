<?php
require_once 'Database.php';

$db = new Database();
$conn = $db->getConnection();

// Check if profile already exists for user 25
$stmt = $conn->prepare('SELECT id FROM user_profiles WHERE user_id = 25');
$stmt->execute();
$existing = $stmt->fetch(PDO::FETCH_ASSOC);

if ($existing) {
    echo "Profile already exists for user 25 with ID: " . $existing['id'] . "\n";
    
    // Show current data
    $stmt = $conn->prepare('SELECT * FROM user_profiles WHERE user_id = 25');
    $stmt->execute();
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "\nCurrent profile data:\n";
    echo "===================\n";
    foreach ($profile as $key => $value) {
        if ($value !== null && $value !== '') {
            echo "$key: $value\n";
        }
    }
} else {
    echo "Creating new profile for user 25...\n";
    
    // Insert a basic profile with some sample data
    $stmt = $conn->prepare('
        INSERT INTO user_profiles (
            user_id, 
            gender, 
            date_of_birth, 
            nationality, 
            phone, 
            address, 
            city, 
            country,
            job_title,
            company,
            industry,
            highest_degree,
            institution,
            field_of_study,
            year_of_graduation,
            skills,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ');
    
    $result = $stmt->execute([
        25,                                    // user_id
        'Male',                                // gender
        '1990-05-15',                          // date_of_birth
        'Tanzanian',                           // nationality
        '0626776318',                          // phone
        '123 Main Street',                     // address
        'Dar es Salaam',                       // city
        'Tanzania',                            // country
        'Librarian',                           // job_title
        'National Library',                    // company
        'Education',                           // industry
        'Bachelor of Library Science',         // highest_degree
        'University of Dar es Salaam',        // institution
        'Library Science',                     // field_of_study
        '2020',                                // year_of_graduation
        'Cataloging, Research, Digital Archives' // skills
    ]);
    
    if ($result) {
        echo "Profile created successfully for user 25!\n";
    } else {
        echo "Failed to create profile for user 25\n";
    }
}
?>
