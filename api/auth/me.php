<?php
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

require_once '../../config.php';
require_once '../../Database.php';
require_once '../../jwt.php';

$database = new Database();
$db = $database->getConnection();

// Get token from Authorization header
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $token = $matches[1];
    $decoded = validateJWT($token);
    
    if ($decoded) {
        $query = 'SELECT u.id, u.name, u.email, u.is_admin, u.is_approved, up.membership_number, up.membership_type, up.membership_status, up.join_date, up.membership_expiry 
                   FROM users u 
                   LEFT JOIN user_profiles up ON u.id = up.user_id 
                   WHERE u.id = ? LIMIT 1';
        $stmt = $db->prepare($query);
        $stmt->execute([$decoded['id']]);
        
        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            http_response_code(200);
            echo json_encode([
                'id' => $row['id'],
                'name' => $row['name'],
                'email' => $row['email'],
                'isAdmin' => (bool)$row['is_admin'],
                'isApproved' => (bool)$row['is_approved'],
                'membershipNumber' => $row['membership_number'] ?: $row['membership_number'], // Prioritize user_profiles data
                'membershipType' => $row['membership_type'] ?: null,
                'membershipStatus' => $row['membership_status'] ?: null,
                'joinDate' => $row['join_date'] ?: null,
                'expiryDate' => $row['membership_expiry'] ?: null
            ]);
        } else {
            http_response_code(404);
            echo json_encode(['message' => 'User not found']);
        }
    } else {
        http_response_code(401);
        echo json_encode(['message' => 'Invalid or expired token']);
    }
} else {
    http_response_code(401);
    echo json_encode(['message' => 'Authorization header missing or invalid']);
}
?>
