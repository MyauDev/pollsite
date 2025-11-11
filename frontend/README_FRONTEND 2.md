# PollSite Frontend

React 19 + TypeScript + Tailwind CSS v4 frontend for PollSite - A modern polling application with real-time interactions.

## Tech Stack

- **React 19.1.1** - Latest React with concurrent features
- **TypeScript 5.9.3** - Type safety
- **Vite 7.x** - Fast build tool and dev server with HMR
- **Tailwind CSS v4.1.17** - Modern utility-first CSS with new architecture
- **React Router 7.1.3** - Client-side routing
- **Axios 1.13.2** - HTTP client with interceptors

## Project Structure

```
src/
├── api/              # API client and endpoints
│   ├── client.ts     # Axios instance with cookie auth & device ID
│   └── endpoints.ts  # Type-safe API endpoint functions
├── components/       # Reusable UI components
│   ├── Header.tsx           # Sticky header with navigation
│   ├── PollCard.tsx         # Individual poll display with voting
│   ├── CommentPanel.tsx     # Sliding comment panel with replies
│   ├── Toast.tsx            # Notification component
│   └── Button.tsx           # Reusable button component
├── context/          # React contexts
│   └── AuthContext.tsx      # Global auth state management
├── hooks/            # Custom React hooks
│   ├── useInfiniteFeed.ts   # Infinite scroll pagination
│   └── useVote.ts           # Poll voting logic
├── pages/            # Page components
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   ├── SignupPage.tsx
│   └── PollDetailPage.tsx
├── types/            # TypeScript type definitions
│   └── index.ts      # All interfaces (Poll, Comment, User, etc.)
├── utils/            # Utility functions
│   └── device.ts     # Device ID generation for anonymous voting
├── App.tsx           # Main app with routing
├── main.tsx          # Entry point
└── index.css         # Global styles with Tailwind v4 & icon masks
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

The Vite dev server proxies API requests to avoid CORS issues:

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

All requests to `/api/*` forward to `http://localhost:8000/api/*`.

## Features Implemented

### Authentication
- ✅ JWT cookie-based authentication (httpOnly, SameSite)
- ✅ Session persistence across page refreshes
- ✅ Login & signup with validation
- ✅ Auth context with useAuth() hook
- ✅ Protected routes

### Polls
- ✅ Infinite scroll feed with cursor pagination
- ✅ Device-based anonymous voting (localStorage + SHA-256)
- ✅ Vote state persistence across refreshes
- ✅ Real-time percentage calculations
- ✅ Animated vote transitions (text slide, bar fill, percentage fade)
- ✅ Visual feedback (pink fill bars, bold selected option)
- ✅ Topic tags display
- ✅ Poll descriptions with line clamping
- ✅ Share link with copy-to-clipboard

### Comments System
- ✅ Sliding comment panel from right side
- ✅ Nested replies with parent/child relationships
- ✅ Expandable/collapsible reply threads
- ✅ Like and reply buttons (UI ready)
- ✅ Real-time comment posting with optimistic updates
- ✅ Character counter (2000 max)
- ✅ User avatars and timestamps
- ✅ Anonymous comment support

### UI/UX
- ✅ Sticky header that stays visible on scroll
- ✅ Responsive design (mobile-first)
- ✅ Pink theme (#F080B8) with gradients
- ✅ Icon system with CSS mask-image (heart, comment, share)
- ✅ Toast notifications (bottom-right, auto-dismiss)
- ✅ Loading states and error handling
- ✅ Smooth animations and transitions
- ✅ Custom scrollbars

## Key Features Explained

### Device ID System
Anonymous users get a unique device ID stored in localStorage, hashed with SHA-256, and sent as `X-Device-Id` header. This enables:
- Anonymous voting without requiring login
- Vote state persistence across sessions
- Prevention of duplicate votes from same device

### Infinite Scroll
Uses `IntersectionObserver` API to detect when user scrolls near the bottom, automatically loads more polls with cursor-based pagination, prevents duplicates.

### Comment Replies
- Top-level comments shown by default
- Click reply count to expand nested replies
- Posting a reply auto-expands to show the new comment
- Chevron icon rotates to indicate expand/collapse state

### Vote Animations
Smooth multi-step animation when voting:
1. Text smoothly slides from center to left
2. Pink bar fills from 0% to vote percentage
3. Percentage number fades in from right
4. Selected option gets white text and bold font

## API Integration

All API calls are type-safe and use the endpoint functions from `src/api/endpoints.ts`:

```typescript
// Example: Login
import { authAPI } from './api/endpoints';
const response = await authAPI.login({ identifier: 'user@example.com', password: 'pass' });

// Example: Vote
import { pollAPI } from './api/endpoints';
await pollAPI.vote(pollId, { option_id: optionId });

// Example: Comments
import { commentAPI } from './api/endpoints';
const comments = await commentAPI.list(pollId);
await commentAPI.create(pollId, { content: 'Great poll!', parent: null });
```

The API client (`src/api/client.ts`) automatically:
- Includes credentials (httpOnly cookies)
- Sends device ID header for anonymous actions
- Handles authentication errors
- Provides TypeScript types for all requests/responses

## TypeScript Types

All backend models have TypeScript interfaces in `src/types/index.ts`:

**Core Types:**
- `User`, `AuthResponse`, `LoginRequest`, `SignupRequest`
- `Poll`, `PollOption`, `PollStats`, `Topic`
- `Comment`, `CommentAuthor`, `CreateCommentRequest`
- `VoteResponse` - includes percentages and vote counts
- `PaginatedResponse<T>` - generic pagination wrapper

## Custom Hooks

### useInfiniteFeed
```typescript
const { polls, loading, error, hasMore, loadMore } = useInfiniteFeed();
```
Handles cursor-based pagination with automatic loading on scroll.

### useVote
```typescript
const vote = useVote();
const response = await vote(pollId, optionId);
// Returns: { voted_option_id, total_votes, percents, counts }
```
Submits votes and returns updated poll statistics.

## Styling System

### Tailwind v4
Using latest Tailwind architecture with `@tailwindcss/vite` plugin:
- Custom pink theme colors in `tailwind.config.js`
- Utility-first approach
- Responsive breakpoints (sm, md, lg)

### Icon System
Icons use CSS `mask-image` for color flexibility:
```css
.icon-button {
  background-color: #FFFFFF; /* white on polls */
  mask-image: url('/heart.svg');
}

