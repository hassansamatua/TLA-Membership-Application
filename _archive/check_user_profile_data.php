<?php
// Check what profile data is available for the current user
require_once 'Database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    echo "=== Checking User Profile Data ===\n\n";
    
    // Get a sample user (let's use user 34 since we know they exist)
    $stmt = $conn->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([34]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo "❌ User 34 not found\n";
        exit;
    }
    
    echo "User 34 ({$user['name']}):\n";
    
    // Check each field that the dashboard calculation looks for
    $fields = [
        'name' => 'Name',
        'date_of_birth' => 'Date of Birth', 
        'phone' => 'Phone',
        'address' => 'Address',
        'employment' => 'Employment',
        'education' => 'Education',
        'membership_status' => 'Membership Status',
        'profile_picture' => 'Profile Picture',
        'id_proof_path' => 'ID Proof Path'
    ];
    
    $completedFields = 0;
    $totalFields = count($fields);
    
    echo "\nField Analysis:\n";
    foreach ($fields as $field => $label) {
        $value = $user[$field] ?? null;
        $hasValue = !empty($value);
        
        if ($hasValue) {
            $completedFields++;
            echo "   ✅ {$label}: " . (is_string($value) && strlen($value) > 50 ? substr($value, 0, 50) . '...' : $value) . "\n";
        } else {
            echo "   ❌ {$label}: EMPTY\n";
        }
    }
    
    // Special handling for JSON fields
    echo "\nJSON Field Analysis:\n";
    
    if (!empty($user['employment'])) {
        try {
            $employment = json_decode($user['employment'], true);
            if ($employment && isset($employment['occupation']) && !empty($employment['occupation'])) {
                echo "   ✅ Employment has occupation: {$employment['occupation']}\n";
            } else {
                echo "   ❌ Employment missing occupation\n";
            }
        } catch (Exception $e) {
            echo "   ❌ Employment JSON invalid\n";
        }
    }
    
    if (!empty($user['education'])) {
        try {
            $education = json_decode($user['education'], true);
            if ($education && is_array($education) && count($education) > 0) {
                echo "   ✅ Education has " . count($education) . " entries\n";
            } else {
                echo "   ❌ Education empty or invalid\n";
            }
        } catch (Exception $e) {
            echo "   ❌ Education JSON invalid\n";
        }
    }
    
    $percentage = round(($completedFields / $totalFields) * 100);
    echo "\n=== CALCULATION ===\n";
    echo "Completed Fields: {$completedFields}/{$totalFields}\n";
    echo "Profile Completion: {$percentage}%\n";
    
    if ($percentage < 100) {
        echo "\n⚠️ Profile is not complete. Missing fields need to be filled.\n";
    } else {
        echo "\n✅ Profile should be complete!\n";
    }
    
    // Also check user_profiles table
    echo "\n=== Checking user_profiles table ===\n";
    $stmt = $conn->prepare("SELECT * FROM user_profiles WHERE user_id = ?");
    $stmt->execute([34]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($profile) {
        echo "Found user_profiles record:\n";
        foreach ($profile as $key => $value) {
            if (!empty($value)) {
                echo "   ✅ {$key}: " . (is_string($value) && strlen($value) > 50 ? substr($value, 0, 50) . '...' : $value) . "\n";
            } else {
                echo "   ❌ {$key}: EMPTY\n";
            }
        }
    } else {
        echo "❌ No user_profiles record found\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
