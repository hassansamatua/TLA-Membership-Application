@echo off
echo Creating known admin user...

REM Set MySQL path
set MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe

"%MYSQL_PATH%" -u root next_auth < database/create_known_admin.sql

pause
