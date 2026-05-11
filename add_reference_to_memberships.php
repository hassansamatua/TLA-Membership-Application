<?php
require_once 'Database.php';

$database = new Database();
$db = $database->getConnection();

echo "=== ADDING REFERENCE COLUMN TO MEMBERSHIPS ===\n\n";

// Add payment_reference column to memberships table if it doesn't exist
$sql = "ALTER TABLE memberships 
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100) NULL";

try {
    $db->exec($sql);
    echo "✅ payment_reference column added to memberships table successfully!\n";
} catch (Exception $e) {
    echo "❌ Error adding payment_reference column: " . $e->getMessage() . "\n";
}

echo "\n=== VERIFICATION ===\n";

// Verify the column was added
$result = $db->query("DESCRIBE memberships");
if ($result) {
    echo "Memberships table columns:\n";
    while ($row = $result->fetch(PDO::FETCH_ASSOC)) {
        echo "  - {$row['Field']} ({$row['Type']})\n";
    }
}

echo "\n=== CONCLUSION ===\n";
if (strpos($result, 'payment_reference') !== false) {
    echo "✅ payment_reference column is now available in memberships table!\n";
} else {
    echo "❌ payment_reference column was not added to memberships table\n";
}
?>
