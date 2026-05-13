<?php
$host = 'localhost';
$user = 'root';
$password = 'hansco123';
$database = 'tutorial2';

try {
    $pdo = new PDO("mysql:host=$host", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Creating database tutorial2...\n";
    
    // Create database
    $pdo->exec("CREATE DATABASE IF NOT EXISTS $database");
    echo "✓ Database created\n";
    
    // Use the database
    $pdo->exec("USE $database");
    
    // Create users table
    echo "Creating users table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            nida VARCHAR(16) UNIQUE,
            user_category ENUM('librarian', 'organization', 'regular') DEFAULT 'regular',
            membership_type VARCHAR(50) DEFAULT 'personal',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");
    echo "✓ Users table created\n";
    
    // Create tokens table
    echo "Creating tokens table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token VARCHAR(255) UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ");
    echo "✓ Tokens table created\n";
    
    // Create membership_number_sequence table
    echo "Creating membership_number_sequence table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS membership_number_sequence (
            id INT AUTO_INCREMENT PRIMARY KEY,
            year_prefix VARCHAR(2) NOT NULL,
            sequence_number INT NOT NULL,
            is_used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_year_sequence (year_prefix, sequence_number)
        )
    ");
    echo "✓ Membership number sequence table created\n";
    
    // Create user_membership_status table
    echo "Creating user_membership_status table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS user_membership_status (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            membership_number VARCHAR(20) UNIQUE,
            status ENUM('active', 'expired', 'suspended', 'pending') DEFAULT 'pending',
            payment_status ENUM('paid', 'pending', 'overdue', 'cancelled') DEFAULT 'pending',
            joined_date DATE,
            expiry_date DATE,
            amount_paid DECIMAL(10, 2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ");
    echo "✓ User membership status table created\n";
    
    // Create cycle_payment_status table
    echo "Creating cycle_payment_status table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS cycle_payment_status (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            cycle_year INT NOT NULL,
            is_paid BOOLEAN DEFAULT FALSE,
            amount DECIMAL(10, 2) NOT NULL,
            penalty_amount DECIMAL(10, 2) DEFAULT 0,
            payment_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY unique_user_cycle (user_id, cycle_year)
        )
    ");
    echo "✓ Cycle payment status table created\n";
    
    echo "\n✅ All database tables created successfully!\n";
    
} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
}
?>
