# PollSite Frontend

React + TypeScript + Tailwind CSS frontend for PollSite.

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls

## Project Structure

```
src/
├── api/              # API client and endpoints
│   ├── client.ts     # Axios instance with interceptors
│   └── endpoints.ts  # Type-safe API endpoint functions
├── components/       # Reusable components
│   ├── Navbar.tsx
│   └── ProtectedRoute.tsx
├── context/          # React contexts
│   └── AuthContext.tsx
├── pages/            # Page components
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   ├── SignupPage.tsx
│   └── PollDetailPage.tsx
├── types/            # TypeScript type definitions
│   └── index.ts
├── App.tsx           # Main app component with routing
├── main.tsx          # Entry point
└── index.css         # Global styles with Tailwind
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Django backend running on `http://localhost:8000`

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Configuration

### API Proxy

The Vite dev server is configured to proxy API requests to the Django backend:

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
}
```

This means all requests to `/api/*` will be forwarded to `http://localhost:8000/api/*`.

### Environment Variables

Create a `.env` file for environment-specific configuration:

```env
VITE_API_BASE_URL=/api
```

## Features Implemented

### Authentication
- ✅ Login page with JWT cookie authentication
- ✅ Signup page with validation
- ✅ Auth context for global auth state
- ✅ Automatic token refresh on 401 errors
- ✅ Protected routes

### Polls
- ✅ List all polls on homepage
- ✅ View poll details
- ✅ Vote on polls (authenticated users)
- ✅ Real-time vote percentage display
- ✅ Visual progress bars for results

### UI/UX
- ✅ Responsive design with Tailwind CSS
- ✅ Navigation bar with auth state
- ✅ Loading states
- ✅ Error handling and display

## Next Steps

You can extend this by adding:

1. **Create Poll Page** - Form to create new polls
2. **User Profile Page** - View and edit user profiles
3. **My Polls Page** - List of user's created polls
4. **Comments** - Add and view comments on polls
5. **Topics/Categories** - Filter polls by topic
6. **Search** - Search polls by title or content
7. **Analytics** - Detailed poll analytics and charts
8. **Dark Mode** - Toggle between light and dark themes

## API Integration

All API calls are type-safe and use the endpoint functions from `src/api/endpoints.ts`:

```typescript
// Example: Login
import { authAPI } from '@/api/endpoints';

const response = await authAPI.login({ email, password });
```

The API client automatically:
- Includes credentials (cookies)
- Handles token refresh on 401 errors
- Adds proper headers
- Provides TypeScript types for requests and responses

## TypeScript Types

All backend models have corresponding TypeScript interfaces in `src/types/index.ts`:

- `User`, `AuthResponse`
- `Poll`, `PollOption`, `CreatePollRequest`
- `Comment`, `CreateCommentRequest`
- `Profile`, `Topic`
- `PaginatedResponse<T>`

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready to be served by nginx or any static file server.
