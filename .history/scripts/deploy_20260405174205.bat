@echo off
echo ========================================
echo CFCT Deployment Script
echo ========================================
echo.

echo [1/5] Pulling latest changes...
git pull

echo [2/5] Activating virtual environment...
cd backend
call venv\Scripts\activate

echo [3/5] Installing dependencies...
pip install -r requirements.txt

echo [4/5] Running migrations...
python manage.py migrate
python manage.py collectstatic --noinput

echo [5/5] Restarting services...
cd ..
docker-compose down
docker-compose up -d --build

echo ✅ Deployment completed!
pause