<?php
// Check current database structure and create safe migration

$host = 'localhost';
$user = 'root';
$password = readline("Enter MySQL password: ");

try {
    // Connect to MySQL without specifying database first
    $conn = new mysqli($host, $user, $password);
    
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }
    
    echo "Connected to MySQL successfully!\n";
    
    // Show available databases
    echo "Available databases:\n";
    $result = $conn->query("SHOW DATABASES");
    while ($row = $result->fetch_assoc()) {
        echo "- " . $row['Database'] . "\n";
    }
    
    // Try to connect to common database names
    $databases = ['tutorial2', 'library_system', 'tla_system', 'membership_system'];
    $database = null;
    
    foreach ($databases as $db) {
        $conn->select_db($db);
        if (!$conn->error) {
            $database = $db;
            echo "\nUsing database: $db\n";
            break;
        }
    }
    
    if (!$database) {
        echo "\nPlease enter the database name: ";
        $database = trim(readline());
        $conn->select_db($database);
    }
    
    // Check if users table exists and show its structure
    echo "\n=== USERS TABLE STRUCTURE ===\n";
    $result = $conn->query("DESCRIBE users");
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            echo "- " . $row['Field'] . " (" . $row['Type'] . ")\n";
        }
    } else {
        echo "Users table not found!\n";
    }
    
    // Check if membership_number_sequence table exists
    echo "\n=== MEMBERSHIP_NUMBER_SEQUENCE TABLE ===\n";
    $result = $conn->query("SHOW TABLES LIKE 'membership_number_sequence'");
    if ($result->num_rows > 0) {
        echo "Table exists!\n";
        $result = $conn->query("DESCRIBE membership_number_sequence");
        while ($row = $result->fetch_assoc()) {
            echo "- " . $row['Field'] . " (" . $row['Type'] . ")\n";
        }
    } else {
        echo "Table does not exist - will be created\n";
    }
    
    $conn->close();
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
