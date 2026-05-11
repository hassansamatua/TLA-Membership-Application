<?php
// Debug the summary query to find why it shows 16 instead of 3
require_once 'Database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    echo "=== Debugging Summary Query ===\n\n";
    
    // Check all memberships table data
    echo "1. ALL MEMBERSHIPS TABLE DATA:\n";
    $stmt = $conn->query("
      SELECT 
        user_id,
        membership_number,
        status,
        expiry_date,
        CASE 
          WHEN expiry_date >= CURDATE() THEN 'VALID'
          ELSE 'EXPIRED'
        END as expiry_status
      FROM memberships
      ORDER BY user_id
    ");
    $allMemberships = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($allMemberships as $membership) {
      echo "   User {$membership['user_id']}: {$membership['status']} ({$membership['expiry_status']}) - Expires: {$membership['expiry_date']}\n";
    }
    
    echo "\n2. SUMMARY QUERY BREAKDOWN:\n";
    
    // Check what the summary query is actually counting
    echo "   a) All active status records:\n";
    $stmt = $conn->query("SELECT COUNT(*) as count FROM memberships WHERE status = 'active'");
    $count = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "      Count: {$count['count']}\n";
    
    echo "   b) Active + valid expiry:\n";
    $stmt = $conn->query("SELECT COUNT(*) as count FROM memberships WHERE status = 'active' AND expiry_date >= CURDATE()");
    $count = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "      Count: {$count['count']}\n";
    
    echo "   c) Active + valid expiry (distinct users):\n";
    $stmt = $conn->query("SELECT COUNT(DISTINCT user_id) as count FROM memberships WHERE status = 'active' AND expiry_date >= CURDATE()");
    $count = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "      Count: {$count['count']}\n";
    
    // Check for duplicate user_ids
    echo "\n3. CHECK FOR DUPLICATE USER_IDS:\n";
    $stmt = $conn->query("
      SELECT user_id, COUNT(*) as count 
      FROM memberships 
      WHERE status = 'active'
      GROUP BY user_id 
      HAVING COUNT(*) > 1
    ");
    $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($duplicates)) {
      echo "   No duplicate user_ids found\n";
    } else {
      echo "   Found duplicates:\n";
      foreach ($duplicates as $dup) {
        echo "   - User {$dup['user_id']}: {$dup['count']} records\n";
      }
    }
    
    // Check if there are users with multiple memberships
    echo "\n4. USERS WITH MULTIPLE MEMBERSHIPS:\n";
    $stmt = $conn->query("
      SELECT 
        u.id,
        u.name,
        COUNT(m.id) as membership_count,
        GROUP_CONCAT(m.status) as statuses,
        GROUP_CONCAT(m.expiry_date) as expiry_dates
      FROM users u
      LEFT JOIN memberships m ON u.id = m.user_id
      GROUP BY u.id, u.name
      HAVING membership_count > 1
    ");
    $multiMemberships = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($multiMemberships)) {
      echo "   No users with multiple memberships\n";
    } else {
      foreach ($multiMemberships as $user) {
        echo "   - User {$user['id']} ({$user['name']}): {$user['membership_count']} memberships\n";
        echo "     Statuses: {$user['statuses']}\n";
        echo "     Expiry dates: {$user['expiry_dates']}\n";
      }
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