.icon-button-gray {
  background-color: #71717A; /* gray in comments */
}
```

Available icons: `icon-heart`, `icon-comment`, `icon-paper-plane`

## Development Tips

### Adding a New Page
1. Create component in `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`
3. Add navigation link in `src/components/Header.tsx`

### Adding a New API Endpoint
1. Add type definitions in `src/types/index.ts`
2. Add endpoint function in `src/api/endpoints.ts`
3. Use in component with proper error handling

### State Management
- Use `AuthContext` for global auth state
- Use local component state for UI-specific state
- Use React hooks for reusable logic

## Building for Production

```bash
npm run build
```

Output goes to `dist/` directory. Can be served with:
- Nginx (see `nginx.conf`)
- Docker (see `Dockerfile`)
- Any static file server

## Next Steps / TODO

**Backend Integration:**
- [ ] Implement like functionality for comments
- [ ] Add real-time updates with WebSockets/SSE
- [ ] Implement poll analytics dashboard

**Features:**
- [ ] Create Poll page/form
- [ ] User profile pages
- [ ] Poll search and filtering by topic
- [ ] Dark mode toggle
- [ ] Image upload for polls
- [ ] Poll expiration countdown

**Polish:**
- [ ] Add loading skeletons
- [ ] Improve error messages
- [ ] Add keyboard shortcuts
- [ ] Add accessibility improvements (ARIA labels)
- [ ] Add unit tests

## Common Issues

**Vote not persisting:** 
- Check browser localStorage for device ID
- Verify `X-Device-Id` header is being sent
- Check backend logs for device_hash matching

**Comments not showing:**
- Remember replies don't appear in main list
- Click reply count to expand nested replies
- Check browser console for API errors

**Auth not working:**
- Verify cookies are being set (check DevTools > Application)
- Check backend `FRONTEND_ORIGIN` environment variable
- Ensure backend has `SESSION_COOKIE_SAMESITE = 'Lax'`
