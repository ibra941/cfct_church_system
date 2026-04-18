# CFCT Church Management System

A comprehensive church management system for Christian Fellowship Church Tanzania.

## Features

- **Multi-tenancy** with hierarchical church structure (National → Zone → Region → District → Local)
- **Role-Based Access Control** (National Leader, Zone Leader, Regional Leader, District Leader, Local Member)
- **Member Management** with registration and approval workflow
- **Financial Management** (Offerings, Expenses, Budgets)
- **Event Management** with popup news
- **Department Management**
- **Prayer Request System**
- **Member Transfer Workflow**
- **Real-time Notifications**
- **Bilingual Support** (English/Kiswahili)
- **PWA Support** for mobile devices
- **Advanced Reporting**

## Tech Stack

- **Backend**: Django 5.0, Django REST Framework
- **Database**: PostgreSQL
- **Frontend**: React 18, Vite, Tailwind CSS
- **Authentication**: JWT
- **Real-time**: WebSockets (Channels)
- **Task Queue**: Celery, Redis
- **Container**: Docker

## Installation

### Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL 15+
- Redis (optional)

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your database credentials
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## Public Hosting (GitHub)

This project can be made public using GitHub + Render (backend) + Vercel (frontend).

### 1. Push Project to GitHub

```bash
git init
git add .
git commit -m "Prepare production deployment"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### 2. Deploy Backend on Render

1. Open Render dashboard.
2. Click "New" -> "Blueprint".
3. Connect your GitHub repo.
4. Render will detect `render.yaml` and create:
   - `cfct-backend` (web service)
   - `cfct-postgres` (database)
5. After first deploy, update these env values in Render:
   - `ALLOWED_HOSTS` -> your backend host (for example `cfct-backend.onrender.com`)
   - `CORS_ALLOWED_ORIGINS` -> your frontend host (for example `https://cfct-frontend.vercel.app`)
   - `CSRF_TRUSTED_ORIGINS` -> backend + frontend URLs
   - `FRONTEND_BASE_URL` -> frontend URL

### 3. Deploy Frontend on Vercel

1. Open Vercel dashboard.
2. Import same GitHub repo.
3. Set project root directory to `frontend`.
4. Add env variable:
   - `VITE_API_URL=https://<your-render-backend>/api`
5. Deploy.

### 4. Final Production Checklist

- Create Django superuser on Render shell:

```bash
python manage.py createsuperuser
```

- Test:
  - Frontend opens
  - Login works
  - API responds
  - Admin opens at `https://<backend>/admin/`
