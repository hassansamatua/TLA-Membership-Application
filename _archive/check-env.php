<?php
echo "Checking environment variables...\n";

echo "AZAMPAY_CLIENT_ID: " . (getenv('AZAMPAY_CLIENT_ID') ?: 'NOT SET') . "\n";
echo "AZAMPAY_CLIENT_SECRET: " . (getenv('AZAMPAY_CLIENT_SECRET') ?: 'NOT SET') . "\n";
echo "AZAMPAY_APP_NAME: " . (getenv('AZAMPAY_APP_NAME') ?: 'NOT SET') . "\n";
echo "AZAMPAY_CALLBACK_URL: " . (getenv('AZAMPAY_CALLBACK_URL') ?: 'NOT SET') . "\n";
echo "AZAMPAY_TEST_MODE: " . (getenv('AZAMPAY_TEST_MODE') ?: 'NOT SET') . "\n";
echo "NODE_ENV: " . (getenv('NODE_ENV') ?: 'NOT SET') . "\n";
echo "NEXT_PUBLIC_BASE_URL: " . (getenv('NEXT_PUBLIC_BASE_URL') ?: 'NOT SET') . "\n";
?>
