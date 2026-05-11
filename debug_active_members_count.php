<?php
// Debug the discrepancy between summary count and detailed list
require_once 'Database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    echo "=== Debugging Active Members Count ===\n\n";
    
    // 1. Check the summary query (from reports/summary API)
    echo "1. SUMMARY QUERY (from /api/admin/reports/summary):\n";
    $stmt = $conn->query("
      SELECT COUNT(DISTINCT user_id) as count 
      FROM memberships 
      WHERE status = 'active' 
      AND expiry_date >= CURDATE()
    ");
    $summaryCount = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   Count: {$summaryCount['count']}\n\n";
    
    // 2. Check the detailed query (from membership API)
    echo "2. DETAILED QUERY (from /api/admin/reports/membership):\n";
    $stmt = $conn->query("
      SELECT 
        u.id,
        u.name,
        u.email,
        m.membership_number,
        m.membership_type,
        m.status,
        m.expiry_date,
        m.joined_date,
        m.payment_status,
        m.created_at as membership_created_at
      FROM memberships m
      INNER JOIN users u ON m.user_id = u.id
      WHERE m.status = 'active' 
      AND m.expiry_date >= CURDATE()
      ORDER BY m.created_at DESC
    ");
    $detailedMembers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "   Count: " . count($detailedMembers) . "\n\n";
    
    // 3. Check all active memberships regardless of expiry
    echo "3. ALL ACTIVE MEMBERSHIPS (ignoring expiry):\n";
    $stmt = $conn->query("
      SELECT 
        u.id,
        u.name,
        m.status,
        m.expiry_date,
        CASE 
          WHEN m.expiry_date >= CURDATE() THEN 'VALID'
          ELSE 'EXPIRED'
        END as expiry_status
      FROM memberships m
      INNER JOIN users u ON m.user_id = u.id
      WHERE m.status = 'active'
      ORDER BY m.expiry_date DESC
    ");
    $allActive = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "   Count: " . count($allActive) . "\n\n";
    
    echo "   Breakdown:\n";
    foreach ($allActive as $member) {
      echo "   - User {$member['id']} ({$member['name']}): {$member['expiry_status']} (Expires: {$member['expiry_date']})\n";
    }
    
    // 4. Check current date
    echo "\n4. CURRENT DATE CHECK:\n";
    echo "   Today: " . date('Y-m-d') . "\n";
    echo "   CURDATE(): " . $conn->query("SELECT CURDATE() as today")->fetch(PDO::FETCH_ASSOC)['today'] . "\n";
    
    // 5. Check for any NULL expiry dates
    echo "\n5. NULL EXPIRY DATES:\n";
    $stmt = $conn->query("
      SELECT COUNT(*) as count 
      FROM memberships 
      WHERE status = 'active' 
      AND (expiry_date IS NULL OR expiry_date = '0000-00-00')
    ");
    $nullExpiry = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   Active members with NULL expiry: {$nullExpiry['count']}\n";
    
    echo "\n=== ANALYSIS ===\n";
    if ($summaryCount['count'] != count($detailedMembers)) {
      echo "⚠️ DISCREPANCY FOUND!\n";
      echo "   Summary shows: {$summaryCount['count']}\n";
      echo "   Detailed shows: " . count($detailedMembers) . "\n";
      echo "   This suggests there might be data integrity issues.\n";
    } else {
      echo "✅ Counts match: Both show {$summaryCount['count']}\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
