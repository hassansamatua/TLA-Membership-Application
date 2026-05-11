<?php
// Add missing work-related columns to user_profiles table
$host = 'localhost';
$dbname = 'next_auth';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Adding missing work columns to user_profiles table...\n\n";
    
    // Check current columns
    $stmt = $pdo->query('SHOW COLUMNS FROM user_profiles');
    $existingColumns = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $existingColumns[] = $row['Field'];
    }
    
    echo "Current columns: " . implode(', ', $existingColumns) . "\n\n";
    
    // Columns to add
    $columnsToAdd = [
        'work_phone' => 'VARCHAR(255) DEFAULT NULL',
        'work_email' => 'VARCHAR(255) DEFAULT NULL', 
        'work_address' => 'TEXT DEFAULT NULL'
    ];
    
    foreach ($columnsToAdd as $column => $definition) {
        if (!in_array($column, $existingColumns)) {
            echo "Adding column: $column\n";
            try {
                $sql = "ALTER TABLE user_profiles ADD COLUMN $column $definition";
                $pdo->exec($sql);
                echo "✓ Added $column\n";
            } catch (PDOException $e) {
                echo "❌ Failed to add $column: " . $e->getMessage() . "\n";
            }
        } else {
            echo "✓ $column already exists\n";
        }
    }
    
    echo "\nNow updating user 25 with work data...\n";
    
    // Update user 25 with work data
    $stmt = $pdo->prepare('
        UPDATE user_profiles SET 
            work_phone = ?,
            work_email = ?,
            work_address = ?,
            updated_at = NOW()
        WHERE user_id = 25
    ');
    
    $result = $stmt->execute([
        '0626776318',                                    // work_phone
        'jafar@muhas.ac.tz',                              // work_email
        'Muhimbili University of Health and Allied Sciences, Library Department, Dar es Salaam, Tanzania' // work_address
    ]);
    
    if ($result) {
        echo "✓ User 25 updated with work data!\n";
        
        // Verify the update
        $stmt = $pdo->prepare('SELECT work_phone, work_email, work_address FROM user_profiles WHERE user_id = 25');
        $stmt->execute();
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo "\nWork data for user 25:\n";
        echo "========================\n";
        echo "Work Phone: " . $profile['work_phone'] . "\n";
        echo "Work Email: " . $profile['work_email'] . "\n";
        echo "Work Address: " . $profile['work_address'] . "\n";
        
        echo "\n✅ Now refresh localhost:3000/admin/users/25 to see all work information!\n";
        
    } else {
        echo "❌ Failed to update user 25\n";
        print_r($stmt->errorInfo());
    }
    
} catch (PDOException $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
}
?>
