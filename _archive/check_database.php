<?php
// Simple database check
echo "Checking database connection and tables...\n\n";

try {
    $pdo = new PDO("mysql:host=localhost;dbname=next_auth", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✓ Database connection successful\n\n";
    
    // Check if user_profiles table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'user_profiles'");
    if ($stmt->rowCount() > 0) {
        echo "✓ user_profiles table exists\n\n";
        
        // Show table structure
        $stmt = $pdo->query("DESCRIBE user_profiles");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "Table structure:\n";
        echo "================\n";
        foreach ($columns as $col) {
            echo "- {$col['Field']} ({$col['Type']})\n";
        }
        
        echo "\n";
        
        // Check data for user 25
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM user_profiles WHERE user_id = 25");
        $stmt->execute();
        $count = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo "Records for user 25: " . $count['count'] . "\n\n";
        
        if ($count['count'] > 0) {
            $stmt = $pdo->prepare("SELECT * FROM user_profiles WHERE user_id = 25");
            $stmt->execute();
            $profile = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo "Profile data for user 25:\n";
            echo "========================\n";
            foreach ($profile as $key => $value) {
                if ($value !== null && $value !== '') {
                    echo "$key: $value\n";
                }
            }
        } else {
            echo "❌ No profile found for user 25\n";
            echo "Creating sample profile...\n";
            
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
                echo "✓ Sample profile created for user 25\n";
            } else {
                echo "❌ Failed to create profile\n";
            }
        }
        
    } else {
        echo "❌ user_profiles table does not exist\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
}
?>
