import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  getNotifications,
  markAllNotificationsRead,
  markSingleNotificationRead,
  deleteNotification,
  clearAllNotifications,
} from '../api/notifications';
import { Notification } from '../types/api';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { toast } from 'sonner';
import { Skeleton, SkeletonCard } from '../components/Skeleton';
import { Bell, CheckCheck, Heart, MessageSquare, UserPlus, Bookmark, Repeat2, RotateCw, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SlideIn, BreathingDot } from '../components/MotionPrimitives';

export default function NotificationsList() {
  const { user } = useAuth();
  const { setUnreadCount, onNewNotification } = useSocket();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);

  // Listen for new notifications and add them to the list
  useEffect(() => {
    const unsubscribe = onNewNotification((notification: Notification) => {
      setTimeout(() => {
        setNotifications((prev) => [notification, ...prev]);
      }, 0);
    });
    return unsubscribe;
  }, [onNewNotification]);

  const fetchInitialNotifications = async () => {
    try {
      setLoading(true);
      const res = await getNotifications(50);
      if (res.success) {
        setNotifications(res.notifications || res.items || []);
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
      }
    } catch (err) {
      toast.error('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => fetchInitialNotifications(), 0);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    try {
      setLoadingMore(true);
      const res = await getNotifications(15, nextCursor);
      if (res.success) {
        setNotifications((prev) => [...prev, ...(res.notifications || [])]);
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
      }
    } catch (err) {
      toast.error('Failed to load more notifications.');
    } finally {
      setLoadingMore(false);
    }
  };

  const { elementRef } = useInfiniteScroll({
    hasMore,
    isLoading: loadingMore,
    loadMore: handleLoadMore,
  });

  const handleMarkAllRead = async () => {
    if (notifications.length === 0) return;
    try {
      const res = await markAllNotificationsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast.success('All notifications marked as read.');
      }
    } catch (err) {
      toast.error('Failed to mark all as read.');
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    // Mark as read immediately on backend
    if (!notif.isRead) {
      try {
        await markSingleNotificationRead(notif._id).catch(() => {});
        setNotifications((prev) => prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        // ignore
      }
    }

    // Direct routing based on notification type
    if (notif.type === 'follow') {
      navigate(`/profile/${notif.sender.username}`);
    } else if (notif.post) {
      navigate(`/post/${notif.post._id}`);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
      setShowClearConfirm(false);
      toast.success('All notifications cleared.');
    } catch (err) {
      toast.error('Failed to clear notifications.');
    }
  };

  const handleDeleteSingle = async (notificationId: string) => {
    setDeletingId(notificationId);
    try {
      await deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      toast.success('Notification deleted.');
    } catch (err) {
      toast.error('Failed to delete notification.');
    } finally {
      setDeletingId(null);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Compute unread count from the loaded notifications array
  // (socket's unreadCount resets to 0 on this page, so we compute locally instead)
  const unreadCountDisplay = notifications.filter((n) => !n.isRead).length;

  // Helper icons selector
  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-orbit-accent" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-emerald-400" />;
      case 'repost':
        return <Repeat2 className="w-4 h-4 text-indigo-400" />;
      case 'save':
        return <Bookmark className="w-4 h-4 text-cyan-400 fill-cyan-400" />;
      default:
        return <Bell className="w-4 h-4 text-[#8b949e]" />;
    }
  };

  // Helper dynamic UI copies selector
  const getNotifText = (notif: Notification) => {
    const senderName = notif.sender.fullName;
    const type = notif.type;

    if (type === 'like') {
      if (notif.comment) {
        return (
          <span>
            <strong className="text-white hover:underline">{senderName}</strong> liked your comment:{' '}
            <span className="text-orbit-muted italic font-mono text-[11px]">{`“${notif.comment.content}”`}</span>
          </span>
        );
      }
      return (
        <span>
          <strong className="text-white hover:underline">{senderName}</strong> liked your post:{' '}
          <strong className="text-white">{`“${notif.post?.title}”`}</strong>
        </span>
      );
    } else if (type === 'comment') {
      return (
        <span>
          <strong className="text-white hover:underline">{senderName}</strong> commented on your post:{' '}
          <strong className="text-white">{`“${notif.post?.title}”`}</strong>
        </span>
      );
    } else if (type === 'follow') {
      return (
        <span>
          <strong className="text-white hover:underline">{senderName}</strong> started following you.
        </span>
      );
    } else if (type === 'repost') {
      return (
        <span>
          <strong className="text-white hover:underline">{senderName}</strong> shared your post.
        </span>
      );
    } else if (type === 'save') {
      return (
        <span>
          <strong className="text-white hover:underline">{senderName}</strong> bookmarked your post.
        </span>
      );
    }

    return <span>Notification received.</span>;
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 md:px-6 space-y-6">
      {/* Clear All Confirmation Dialog */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="bg-orbit-card border border-orbit-border rounded-3xl p-6 max-w-sm w-full mx-4 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-display font-semibold text-white text-base">Clear all notifications?</h3>
              <p className="text-xs text-orbit-muted">
                This will permanently delete all your notifications. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-orbit-muted font-semibold text-xs px-4 py-2.5 rounded-full transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs px-4 py-2.5 rounded-full transition-all"
              >
                Yes, clear all
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Notifications Header */}
      <SlideIn direction="down" duration={0.4}>
        <div className="flex items-center justify-between border-b border-orbit-border pb-4 gap-2">
          <div className="space-y-1 text-left min-w-0">
            <h1 className="font-display font-semibold text-lg sm:text-2xl text-white flex items-center gap-2">
              <div className="relative">
                <Bell className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 text-orbit-accent" />
                {/* Unread count badge */}
                {unreadCountDisplay > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] sm:text-[10px] font-bold font-mono leading-none shadow-md shadow-red-500/40 ring-2 ring-orbit-card"
                  >
                    {unreadCountDisplay > 9 ? '9+' : unreadCountDisplay}
                  </motion.span>
                )}
              </div>
              <span>Notifications</span>
            </h1>
            <p className="text-[10px] sm:text-xs text-orbit-muted">Stay updated with activities and interactions.</p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleMarkAllRead}
              disabled={loading || notifications.length === 0}
              className="bg-white/5 hover:bg-orbit-accent hover:text-orbit-accent-foreground disabled:opacity-50 text-orbit-muted font-semibold text-[10px] sm:text-xs px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <CheckCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="hidden xs:inline sm:inline">Mark all read</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowClearConfirm(true)}
              disabled={loading || notifications.length === 0}
              className="bg-red-500/10 hover:bg-red-500/25 disabled:opacity-50 text-red-400 font-semibold text-[10px] sm:text-xs px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="hidden xs:inline sm:inline">Clear all</span>
            </motion.button>
          </div>
        </div>
      </SlideIn>
      {loading ? (
        <div role="status" aria-label="Loading notifications" className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-orbit-card border border-orbit-border rounded-3xl p-16 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-black/20 border border-orbit-border flex items-center justify-center mx-auto text-orbit-muted">
            <Bell className="w-8 h-8" />
          </div>
          <h3 className="font-display font-medium text-white text-sm">All caught up</h3>
          <p className="text-xs text-orbit-muted max-w-xs mx-auto">
            You don&rsquo;t have any new notifications yet. Recent likes, Comments, and follows will show up here.
          </p>
          <Link
            to="/"
            className="inline-block bg-white/5 hover:bg-orbit-accent hover:text-orbit-accent-foreground transition-all text-xs font-semibold px-4 py-2 rounded-full mt-4 cursor-pointer"
          >
            Explore Feed
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5 sm:space-y-3.5">
          <AnimatePresence mode="popLayout">
            {notifications.map((notif, index) => {
              const senderPic =
                notif.sender.profilePic?.url ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop';

              return (
                <motion.div
                  key={notif._id}
                  layout
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 50, scale: 0.9, filter: 'blur(4px)' }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`flex gap-2.5 sm:gap-3.5 items-start p-3 sm:p-4 border rounded-2xl sm:rounded-3xl cursor-pointer transition-all text-xs relative ${
                    notif.isRead
                      ? 'bg-orbit-card/70 border-orbit-border opacity-75 hover:bg-white/5'
                      : 'bg-orbit-card border-orbit-accent/40 shadow-lg ring-1 ring-orbit-accent/10 hover:bg-white/[0.03]'
                  }`}
                >
                  {/* Notif status indicator */}
                  {!notif.isRead && (
                    <BreathingDot className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2 h-2 sm:w-2.5 sm:h-2.5" />
                  )}

                  {/* Left icon wrapper */}
                  <div
                    className="bg-black/20 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-orbit-border shrink-0 mt-0.5"
                    onClick={() => handleNotificationClick(notif)}
                  >
                    {getNotifIcon(notif.type)}
                  </div>

                  {/* Avatar pic */}
                  <img
                    src={senderPic}
                    alt={notif.sender.username}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-orbit-border object-cover shrink-0"
                    onClick={() => handleNotificationClick(notif)}
                  />

                  {/* Copy content */}
                  <div
                    className="flex-1 space-y-0.5 sm:space-y-1 min-w-0"
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <p className="text-zinc-200 leading-normal font-medium text-left text-[11px] sm:text-xs">
                      {getNotifText(notif)}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-zinc-500 font-mono text-left">
                      {new Date(notif.createdAt).toLocaleDateString()}{' '}
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Delete button */}
                  <motion.button
                    whileHover={{ scale: 1.15, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleDeleteSingle(notif._id);
                    }}
                    disabled={deletingId === notif._id}
                    className="shrink-0 p-1.5 sm:p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 cursor-pointer self-center"
                    title="Delete notification"
                    aria-label="Delete notification"
                  >
                    {deletingId === notif._id ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </motion.button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Infinite Scroll Sentry */}
          {hasMore && (
            <div
              ref={(el) => {
                elementRef.current = el;
              }}
              className="pt-8 flex items-center justify-center"
            >
              {loadingMore && (
                <div className="flex items-center gap-2 text-xs text-orbit-muted animate-pulse">
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading more...</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
