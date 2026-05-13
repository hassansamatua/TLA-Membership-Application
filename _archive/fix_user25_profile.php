<?php
// Fix the existing profile for user 25 with proper data
$host = 'localhost';
$dbname = 'next_auth';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Fixing profile for user 25 (Jafar Juma Jafar)...\n";
    
    // Update the existing record with missing data
    $stmt = $pdo->prepare('
        UPDATE user_profiles SET 
            phone = ?, 
            address = ?, 
            postal_code = ?, 
            industry = ?,
            years_of_experience = ?,
            skills = ?,
            highest_degree = ?,
            institution = ?,
            field_of_study = ?,
            year_of_graduation = ?,
            additional_certifications = ?,
            nationality = ?,
            place_of_birth = ?,
            personal_info = ?,
            contact_info = ?,
            education = ?,
            employment = ?,
            updated_at = NOW()
        WHERE user_id = 25
    ');
    
    $personalInfo = json_encode([
        'fullName' => 'Jafar Juma Jafar',
        'name' => 'Jafar Juma Jafar',
        'gender' => 'male',
        'dateOfBirth' => '1990-01-01',
        'nationality' => 'Tanzanian',
        'placeOfBirth' => 'Mbeya'
    ]);
    
    $contactInfo = json_encode([
        'phone' => '0626776318',
        'address' => 'P.O. Box 123, Chunya',
        'city' => 'Chunya',
        'state' => 'Mbeya',
        'country' => 'Tanzania',
        'postalCode' => '12345'
    ]);
    
    $education = json_encode([
        [
            'highestDegree' => 'Bachelor of Library Science',
            'institution' => 'Muhimbili University of Health and Allied Sciences (MUHAS)',
            'fieldOfStudy' => 'Library and Information Science',
            'yearOfGraduation' => '2018'
        ]
    ]);
    
    $employment = json_encode([
        [
            'jobTitle' => 'Librarian',
            'company' => 'Muhimbili University of Health and Allied Sciences (MUHAS)',
            'industry' => 'Education & Library Services',
            'yearsOfExperience' => '5',
            'occupation' => 'Librarian'
        ]
    ]);
    
    $result = $stmt->execute([
        '0626776318',                          // phone
        'P.O. Box 123, Chunya',                // address
        '12345',                               // postal_code
        'Education & Library Services',           // industry
        5,                                     // years_of_experience
        'Cataloging, Research, Digital Archives, Information Management, Student Support', // skills
        'Bachelor of Library Science',         // highest_degree
        'Muhimbili University of Health and Allied Sciences (MUHAS)', // institution
        'Library and Information Science',      // field_of_study
        2018,                                  // year_of_graduation
        'Professional Librarian Certification, Digital Library Management', // additional_certifications
        'Tanzanian',                           // nationality
        'Mbeya',                                // place_of_birth
        $personalInfo,                          // personal_info
        $contactInfo,                          // contact_info
        $education,                             // education
        $employment,                            // employment
    ]);
    
    if ($result) {
        echo "✓ Profile updated successfully for user 25!\n";
        
        // Verify the updated profile
        $stmt = $pdo->prepare('SELECT * FROM user_profiles WHERE user_id = 25');
        $stmt->execute();
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo "\nUpdated profile summary:\n";
        echo "========================\n";
        echo "Name: Jafar Juma Jafar\n";
        echo "Phone: " . $profile['phone'] . "\n";
        echo "Address: " . $profile['address'] . "\n";
        echo "City: " . $profile['city'] . "\n";
        echo "State: " . $profile['state'] . "\n";
        echo "Country: " . $profile['country'] . "\n";
        echo "Gender: " . $profile['gender'] . "\n";
        echo "Nationality: " . $profile['nationality'] . "\n";
        echo "Place of Birth: " . json_decode($profile['personal_info'])->placeOfBirth . "\n";
        echo "Job Title: " . $profile['job_title'] . "\n";
        echo "Company: " . $profile['company'] . "\n";
        echo "Industry: " . $profile['industry'] . "\n";
        echo "Years of Experience: " . $profile['years_of_experience'] . "\n";
        echo "Highest Degree: " . $profile['highest_degree'] . "\n";
        echo "Institution: " . $profile['institution'] . "\n";
        echo "Field of Study: " . $profile['field_of_study'] . "\n";
        echo "Year of Graduation: " . $profile['year_of_graduation'] . "\n";
        echo "Skills: " . $profile['skills'] . "\n";
        echo "Additional Certifications: " . $profile['additional_certifications'] . "\n";
        
        echo "\n✅ Now refresh localhost:3000/admin/users/25 to see the updated profile!\n";
        
    } else {
        echo "❌ Failed to update profile for user 25\n";
        print_r($stmt->errorInfo());
    }
    
} catch (PDOException $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
}
?>
