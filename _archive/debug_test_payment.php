<?php
// Database connection
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'next_auth';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$database", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== DEBUGGING TEST PAYMENT: TEST-1767944794384 ===\n\n";
    
    // Check this specific payment
    $stmt = $pdo->prepare("
        SELECT p.*, u.name, u.email 
        FROM payments p 
        JOIN users u ON p.user_id = u.id 
        WHERE p.reference = 'TEST-1767944794384'
    ");
    $stmt->execute();
    $payment = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$payment) {
        echo "❌ Payment TEST-1767944794384 NOT FOUND!\n";
        exit;
    }
    
    echo "✅ PAYMENT FOUND:\n";
    echo "Reference: {$payment['reference']}\n";
    echo "User: {$payment['name']} ({$payment['email']})\n";
    echo "User ID: {$payment['user_id']}\n";
    echo "Amount: {$payment['amount']} TZS\n";
    echo "Status: {$payment['status']}\n";
    echo "Payment Method: {$payment['payment_method']}\n";
    echo "Created: {$payment['created_at']}\n";
    echo "Paid At: {$payment['paid_at']}\n";
    echo "Transaction ID: {$payment['transaction_id']}\n\n";
    
    // Check membership for this user
    $stmt = $pdo->prepare("
        SELECT * FROM memberships WHERE user_id = ?
    ");
    $stmt->execute([$payment['user_id']]);
    $membership = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$membership) {
        echo "❌ NO MEMBERSHIP FOUND FOR USER {$payment['user_id']}!\n";
    } else {
        echo "✅ MEMBERSHIP FOUND:\n";
        echo "Membership Number: {$membership['membership_number']}\n";
        echo "Type: {$membership['membership_type']}\n";
        echo "Status: {$membership['status']}\n";
        echo "Payment Status: {$membership['payment_status']}\n";
        echo "Expiry Date: {$membership['expiry_date']}\n";
        echo "Payment Date: {$membership['payment_date']}\n";
        echo "Amount Paid: {$membership['amount_paid']}\n\n";
        
        // Check if membership is active
        $expiryDate = new DateTime($membership['expiry_date']);
        $today = new DateTime();
        $isActive = $membership['status'] === 'active' && 
                   $membership['payment_status'] === 'paid' && 
                   $expiryDate >= $today;
        
        echo "🔍 MEMBERSHIP STATUS CHECK:\n";
        echo "Status = 'active': " . ($membership['status'] === 'active' ? '✅' : '❌') . "\n";
        echo "Payment Status = 'paid': " . ($membership['payment_status'] === 'paid' ? '✅' : '❌') . "\n";
        echo "Not Expired: " . ($expiryDate >= $today ? '✅' : '❌') . "\n";
        echo "Overall Active: " . ($isActive ? '✅' : '❌') . "\n\n";
    }
    
    // Check if this is a recent test payment that needs manual completion
    if ($payment['status'] === 'pending' && strpos($payment['reference'], 'TEST-') === 0) {
        echo "🔧 ACTION NEEDED: Test payment is still pending!\n";
        echo "Completing test payment manually...\n\n";
        
        try {
            // Update payment status
            $stmt = $pdo->prepare("
                UPDATE payments SET 
                status = 'completed', 
                paid_at = NOW(), 
                transaction_id = CONCAT('TEST-COMPLETE-', UNIX_TIMESTAMP())
                WHERE reference = ?
            ");
            $stmt->execute([$payment['reference']]);
            
            echo "✅ Payment status updated to 'completed'\n";
            
            // Create/update membership
            $membershipStmt = $pdo->prepare("
                SELECT membership_number FROM memberships WHERE user_id = ?
            ");
            $membershipStmt->execute([$payment['user_id']]);
            $existingMembership = $membershipStmt->fetch(PDO::FETCH_ASSOC);
            
            $membershipNumber = $existingMembership['membership_number'] ?? null;
            if (!$membershipNumber) {
                // Generate new membership number
                $year = date('y');
                $seqStmt = $pdo->prepare("SELECT last_number FROM membership_sequence WHERE year = ? FOR UPDATE");
                $seqStmt->execute([$year]);
                $seqResult = $seqStmt->fetch(PDO::FETCH_ASSOC);
                
                $nextNumber = $seqResult ? $seqResult['last_number'] + 1 : 1;
                $membershipNumber = "TLA{$year}" . str_pad($nextNumber, 5, '0', STR_PAD_LEFT);
                
                // Update sequence
                $upsertStmt = $pdo->prepare("
                    INSERT INTO membership_sequence (year, last_number) VALUES (?, ?)
                    ON DUPLICATE KEY UPDATE last_number = ?
                ");
                $upsertStmt->execute([$year, $nextNumber, $nextNumber]);
            }
            
            // Update membership
            $membershipUpdateStmt = $pdo->prepare("
                INSERT INTO memberships (
                    user_id, membership_number, membership_type, status, 
                    payment_status, payment_date, amount_paid, joined_date, expiry_date
                ) VALUES (?, ?, ?, 'active', 'paid', CURDATE(), ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR))
                ON DUPLICATE KEY UPDATE 
                    membership_number = VALUES(membership_number),
                    membership_type = VALUES(membership_type),
                    status = 'active',
                    payment_status = 'paid',
                    payment_date = CURDATE(),
                    amount_paid = VALUES(amount_paid),
                    expiry_date = DATE_ADD(CURDATE(), INTERVAL 1 YEAR),
                    updated_at = NOW()
            ");
            $membershipUpdateStmt->execute([
                $payment['user_id'],
                $membershipNumber,
                $payment['membership_type'],
                $payment['amount']
            ]);
            
            echo "✅ Membership activated: {$membershipNumber}\n";
            echo "🎉 Test payment completed successfully!\n\n";
            
        } catch (Exception $e) {
            echo "❌ Error completing test payment: " . $e->getMessage() . "\n";
        }
    }
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
