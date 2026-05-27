import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import SpaceCanvas from './components/SpaceCanvas';
import ErrorBoundary from './components/ErrorBoundary'; // Import ErrorBoundary
import { AnimatePresence, motion } from 'motion/react';
import { setNavigateFunction } from './api/client'; // Import setNavigateFunction

// Route-level code splitting — lazy loaded
const HomeFeed = React.lazy(() => import('./pages/HomeFeed'));
const Login = React.lazy(() => import('./pages/Login'));
const Signup = React.lazy(() => import('./pages/Signup'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const PostDetail = React.lazy(() => import('./pages/PostDetail'));
const CreateEditPost = React.lazy(() => import('./pages/CreateEditPost'));
const Search = React.lazy(() => import('./pages/Search'));
const NotificationsList = React.lazy(() => import('./pages/NotificationsList'));
const SavedPosts = React.lazy(() => import('./pages/SavedPosts'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Settings = React.lazy(() => import('./pages/Settings'));
const DiscoverUsers = React.lazy(() => import('./pages/DiscoverUsers'));

// Sonner Toaster
import { Toaster } from 'sonner';
import { OnlineStatus } from './components/OnlineStatus';

const PageWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate(); // Get navigate function
  const [showNotice, setShowNotice] = useState(true);

  useEffect(() => {
    setNavigateFunction(navigate); // Store navigate function in client.ts
  }, [navigate]);

  return (
    <div className="min-h-screen bg-orbit-bg text-[#f0f6fc] flex flex-col font-sans select-text relative">
      {/* Interactive background particle system */}
      <SpaceCanvas />

      {/* Network status indicator */}
      <OnlineStatus />

      <motion.div layout transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col flex-1">
        {/* Technical Difficulties Notice Banner */}
        <AnimatePresence>
          {showNotice && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.95 }}
              transition={{ duration: 0.6, type: 'spring', bounce: 0.6 }}
              className="relative z-50 py-2 md:py-3.5 px-3 md:px-5 text-center overflow-hidden shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #e11d48, #db2777, #9333ea)',
              }}
            >
              <div className="absolute inset-0 bg-white/10 animate-pulse" />
              <div className="relative z-10 flex items-center justify-between gap-2 md:gap-4 max-w-6xl mx-auto">
                <div className="flex items-center gap-2 md:gap-3 flex-1">
                  <motion.div
                    animate={{
                      rotate: [0, 12, -12, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="flex-shrink-0"
                  >
                    <svg
                      className="w-4 h-4 md:w-6 md:h-6 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                      />
                    </svg>
                  </motion.div>
                  <motion.span
                    animate={{ x: [0, 2, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-[10px] md:text-xs font-semibold text-white"
                  >
                    <span className="hidden md:inline">
                      We are currently experiencing technical difficulties with our email delivery system. Forgot
                      password and account update emails are currently unavailable.
                    </span>
                    <span className="md:hidden">Email delivery temporarily unavailable.</span>
                  </motion.span>
                </div>
                <motion.button
                  onClick={() => setShowNotice(false)}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex-shrink-0 p-1 md:p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-all cursor-pointer"
                  title="Close notification"
                >
                  <svg
                    className="w-3 h-3 md:w-3.5 md:h-3.5 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Navigation Header */}
        <Navbar />

        {/* Viewport Routing Segment container */}
        <div className="flex-1 w-full max-w-7xl mx-auto pb-12 relative z-10">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-orbit-accent border-t-transparent" />
              </div>
            }
          >
            <AnimatePresence mode="wait">
              <Routes location={location}>
                {/* Public Home Feed Timeline */}
                <Route
                  path="/"
                  element={
                    <PageWrapper>
                      <HomeFeed />
                    </PageWrapper>
                  }
                />

                {/* Guest Account Access routes */}
                <Route
                  path="/login"
                  element={
                    <PageWrapper>
                      <Login />
                    </PageWrapper>
                  }
                />
                <Route
                  path="/signup"
                  element={
                    <PageWrapper>
                      <Signup />
                    </PageWrapper>
                  }
                />
                <Route
                  path="/forgot-password"
                  element={
                    <PageWrapper>
                      <ForgotPassword />
                    </PageWrapper>
                  }
                />

                {/* Public Deep Space Observatory logs */}
                <Route
                  path="/post/:postId"
                  element={
                    <PageWrapper>
                      <PostDetail />
                    </PageWrapper>
                  }
                />
                <Route
                  path="/profile/:username"
                  element={
                    <PageWrapper>
                      <Profile />
                    </PageWrapper>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <PageWrapper>
                      <DiscoverUsers />
                    </PageWrapper>
                  }
                />

                {/* Restricted Secure Commands parameters wrappers */}
                <Route
                  path="/post/new"
                  element={
                    <ProtectedRoute>
                      <PageWrapper>
                        <CreateEditPost />
                      </PageWrapper>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/post/:postId/edit"
                  element={
                    <ProtectedRoute>
                      <PageWrapper>
                        <CreateEditPost />
                      </PageWrapper>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/search"
                  element={
                    <ProtectedRoute>
                      <PageWrapper>
                        <Search />
                      </PageWrapper>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <PageWrapper>
                        <NotificationsList />
                      </PageWrapper>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/saved"
                  element={
                    <ProtectedRoute>
                      <PageWrapper>
                        <SavedPosts />
                      </PageWrapper>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <PageWrapper>
                        <Settings />
                      </PageWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* Singular Collapse fallback route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AnimatePresence>
          </Suspense>
        </div>

        {/* Bottom humble label */}
        <motion.footer
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
          className="py-6 text-center text-[10px] text-zinc-500 font-mono tracking-widest border-t border-orbit-border mt-auto select-none bg-[#0b0c10]"
        >
          <span>
            © 2026 Orbit. All rights reserved. Made by <span className="text-orbit-accent font-bold">@indieDev</span>
          </span>
        </motion.footer>

        {/* Elegant popup alerts */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#151821',
              border: '1px solid #21262d',
              color: '#f0f6fc',
              fontSize: '12px',
              borderRadius: '12px',
            },
          }}
        />
      </motion.div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <SocketProvider>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </SocketProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
