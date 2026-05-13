<?php
require_once 'config.php';

echo "🔍 Debugging Analytics APIs\n\n";

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Test Membership Analytics
    echo "📊 Membership Analytics:\n";
    $stmt = $pdo->query("
        SELECT 
            DATE_FORMAT(u.created_at, '%Y-%m') as period,
            COUNT(*) as new_members,
            COUNT(DISTINCT u.id) as unique_members
        FROM users u
        WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
        GROUP BY DATE_FORMAT(u.created_at, '%Y-%m')
        ORDER BY period
        LIMIT 5
    ");
    $growth = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($growth as $row) {
        echo "  - {$row['period']}: {$row['new_members']} new, {$row['unique_members']} unique\n";
    }

    // Test Status Distribution
    echo "\n📈 Status Distribution:\n";
    $stmt = $pdo->query("
        SELECT 
            m.status,
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM memberships), 2) as percentage
        FROM memberships m
        GROUP BY m.status
    ");
    $status = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($status as $row) {
        echo "  - {$row['status']}: {$row['count']} ({$row['percentage']}%)\n";
    }

    // Test Activity Levels
    echo "\n👥 Activity Levels:\n";
    $stmt = $pdo->query("
        SELECT 
            CASE 
                WHEN DATEDIFF(NOW(), u.last_login) <= 7 THEN 'Active'
                WHEN DATEDIFF(NOW(), u.last_login) <= 30 THEN 'Moderately Active'
                WHEN DATEDIFF(NOW(), u.last_login) <= 90 THEN 'Less Active'
                ELSE 'Inactive'
            END as activity_level,
            COUNT(*) as count
        FROM users u
        WHERE u.last_login IS NOT NULL
        GROUP BY activity_level
    ");
    $activity = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($activity as $row) {
        echo "  - {$row['activity_level']}: {$row['count']}\n";
    }

    // Test Payment Analytics
    echo "\n💳 Payment Analytics:\n";
    $stmt = $pdo->query("
        SELECT
            COUNT(*) as total_payments,
            SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
            AVG(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as avg_payment,
            COUNT(DISTINCT user_id) as paying_customers,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_payments,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
            ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate
        FROM payments
    ");
    $metrics = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "  - Total Payments: {$metrics['total_payments']}\n";
    echo "  - Total Revenue: {$metrics['total_revenue']}\n";
    echo "  - Success Rate: {$metrics['success_rate']}%\n";

    // Test Payment Methods
    echo "\n💳 Payment Methods:\n";
    $stmt = $pdo->query("
        SELECT
            COALESCE(payment_method, 'Unknown') as method,
            COUNT(*) as count,
            SUM(amount) as total_amount,
            ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM payments), 2) as percentage
        FROM payments
        GROUP BY payment_method
        ORDER BY count DESC
    ");
    $methods = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($methods as $row) {
        echo "  - {$row['method']}: {$row['count']} ({$row['percentage']}%)\n";
    }

    // Test Activity Analytics
    echo "\n📊 Activity Analytics:\n";
    $stmt = $pdo->query("
        SELECT
            DATE_FORMAT(last_login, '%Y-%m') as period,
            COUNT(*) as login_count,
            COUNT(DISTINCT user_id) as unique_users
        FROM users
        WHERE last_login >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
            AND last_login IS NOT NULL
        GROUP BY DATE_FORMAT(last_login, '%Y-%m')
        ORDER BY period
        LIMIT 5
    ");
    $loginActivity = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($loginActivity as $row) {
        echo "  - {$row['period']}: {$row['login_count']} logins, {$row['unique_users']} users\n";
    }

    // Test Engagement Metrics
    echo "\n📈 Engagement Metrics:\n";
    $stmt = $pdo->query("
        SELECT
            COUNT(CASE WHEN DATEDIFF(NOW(), last_login) <= 7 THEN 1 END) as weekly_active_users,
            COUNT(CASE WHEN DATEDIFF(NOW(), last_login) <= 30 THEN 1 END) as monthly_active_users,
            COUNT(*) as total_users
        FROM users
        WHERE last_login IS NOT NULL
    ");
    $engagement = $stmt->fetch(PDO::FETCH_ASSOC);
    $weekly_rate = round(($engagement['weekly_active_users'] / $engagement['total_users']) * 100, 2);
    $monthly_rate = round(($engagement['monthly_active_users'] / $engagement['total_users']) * 100, 2);
    echo "  - Weekly Active: {$engagement['weekly_active_users']} ({$weekly_rate}%)\n";
    echo "  - Monthly Active: {$engagement['monthly_active_users']} ({$monthly_rate}%)\n";

    // Check if tables exist
    echo "\n🔍 Table Structure Check:\n";
    $tables = ['users', 'memberships', 'payments'];
    foreach ($tables as $table) {
        $stmt = $pdo->query("SHOW COLUMNS FROM `$table`");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo "  ✅ $table: " . count($columns) . " columns\n";
        
        // Check for specific columns we need
        $columnNames = array_map(function($c) { return $c['Field']; }, $columns);
        if ($table === 'users') {
            echo "    - last_login: " . (in_array('last_login', $columnNames) ? '✅' : '❌') . "\n";
        }
        if ($table === 'payments') {
            echo "    - payment_method: " . (in_array('payment_method', $columnNames) ? '✅' : '❌') . "\n";
            echo "    - failure_reason: " . (in_array('failure_reason', $columnNames) ? '✅' : '❌') . "\n";
        }
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "\n✅ Debug completed!\n";
?>
