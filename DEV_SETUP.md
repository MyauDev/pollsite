# Development Setup - Local Frontend + Docker Backend

This setup allows you to:
- Run the **backend (Django, PostgreSQL, Redis)** in Docker
- Run the **frontend (React)** locally with hot-reload

## 🚀 Quick Start

### 1. Start Backend (Docker)

```bash
# From project root
make up
# or
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Django API (port 8000)
- Celery worker
- Celery beat

### 2. Start Frontend (Local)

```bash
# In a new terminal
cd frontend
npm run dev
```

This starts:
- React app with Vite (port 3000)
- Hot module reload enabled
- Development mode

### 3. Access Your Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/
- **Django Admin**: http://localhost:8000/admin/

## 🔧 How It Works

### Backend (Docker)
- API exposed on `localhost:8000`
- CORS configured to accept requests from `localhost:3000`
- Database and Redis managed by Docker

### Frontend (Local)
- Vite dev server on `localhost:3000`
- Proxy configuration in `vite.config.ts`:
  ```typescript
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  }
  ```
- All `/api/*` requests forwarded to Django backend

## 📋 Common Commands

### Backend
```bash
# Start backend
make up

# Stop backend
docker-compose down

# View logs
docker-compose logs -f api

# Run migrations
docker-compose exec api python manage.py migrate

# Create superuser
docker-compose exec api python manage.py createsuperuser

# Django shell
docker-compose exec api python manage.py shell
```

### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 🔄 Workflow

1. **Start your day**:
   ```bash
   # Terminal 1
   make up
   
   # Terminal 2
   cd frontend && npm run dev
   ```

2. **Make changes**:
   - Edit React code → Hot reload automatically
   - Edit Django code → Container auto-reloads (with volume mount)

3. **End your day**:
   ```bash
   # Stop frontend: Ctrl+C
   
   # Stop backend
   docker-compose down
   ```

## 🐛 Troubleshooting

### Frontend can't connect to API
- Check backend is running: `docker-compose ps`
- Verify API is accessible: `curl http://localhost:8000/api/auth/session`
- Check CORS settings in `.env` file

### CORS errors
- Ensure `.env` has:
  ```
  CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
  FRONTEND_ORIGIN=http://localhost:3000
  ```
- Restart backend: `docker-compose restart api`

### Port already in use
- **Port 8000**: Stop other Django instances or change API port
- **Port 3000**: Change in `vite.config.ts` server port
- **Port 5432/6379**: Stop local PostgreSQL/Redis or change ports

### Database issues
- Reset database:
  ```bash
  docker-compose down -v
  docker-compose up -d
  ```

## 🎯 Benefits of This Setup

✅ **Fast Frontend Development**
- Instant hot-reload without Docker overhead
- Native npm commands
- Better IDE integration

✅ **Isolated Backend**
- Consistent environment across team
- No local PostgreSQL/Redis installation needed
- Easy to reset/clean

✅ **Production-like**
- Same backend configuration as production
- Test Docker builds when needed
- Easy to switch to full Docker mode

## 🔀 Switch to Full Docker Mode

If you want to run frontend in Docker too:

1. Uncomment `frontend` and `nginx` services in `docker-compose.yml`
2. Run: `docker-compose up --build`
3. Access: `http://localhost` (port 80)

## 📝 Environment Variables

### Required in `.env`
```env
# Database
POSTGRES_DB=polls
POSTGRES_USER=polls
POSTGRES_PASSWORD=12345

# Django
DJANGO_SECRET_KEY=dev-secret-key
DATABASE_URL=postgresql://polls:12345@db:5432/polls
REDIS_URL=redis://redis:6379/0

# CORS (for local frontend)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
FRONTEND_ORIGIN=http://localhost:3000
```

## 🎉 You're Ready!

Your development environment is configured for optimal workflow. Happy coding! 🚀
