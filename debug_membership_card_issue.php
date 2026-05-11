<?php
require_once 'Database.php';

$database = new Database();
$db = $database->getConnection();

echo "=== DEBUGGING MEMBERSHIP CARD ISSUE ===\n\n";

// Test user ID 26 (eg eg eg)
$userId = 26;

echo "Checking user ID: $userId\n";

// Check membership_payments table for completed payments
echo "\n1. Checking membership_payments table:\n";
$paymentQuery = "SELECT * FROM membership_payments WHERE user_id = ? ORDER BY payment_date DESC LIMIT 5";
$paymentStmt = $db->prepare($paymentQuery);
$paymentStmt->execute([$userId]);

$payments = $paymentStmt->fetchAll(PDO::FETCH_ASSOC);
if ($payments) {
    foreach ($payments as $payment) {
        echo "  Payment ID: {$payment['id']}, Status: {$payment['status']}, Amount: {$payment['amount']}, Date: {$payment['payment_date']}, Reference: {$payment['payment_reference']}\n";
    }
} else {
    echo "  No payments found\n";
}

// Check memberships table
echo "\n2. Checking memberships table:\n";
$membershipQuery = "SELECT * FROM memberships WHERE user_id = ? ORDER BY expiry_date DESC LIMIT 3";
$membershipStmt = $db->prepare($membershipQuery);
$membershipStmt->execute([$userId]);

$memberships = $membershipStmt->fetchAll(PDO::FETCH_ASSOC);
if ($memberships) {
    foreach ($memberships as $membership) {
        echo "  Membership ID: {$membership['id']}, Status: {$membership['status']}, Payment Status: {$membership['payment_status']}, Amount Paid: {$membership['amount_paid']}, Expiry: {$membership['expiry_date']}, Number: {$membership['membership_number']}\n";
    }
} else {
    echo "  No memberships found\n";
}

// Test what the API should return
echo "\n3. Simulating API response:\n";

// Get latest completed payment
$completedPaymentQuery = "SELECT * FROM membership_payments WHERE user_id = ? AND status = 'completed' ORDER BY payment_date DESC LIMIT 1";
$completedPaymentStmt = $db->prepare($completedPaymentQuery);
$completedPaymentStmt->execute([$userId]);
$completedPayment = $completedPaymentStmt->fetch(PDO::FETCH_ASSOC);

// Get latest membership
$membershipQuery2 = "SELECT * FROM memberships WHERE user_id = ? ORDER BY expiry_date DESC LIMIT 1";
$membershipStmt2 = $db->prepare($membershipQuery2);
$membershipStmt2->execute([$userId]);
$membership = $membershipStmt2->fetch(PDO::FETCH_ASSOC);

$hasCompletedPayment = !empty($completedPayment);
$membershipActive = $membership && $membership['status'] === 'active' && $membership['payment_status'] === 'paid';

$canAccessIdCard = $hasCompletedPayment && $membershipActive;

echo "API Response Simulation:\n";
echo "  success: true\n";
echo "  canAccessIdCard: " . ($canAccessIdCard ? 'true' : 'false') . "\n";
echo "  hasCompletedPayment: " . ($hasCompletedPayment ? 'true' : 'false') . "\n";
echo "  membershipActive: " . ($membershipActive ? 'true' : 'false') . "\n";

if ($membership) {
    echo "  membership: {\n";
    echo "    membershipNumber: {$membership['membership_number']}\n";
    echo "    membershipType: {$membership['membership_type']}\n";
    echo "    status: {$membership['status']}\n";
    echo "    paymentStatus: {$membership['payment_status']}\n";
    echo "  }\n";
}

echo "\n=== CONCLUSION ===\n";
if ($canAccessIdCard) {
    echo "✅ User SHOULD be able to access membership card\n";
} else {
    echo "❌ User will NOT be able to access membership card\n";
    echo "   - Has completed payment: " . ($hasCompletedPayment ? 'YES' : 'NO') . "\n";
    echo "   - Membership is active: " . ($membershipActive ? 'YES' : 'NO') . "\n";
}
?>
