# Orbit Social Media Platform — Production Frontend

Orbit is a high-density, space-age social media web platform styled in **Space Onyx** (fusing Inter typography, Space Grotesk astronomical display headings, deep coal textures, and glowing indigo celestial accents). 

This repository houses the production-ready frontend built specifically to connect with the Orbit REST API backend.

---

## 🛰️ Architecture & Tech Stack

- **Framework:** React 19 + TypeScript + Vite
- **State Management:** React Context (Auth snapshots) + TanStack React Query (server-state, mutations, and caching caches structures)
- **Styling:** Tailwind CSS (utility classes direct configuration)
- **Navigation Routing:** React Router v6
- **Animations:** Motion (smooth page adjustments, overlay animations)
- **Icons:** Lucide-React
- **Notifications:** Sonner Toasts (glowing carbon containers matching theme)

---

## 🛠️ Installation & Activation Guide

### 1. Requirements
Ensure your workspace includes:
- [Node.js](https://nodejs.org/) (Version 18 or above recommended)
- [npm](https://www.npmjs.com/) (installed automatically alongside Node)

### 2. Install Project Dependencies
Under your project environment terminal root directory, run:
```bash
npm install
```

### 3. Establish Local Environment Variables
Create a `.env` file at the root folder level:
```env
# Point this to your active Express / MongoDB REST API Backend Server
VITE_API_URL="http://localhost:5000"
```

*Note on AI Studio Live Previews:* If `VITE_API_URL` is left empty or omitted, Orbit automatically launches a high-integrity **virtual local-first database engine stored inside local-storage**! This seeds beautiful default observer accounts, rich observations cards, follow relationship, saves, nested comment threads, and triggers full responsive feed pages out of the box in your previews! Once you supply your custom backend URL, Orbit switches fully to raw Axios endpoint integrations with your real server databases!

### 4. Direct Back-End Alignment (CORS Coordinates)
For Orbit's cookie-based authentication state handling to validate securely, align your Express backend server configuration parameters inside its corresponding `.env` file:
```env
CLIENT_URL="http://localhost:3000"  # Or your Vite live hosting port URL
```
This is essential to allow credentials handshake parameters (`withCredentials: true`) to transit cookies securely across CORS origins.

### 5. Launch Development Client
Run the Vite local server:
```bash
npm run dev
```
Navigate to `http://localhost:3000` inside your preferred browser.

---

## 🛸 Highlighted Core Features

1. **Pragmatic Authentication Checks:** Auth uses real cookie-based session persistence. Session verification is handled automatically on loads with fallback protection.
2. **Infinite Pagination:** Feeds, savers registries, comment threads, discover channels, and system notification indices use strict cursor-based lazy-fetching. Notifications use the custom `{timestamp}_{notificationId}` compound cursor keys, resolving queries comfortably.
3. **Optimistic Updates:** Social actions (Liking posts/comments, following astronomical nodes, Saves Bookmarks, and Reposting entries) are processed optimistically inside the UI. Any error rolls back values seamlessly with toasted notifications.
4. **Drag & Drop Attachment targets:** Registration form for avatar pictures and optional banner backdrops uses standard files dialogs matching touch selections, as well as drag zones.
5. **Recursive Planetary Comments:** Reading post details records view telemetry streams. Comments display lazy-loading subthreads calling `/api/comments/replies/:commentId` directly. Adding replies attaches parent coordinate pointers perfectly.
