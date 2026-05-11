<?php
// Manual payment activation script
// Usage: Visit this script in browser with ?reference=TEST-XXXXX

try {
    $conn = new PDO('mysql:host=localhost;dbname=next_auth', 'root', '');
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $reference = $_GET['reference'] ?? '';
    
    if (empty($reference)) {
        die('Error: Reference parameter is required');
    }
    
    echo "<h2>Manual Payment Activation</h2>";
    echo "<p>Reference: <strong>$reference</strong></p>";
    
    // Find the payment
    $stmt = $conn->prepare("SELECT * FROM payments WHERE reference = ?");
    $stmt->execute([$reference]);
    $payment = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$payment) {
        echo "<p style='color: red;'>Error: Payment not found</p>";
        exit;
    }
    
    echo "<p>Current Status: <strong>{$payment['status']}</strong></p>";
    echo "<p>Paid At: " . ($payment['paid_at'] ?: 'NULL') . "</p>";
    
    // Find the user
    $userStmt = $conn->prepare("SELECT * FROM users WHERE id = ?");
    $userStmt->execute([$payment['user_id']]);
    $user = $userStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo "<p style='color: red;'>Error: User not found</p>";
        exit;
    }
    
    echo "<h3>Activation Options:</h3>";
    echo "<form method='post'>";
    echo "<input type='hidden' name='reference' value='$reference'>";
    echo "<button type='submit' name='action' value='activate'>Activate Payment</button> ";
    echo "<button type='submit' name='action' value='activate_and_create_membership'>Activate & Create Membership</button>";
    echo "<button type='submit' name='action' value='fix_status'>Fix Status to Completed</button>";
    echo "</form>";
    
    if ($_POST['action'] === 'activate') {
        // Update payment status
        $stmt = $conn->prepare("UPDATE payments SET status = 'completed', paid_at = NOW() WHERE reference = ?");
        $stmt->execute([$reference]);
        echo "<p style='color: green;'>✓ Payment activated!</p>";
        
        // Refresh to see updated status
        header("Refresh: 0");
        echo "<script>setTimeout(() => window.location.reload(), 2000);</script>";
    }
    
    if ($_POST['action'] === 'activate_and_create_membership') {
        // Update payment status
        $stmt = $conn->prepare("UPDATE payments SET status = 'completed', paid_at = NOW() WHERE reference = ?");
        $stmt->execute([$reference]);
        
        // Create membership
        $year = date('Y');
        $membershipNumber = "TLA{$year}0001";
        
        $stmt = $conn->prepare("
            INSERT INTO memberships 
                (user_id, membership_number, membership_type, status, payment_status, payment_date, amount_paid, join_date, expiry_date)
                VALUES (?, ?, 'personal', 'active', 'paid', CURDATE(), 40000, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR))
        ");
        $stmt->execute([$payment['user_id'], $membershipNumber]);
        
        echo "<p style='color: green;'>✓ Payment activated and membership created!</p>";
        echo "<p>Membership Number: <strong>$membershipNumber</strong></p>";
        
        // Refresh to see updated status
        header("Refresh: 0");
        echo "<script>setTimeout(() => window.location.reload(), 2000);</script>";
    }
    
    if ($_POST['action'] === 'fix_status') {
        // Fix all pending payments to completed
        $stmt = $conn->prepare("UPDATE payments SET status = 'completed', paid_at = NOW() WHERE status = 'pending'");
        $stmt->execute();
        $affected = $stmt->rowCount();
        echo "<p style='color: green;'>✓ Fixed <strong>$affected</strong> payments from 'pending' to 'completed'!</p>";
        
        // Refresh to see updated status
        header("Refresh: 0");
        echo "<script>setTimeout(() => window.location.reload(), 2000);</script>";
    }
    
} catch(PDOException $e) {
    echo "<p style='color: red;'>Error: " . $e->getMessage() . "</p>";
}
?>
