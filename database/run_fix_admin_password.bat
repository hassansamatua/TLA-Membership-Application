@echo off
echo Fixing admin passwords...

REM Set MySQL path
set MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe

"%MYSQL_PATH%" -u root next_auth < database/fix_admin_password.sql

pause
