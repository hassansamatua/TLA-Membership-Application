<?php
require_once 'Database.php';

$database = new Database();
$db = $database->getConnection();

echo "=== DEBUGGING PAYMENT FLOW ===\n\n";

// Test user 26
$userId = 26;

echo "1. Checking current payment status for user $userId...\n";

// Check if there are any completed payments
$completedPaymentQuery = "SELECT * FROM membership_payments WHERE user_id = ? AND status = 'completed' ORDER BY payment_date DESC LIMIT 1";
$completedPaymentStmt = $db->prepare($completedPaymentQuery);
$completedPaymentStmt->execute([$userId]);

$completedPayment = $completedPaymentStmt->fetch(PDO::FETCH_ASSOC);

if ($completedPayment) {
    echo "✅ Found completed payment:\n";
    echo "  - Reference: {$completedPayment['reference']}\n";
    echo "  - Amount: {$completedPayment['amount']}\n";
    echo "  - Date: {$completedPayment['payment_date']}\n";
    echo "  - Status: {$completedPayment['status']}\n";
    echo "  - Payment Method: {$completedPayment['payment_method']}\n";
} else {
    echo "❌ No completed payments found for user $userId\n";
}

// Check membership status
echo "\n2. Checking membership status...\n";
$membershipQuery = "SELECT * FROM memberships WHERE user_id = ? ORDER BY expiry_date DESC LIMIT 1";
$membershipStmt = $db->prepare($membershipQuery);
$membershipStmt->execute([$userId]);

$membership = $membershipStmt->fetch(PDO::FETCH_ASSOC);

if ($membership) {
    echo "✅ Found membership record:\n";
    echo "  - Membership Number: {$membership['membership_number']}\n";
    echo "  - Status: {$membership['status']}\n";
    echo "  - Payment Status: {$membership['payment_status']}\n";
    echo "  - Amount Paid: {$membership['amount_paid']}\n";
    echo "  - Payment Date: {$membership['payment_date']}\n";
    echo "  - Payment Reference: {$membership['payment_reference']}\n";
} else {
    echo "❌ No membership record found for user $userId\n";
}

echo "\n=== CONCLUSION ===\n";

if ($completedPayment && $membership && $membership['status'] === 'active' && $membership['payment_status'] === 'paid') {
    echo "✅ User SHOULD be able to access membership card!\n";
    echo "   - Has completed payment: YES\n";
    echo "   - Membership is active: YES\n";
    echo "   - Payment status is paid: YES\n";
    echo "   - Payment reference exists: " . ($membership['payment_reference'] ? 'YES' : 'NO') . "\n";
} else {
    echo "❌ User will NOT be able to access membership card\n";
    echo "   - Missing: completed payment, active membership, OR paid status\n";
}

echo "\n=== NEXT STEPS ===\n";
echo "1. Make a real payment through your payment interface\n";
echo "2. Check if payment success API is called after payment\n";
echo "3. Verify membership status API returns canAccessIdCard: true\n";
echo "4. Test membership card page access\n";

echo "\n=== DEBUG COMPLETE ===\n";
?>
