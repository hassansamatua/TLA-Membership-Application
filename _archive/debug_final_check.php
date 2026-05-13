<?php
require_once 'config.php';

echo "🔍 Final Database Check\n\n";

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $email = 'hassansamatua60@gmail.com';
    $userCode = '967741';
    
    echo "📧 Checking all reset tokens for $email:\n";
    
    $stmt = $pdo->prepare("SELECT id, reset_token, reset_token_expires_at FROM users WHERE email = ? AND reset_token IS NOT NULL ORDER BY reset_token_expires_at DESC");
    $stmt->execute([$email]);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($users) > 0) {
        foreach ($users as $user) {
            $expiresAt = new DateTime($user['reset_token_expires_at']);
            $now = new DateTime();
            $isExpired = $expiresAt < $now;
            $minutesLeft = $now->diff($expiresAt)->format('%i');
            
            echo "- Token: {$user['reset_token']} (Expired: " . ($isExpired ? 'YES' : 'NO') . ", Minutes left: $minutesLeft)\n";
        }
    }
    
    echo "\n🎯 User trying code: $userCode\n";
    
    // Check if this code exists
    $codeFound = false;
    $validCode = '';
    foreach ($users as $user) {
        if ($user['reset_token'] === $userCode) {
            $codeFound = true;
            $validCode = $user['reset_token'];
            $expiresAt = new DateTime($user['reset_token_expires_at']);
            $now = new DateTime();
            $isExpired = $expiresAt < $now;
            
            echo "✅ Code $userCode found!\n";
            echo "Expires at: {$expiresAt->format('Y-m-d H:i:s')}\n";
            echo "Is expired: " . ($isExpired ? 'YES' : 'NO') . "\n";
            break;
        }
    }
    
    if (!$codeFound) {
        echo "❌ Code $userCode NOT found in database\n";
        echo "❌ Available codes:\n";
        foreach ($users as $user) {
            echo "  - {$user['reset_token']}\n";
        }
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
