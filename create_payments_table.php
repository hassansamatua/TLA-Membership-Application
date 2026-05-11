<?php
require_once 'Database.php';

$database = new Database();
$db = $database->getConnection();

echo "Creating membership_payments table...\n";

$sql = "CREATE TABLE IF NOT EXISTS membership_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_reference VARCHAR(100) NOT NULL,
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
    cycle_year INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_cycle_year (cycle_year),
    INDEX idx_status (status),
    INDEX idx_payment_date (payment_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)";

try {
    $db->exec($sql);
    echo "✅ Table created successfully!\n";
} catch (Exception $e) {
    echo "❌ Error creating table: " . $e->getMessage() . "\n";
}

// Also add missing columns to memberships table if needed
echo "\nChecking memberships table structure...\n";
$alterSql = "ALTER TABLE memberships 
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) NULL";

try {
    $db->exec($alterSql);
    echo "✅ Memberships table updated successfully!\n";
} catch (Exception $e) {
    echo "❌ Error updating memberships table: " . $e->getMessage() . "\n";
}
?>
