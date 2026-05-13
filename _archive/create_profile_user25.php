<?php
// Create profile for user 25 (Jafar Juma Jafar)
$host = 'localhost';
$dbname = 'next_auth';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Creating profile for user 25 (Jafar Juma Jafar)...\n";
    
    // Insert profile with sample data based on existing patterns
    $stmt = $pdo->prepare('
        INSERT INTO user_profiles (
            user_id, phone, address, city, state, postal_code, country,
            job_title, company, industry, years_of_experience, skills,
            highest_degree, institution, field_of_study, year_of_graduation,
            additional_certifications, date_of_birth, gender, nationality,
            place_of_birth, personal_info, contact_info, education, employment,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ');
    
    $personalInfo = json_encode([
        'fullName' => 'Jafar Juma Jafar',
        'name' => 'Jafar Juma Jafar',
        'gender' => 'male',
        'dateOfBirth' => '1985-01-01',
        'nationality' => 'Tanzanian'
    ]);
    
    $contactInfo = json_encode([
        'phone' => '0626776318',
        'address' => '123 Main Street',
        'city' => 'Dar es Salaam',
        'country' => 'Tanzania'
    ]);
    
    $education = json_encode([
        [
            'highestDegree' => 'Bachelor of Library Science',
            'institution' => 'University of Dar es Salaam',
            'fieldOfStudy' => 'Library Science',
            'yearOfGraduation' => '2010'
        ]
    ]);
    
    $employment = json_encode([
        [
            'jobTitle' => 'Librarian',
            'company' => 'National Library',
            'industry' => 'Education',
            'yearsOfExperience' => '10'
        ]
    ]);
    
    $result = $stmt->execute([
        25,                                    // user_id
        '0626776318',                          // phone
        '123 Main Street',                     // address
        'Dar es Salaam',                       // city
        'Dar es Salaam',                       // state
        '12345',                               // postal_code
        'Tanzania',                            // country
        'Librarian',                           // job_title
        'National Library',                    // company
        'Education',                           // industry
        10,                                    // years_of_experience
        'Cataloging, Research, Digital Archives', // skills
        'Bachelor of Library Science',         // highest_degree
        'University of Dar es Salaam',        // institution
        'Library Science',                     // field_of_study
        2010,                                  // year_of_graduation
        'Professional Librarian Certification', // additional_certifications
        '1985-01-01',                         // date_of_birth
        'male',                                // gender
        'Tanzanian',                           // nationality
        'Dar es Salaam',                       // place_of_birth
        $personalInfo,                          // personal_info
        $contactInfo,                          // contact_info
        $education,                             // education
        $employment,                            // employment
    ]);
    
    if ($result) {
        echo "✓ Profile created successfully for user 25!\n";
        
        // Verify the created profile
        $stmt = $pdo->prepare('SELECT * FROM user_profiles WHERE user_id = 25');
        $stmt->execute();
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo "\nCreated profile data:\n";
        echo "====================\n";
        echo "User ID: " . $profile['user_id'] . "\n";
        echo "Name: " . json_decode($profile['personal_info'])->fullName . "\n";
        echo "Phone: " . $profile['phone'] . "\n";
        echo "Address: " . $profile['address'] . "\n";
        echo "City: " . $profile['city'] . "\n";
        echo "Country: " . $profile['country'] . "\n";
        echo "Job Title: " . $profile['job_title'] . "\n";
        echo "Company: " . $profile['company'] . "\n";
        echo "Industry: " . $profile['industry'] . "\n";
        echo "Highest Degree: " . $profile['highest_degree'] . "\n";
        echo "Institution: " . $profile['institution'] . "\n";
        echo "Field of Study: " . $profile['field_of_study'] . "\n";
        echo "Year of Graduation: " . $profile['year_of_graduation'] . "\n";
        echo "Skills: " . $profile['skills'] . "\n";
        
    } else {
        echo "❌ Failed to create profile for user 25\n";
        print_r($stmt->errorInfo());
    }
    
} catch (PDOException $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
}
?>
