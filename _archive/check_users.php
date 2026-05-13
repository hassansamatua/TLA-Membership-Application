<?php
require_once 'config.php';

$conn = new mysqli('localhost', 'root', '', 'next_auth');

if ($conn->connect_error) {
    echo 'DB Error: ' . $conn->connect_error;
    exit;
}

echo "Checking users...\n";

$result = $conn->query("SELECT id, name, email, is_admin, is_approved FROM users LIMIT 5");

if ($result->num_rows === 0) {
    echo "No users found\n";
} else {
    echo "Found users:\n";
    while ($row = $result->fetch_assoc()) {
        echo "ID: {$row['id']}, Name: {$row['name']}, Email: {$row['email']}, Admin: " . ($row['is_admin'] ? 'Yes' : 'No') . ", Approved: " . ($row['is_approved'] ? 'Yes' : 'No') . "\n";
    }
}

$conn->close();
?>
