<?php
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

require_once '../../config.php';
require_once '../../Database.php';
require_once '../../jwt.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents('php://input'));

    $query = 'SELECT id, name, email, password, is_admin, is_approved FROM users WHERE email = ? LIMIT 1';
    $stmt = $db->prepare($query);
    $stmt->execute([$data->email]);
    
    if ($stmt->rowCount() > 0) {
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (password_verify($data->password, $row['password'])) {
            
            // Check if user is approved
            if (!$row['is_approved']) {
                http_response_code(403);
                echo json_encode(['message' => 'Account pending approval']);
                exit();
            }
            
            $token = generateJWT([
                'id' => $row['id'],
                'email' => $row['email'],
                'is_admin' => $row['is_admin']
            ]);
            
            setcookie('token', $token, time() + TOKEN_EXPIRY, '/', '', false, true);
            
            http_response_code(200);
            echo json_encode([
                'message' => 'Login successful',
                'token' => $token,
                'user' => [
                    'id' => $row['id'],
                    'name' => $row['name'],
                    'email' => $row['email'],
                    'isAdmin' => (bool)$row['is_admin'],
                    'isApproved' => (bool)$row['is_approved']
                ]
            ]);
        } else {
            http_response_code(401);
            echo json_encode(['message' => 'Invalid credentials']);
        }
    } else {
        http_response_code(404);
        echo json_encode(['message' => 'User not found']);
    }
} else {
    http_response_code(400);
    echo json_encode(['message' => 'Unable to login. Data is incomplete.']);
}
?>
