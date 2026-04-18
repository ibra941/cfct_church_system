@echo off
echo Backing up database...
pg_dump -U postgres cfct_db > backup_%2026%%04%%04%.sql
echo Backup complete!
