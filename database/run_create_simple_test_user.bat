@echo off
echo Creating simple test user...

REM Set MySQL path
set MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe

"%MYSQL_PATH%" -u root next_auth < database/create_simple_test_user.sql

pause
