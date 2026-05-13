<?php
// Database connection
$host = 'localhost';
$username = 'root';
$password = '';
$database = 'next_auth';

try {
    $conn = new mysqli($host, $username, $password, $database);
    
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }

    echo "=== Checking Current Status of All Users ===\n\n";

    // Get all users with membership numbers
    $sql = "SELECT 
                u.id,
                u.name,
                u.email,
                up.membership_number,
                up.membership_type,
                up.membership_status,
                up.join_date as profile_join_date,
                up.phone as user_phone,
                m.joined_date as membership_joined_date,
                m.expiry_date,
                m.payment_status,
                m.amount_paid,
                m.payment_date as membership_payment_date,
                m.status as membership_status_from_db,
                (SELECT COUNT(*) FROM payments p WHERE p.user_id = u.id AND p.status = 'completed') as payment_count,
                (SELECT MAX(p.paid_at) FROM payments p WHERE p.user_id = u.id AND p.status = 'completed') as last_payment_date
             FROM users u
             LEFT JOIN user_profiles up ON u.id = up.user_id
             LEFT JOIN memberships m ON u.id = m.user_id
             WHERE up.membership_number IS NOT NULL
             ORDER BY u.id";
    
    $result = $conn->query($sql);
    
    $paidUsersWithIssues = [];
    
    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $hasPayments = $row['payment_count'] > 0;
            $isPaid = $row['payment_status'] === 'paid';
            $hasDates = $row['membership_joined_date'] && $row['expiry_date'] && $row['membership_payment_date'];
            
            echo "=== User ID: {$row['id']} ===\n";
            echo "Name: {$row['name']}\n";
            echo "Email: {$row['email']}\n";
            echo "Membership #: {$row['membership_number']}\n";
            echo "Payment Count: {$row['payment_count']}\n";
            echo "Last Payment: " . ($row['last_payment_date'] ? $row['last_payment_date'] : 'NULL') . "\n";
            echo "Payment Status: " . ($row['payment_status'] ? $row['payment_status'] : 'NULL') . "\n";
            echo "Amount Paid: " . ($row['amount_paid'] ? $row['amount_paid'] : 'NULL') . "\n";
            echo "Membership Status: " . ($row['membership_status_from_db'] ? $row['membership_status_from_db'] : 'NULL') . "\n";
            echo "Join Date: " . ($row['membership_joined_date'] ? $row['membership_joined_date'] : 'NULL') . "\n";
            echo "Expiry Date: " . ($row['expiry_date'] ? $row['expiry_date'] : 'NULL') . "\n";
            echo "Payment Date: " . ($row['membership_payment_date'] ? $row['membership_payment_date'] : 'NULL') . "\n";
            
            // Check for issues
            $issues = [];
            if ($hasPayments && !$isPaid) $issues[] = "Has payments but payment_status is not 'paid'";
            if ($hasPayments && !$hasDates) $issues[] = "Has payments but missing dates";
            if ($isPaid && !$hasDates) $issues[] = "Is paid but missing dates";
            
            if (!empty($issues)) {
                echo "❌ ISSUES: " . implode(', ', $issues) . "\n";
                $paidUsersWithIssues[] = $row;
            } else {
                echo "✅ OK: All data consistent\n";
            }
            
            echo "----------------------------------------\n";
        }
    }

    echo "\n=== Summary ===\n";
    echo "Users with issues: " . count($paidUsersWithIssues) . "\n";
    
    if (!empty($paidUsersWithIssues)) {
        echo "\n=== Fixing Issues ===\n";
        
        foreach ($paidUsersWithIssues as $user) {
            echo "\n=== Fixing User ID {$user['id']} ===\n";
            
            // Get latest payment
            $paymentSql = "SELECT paid_at, amount, membership_type, reference 
                          FROM payments 
                          WHERE user_id = {$user['id']} 
                          AND status = 'completed' 
                          ORDER BY paid_at DESC 
                          LIMIT 1";
            
            $paymentResult = $conn->query($paymentSql);
            $payment = $paymentResult->fetch_assoc();
            
            if ($payment) {
                $paymentDate = $payment['paid_at'];
                $paymentDateTime = new DateTime($paymentDate);
                
                // Calculate dates using the new logic
                $joinDate = $paymentDateTime->format('Y-m-d');
                
                // Calculate expiry date based on membership cycle (Feb 1 - Jan 31)
                $paymentMonth = $paymentDateTime->format('n'); // 1-12
                
                if ($paymentMonth == 1) { // January
                    $expiryYear = $paymentDateTime->format('Y') + 1;
                } else if ($paymentMonth == 2) { // February
                    $expiryYear = $paymentDateTime->format('Y') + 1;
                } else if ($paymentMonth >= 3 && $paymentMonth <= 12) { // March-December
                    $expiryYear = $paymentDateTime->format('Y') + 2;
                } else {
                    $expiryYear = $paymentDateTime->format('Y') + 1;
                }
                
                $expiryDate = $expiryYear . '-01-31';
                
                echo "Payment Date: $paymentDate\n";
                echo "Calculated Join Date: $joinDate\n";
                echo "Calculated Expiry Date: $expiryDate\n";
                
                // Update membership record
                $updateSql = "UPDATE memberships 
                              SET joined_date = ?, 
                                  expiry_date = ?, 
                                  payment_date = ?, 
                                  payment_status = 'paid',
                                  status = 'active',
                                  updated_at = NOW()
                              WHERE user_id = ?";
                
                $stmt = $conn->prepare($updateSql);
                $stmt->bind_param('sssi', $joinDate, $expiryDate, $joinDate, $user['id']);
                
                if ($stmt->execute()) {
                    echo "✅ Updated membership record\n";
                } else {
                    echo "❌ Failed to update: " . $stmt->error . "\n";
                }
            }
        }
    }

    $conn->close();
    echo "\n✅ Status check completed!\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
