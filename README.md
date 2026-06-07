# Orbit Frontend

A modern, responsive social media frontend built with React 19, TypeScript, Tailwind CSS v4, and Socket.io.

## Overview

Orbit is a simpler social feed platform. This frontend provides a polished dark-themed glassmorphic UI with real-time chat, post feeds, user profiles, threaded comments, and live notifications — all optimized for both mobile and desktop.

## Features

- **User Authentication**: Login, signup, logout with JWT httpOnly cookies
- **User Profiles**: View and edit profiles with avatar and banner image cropping
- **Post Feed**: Create, like, comment, save, and repost posts with hashtag/mention support
- **Real-time Updates**: Live notifications and post interactions via Socket.io
- **Direct Messaging**: Full chat system with message edit/delete, reactions, file attachments, and presence indicators
- **Search**: Search users and posts with partial matching
- **Responsive Design**: Mobile-first with bottom dock navigation + desktop sidebar layout
- **Dark Mode**: Forced dark space theme with glassmorphic elements
- **Image Cropping**: Built-in crop modal for profile and post images
- **Smooth Animations**: Framer Motion spring animations throughout
- **Pull-to-Refresh**: Touch gesture support for mobile feed reload
- **CSRF Protection**: Double-submit cookie pattern — CSRF token sent as header on all mutations
- **Error Boundaries**: Root + content-area error boundaries prevent white screen crashes
- **Form Validation**: Field-level inline error messages across all forms
- **Client-side Caching**: Per-endpoint TTL caching with automatic invalidation

## Tech Stack

| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool (fast HMR, optimized builds) |
| **Tailwind CSS v4** | Utility-first styling |
| **Framer Motion (motion/react)** | Spring animations, layout animations |
| **Lucide React** | Icon library |
| **Socket.io Client** | Real-time bidirectional communication |
| **GSAP** | Hero section timeline animations |
| **react-easy-crop** | Image crop UI |

## Prerequisites

- Node.js 18+
- Backend server running (see [orbit-server](../orbit-server/README.md))

## Installation

```bash
npm install
```

### Environment Variables (optional)

```bash
VITE_API_URL=http://localhost:5000
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/       # React components
│   ├── Auth.tsx          # Login/Signup forms
│   ├── Feed.tsx          # Main post feed with composer
│   ├── Explore.tsx       # Search/browse users & posts
│   ├── Profile.tsx       # User profile view/edit
│   ├── Chat.tsx          # Real-time direct messaging
│   ├── Notifications.tsx # Notification inbox
│   ├── Settings.tsx      # Account settings (profile, password, delete)
│   ├── Dock.tsx          # Bottom navigation (macOS-style)
│   ├── LeftSidebar.tsx   # Desktop sidebar navigation
│   ├── GlassCard.tsx     # Reusable glassmorphic card wrapper
│   ├── ConfirmDialog.tsx # Reusable confirmation modal
│   ├── CommentNode.tsx   # Recursive threaded comment component
│   ├── Skeleton.tsx      # Loading skeleton with shimmer
│   └── ... (LandingPage, PostModal, ImageCropModal, etc.)
├── utils/
│   └── api.ts            # API client with caching
├── types.ts              # Shared TypeScript interfaces
├── App.tsx               # Root component with global state & routing
└── main.tsx              # Entry point
```

## Architecture

- **Global state** lives in `App.tsx` (user, conversations, notifications, following states)
- **Cross-component sync** uses `window.dispatchEvent` + `CustomEvent` for post interactions
- **Lazy loading** via `React.lazy()` + `Suspense` for all tab content
- **Optimistic updates**: Like/save/repost update UI immediately, rollback on error
- **Socket.io**: Single persistent connection for real-time features

## Socket.io Events

### Listen (Server → Client)
- `notification` — New notification received
- `message:new` / `message:edit` / `message:delete` — Chat messages
- `messages:seen` — Read receipts
- `chat:typing` — Typing indicator
- `user:presence` — Online/offline status
- `post:like/unlike` / `post:save/unsave` / `post:repost/unrepost` — Real-time interaction sync
- `post:created` / `post:deleted` / `post:updated` — Real-time post changes
- `comment:reply` / `comment:updated` / `comment:deleted` — Real-time comment changes

### Emit (Client → Server)
- `chat:join` / `chat:leave` — Join/leave conversation room
- `chat:typing` — Typing status

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npx tsc --noEmit` | TypeScript type check |
