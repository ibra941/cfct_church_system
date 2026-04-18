@echo off
echo ========================================
echo CFCT Database Restore Script
echo ========================================
echo.

set BACKUP_DIR=C:\Users\hp\Desktop\cfct_church_system\backups

echo Available backups:
dir %BACKUP_DIR%\*.sql /b
echo.

set /p BACKUP_FILE="Enter backup filename to restore: "

if not exist "%BACKUP_DIR%\%BACKUP_FILE%" (
    echo ❌ Backup file not found!
    pause
    exit /b 1
)

echo Restoring database from: %BACKUP_FILE%

psql -U postgres -h localhost -p 5432 -d cfct_db -f "%BACKUP_DIR%\%BACKUP_FILE%"

if %errorlevel% == 0 (
    echo ✅ Database restored successfully!
) else (
    echo ❌ Restore failed!
)

echo.
pause