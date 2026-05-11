<?php
// Database connection
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'next_auth';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$database", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== FIXING MISSING MEMBERSHIPS ===\n\n";
    
    // Find users with completed payments but no membership
    $stmt = $pdo->query("
        SELECT p.*, u.name, u.email 
        FROM payments p 
        LEFT JOIN memberships m ON p.user_id = m.user_id 
        JOIN users u ON p.user_id = u.id 
        WHERE p.status = 'completed' AND m.user_id IS NULL
    ");
    $missingMemberships = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($missingMemberships)) {
        echo "No missing memberships found.\n";
        exit;
    }
    
    foreach ($missingMemberships as $payment) {
        echo "Creating membership for user: {$payment['name']} ({$payment['email']})\n";
        echo "Payment: {$payment['reference']}, Amount: {$payment['amount']}\n";
        
        try {
            // Generate membership number
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
            
            // Create membership
            $membershipStmt = $pdo->prepare("
                INSERT INTO memberships (
                    user_id, membership_number, membership_type, status, 
                    payment_status, payment_date, amount_paid, joined_date, expiry_date
                ) VALUES (?, ?, ?, 'active', 'paid', CURDATE(), ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR))
            ");
            $membershipStmt->execute([
                $payment['user_id'],
                $membershipNumber,
                $payment['membership_type'],
                $payment['amount']
            ]);
            
            echo "✓ Membership created: {$membershipNumber}\n\n";
            
        } catch (Exception $e) {
            echo "✗ Error: " . $e->getMessage() . "\n\n";
        }
    }
    
    echo "=== VERIFICATION ===\n";
    
    // Verify all completed payments now have memberships
    $stmt = $pdo->query("
        SELECT p.*, u.name, u.email, m.membership_number, m.status as membership_status
        FROM payments p 
        JOIN users u ON p.user_id = u.id 
        LEFT JOIN memberships m ON p.user_id = m.user_id 
        WHERE p.status = 'completed'
        ORDER BY p.paid_at DESC
    ");
    $completedPayments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Completed payments with membership status:\n";
    foreach ($completedPayments as $payment) {
        $hasMembership = $payment['membership_number'] ? '✓' : '✗';
        echo "{$hasMembership} {$payment['reference']}: {$payment['name']} - " . ($payment['membership_number'] ?? 'NO MEMBERSHIP') . "\n";
    }
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
