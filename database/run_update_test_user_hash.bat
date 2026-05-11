@echo off
echo Updating test user hash...

REM Set MySQL path
set MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe

"%MYSQL_PATH%" -u root next_auth < database/update_test_user_hash.sql

pause
