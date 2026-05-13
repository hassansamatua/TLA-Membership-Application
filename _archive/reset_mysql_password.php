<?php
// Reset MySQL root password
// This script will help you reset your MySQL password

echo "=== MySQL Password Reset Helper ===\n\n";

// Try common default passwords
$defaults = ['', 'root', 'password', '123456', 'admin'];
$host = 'localhost';
$user = 'root';

foreach ($defaults as $password) {
    echo "Trying password: " . (empty($password) ? '(empty)' : $password) . "\n";
    
    try {
        $conn = new mysqli($host, $user, $password);
        
        if (!$conn->connect_error) {
            echo "✅ SUCCESS! Connected with password: " . (empty($password) ? '(empty)' : $password) . "\n\n";
            
            // Show databases
            $result = $conn->query("SHOW DATABASES");
            echo "Available databases:\n";
            while ($row = $result->fetch_assoc()) {
                echo "- " . $row['Database'] . "\n";
            }
            
            $conn->close();
            
            // Now run migration with this password
            echo "\n=== Running Migration ===\n";
            echo "Password found: " . (empty($password) ? '(empty)' : $password) . "\n";
            
            // Run the safe migration
            include 'safe_migration.php';
            exit;
        }
    } catch (Exception $e) {
        echo "❌ Failed: " . $e->getMessage() . "\n";
    }
}

echo "\n=== Manual Reset Instructions ===\n";
echo "If none of the default passwords work, you can reset MySQL password:\n\n";

echo "Method 1: XAMPP Control Panel\n";
echo "1. Open XAMPP Control Panel\n";
echo "2. Click 'Config' next to MySQL\n";
echo "3. Click 'my.ini'\n";
echo "4. Find or add this line under [mysqld]:\n";
echo "   skip-grant-tables\n";
echo "5. Restart MySQL service\n";
echo "6. Run: mysql -u root\n";
echo "7. Run: USE mysql;\n";
echo "8. Run: UPDATE user SET password=PASSWORD('newpassword') WHERE user='root';\n";
echo "9. Run: FLUSH PRIVILEGES;\n";
echo "10. Remove skip-grant-tables from my.ini\n";
echo "11. Restart MySQL again\n\n";

echo "Method 2: XAMPP Shell\n";
echo "1. Open XAMPP Shell\n";
echo "2. Run: mysqladmin -u root password newpassword\n\n";

echo "After resetting, run: php safe_migration.php\n";
?>
