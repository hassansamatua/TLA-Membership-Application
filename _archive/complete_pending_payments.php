<?php
// Database connection
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'next_auth';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$database", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== COMPLETING PENDING PAYMENTS ===\n\n";
    
    // Get all pending payments
    $stmt = $pdo->query("
        SELECT p.*, u.name, u.email 
        FROM payments p 
        JOIN users u ON p.user_id = u.id 
        WHERE p.status = 'pending' 
        ORDER BY p.created_at DESC
    ");
    $pendingPayments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($pendingPayments)) {
        echo "No pending payments found.\n";
        exit;
    }
    
    echo "Found " . count($pendingPayments) . " pending payments:\n\n";
    
    foreach ($pendingPayments as $payment) {
        echo "Processing payment: {$payment['reference']}\n";
        echo "User: {$payment['name']} ({$payment['email']})\n";
        echo "Amount: {$payment['amount']} TZS\n";
        echo "Type: {$payment['membership_type']}\n";
        echo "Created: {$payment['created_at']}\n";
        
        try {
            // Update payment status
            $stmt = $pdo->prepare("
                UPDATE payments SET 
                status = 'completed', 
                paid_at = NOW(), 
                transaction_id = CONCAT('MANUAL-', UNIX_TIMESTAMP())
                WHERE reference = ?
            ");
            $stmt->execute([$payment['reference']]);
            
            // Update or create membership
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
            
            echo "✓ Payment completed successfully\n";
            echo "✓ Membership activated: {$membershipNumber}\n\n";
            
        } catch (Exception $e) {
            echo "✗ Error: " . $e->getMessage() . "\n\n";
        }
    }
    
    echo "=== COMPLETION SUMMARY ===\n";
    
    // Check results
    $stmt = $pdo->query("
        SELECT p.*, u.name, u.email 
        FROM payments p 
        JOIN users u ON p.user_id = u.id 
        WHERE p.status = 'completed' 
        ORDER BY p.paid_at DESC 
        LIMIT 5
    ");
    $completedPayments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Recently completed payments:\n";
    foreach ($completedPayments as $payment) {
        echo "- {$payment['reference']}: {$payment['name']} - {$payment['amount']} TZS\n";
    }
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
