@echo off
echo ========================================
echo CFCT Database Backup Script
echo ========================================
echo.

set BACKUP_DIR=C:\Users\hp\Desktop\cfct_church_system\backups
set TIMESTAMP=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set BACKUP_FILE=%BACKUP_DIR%\cfct_backup_%TIMESTAMP%.sql

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Creating backup: %BACKUP_FILE%

pg_dump -U postgres -h localhost -p 5432 cfct_db > "%BACKUP_FILE%"

if %errorlevel% == 0 (
    echo ✅ Backup completed successfully!
    echo File: %BACKUP_FILE%
) else (
    echo ❌ Backup failed!
)

echo.
pause