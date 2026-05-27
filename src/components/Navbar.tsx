import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme, OrbitTheme } from '../context/ThemeContext';
import {
  getUnreadNotificationsCount,
  getNotifications,
  markSingleNotificationRead,
  markAllNotificationsRead,
} from '../api/notifications';
import { Notification } from '../types/api';
import { gsap } from 'gsap';
import { motion, AnimatePresence } from 'motion/react';
import {
  Compass,
  Search,
  Bell,
  Bookmark,
  Settings,
  LogOut,
  User as UserIcon,
  PlusSquare,
  Users,
  Palette,
  Heart,
  MessageSquare,
  UserPlus as UserPlusIcon,
  Repeat2,
  CheckCheck,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { unreadCount, setUnreadCount, onNewNotification } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifCursor, setNotifCursor] = useState<string | null>(null);
  const [notifHasMore, setNotifHasMore] = useState(false);
  const bellRef = useRef<HTMLSpanElement>(null);
  const prevUnreadRef = useRef<number | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (navRef.current) {
      gsap.fromTo(navRef.current, { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: 'power4.out' });
    }
  }, []);

  const themeList: { id: OrbitTheme; name: string; color: string; desc: string }[] = [
    {
      id: 'midnight',
      name: 'Midnight Orbit',
      color: 'bg-[#020306] border-[#020306]/20',
      desc: 'Pure high-contrast stark OLED dark',
    },
    {
      id: 'light',
      name: 'Stellar Light',
      color: 'bg-[#e2dedc] border-[#e2dedc]/20',
      desc: 'Crisp, soothing, and high-contrast light mode',
    },
    {
      id: 'nordic',
      name: 'Nordic Sky',
      color: 'bg-[#31cdc3] border-[#31cdc3]/20',
      desc: 'Crystalline polar night & bright auroral shimmers',
    },
    {
      id: 'instagram' as OrbitTheme,
      name: 'Instagram Vibes',
      color: 'bg-gradient-to-r from-[#f09433] via-[#e6683c] via-[#dc2743] to-[#bc1888] border-pink-500/20',
      desc: 'Iconic Instagram gradient & warm tones',
    },
  ];

  // Fetch recent notifications and poll for count
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        setNotifLoading(true);
        const data = await getNotifications(5);
        if (data?.success) {
          setNotifications(data.notifications || data.items || []);
          setNotifCursor(data.nextCursor || null);
          setNotifHasMore(data.hasMore || false);
        }
      } catch {
        // ignore
      } finally {
        setNotifLoading(false);
      }
    };
    const notifTimer = setTimeout(() => fetchNotifications(), 0);

    const fetchCount = async () => {
      try {
        const data = await getUnreadNotificationsCount();
        if (data?.success) {
          setUnreadCount(data.unreadCount);
        }
      } catch {
        // ignore
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 20000); // 20s poll
    return () => {
      clearTimeout(notifTimer);
      clearInterval(interval);
    };
  }, [user, location.pathname, setUnreadCount]);

  // Listen for real-time new notifications
  useEffect(() => {
    if (!user) return;
    const unsub = onNewNotification((notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 20));
      setUnreadCount((prev: number) => prev + 1);
      // bell animation is handled by the unreadCount useEffect below
    });
    return unsub;
  }, [user, onNewNotification, setUnreadCount]);

  // Update browser tab title and mobile app badge
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount > 9 ? '9+' : unreadCount}) Orbit`;
      if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
        (navigator as any).setAppBadge(unreadCount).catch(console.error);
      }
    } else {
      document.title = 'Orbit';
      if (typeof navigator !== 'undefined' && 'clearAppBadge' in navigator) {
        (navigator as any).clearAppBadge().catch(console.error);
      }
    }
  }, [unreadCount]);

  const loadMoreNotifications = async () => {
    if (!notifCursor || notifLoading) return;
    try {
      setNotifLoading(true);
      const data = await getNotifications(10, notifCursor);
      if (data?.success) {
        const newNotifications = data.notifications || data.items || [];
        setNotifications((prev) => [...prev, ...newNotifications]);
        setNotifCursor(data.nextCursor || null);
        setNotifHasMore(data.hasMore || false);
      }
    } catch {
      // ignore
    } finally {
      setNotifLoading(false);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-3.5 h-3.5 text-rose-400" />;
      case 'comment':
        return <MessageSquare className="w-3.5 h-3.5 text-orbit-accent" />;
      case 'follow':
        return <UserPlusIcon className="w-3.5 h-3.5 text-emerald-400" />;
      case 'repost':
        return <Repeat2 className="w-3.5 h-3.5 text-cyan-400" />;
      case 'save':
        return <Bookmark className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-orbit-muted" />;
    }
  };

  const getNotifAction = (notif: Notification): string => {
    switch (notif.type) {
      case 'like':
        return 'liked your post';
      case 'comment':
        return 'commented on your post';
      case 'follow':
        return 'started following you';
      case 'repost':
        return 'reposted your post';
      case 'save':
        return 'saved your post';
      default:
        return 'interacted with your post';
    }
  };

  const timeAgo = (dateStr: string): string => {
    const now = Date.now(); // eslint-disable-line react-hooks/purity
    const date = new Date(dateStr).getTime();
    const diffMs = now - date;
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const handleNotifClick = async (notif: Notification) => {
    // Mark as read
    try {
      await markSingleNotificationRead(notif._id);
      setNotifications((prev) => prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev: number) => Math.max(0, prev - 1));
    } catch {
      /* ignore */
    }

    setIsNotificationOpen(false);

    // Navigate based on type
    if (notif.type === 'follow') {
      navigate(`/profile/${notif.sender.username}`);
    } else if (notif.post) {
      navigate(`/post/${notif.post._id || notif.post.slug}`);
    }
  };

  // Close notification dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    if (isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotificationOpen]);

  // Auto-close notification dropdown on page navigation
  useEffect(() => {
    const timer = setTimeout(() => setIsNotificationOpen(false), 0);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // GSAP bell bounce animation when a new notification arrives in real time
  useEffect(() => {
    if (prevUnreadRef.current !== null && unreadCount > prevUnreadRef.current && bellRef.current) {
      gsap.to(bellRef.current, {
        keyframes: {
          rotation: [0, -15, 15, -10, 10, -5, 5, 0],
        },
        duration: 0.6,
        ease: 'power2.out',
      });
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      /* silent */
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsDropdownOpen(false);
      navigate('/login');
    } catch {
      // handled
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      ref={navRef}
      role="navigation"
      aria-label="Main navigation"
      className="sticky top-2 mx-1 sm:mx-2 mt-2 md:mx-4 lg:mx-8 z-50 bg-orbit-card/75 backdrop-blur-md border border-orbit-border rounded-[24px] md:rounded-[32px] py-2 md:py-3.5 px-2 sm:px-3 md:px-6 lg:px-10 shadow-lg shadow-black/30 transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-6 h-6 md:w-8 md:h-8 relative">
            <div className="absolute inset-0 border border-orbit-accent rounded-full opacity-25"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 md:w-2 md:h-2 bg-orbit-accent rounded-full shadow-[0_0_12px_var(--color-orbit-glow)]"></div>
            <div className="absolute top-0 left-0 w-6 h-6 md:w-8 md:h-8 border-t-2 border-orbit-accent rounded-full animate-spin [animation-duration:8s]"></div>
          </div>
          <span className="text-sm md:text-lg font-bold tracking-[0.2em] uppercase text-orbit-accent group-hover:scale-105 transition-transform duration-300">
            Orbit
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-1 lg:gap-6">
          <Link
            to="/"
            className={`flex items-center justify-center gap-1.5 text-[10px] lg:text-xs font-bold uppercase tracking-widest transition-all p-2 lg:px-1 ${
              isActive('/') ? 'text-orbit-accent' : 'text-orbit-muted hover:text-orbit-accent'
            }`}
            title="Feed"
          >
            <Compass className="w-4 h-4" />
            <span className="hidden lg:inline">Feed</span>
          </Link>

          {user && (
            <>
              <Link
                to="/search"
                className={`flex items-center justify-center gap-1.5 text-[10px] lg:text-xs font-bold uppercase tracking-widest transition-all p-2 lg:px-1 ${
                  isActive('/search') ? 'text-orbit-accent' : 'text-orbit-muted hover:text-orbit-accent'
                }`}
                title="Search"
              >
                <Search className="w-4 h-4" />
                <span className="hidden lg:inline">Search</span>
              </Link>

              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  className={`flex items-center justify-center gap-1.5 text-[10px] lg:text-xs font-bold uppercase tracking-widest relative transition-all cursor-pointer p-2 lg:px-1 ${
                    isActive('/notifications') ? 'text-orbit-accent' : 'text-orbit-muted hover:text-orbit-accent'
                  }`}
                  title="Notifications"
                  aria-label="Toggle notifications dropdown"
                >
                  <span ref={bellRef} className="inline-flex">
                    <Bell className="w-4 h-4" />
                  </span>
                  <span className="hidden lg:inline">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-orbit-accent text-orbit-accent-foreground font-mono text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                <AnimatePresence>
                  {isNotificationOpen && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setIsNotificationOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute left-1/2 -translate-x-1/2 mt-3 w-80 bg-orbit-card border border-orbit-border rounded-[22px] shadow-[0_8px_30px_rgba(0,0,0,0.6)] p-2 z-50 max-h-[70vh] overflow-y-auto"
                      >
                        <div className="flex items-center justify-between px-2 pb-2 border-b border-orbit-border/50 mb-1">
                          <span className="text-[9px] uppercase tracking-[0.2em] font-black text-orbit-muted">
                            Recent Notifications
                          </span>
                          <div className="flex items-center gap-2">
                            {notifications.some((n) => !n.isRead) && (
                              <button
                                onClick={handleMarkAllRead}
                                className="text-[9px] font-bold text-orbit-accent hover:opacity-80 transition-opacity flex items-center gap-1"
                                title="Mark all as read"
                              >
                                <CheckCheck className="w-3 h-3" />
                                <span>Mark all read</span>
                              </button>
                            )}
                            <Link
                              to="/notifications"
                              onClick={() => setIsNotificationOpen(false)}
                              className="text-[9px] font-bold text-orbit-accent hover:opacity-80 transition-opacity"
                            >
                              View All
                            </Link>
                          </div>
                        </div>

                        {notifLoading && notifications.length === 0 ? (
                          <div className="flex items-center justify-center py-6">
                            <div className="w-4 h-4 border-2 border-orbit-accent/30 border-t-orbit-accent rounded-full animate-spin" />
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="text-center py-8 text-[10px] text-orbit-muted">
                            <Bell className="w-6 h-6 mx-auto mb-2 opacity-40" />
                            <p>No notifications yet</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {notifications.map((notif) => (
                              <button
                                key={notif._id}
                                onClick={() => handleNotifClick(notif)}
                                className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                                  !notif.isRead ? 'bg-orbit-accent/5 border border-orbit-accent/15' : 'hover:bg-white/5'
                                }`}
                              >
                                {/* Icon */}
                                <div className="shrink-0 mt-0.5">{getNotifIcon(notif.type)}</div>
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] text-orbit-muted leading-snug">
                                    <strong className="text-white font-semibold">{notif.sender.fullName}</strong>{' '}
                                    {getNotifAction(notif)}
                                  </p>
                                  <p className="text-[8px] text-orbit-muted/50 mt-0.5 font-mono">
                                    {timeAgo(notif.createdAt)}
                                  </p>
                                </div>
                                {!notif.isRead && (
                                  <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-orbit-accent mt-1.5" />
                                )}
                              </button>
                            ))}
                            {notifHasMore && (
                              <button
                                onClick={loadMoreNotifications}
                                disabled={notifLoading}
                                className="w-full py-2 text-[10px] font-bold text-orbit-accent hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-center"
                              >
                                {notifLoading ? 'Loading...' : 'Load More'}
                              </button>
                            )}
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          <Link
            to="/users"
            className={`flex items-center justify-center gap-1.5 text-[10px] lg:text-xs font-bold uppercase tracking-widest transition-all p-2 lg:px-1 ${
              isActive('/users') ? 'text-orbit-accent' : 'text-orbit-muted hover:text-orbit-accent'
            }`}
            title="Discover"
          >
            <Users className="w-4 h-4" />
            <span className="hidden lg:inline">Discover</span>
          </Link>
        </div>

        {/* Action Panel */}
        <div className="hidden md:flex items-center gap-1 lg:gap-4">
          {/* Theme Switcher Droplet */}
          <div className="relative">
            <button
              onClick={() => setIsThemeOpen(!isThemeOpen)}
              className="p-2 text-orbit-muted hover:text-orbit-accent hover:bg-orbit-accent/10 rounded-full transition-all focus:outline-none flex items-center justify-center cursor-pointer font-bold"
              title="Customize App Theme"
              aria-label="Customize app theme"
              aria-expanded={isThemeOpen}
            >
              <Palette className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {isThemeOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setIsThemeOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.9 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="absolute right-0 mt-3 w-56 bg-orbit-card border border-orbit-border rounded-[22px] shadow-[0_8px_30px_rgba(0,0,0,0.6)] p-3 z-50 space-y-1"
                  >
                    <div className="text-[9px] uppercase tracking-[0.2em] font-black text-orbit-muted px-2 pb-1.5 border-b border-orbit-border">
                      CHOOSE COLOR THEME
                    </div>
                    {themeList.map((t, i) => (
                      <motion.button
                        key={t.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        onClick={() => {
                          setTheme(t.id);
                          setIsThemeOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-2 py-2 text-xs rounded-xl transition-all text-left cursor-pointer ${
                          theme === t.id
                            ? 'bg-orbit-accent/15 text-orbit-accent font-bold'
                            : 'text-orbit-muted hover:bg-orbit-accent/5 hover:text-orbit-accent'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full ${t.color} border flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs truncate">{t.name}</div>
                          <div className="text-[9px] text-orbit-muted/70 truncate leading-none mt-0.5">{t.desc}</div>
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {user ? (
            <>
              <Link
                to="/post/new"
                className="flex items-center gap-1.5 bg-orbit-accent text-orbit-accent-foreground text-[9px] lg:text-[10px] font-black uppercase tracking-widest px-2 lg:px-4 py-2 hover:opacity-90 transition-all rounded-full shadow-md shadow-orbit-accent/10 shrink-0"
                title="Create Post"
              >
                <PlusSquare className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                <span className="hidden lg:inline">Create Post</span>
              </Link>

              {/* Profile Menu Trigger */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1 lg:gap-2 group focus:outline-none"
                >
                  <img
                    src={
                      user.profilePic?.url ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop'
                    }
                    alt={user.username}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 lg:w-8 lg:h-8 rounded-full border border-orbit-border group-hover:border-orbit-accent transition-all object-cover"
                  />
                  <div className="hidden lg:block text-left">
                    <div className="text-xs font-semibold text-orbit-accent leading-tight group-hover:opacity-80 transition-all">
                      {user.fullName}
                    </div>
                    <div className="text-[10px] text-orbit-muted leading-none">@{user.username}</div>
                  </div>
                </button>

                {/* Dropdown Card */}
                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                    <div className="absolute right-0 mt-3 w-48 bg-orbit-card border border-orbit-border rounded-[22px] shadow-2xl p-2 z-50">
                      <Link
                        to={`/profile/${user.username}`}
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-orbit-muted hover:bg-orbit-accent/10 hover:text-orbit-accent rounded-xl transition-all"
                      >
                        <UserIcon className="w-4 h-4" />
                        <span>My Profile</span>
                      </Link>

                      <Link
                        to="/settings"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-orbit-muted hover:bg-orbit-accent/10 hover:text-orbit-accent rounded-xl transition-all"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </Link>

                      <hr className="border-orbit-border my-1" />

                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-white/5 hover:text-red-300 transition-colors text-left"
                        aria-label="Sign out of your account"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="bg-white text-black text-[10px] font-black uppercase tracking-widest px-4 py-2 hover:bg-zinc-200 transition-colors rounded-full"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile/Tablet Header Elements */}
        <div className="md:hidden flex items-center gap-2">
          {user ? (
            <>
              {/* Mobile Quick Notifications */}
              <Link
                to="/notifications"
                className={`p-1.5 rounded-full hover:bg-white/5 transition-colors relative ${
                  isActive('/notifications') ? 'text-orbit-accent' : 'text-white/50'
                }`}
                title="Notifications"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-orbit-accent text-orbit-accent-foreground font-mono text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Mobile Quick Search */}
              <Link
                to="/search"
                className={`p-1.5 rounded-full hover:bg-white/5 transition-colors ${
                  isActive('/search') ? 'text-orbit-accent' : 'text-white/50'
                }`}
                title="Search"
              >
                <Search className="w-4.5 h-4.5" />
              </Link>

              {/* Mobile Quick Create Post */}
              <Link
                to="/post/new"
                className={`bg-white text-black p-1.5 rounded-full hover:scale-105 active:scale-95 transition-all flex items-center justify-center ${
                  isActive('/post/new') ? 'ring-2 ring-orbit-accent/40' : ''
                }`}
                title="Create Post"
              >
                <PlusSquare className="w-3.5 h-3.5 text-black" />
              </Link>
            </>
          ) : (
            /* Guest can also search quickly on mobile */
            <Link
              to="/search"
              className={`p-1.5 rounded-full hover:bg-white/5 transition-colors ${
                isActive('/search') ? 'text-orbit-accent' : 'text-white/50'
              }`}
              title="Search"
            >
              <Search className="w-4.5 h-4.5" />
            </Link>
          )}

          {/* User profile picture as options drawer switch (replacing generic hamburger logo) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center justify-center focus:outline-none p-0.5 rounded-full transition-all active:scale-95 cursor-pointer ml-1"
            title="Toggle Menu Options"
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}
          >
            {user ? (
              <img
                src={
                  user.profilePic?.url ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop'
                }
                alt={user.username}
                referrerPolicy="no-referrer"
                className={`w-7 h-7 rounded-full border object-cover transition-all ${
                  isMobileMenuOpen
                    ? 'border-orbit-accent ring-2 ring-orbit-accent/40'
                    : 'border-white/15 hover:border-white/40'
                }`}
              />
            ) : (
              <div
                className={`w-7 h-7 rounded-full border bg-white/5 flex items-center justify-center text-white/55 hover:text-white transition-all ${
                  isMobileMenuOpen ? 'border-orbit-accent bg-orbit-accent/15' : 'border-white/15 hover:border-white/30'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-orbit-card/95 backdrop-blur-md border border-orbit-border rounded-[28px] mt-3 py-4 px-2.5 space-y-3 animate-fade-in mx-1 p-2 shadow-2xl">
          <Link
            to="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-orbit-muted hover:text-orbit-accent hover:bg-orbit-accent/10 rounded-full transition-colors"
          >
            <Compass className="w-4 h-4 text-orbit-accent" />
            <span>Feed</span>
          </Link>

          {user ? (
            <>
              <Link
                to="/search"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-orbit-muted hover:text-orbit-accent hover:bg-orbit-accent/10 rounded-full transition-colors"
              >
                <Search className="w-4 h-4 text-orbit-accent" />
                <span>Search</span>
              </Link>

              <Link
                to={`/profile/${user.username}`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-orbit-muted hover:text-orbit-accent hover:bg-orbit-accent/10 rounded-full transition-colors"
              >
                <UserIcon className="w-4 h-4 text-orbit-accent" />
                <span>My Profile</span>
              </Link>

              <Link
                to="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-orbit-muted hover:text-orbit-accent hover:bg-orbit-accent/10 rounded-full transition-colors"
              >
                <Settings className="w-4 h-4 text-orbit-accent" />
                <span>Settings</span>
              </Link>
            </>
          ) : null}

          <Link
            to="/users"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-orbit-muted hover:text-orbit-accent hover:bg-orbit-accent/10 rounded-full transition-colors"
          >
            <Users className="w-4 h-4 text-orbit-accent" />
            <span>Discover Creators</span>
          </Link>

          {/* Mobile Theme Selection Row */}
          <div className="px-4 py-2 space-y-2">
            <div className="text-[9px] uppercase tracking-[0.2em] font-black text-orbit-muted flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-orbit-accent" />
              <span>Themes</span>
            </div>
            <div className="flex flex-wrap gap-2.5 pt-1">
              {themeList.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  title={t.name}
                  className={`relative p-1 rounded-full border transition-all cursor-pointer ${
                    theme === t.id
                      ? 'border-orbit-accent scale-110 shadow-lg'
                      : 'border-orbit-border hover:border-orbit-accent'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full ${t.color}`} />
                  {theme === t.id && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orbit-accent opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orbit-accent"></span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-orbit-border my-2" />

          {user ? (
            <button
              onClick={() => {
                handleLogout();
                setIsMobileMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors text-left cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          ) : (
            <div className="flex flex-col gap-2 px-4 py-2">
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-center py-2 text-xs font-bold uppercase tracking-widest text-orbit-muted hover:text-orbit-accent transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-center py-2 text-[10px] font-black uppercase tracking-widest bg-orbit-accent text-orbit-accent-foreground rounded-full transition-all hover:opacity-90 shadow-md"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
