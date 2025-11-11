# PollSite

A modern, full-stack polling application built with Django REST Framework and React.

## Overview

PollSite allows users to create polls, vote, comment, and engage with a community around polls. Features include anonymous voting via device tracking, nested comment replies, real-time vote updates, and infinite scroll.

## Tech Stack

### Backend
- **Django 5.1** + **Django REST Framework 3.15**
- **PostgreSQL 16** - Primary database
- **Redis 7** - Caching and pub/sub
- **Celery** - Async task processing
- **JWT Authentication** - httpOnly cookie-based auth

### Frontend
- **React 19.1.1** - Latest React with concurrent features
- **TypeScript 5.9.3** - Full type safety
- **Vite 7** - Fast build tool
- **Tailwind CSS v4.1.17** - Modern utility-first CSS
- **React Router 7** - Client-side routing

## Features

✅ **Authentication**
- JWT cookie-based auth (secure, httpOnly)
- Session persistence across page refreshes
- Anonymous voting with device ID tracking

✅ **Polls**
- Create, vote, and share polls
- Infinite scroll feed with cursor pagination
- Real-time vote percentages with smooth animations
- Topic/category tagging
- Anonymous + authenticated voting support

✅ **Comments**
- Nested comment replies (parent/child)
- Expandable reply threads
- Real-time comment posting
- Like functionality (UI ready)

✅ **UI/UX**
- Fully responsive design
- Smooth animations and transitions
- Toast notifications
- Sticky header
- Custom icon system
- Pink theme (#F080B8)

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 16
- Redis 7
- Docker (optional)

### Development Setup

**1. Clone the repository**
```bash
git clone https://github.com/ArtsemiMu/pollsite_dev.git
cd pollsite_dev
```

**2. Backend Setup**
```bash
cd api

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Seed demo data (optional)
python manage.py seed_polls

# Start server
python manage.py runserver
```

Backend runs at: `http://localhost:8000`

**3. Frontend Setup**
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: `http://localhost:3000`

### Docker Setup (Alternative)

```bash
# Start all services
docker-compose up --build

# Run migrations
docker-compose exec api python manage.py migrate

# Create superuser
docker-compose exec api python manage.py createsuperuser

# Seed demo data
docker-compose exec api python manage.py seed_polls
```

Access:
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000` (run locally with npm)

## Project Structure

```
pollsite_dev/
├── api/                    # Django backend
│   ├── core/              # Django settings
│   ├── polls/             # Main app
│   │   ├── models/       # Database models
│   │   ├── serializers/  # DRF serializers
│   │   ├── viewsets/     # API endpoints
│   │   └── management/   # Management commands
│   └── lib/              # Shared utilities
│
├── frontend/              # React frontend
│   ├── src/
│   │   ├── api/          # API client
│   │   ├── components/   # UI components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom hooks
│   │   ├── context/      # React contexts
│   │   └── types/        # TypeScript types
│   └── public/           # Static assets
│
├── nginx/                 # Nginx config
└── docker-compose.yml     # Docker orchestration
```

## API Documentation

### Key Endpoints

**Authentication:**
- `POST /api/auth/login/` - Login
- `POST /api/auth/signup/` - Register
- `GET /api/auth/session/` - Check session
- `POST /api/auth/logout/` - Logout

**Polls:**
- `GET /api/polls/` - List polls (with cursor pagination)
- `GET /api/polls/{id}/` - Get poll detail
- `POST /api/polls/` - Create poll (auth required)
- `POST /api/polls/{id}/vote/` - Vote on poll

**Comments:**
- `GET /api/polls/{id}/comments/` - List comments
- `GET /api/polls/{id}/comments/?parent={id}` - List replies
- `POST /api/polls/{id}/comments/` - Create comment

Full API docs available at: `http://localhost:8000/api/schema/swagger/`

## Environment Variables

### Backend (.env)
```env
POSTGRES_DB=pollsite
POSTGRES_USER=postgres
POSTGRES_PASSWORD=yourpassword
POSTGRES_HOST=db
POSTGRES_PORT=5432

REDIS_URL=redis://redis:6379/0

SECRET_KEY=your-secret-key
DEBUG=True
FRONTEND_ORIGIN=http://localhost:3000
```

### Frontend (.env)
```env
VITE_API_BASE_URL=/api
```

## Development Notes

### Device ID System
- Anonymous users get a unique device ID (stored in localStorage)
- Device ID is hashed (SHA-256) and sent as `X-Device-Id` header
- Enables anonymous voting without requiring authentication

### Comment System
- Top-level comments shown by default (`parent=null`)
- Replies loaded on-demand via `?parent={id}` query
- Frontend handles expand/collapse UI

### Vote Animations
Multi-step CSS transitions:
1. Text slides from center to left
2. Progress bar fills to percentage
3. Percentage number fades in
4. Selected option highlights

## Management Commands

```bash
# Seed demo polls
python manage.py seed_polls

# Create moderator user
python manage.py create_moderator <username> <email>
```

## Contributing

This is a development project. Feel free to:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is for educational/portfolio purposes.

## Contact

For questions or issues, please open an issue on GitHub or contact the repository owner.
