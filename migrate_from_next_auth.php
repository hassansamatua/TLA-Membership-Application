<?php
$host = 'localhost';
$user = 'root';
$password = 'hansco123';
$sourceDb = 'next_auth';
$targetDb = 'tutorial2';

try {
    // Connect to source database
    $sourcePdo = new PDO("mysql:host=$host;dbname=$sourceDb", $user, $password);
    $sourcePdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Connect to target database
    $targetPdo = new PDO("mysql:host=$host;dbname=$targetDb", $user, $password);
    $targetPdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Migrating users from $sourceDb to $targetDb...\n";
    
    // Get users from source
    $stmt = $sourcePdo->query("SELECT * FROM users");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($users as $user) {
        echo "Migrating user: {$user['name']} ({$user['email']})\n";
        
        // Insert into target database
        $stmt = $targetPdo->prepare("
            INSERT INTO users (id, name, email, password, nida, user_category, membership_type, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            email = VALUES(email),
            password = VALUES(password),
            nida = VALUES(nida),
            user_category = COALESCE(user_category, VALUES(user_category)),
            membership_type = COALESCE(membership_type, VALUES(membership_type)),
            updated_at = VALUES(updated_at)
        ");
        
        $stmt->execute([
            $user['id'],
            $user['name'],
            $user['email'],
            $user['password'],
            $user['nida'] ?? null,
            $user['user_category'] ?? 'regular',
            $user['membership_type'] ?? 'personal',
            $user['created_at'] ?? date('Y-m-d H:i:s'),
            date('Y-m-d H:i:s')
        ]);
    }
    
    // Migrate tokens
    echo "\nMigrating tokens...\n";
    $stmt = $sourcePdo->query("SELECT * FROM tokens");
    $tokens = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($tokens as $token) {
        echo "Migrating token for user {$token['user_id']}\n";
        
        $stmt = $targetPdo->prepare("
            INSERT INTO tokens (id, user_id, token, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            token = VALUES(token),
            expires_at = VALUES(expires_at)
        ");
        
        $stmt->execute([
            $token['id'],
            $token['user_id'],
            $token['token'],
            $token['expires_at'],
            $token['created_at'] ?? date('Y-m-d H:i:s')
        ]);
    }
    
    echo "\n✅ Migration completed!\n";
    
    // Verify migration
    $stmt = $targetPdo->query("SELECT COUNT(*) as count FROM users");
    $userCount = $stmt->fetchColumn();
    
    $stmt = $targetPdo->query("SELECT COUNT(*) as count FROM tokens");
    $tokenCount = $stmt->fetchColumn();
    
    echo "Users in tutorial2: $userCount\n";
    echo "Tokens in tutorial2: $tokenCount\n";
    
} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
}
?>
