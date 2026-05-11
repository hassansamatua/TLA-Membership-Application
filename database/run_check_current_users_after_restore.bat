@echo off
echo Checking current users after restore...

REM Set MySQL path
set MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe

"%MYSQL_PATH%" -u root next_auth < database/check_current_users_after_restore.sql

pause
