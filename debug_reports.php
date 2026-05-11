<?php
require_once 'config.php';

// Check database connection
try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ Database connection successful\n\n";
} catch (PDOException $e) {
    echo "❌ Database connection failed: " . $e->getMessage() . "\n";
    exit;
}

// Check tables
$tables = ['users', 'memberships', 'payments'];
foreach ($tables as $table) {
    try {
        $stmt = $pdo->query("DESCRIBE `$table`");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo "✅ Table '$table' exists with " . count($columns) . " columns\n";
        
        // Check if table has data
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$table`");
        $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        echo "   📊 Records in '$table': $count\n";
        
        // Show important columns
        $importantColumns = [];
        foreach ($columns as $col) {
            if (in_array($col['Field'], ['id', 'user_id', 'status', 'amount', 'created_at', 'deleted_at', 'expiry_date', 'membership_type'])) {
                $importantColumns[] = $col['Field'];
            }
        }
        if (!empty($importantColumns)) {
            echo "   📋 Important columns: " . implode(', ', $importantColumns) . "\n";
        }
        echo "\n";
    } catch (PDOException $e) {
        echo "❌ Table '$table' error: " . $e->getMessage() . "\n\n";
    }
}

// Test the actual queries from the API
echo "🔍 Testing API queries:\n\n";

// Test total members query
try {
    $stmt = $pdo->query("
        SELECT COUNT(*) as count FROM users
        WHERE deleted_at IS NULL
    ");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "✅ Total members query: " . $result['count'] . "\n";
} catch (PDOException $e) {
    echo "❌ Total members query failed: " . $e->getMessage() . "\n";
}

// Test active memberships query
try {
    $stmt = $pdo->query("
        SELECT COUNT(DISTINCT user_id) as count 
        FROM memberships 
        WHERE status = 'active' 
        AND expiry_date >= CURDATE()
    ");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "✅ Active members query: " . $result['count'] . "\n";
} catch (PDOException $e) {
    echo "❌ Active members query failed: " . $e->getMessage() . "\n";
}

// Test revenue query
try {
    $stmt = $pdo->query("
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM payments 
        WHERE status = 'completed'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "✅ Revenue query: " . $result['total'] . "\n";
} catch (PDOException $e) {
    echo "❌ Revenue query failed: " . $e->getMessage() . "\n";
}

// Test membership types query
try {
    $stmt = $pdo->query("
        SELECT 
            membership_type as type,
            COUNT(*) as count
        FROM memberships
        WHERE status = 'active'
        GROUP BY membership_type
    ");
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "✅ Membership types query: " . count($results) . " types found\n";
    foreach ($results as $row) {
        echo "   - " . ($row['type'] ?: 'NULL') . ": " . $row['count'] . "\n";
    }
} catch (PDOException $e) {
    echo "❌ Membership types query failed: " . $e->getMessage() . "\n";
}

// Test monthly signups query
try {
    $stmt = $pdo->query("
        SELECT 
            DATE_FORMAT(created_at, '%Y-%m') as month,
            COUNT(*) as count
        FROM users
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month
    ");
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "✅ Monthly signups query: " . count($results) . " months found\n";
    foreach ($results as $row) {
        echo "   - " . $row['month'] . ": " . $row['count'] . "\n";
    }
} catch (PDOException $e) {
    echo "❌ Monthly signups query failed: " . $e->getMessage() . "\n";
}

echo "\n✅ Debug completed!\n";
?>
