<?php
// Safe Migration Script - Only adds missing components
// This script checks what exists and only adds what's missing

$host = 'localhost';
$user = 'root';
$password = readline("Enter MySQL password: ");

try {
    // Connect to MySQL
    $conn = new mysqli($host, $user, $password);
    
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }
    
    echo "Connected to MySQL successfully!\n";
    
    // Get database name
    echo "Available databases:\n";
    $result = $conn->query("SHOW DATABASES");
    $databases = [];
    while ($row = $result->fetch_assoc()) {
        $databases[] = $row['Database'];
        echo "- " . $row['Database'] . "\n";
    }
    
    echo "\nEnter database name (or press Enter for 'tutorial2'): ";
    $database = trim(readline());
    if (empty($database)) $database = 'tutorial2';
    
    $conn->select_db($database);
    echo "Using database: $database\n";
    
    // Check if user_category column exists in users table
    echo "\n=== CHECKING USER_CATEGORY COLUMN ===\n";
    $result = $conn->query("SHOW COLUMNS FROM users LIKE 'user_category'");
    if ($result->num_rows == 0) {
        echo "Adding user_category column...\n";
        $conn->query("ALTER TABLE users ADD COLUMN user_category ENUM('librarian', 'organization', 'regular') NOT NULL DEFAULT 'regular' AFTER email");
        echo "✓ user_category column added\n";
    } else {
        echo "✓ user_category column already exists\n";
    }
    
    // Check if membership_number_sequence table exists
    echo "\n=== CHECKING MEMBERSHIP_NUMBER_SEQUENCE TABLE ===\n";
    $result = $conn->query("SHOW TABLES LIKE 'membership_number_sequence'");
    if ($result->num_rows == 0) {
        echo "Creating membership_number_sequence table...\n";
        $sql = "CREATE TABLE membership_number_sequence (
            id int NOT NULL AUTO_INCREMENT,
            year_prefix varchar(2) NOT NULL,
            sequence_number int NOT NULL,
            is_used boolean NOT NULL DEFAULT FALSE,
            created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY unique_year_sequence (year_prefix, sequence_number),
            KEY idx_year_prefix (year_prefix),
            KEY idx_is_used (is_used)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        $conn->query($sql);
        echo "✓ membership_number_sequence table created\n";
        
        // Initialize sequence for current year
        $year = date('y');
        $conn->query("INSERT INTO membership_number_sequence (year_prefix, sequence_number, is_used) VALUES ('$year', 1, FALSE)");
        echo "✓ Sequence initialized for year 20$year\n";
    } else {
        echo "✓ membership_number_sequence table already exists\n";
    }
    
    // Add indexes for performance
    echo "\n=== CHECKING INDEXES ===\n";
    $indexes = ['idx_users_category', 'idx_user_membership_status', 'idx_cycle_payment_status'];
    foreach ($indexes as $index) {
        $result = $conn->query("SHOW INDEX FROM users WHERE Key_name = '$index'");
        if ($result->num_rows == 0) {
            echo "Adding index: $index\n";
            switch ($index) {
                case 'idx_users_category':
                    $conn->query("CREATE INDEX idx_users_category ON users (user_category)");
                    break;
                case 'idx_user_membership_status':
                    $conn->query("CREATE INDEX idx_user_membership_status ON user_membership_status (user_id, status, payment_status)");
                    break;
                case 'idx_cycle_payment_status':
                    $conn->query("CREATE INDEX idx_cycle_payment_status ON cycle_payment_status (user_id, cycle_year, is_paid)");
                    break;
            }
            echo "✓ Index $index added\n";
        } else {
            echo "✓ Index $index already exists\n";
        }
    }
    
    echo "\n=== MIGRATION COMPLETED SUCCESSFULLY! ===\n";
    echo "Enhanced membership system is now ready.\n";
    
    $conn->close();
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
