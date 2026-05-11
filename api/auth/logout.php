<?php
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

setcookie('token', '', time() - 3600, '/', '', false, true);
http_response_code(200);
echo json_encode(['message' => 'Successfully logged out']);
?>
