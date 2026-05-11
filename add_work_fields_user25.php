<?php
// Add missing work-related fields for user 25
$host = 'localhost';
$dbname = 'next_auth';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Adding missing work fields for user 25...\n";
    
    // Update employment JSON to include work-specific fields
    $stmt = $pdo->prepare('
        UPDATE user_profiles SET 
            work_phone = ?,
            work_email = ?,
            work_address = ?,
            employment = ?,
            updated_at = NOW()
        WHERE user_id = 25
    ');
    
    $employment = json_encode([
        [
            'jobTitle' => 'Librarian',
            'company' => 'Muhimbili University of Health and Allied Sciences (MUHAS)',
            'industry' => 'Education & Library Services',
            'yearsOfExperience' => '5',
            'occupation' => 'Librarian',
            'workPhone' => '0626776318',
            'workEmail' => 'jafar@muhas.ac.tz',
            'workAddress' => 'Muhimbili University of Health and Allied Sciences, Library Department, Dar es Salaam, Tanzania'
        ]
    ]);
    
    $result = $stmt->execute([
        '0626776318',                                    // work_phone
        'jafar@muhas.ac.tz',                              // work_email
        'Muhimbili University of Health and Allied Sciences, Library Department, Dar es Salaam, Tanzania', // work_address
        $employment                                         // employment (JSON)
    ]);
    
    if ($result) {
        echo "✓ Work fields added successfully for user 25!\n";
        
        // Verify the updated profile
        $stmt = $pdo->prepare('SELECT work_phone, work_email, work_address, employment FROM user_profiles WHERE user_id = 25');
        $stmt->execute();
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo "\nUpdated work fields:\n";
        echo "===================\n";
        echo "Work Phone: " . $profile['work_phone'] . "\n";
        echo "Work Email: " . $profile['work_email'] . "\n";
        echo "Work Address: " . $profile['work_address'] . "\n";
        echo "Employment JSON: " . $profile['employment'] . "\n";
        
        echo "\n✅ Now refresh localhost:3000/admin/users/25 to see all work information!\n";
        
    } else {
        echo "❌ Failed to add work fields for user 25\n";
        print_r($stmt->errorInfo());
    }
    
} catch (PDOException $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
}
?>
