@echo off
echo Testing bcrypt hash...

REM Set MySQL path
set MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe

"%MYSQL_PATH%" -u root next_auth < database/test_bcrypt_hash.sql

pause
