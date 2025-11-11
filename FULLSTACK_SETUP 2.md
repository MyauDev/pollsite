# PollSite - Full Stack Setup Guide

This project now has a complete full-stack setup with:
- **Backend**: Django REST API (Python)
- **Frontend**: React + TypeScript + Tailwind CSS
- **Database**: PostgreSQL
- **Cache**: Redis
- **Web Server**: Nginx
- **Containerization**: Docker Compose

## 🏗️ Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Nginx    │ (:80)
│  (Reverse   │
│   Proxy)    │
└──────┬──────┘
       │
       ├─────► /api/*  ────────┐
       │                       ▼
       │              ┌─────────────────┐
       │              │  Django API     │ (:8000)
       │              │  (Gunicorn)     │
       │              └────────┬────────┘
       │                       │
       └─────► /      ─────┐   ├────► PostgreSQL
                            │   └────► Redis
                            ▼
                   ┌─────────────────┐
                   │ React Frontend  │ (:80 internal)
                   │    (Nginx)      │
                   └─────────────────┘
```

## 📁 Project Structure

```
pollsite_dev/
├── api/                      # Django backend
│   ├── core/                 # Django project settings
│   ├── polls/                # Main app (models, views, serializers)
│   ├── lib/                  # Shared utilities
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
├── my-frontend/              # React frontend
│   ├── src/
│   │   ├── api/             # API client & endpoints
│   │   ├── components/      # Reusable components
│   │   ├── context/         # React contexts (Auth, etc.)
│   │   ├── pages/           # Page components
│   │   ├── types/           # TypeScript definitions
│   │   ├── App.tsx          # Main app with routing
│   │   └── main.tsx         # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── Dockerfile
├── nginx/
│   └── nginx.conf           # Nginx configuration
├── docker-compose.yml       # Docker orchestration
└── .env                     # Environment variables
```

## 🚀 Quick Start

### Option 1: Local Development (Recommended for Development)

#### Backend (Django)
```bash
cd api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

#### Frontend (React)
```bash
cd my-frontend
npm install
npm run dev
```

Visit: `http://localhost:3000`

### Option 2: Docker (Recommended for Production-like Environment)

```bash
# Build and start all services
docker-compose up --build

# Or in detached mode
docker-compose up -d --build
```

Visit: `http://localhost`

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
POSTGRES_DB=pollsite
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password

# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
FRONTEND_ORIGIN=http://localhost

# Redis
REDIS_URL=redis://redis:6379/0
```

### Frontend API Configuration

The frontend uses Vite's proxy for local development:

**`my-frontend/vite.config.ts`**:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
}
```

This proxies all `/api/*` requests to your Django backend.

## 📝 Available Features

### ✅ Implemented

#### Authentication
- User registration (signup)
- User login with JWT cookies
- Logout
- Session management
- Protected routes
- Auto token refresh

#### Polls
- List all polls
- View poll details
- Vote on polls
- Real-time vote results with percentages
- Visual progress bars

#### UI/UX
- Responsive design (mobile-friendly)
- Loading states
- Error handling
- Navigation bar with auth state

### 🔨 To Be Implemented

You can extend the project by adding:

1. **Create Poll Page**
   ```typescript
   // Already have the API endpoint:
   pollAPI.create(data)
   ```

2. **User Profiles**
   ```typescript
   profileAPI.get(username)
   profileAPI.update(data)
   ```

3. **Comments**
   ```typescript
   commentAPI.list(pollId)
   commentAPI.create(data)
   ```

4. **Topics/Categories**
   ```typescript
   topicAPI.list()
   topicAPI.polls(slug)
   ```

5. **Search & Filters**
6. **Analytics Dashboard**
7. **Social Features** (follow/unfollow)
8. **Moderation Tools**

## 🛠️ Development Workflow

### Making API Changes

1. Update Django models/serializers/views in `api/polls/`
2. Update TypeScript types in `my-frontend/src/types/index.ts`
3. Update API endpoints in `my-frontend/src/api/endpoints.ts`
4. Use the endpoints in your components

Example:
```typescript
import { pollAPI } from '@/api/endpoints';

const fetchPolls = async () => {
  const response = await pollAPI.list({ page: 1 });
  setPolls(response.data.results);
};
```

### Adding New Pages

1. Create page component in `my-frontend/src/pages/`
2. Add route in `my-frontend/src/App.tsx`
3. Add navigation link if needed

Example:
```typescript
// src/pages/CreatePollPage.tsx
export const CreatePollPage = () => {
  // Your component
};

// src/App.tsx
<Route path="/polls/create" element={
  <ProtectedRoute>
    <CreatePollPage />
  </ProtectedRoute>
} />
```

## 🐳 Docker Commands

```bash
# Start services
docker-compose up

# Rebuild after changes
docker-compose up --build

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f frontend
docker-compose logs -f api

# Run Django migrations
docker-compose exec api python manage.py migrate

# Create Django superuser
docker-compose exec api python manage.py createsuperuser

# Access Django shell
docker-compose exec api python manage.py shell

# Access frontend container
docker-compose exec frontend sh
```

## 🧪 Testing

### Frontend
```bash
cd my-frontend
npm run lint    # Check for linting errors
npm run build   # Test production build
```

### Backend
```bash
cd api
python manage.py test
```

## 📦 Production Deployment

### Frontend Build

The frontend Dockerfile uses multi-stage builds:
1. **Build stage**: Compiles TypeScript and bundles with Vite
2. **Production stage**: Serves static files with Nginx

```bash
cd my-frontend
docker build -t pollsite-frontend .
```

### Backend

The Django backend runs with Gunicorn in production mode.

### Environment Variables for Production

Update `.env` for production:
```env
DEBUG=False
ALLOWED_HOSTS=yourdomain.com
FRONTEND_ORIGIN=https://yourdomain.com
# Use strong secrets!
SECRET_KEY=generate-strong-secret-key
POSTGRES_PASSWORD=strong-database-password
```

## 🔍 Troubleshooting

### CORS Issues
- Make sure `FRONTEND_ORIGIN` in `.env` matches your frontend URL
- Check Django CORS settings in `api/core/settings.py`

### API 401 Errors
- Check if cookies are being sent (`withCredentials: true` in axios)
- Verify JWT settings in Django
- Check browser dev tools → Network → Cookies

### Frontend Not Loading
- Check if all services are running: `docker-compose ps`
- Check nginx logs: `docker-compose logs nginx`
- Verify nginx config syntax: `docker-compose exec nginx nginx -t`

### Cannot Connect to API
- Ensure Django is running on port 8000
- Check Vite proxy configuration
- Verify API base URL in `src/api/client.ts`

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Vite Documentation](https://vitejs.dev/)

## 🤝 Contributing

When contributing:
1. Follow the existing code structure
2. Update TypeScript types when changing API
3. Add proper error handling
4. Test both frontend and backend
5. Update documentation

## 📄 License

[Your License Here]
