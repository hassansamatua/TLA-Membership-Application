<?php
// Add cycle_year column to memberships table
require_once 'Database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    echo "=== Adding cycle_year Column to Memberships Table ===\n\n";
    
    // Check if cycle_year column exists
    echo "1. Checking if cycle_year column exists...\n";
    $stmt = $conn->query("SHOW COLUMNS FROM memberships LIKE 'cycle_year'");
    $exists = $stmt->rowCount() > 0;
    
    if ($exists) {
        echo "   ✅ cycle_year column already exists\n";
    } else {
        echo "   ❌ cycle_year column missing, adding it...\n";
        
        // Add the column
        $sql = "ALTER TABLE memberships ADD COLUMN cycle_year INT NOT NULL DEFAULT 0 AFTER amount_paid";
        $conn->exec($sql);
        echo "   ✅ cycle_year column added successfully\n";
    }
    
    // Verify the table structure
    echo "\n2. Current memberships table structure:\n";
    $stmt = $conn->query("DESCRIBE memberships");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "   - {$row['Field']}: {$row['Type']} {$row['Null']} {$row['Key']} {$row['Default']}\n";
    }
    
    echo "\n=== UPDATE COMPLETE ===\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
