@echo off
echo Updating admin passwords with correct hash...

REM Set MySQL path
set MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe

"%MYSQL_PATH%" -u root next_auth < database/update_admin_with_correct_hash.sql

pause
