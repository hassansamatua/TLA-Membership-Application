<?php
require_once 'config.php';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Adding place_of_birth column to user_profiles table...\n";
    
    // Add the place_of_birth column
    $sql = "ALTER TABLE user_profiles ADD COLUMN place_of_birth VARCHAR(100) AFTER nationality";
    $pdo->exec($sql);
    
    echo "✅ place_of_birth column added successfully!\n";
    
    // Verify the column was added
    echo "\n=== Updated user_profiles table structure ===\n";
    $stmt = $pdo->query('DESCRIBE user_profiles');
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        if (strpos($row['Field'], 'birth') !== false || strpos($row['Field'], 'nationality') !== false) {
            echo $row['Field'] . ' - ' . $row['Type'] . PHP_EOL;
        }
    }
    
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "⚠️  place_of_birth column already exists\n";
    } else {
        echo '❌ Error: ' . $e->getMessage() . PHP_EOL;
    }
}
?>
