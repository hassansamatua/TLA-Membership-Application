<?php
// Check which users exist in memberships but not in users table
require_once 'Database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    echo "=== Checking for Missing Users ===\n\n";
    
    // Check all active memberships and their corresponding users
    echo "1. ACTIVE MEMBERSHIPS AND USER CORRESPONDENCE:\n";
    $stmt = $conn->query("
      SELECT 
        m.user_id,
        m.membership_number,
        m.status,
        m.expiry_date,
        u.name as user_name,
        u.email as user_email,
        CASE 
          WHEN u.id IS NULL THEN 'MISSING FROM USERS TABLE'
          ELSE 'EXISTS IN USERS TABLE'
        END as user_status
      FROM memberships m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.status = 'active' 
      AND m.expiry_date >= CURDATE()
      ORDER BY m.user_id
    ");
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $missingUsers = [];
    $existingUsers = [];
    
    foreach ($results as $result) {
      echo "   User {$result['user_id']}: {$result['user_status']}\n";
      if ($result['user_name']) {
        echo "     Name: {$result['user_name']}\n";
        echo "     Email: {$result['user_email']}\n";
        echo "     Membership: {$result['membership_number']}\n";
        $existingUsers[] = $result;
      } else {
        echo "     ❌ MISSING FROM USERS TABLE\n";
        echo "     Membership: {$result['membership_number']}\n";
        $missingUsers[] = $result;
      }
      echo "     Expires: {$result['expiry_date']}\n";
      echo "---\n";
    }
    
    echo "\n2. SUMMARY:\n";
    echo "   Total active memberships: " . count($results) . "\n";
    echo "   Users found in users table: " . count($existingUsers) . "\n";
    echo "   Users missing from users table: " . count($missingUsers) . "\n";
    
    if (!empty($missingUsers)) {
      echo "\n3. MISSING USER DETAILS:\n";
      foreach ($missingUsers as $missing) {
        echo "   - User ID {$missing['user_id']} has membership {$missing['membership_number']} but no user record\n";
      }
    }
    
    // Check what's in the users table
    echo "\n4. USERS TABLE SAMPLE:\n";
    $stmt = $conn->query("SELECT id, name, email FROM users ORDER BY id LIMIT 10");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($users as $user) {
      echo "   - User {$user['id']}: {$user['name']} ({$user['email']})\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
