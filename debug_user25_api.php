<?php
// Debug what API would return for user 25
$host = 'localhost';
$dbname = 'next_auth';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Debugging API response for user 25...\n\n";
    
    // Get user basic info
    $stmt = $pdo->prepare('SELECT id, name, email, is_admin, is_approved, created_at, updated_at, membership_number FROM users WHERE id = ?');
    $stmt->execute([25]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "User Info:\n";
    echo "==========\n";
    print_r($user);
    echo "\n";
    
    // Get profile data (same as API)
    $stmt = $pdo->query('SHOW COLUMNS FROM user_profiles');
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $profileColumnSet = [];
    foreach ($columns as $col) {
        $profileColumnSet[] = $col['Field'];
    }
    
    $selectFields = [
        'personal_info', 'contact_info', 'professional_info', 'membership_info',
        'membership_type', 'membership_number', 'membership_status', 'join_date',
        'education', 'employment', 'highest_degree', 'institution', 'year_of_graduation',
        'skills', 'job_title', 'current_position', 'company', 'work_email',
        'work_phone', 'years_of_experience', 'gender', 'date_of_birth', 'nationality',
        'place_of_birth', 'profile_picture', 'phone', 'address', 'city', 'state',
        'postal_code', 'country', 'facebook', 'twitter', 'linkedin', 'instagram', 'github',
        'work_address'  // Add this field
    ];
    
    $validFields = array_intersect($selectFields, $profileColumnSet);
    echo "Fields that will be selected: " . implode(', ', $validFields) . "\n\n";
    
    $stmt = $pdo->prepare('SELECT ' . implode(', ', $validFields) . ' FROM user_profiles WHERE user_id = 25');
    $stmt->execute([25]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "Profile Data:\n";
    echo "=============\n";
    print_r($profile);
    echo "\n";
    
    // Parse JSON like API does
    $safeJsonParse = function($jsonString) {
        if (!$jsonString) return [];
        if (is_object($jsonString)) return $jsonString;
        try {
            return json_decode($jsonString, true);
        } catch (Exception $e) {
            return [];
        }
    };
    
    $employmentInfo = $safeJsonParse($profile['employment'] ?? '{}');
    echo "Parsed Employment Info:\n";
    echo "======================\n";
    print_r($employmentInfo);
    echo "\n";
    
    // Simulate what API would return for employmentInfo
    $apiEmploymentInfo = [
        'currentJobTitle' => $employmentInfo['currentJobTitle'] ?? $employmentInfo['jobTitle'] ?? $profile['job_title'] ?? '',
        'currentCompany' => $employmentInfo['currentCompany'] ?? $employmentInfo['company'] ?? $profile['company'] ?? '',
        'currentIndustry' => $employmentInfo['currentIndustry'] ?? $employmentInfo['industry'] ?? $profile['industry'] ?? '',
        'workExperience' => $employmentInfo['workExperience'] ?? $employmentInfo['yearsOfExperience'] ?? $profile['years_of_experience'] ?? '',
        'workAddress' => $employmentInfo['workAddress'] ?? $employmentInfo['work_address'] ?? $profile['work_address'] ?? '',
        'workPhone' => $employmentInfo['workPhone'] ?? $employmentInfo['work_phone'] ?? $profile['work_phone'] ?? '',
        'workEmail' => $employmentInfo['workEmail'] ?? $employmentInfo['work_email'] ?? $profile['work_email'] ?? ''
    ];
    
    echo "API Employment Info Response:\n";
    echo "===========================\n";
    print_r($apiEmploymentInfo);
    
} catch (PDOException $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
}
?>
