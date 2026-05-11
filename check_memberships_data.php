<?php
// Check what's in the memberships table
require_once 'Database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    echo "=== Checking Memberships Table Data ===\n\n";
    
    // Check table structure
    echo "1. Memberships table structure:\n";
    $stmt = $conn->query("DESCRIBE memberships");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "   - {$row['Field']}: {$row['Type']} {$row['Null']} {$row['Default']}\n";
    }
    
    // Check total records
    echo "\n2. Total records in memberships:\n";
    $stmt = $conn->query("SELECT COUNT(*) as count FROM memberships");
    $count = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   - Total records: {$count['count']}\n";
    
    // Check active members according to the API query
    echo "\n3. Active members according to API query:\n";
    $stmt = $conn->query("
      SELECT COUNT(DISTINCT user_id) as count 
      FROM memberships 
      WHERE status = 'active' 
      AND expiry_date >= CURDATE()
    ");
    $activeCount = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   - Active members: {$activeCount['count']}\n";
    
    // Show all membership records
    echo "\n4. All membership records:\n";
    $stmt = $conn->query("
      SELECT m.user_id, u.name, u.email, m.membership_number, m.status, 
             m.expiry_date, m.payment_status, m.created_at
      FROM memberships m
      LEFT JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at DESC
      LIMIT 10
    ");
    $memberships = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($memberships)) {
        echo "   - No membership records found\n";
    } else {
        foreach ($memberships as $membership) {
            echo "   - User {$membership['user_id']} ({$membership['name']}): {$membership['status']}, Expires: {$membership['expiry_date']}\n";
        }
    }
    
    // Check if there are users without memberships
    echo "\n5. Users without memberships:\n";
    $stmt = $conn->query("
      SELECT u.id, u.name, u.email
      FROM users u
      LEFT JOIN memberships m ON u.id = m.user_id
      WHERE m.user_id IS NULL
      LIMIT 5
    ");
    $usersWithoutMemberships = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($usersWithoutMemberships)) {
        echo "   - All users have membership records\n";
    } else {
        foreach ($usersWithoutMemberships as $user) {
            echo "   - User {$user['id']} ({$user['name']}): No membership record\n";
        }
    }
    
    echo "\n=== ANALYSIS ===\n";
    if ($count['count'] == 0) {
        echo "❌ The memberships table is empty. This explains why active members shows 0.\n";
        echo "💡 Need to create membership records for existing users.\n";
    } elseif ($activeCount['count'] == 0) {
        echo "⚠️ The memberships table has records but no active ones.\n";
        echo "💡 Need to check expiry dates and status values.\n";
    } else {
        echo "✅ Found {$activeCount['count']} active members.\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
