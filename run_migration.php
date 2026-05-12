<?php
// Enhanced Membership System Migration Script
// Run this script to update the database with new membership categories and fee structure

$host = 'localhost';
$user = 'root';
$password = readline("Enter MySQL password: "); // Prompt for password
$database = 'tutorial2';

try {
    // Connect to MySQL
    $conn = new mysqli($host, $user, $password, $database);
    
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }
    
    echo "Starting migration...\n";
    
    // Read and execute migration SQL
    $sql = file_get_contents('database/simple_migration.sql');
    
    if ($sql === false) {
        die("Failed to read migration file\n");
    }
    
    // Execute each SQL statement
    $statements = explode(';', $sql);
    
    foreach ($statements as $statement) {
        $statement = trim($statement);
        if (empty($statement)) continue;
        
        echo "Executing: $statement\n";
        $result = $conn->query($statement);
        
        if (!$result) {
            echo "Error: " . $conn->error . "\n";
        } else {
            echo "Success: " . $conn->affected_rows . " rows affected\n";
        }
    }
    
    echo "Migration completed successfully!\n";
    
    $conn->close();
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
