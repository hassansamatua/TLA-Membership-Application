<?php
require 'vendor/autoload.php';
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

function generateJWT($data) {
    $issuedAt = time();
    $expire = $issuedAt + TOKEN_EXPIRY;
    
    $payload = [
        'iat' => $issuedAt,
        'exp' => $expire,
        'data' => $data
    ];
    
    return JWT::encode($payload, JWT_SECRET, 'HS256');
}

function validateJWT($token) {
    try {
        $decoded = JWT::decode($token, new Key(JWT_SECRET, 'HS256'));
        return (array) $decoded->data;
    } catch (Exception $e) {
        return false;
    }
}
?>
