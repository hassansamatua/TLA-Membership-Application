<?php
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

require_once '../../config.php';
require_once '../../Database.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents('php://input'));

    // Check if user already exists
    $query = 'SELECT id FROM users WHERE email = ?';
    $stmt = $db->prepare($query);
    $stmt->execute([$data->email]);
    
    if ($stmt->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(['message' => 'User already exists with this email']);
        exit();
    }

    // Create new user
    $query = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
    $stmt = $db->prepare($query);
    
    $password_hash = password_hash($data->password, PASSWORD_BCRYPT);
    
    if ($stmt->execute([$data->name, $data->email, $password_hash])) {
        http_response_code(201);
        echo json_encode(['message' => 'User created successfully']);
    } else {
        http_response_code(503);
        echo json_encode(['message' => 'Unable to create user']);
    }
} else {
    http_response_code(400);
    echo json_encode(['message' => 'Unable to create user. Data is incomplete.']);
}
?>
