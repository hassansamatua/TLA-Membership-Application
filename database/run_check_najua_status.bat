@echo off
echo Checking najua user status...

REM Set MySQL path
set MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe

"%MYSQL_PATH%" -u root next_auth < database/check_najua_status.sql

pause
