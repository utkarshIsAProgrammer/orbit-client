import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Notification, Post, Comment } from '../types/api';

import { User } from '../types/api';

// Connection states for better UX
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// Reconnection config
const RECONNECT_DEBOUNCE_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;
const INITIAL_RECONNECT_DELAY_MS = 1000;

interface SocketContextType {
  socket: Socket | null;
  connectionState: ConnectionState;
  unreadCount: number;
  setUnreadCount: (count: number | ((prev: number) => number)) => void;
  onNewNotification: (callback: (notification: Notification) => void) => () => void;
  onPostLike: (callback: (data: { postId: string; userId: string; likesCount: number }) => void) => () => void;
  onPostUnlike: (callback: (data: { postId: string; userId: string; likesCount: number }) => void) => () => void;
  onPostSave: (callback: (data: { postId: string; userId: string; savesCount: number }) => void) => () => void;
  onPostUnsave: (callback: (data: { postId: string; userId: string; savesCount: number }) => void) => () => void;
  onPostRepost: (callback: (data: { postId: string; userId: string; repostsCount: number }) => void) => () => void;
  onPostUnrepost: (callback: (data: { postId: string; userId: string; repostsCount: number }) => void) => () => void;
  onPostComment: (callback: (data: { postId: string; comment: Comment }) => void) => () => void;
  onCommentReply: (callback: (data: { commentId: string; reply: Comment }) => void) => () => void;
  onCommentLike: (callback: (data: { commentId: string; userId: string; likesCount: number }) => void) => () => void;
  onCommentUnlike: (callback: (data: { commentId: string; userId: string; likesCount: number }) => void) => () => void;
  onCommentDeleted: (
    callback: (data: { postId: string; commentId: string; commentsCount: number }) => void
  ) => () => void;
  onPostCreated: (callback: (post: Post) => void) => () => void;
  onPostUpdated: (callback: (post: Post) => void) => () => void;
  onPostDeleted: (callback: (postId: string) => void) => () => void;
  onUserFollow: (
    callback: (data: { targetUserId: string; followerId: string; followersCount: number }) => void
  ) => () => void;
  onUserUnfollow: (
    callback: (data: { targetUserId: string; followerId: string; followersCount: number }) => void
  ) => () => void;
  onPostView: (callback: (data: { postId: string; viewsCount: number }) => void) => () => void;
  onPostPin: (callback: (data: { postId: string; userId: string }) => void) => () => void;
  onPostUnpin: (callback: (data: { postId: string; userId: string }) => void) => () => void;
  onUserView: (callback: (data: { userId: string; viewsCount: number }) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef<number>(0);

  const newNotificationCallbacksRef = useRef<Set<(notification: Notification) => void>>(new Set());
  const shownNotificationsRef = useRef<Set<string>>(new Set());
  const locationRef = useRef(location.pathname);

  // Keep locationRef.current in sync with the latest pathname (for socket closure)
  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);
  const postLikeCallbacksRef = useRef<Set<(data: any) => void>>(new Set());
  const postUnlikeCallbacksRef = useRef<Set<(data: any) => void>>(new Set());
  const postSaveCallbacksRef = useRef<Set<(data: any) => void>>(new Set());
  const postUnsaveCallbacksRef = useRef<Set<(data: any) => void>>(new Set());
  const postRepostCallbacksRef = useRef<Set<(data: any) => void>>(new Set());
  const postUnrepostCallbacksRef = useRef<Set<(data: any) => void>>(new Set());
  const postCommentCallbacksRef = useRef<Set<(data: any) => void>>(new Set());
  const commentReplyCallbacksRef = useRef<Set<(data: any) => void>>(new Set());
  const commentLikeCallbacksRef = useRef<Set<(data: any) => void>>(new Set());
  const commentUnlikeCallbacksRef = useRef<Set<(data: any) => void>>(new Set());
  const commentDeletedCallbacksRef = useRef<Set<(data: any) => void>>(new Set());
  const postCreatedCallbacksRef = useRef<Set<(post: Post) => void>>(new Set());
  const postUpdatedCallbacksRef = useRef<Set<(post: Post) => void>>(new Set());
  const postDeletedCallbacksRef = useRef<Set<(postId: string) => void>>(new Set());
  const userFollowCallbacksRef = useRef<Set<(data: any) => void>>(new Set());
  const userUnfollowCallbacksRef = useRef<Set<(data: any) => void>>(new Set());
  const postViewCallbacksRef = useRef<Set<(data: any) => void>>(new Set());
  const postPinCallbacksRef = useRef<Set<(data: any) => void>>(new Set());
  const postUnpinCallbacksRef = useRef<Set<(data: any) => void>>(new Set());
  const userViewCallbacksRef = useRef<Set<(data: any) => void>>(new Set());

  const onNewNotification = useCallback((callback: (notification: Notification) => void) => {
    newNotificationCallbacksRef.current.add(callback);
    return () => {
      newNotificationCallbacksRef.current.delete(callback);
    };
  }, []);

  const onPostLike = useCallback((callback: (data: any) => void) => {
    postLikeCallbacksRef.current.add(callback);
    return () => {
      postLikeCallbacksRef.current.delete(callback);
    };
  }, []);

  const onPostUnlike = useCallback((callback: (data: any) => void) => {
    postUnlikeCallbacksRef.current.add(callback);
    return () => {
      postUnlikeCallbacksRef.current.delete(callback);
    };
  }, []);

  const onPostSave = useCallback((callback: (data: any) => void) => {
    postSaveCallbacksRef.current.add(callback);
    return () => {
      postSaveCallbacksRef.current.delete(callback);
    };
  }, []);

  const onPostUnsave = useCallback((callback: (data: any) => void) => {
    postUnsaveCallbacksRef.current.add(callback);
    return () => {
      postUnsaveCallbacksRef.current.delete(callback);
    };
  }, []);

  const onPostRepost = useCallback((callback: (data: any) => void) => {
    postRepostCallbacksRef.current.add(callback);
    return () => {
      postRepostCallbacksRef.current.delete(callback);
    };
  }, []);

  const onPostUnrepost = useCallback((callback: (data: any) => void) => {
    postUnrepostCallbacksRef.current.add(callback);
    return () => {
      postUnrepostCallbacksRef.current.delete(callback);
    };
  }, []);

  const onPostComment = useCallback((callback: (data: any) => void) => {
    postCommentCallbacksRef.current.add(callback);
    return () => {
      postCommentCallbacksRef.current.delete(callback);
    };
  }, []);

  const onCommentReply = useCallback((callback: (data: any) => void) => {
    commentReplyCallbacksRef.current.add(callback);
    return () => {
      commentReplyCallbacksRef.current.delete(callback);
    };
  }, []);

  const onCommentLike = useCallback((callback: (data: any) => void) => {
    commentLikeCallbacksRef.current.add(callback);
    return () => {
      commentLikeCallbacksRef.current.delete(callback);
    };
  }, []);

  const onCommentUnlike = useCallback((callback: (data: any) => void) => {
    commentUnlikeCallbacksRef.current.add(callback);
    return () => {
      commentUnlikeCallbacksRef.current.delete(callback);
    };
  }, []);

  const onCommentDeleted = useCallback((callback: (data: any) => void) => {
    commentDeletedCallbacksRef.current.add(callback);
    return () => {
      commentDeletedCallbacksRef.current.delete(callback);
    };
  }, []);

  const onPostCreated = useCallback((callback: (post: Post) => void) => {
    postCreatedCallbacksRef.current.add(callback);
    return () => {
      postCreatedCallbacksRef.current.delete(callback);
    };
  }, []);

  const onPostUpdated = useCallback((callback: (post: Post) => void) => {
    postUpdatedCallbacksRef.current.add(callback);
    return () => {
      postUpdatedCallbacksRef.current.delete(callback);
    };
  }, []);

  const onPostDeleted = useCallback((callback: (postId: string) => void) => {
    postDeletedCallbacksRef.current.add(callback);
    return () => {
      postDeletedCallbacksRef.current.delete(callback);
    };
  }, []);

  const onUserFollow = useCallback((callback: (data: any) => void) => {
    userFollowCallbacksRef.current.add(callback);
    return () => {
      userFollowCallbacksRef.current.delete(callback);
    };
  }, []);

  const onUserUnfollow = useCallback((callback: (data: any) => void) => {
    userUnfollowCallbacksRef.current.add(callback);
    return () => {
      userUnfollowCallbacksRef.current.delete(callback);
    };
  }, []);

  const onPostView = useCallback((callback: (data: any) => void) => {
    postViewCallbacksRef.current.add(callback);
    return () => {
      postViewCallbacksRef.current.delete(callback);
    };
  }, []);

  const onPostPin = useCallback((callback: (data: any) => void) => {
    postPinCallbacksRef.current.add(callback);
    return () => {
      postPinCallbacksRef.current.delete(callback);
    };
  }, []);

  const onPostUnpin = useCallback((callback: (data: any) => void) => {
    postUnpinCallbacksRef.current.add(callback);
    return () => {
      postUnpinCallbacksRef.current.delete(callback);
    };
  }, []);

  const onUserView = useCallback((callback: (data: any) => void) => {
    userViewCallbacksRef.current.add(callback);
    return () => {
      userViewCallbacksRef.current.delete(callback);
    };
  }, []);

  // Cleanup reconnect timeout on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const API_URL = (import.meta as any).env.VITE_API_URL || '';
    const token = localStorage.getItem('token');

    // Clear any pending reconnect attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (user && API_URL) {
      if (!socketRef.current) {
        setConnectionState('connecting');
        const newSocket = io(API_URL, {
          withCredentials: true,
          auth: {
            token: token,
          },
          // Socket.io client reconnection config
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: INITIAL_RECONNECT_DELAY_MS,
          reconnectionDelayMax: MAX_RECONNECT_DELAY_MS,
        });

        newSocket.on('connect', () => {
          console.log('Socket connected');
          setConnectionState('connected');
          reconnectAttemptRef.current = 0;
        });

        newSocket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          // Don't set to disconnected immediately - socket.io handles reconnection
          // Only show disconnected state if explicitly disconnected by us or server
          if (reason === 'io server disconnect' || reason === 'io client disconnect') {
            setConnectionState('disconnected');
          } else {
            setConnectionState('connecting');
          }
        });

        newSocket.on('connect_error', (error) => {
          console.error('Socket connection error:', error.message);
          setConnectionState('error');
        });

        newSocket.io.on('reconnect_attempt', (attemptNumber) => {
          console.log(`Socket reconnect attempt #${attemptNumber}`);
          reconnectAttemptRef.current = attemptNumber;
          setConnectionState('connecting');
        });

        newSocket.io.on('reconnect_failed', () => {
          console.error('Socket reconnect failed after multiple attempts');
          setConnectionState('error');
        });

        newSocket.io.on('reconnect', (attemptNumber) => {
          console.log(`Socket reconnected after ${attemptNumber} attempts`);
          setConnectionState('connected');
          reconnectAttemptRef.current = 0;
        });

        newSocket.on('notification', (notification: Notification) => {
          console.log('New notification received:', notification);

          // Call all registered callbacks (Navbar's onNewNotification listener handles unreadCount increment)
          newNotificationCallbacksRef.current.forEach((callback) => {
            callback(notification);
          });

          // Track shown notification IDs so each notification only toasts once until page reload.
          // Must be before the location check so IDs are tracked regardless of current page.
          if (notification._id) {
            if (shownNotificationsRef.current.has(notification._id)) {
              return;
            }
            shownNotificationsRef.current.add(notification._id);
          }

          // Show toast notification (suppress when on the notifications page)
          if (locationRef.current !== '/notifications') {
            let toastMessage = '';
            const senderName = notification.sender?.fullName || notification.sender?.username || 'Someone';

            switch (notification.type) {
              case 'like':
                toastMessage = `${senderName} liked your post!`;
                break;
              case 'comment':
                toastMessage = `${senderName} commented on your post!`;
                break;
              case 'follow':
                toastMessage = `${senderName} started following you!`;
                break;
              case 'repost':
                toastMessage = `${senderName} reposted your post!`;
                break;
              case 'save':
                toastMessage = `${senderName} saved your post!`;
                break;
              default:
                toastMessage = 'You have a new notification!';
            }

            toast.info(toastMessage, {
              duration: 5000,
            });
          }
        });

        // Helper function to update user in all query caches
        const updateUserInAllQueries = (userId: string, updateFn: (user: User | undefined) => User | undefined) => {
          // Update ['userProfile'] cache
          queryClient.setQueriesData({ queryKey: ['userProfile'] }, (oldData: any) => {
            if (!oldData) return oldData;
            if (oldData.user && oldData.user._id === userId) {
              return { ...oldData, user: updateFn(oldData.user) };
            }
            return oldData;
          });

          // Update ['users'] cache
          queryClient.setQueriesData({ queryKey: ['users'] }, (oldData: any) => {
            if (!oldData) return oldData;
            if (oldData.pages) {
              return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                  ...page,
                  users: page.users?.map(updateFn),
                  items: page.items?.map(updateFn),
                })),
              };
            }
            if (Array.isArray(oldData)) {
              return oldData.map(updateFn);
            }
            if (oldData.users) {
              return { ...oldData, users: oldData.users.map(updateFn) };
            }
            return oldData;
          });
          // Update ['searchUsers'] cache
          queryClient.setQueriesData({ queryKey: ['searchUsers'] }, (oldData: any) => {
            if (!oldData) return oldData;
            if (oldData.pages) {
              return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                  ...page,
                  users: page.users?.map(updateFn),
                })),
              };
            }
            if (Array.isArray(oldData)) {
              return oldData.map(updateFn);
            }
            if (oldData.users) {
              return { ...oldData, users: oldData.users.map(updateFn) };
            }
            return oldData;
          });

          // Update ['userSuggestions'] cache
          queryClient.setQueriesData({ queryKey: ['userSuggestions'] }, (oldData: any) => {
            if (!oldData) return oldData;
            if (Array.isArray(oldData)) {
              return oldData.map(updateFn);
            }
            if (oldData.users) {
              return { ...oldData, users: oldData.users.map(updateFn) };
            }
            return oldData;
          });

          // Update ['followers'] cache (followers have nested 'follower' object)
          queryClient.setQueriesData({ queryKey: ['followers'] }, (oldData: any) => {
            if (!oldData) return oldData;
            if (oldData.pages) {
              return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                  ...page,
                  followers: page.followers?.map((follow: any) => ({
                    ...follow,
                    follower:
                      follow.follower && follow.follower._id === userId ? updateFn(follow.follower) : follow.follower,
                  })),
                })),
              };
            }
            if (oldData.followers) {
              return {
                ...oldData,
                followers: oldData.followers?.map((follow: any) => ({
                  ...follow,
                  follower:
                    follow.follower && follow.follower._id === userId ? updateFn(follow.follower) : follow.follower,
                })),
              };
            }
            return oldData;
          });

          // Update ['following'] cache (following have nested 'following' object)
          queryClient.setQueriesData({ queryKey: ['following'] }, (oldData: any) => {
            if (!oldData) return oldData;
            if (oldData.pages) {
              return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                  ...page,
                  following: page.following?.map((follow: any) => ({
                    ...follow,
                    following:
                      follow.following && follow.following._id === userId
                        ? updateFn(follow.following)
                        : follow.following,
                  })),
                })),
              };
            }
            if (oldData.following) {
              return {
                ...oldData,
                following: oldData.following?.map((follow: any) => ({
                  ...follow,
                  following:
                    follow.following && follow.following._id === userId ? updateFn(follow.following) : follow.following,
                })),
              };
            }
            return oldData;
          });
        };

        // Helper function to update comment in all query caches
        const updateCommentInAllQueries = (
          commentId: string,
          updateFn: (comment: Comment | undefined) => Comment | undefined
        ) => {
          // Update ['comments'] cache (handles both regular and infinite queries)
          queryClient.setQueriesData<any>({ queryKey: ['comments'] }, (oldData: any) => {
            if (!oldData) return oldData;

            // Handle infinite query format (data.pages)
            if (oldData.pages) {
              return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                  ...page,
                  comments: page.comments?.map((c: Comment | undefined) =>
                    c && c._id === commentId ? updateFn(c) : c
                  ),
                  items: page.items?.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c)),
                })),
              };
            }

            // Handle regular array format
            if (Array.isArray(oldData)) {
              return oldData.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c));
            }

            // Handle regular object format
            return {
              ...oldData,
              comments: oldData.comments?.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c)),
              items: oldData.items?.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c)),
            };
          });

          // Update ['replies'] cache (handles both regular and infinite queries)
          queryClient.setQueriesData<any>({ queryKey: ['replies'] }, (oldData: any) => {
            if (!oldData) return oldData;

            // Handle infinite query format
            if (oldData.pages) {
              return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                  ...page,
                  replies: page.replies?.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c)),
                  comments: page.comments?.map((c: Comment | undefined) =>
                    c && c._id === commentId ? updateFn(c) : c
                  ),
                  items: page.items?.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c)),
                })),
              };
            }

            // Handle regular array format
            if (Array.isArray(oldData)) {
              return oldData.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c));
            }

            // Handle regular object format
            return {
              ...oldData,
              replies: oldData.replies?.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c)),
              comments: oldData.comments?.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c)),
              items: oldData.items?.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c)),
            };
          });
        };

        // Helper function to update post in all query caches
        const updatePostInAllQueries = (postId: string, updateFn: (post: Post | undefined) => Post | undefined) => {
          // Update ['posts'] cache (handles both regular and infinite queries)
          queryClient.setQueriesData({ queryKey: ['posts'] }, (oldData: any) => {
            if (!oldData) return oldData;

            // Handle infinite query format (data.pages)
            if (oldData.pages) {
              return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                  ...page,
                  posts: page.posts?.map((p: Post | undefined) => updateFn(p)),
                  items: page.items?.map((p: Post | undefined) => updateFn(p)),
                })),
              };
            }

            // Handle regular array format
            if (Array.isArray(oldData)) {
              return oldData.map((p: Post | undefined) => updateFn(p));
            }

            // Handle regular object format
            return {
              ...oldData,
              posts: oldData.posts?.map((p: Post | undefined) => updateFn(p)),
              items: oldData.items?.map((p: Post | undefined) => updateFn(p)),
            };
          });

          // Update ['userPosts'] caches (any user)
          queryClient.setQueriesData({ queryKey: ['userPosts'] }, (oldData: any) => {
            if (!oldData) return oldData;

            // Handle infinite query format
            if (oldData.pages) {
              return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                  ...page,
                  posts: page.posts?.map((p: Post | undefined) => updateFn(p)),
                  items: page.items?.map((p: Post | undefined) => updateFn(p)),
                })),
              };
            }

            // Handle regular object format
            return {
              ...oldData,
              posts: oldData.posts?.map((p: Post | undefined) => updateFn(p)),
              items: oldData.items?.map((p: Post | undefined) => updateFn(p)),
            };
          });

          // Update ['savedPosts'] cache
          queryClient.setQueriesData({ queryKey: ['savedPosts'] }, (oldData: any) => {
            if (!oldData) return oldData;

            // Handle infinite query format
            if (oldData.pages) {
              return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                  ...page,
                  posts: page.posts?.map((p: Post | undefined) => updateFn(p)),
                })),
              };
            }

            // Handle regular object format
            return {
              ...oldData,
              posts: oldData.posts?.map((p: Post | undefined) => updateFn(p)),
            };
          });

          // Update ['userSavedPosts'] cache (Profile saves tab)
          queryClient.setQueriesData({ queryKey: ['userSavedPosts'] }, (oldData: any) => {
            if (!oldData) return oldData;
            if (oldData.pages) {
              return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                  ...page,
                  posts: page.posts?.map((p: Post | undefined) => updateFn(p)),
                })),
              };
            }
            return {
              ...oldData,
              posts: oldData.posts?.map((p: Post | undefined) => updateFn(p)),
            };
          });

          // Update ['userReposts'] cache (Profile reposts tab)
          queryClient.setQueriesData({ queryKey: ['userReposts'] }, (oldData: any) => {
            if (!oldData) return oldData;
            if (oldData.pages) {
              return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                  ...page,
                  posts: page.posts?.map((p: Post | undefined) => updateFn(p)),
                })),
              };
            }
            return {
              ...oldData,
              posts: oldData.posts?.map((p: Post | undefined) => updateFn(p)),
            };
          });

          // Update ['searchPosts'] cache
          queryClient.setQueriesData({ queryKey: ['searchPosts'] }, (oldData: any) => {
            if (!oldData) return oldData;
            if (Array.isArray(oldData)) {
              return oldData.map((p: Post | undefined) => updateFn(p));
            }
            return oldData;
          });

          // Update ['pinnedPosts'] cache
          queryClient.setQueriesData({ queryKey: ['pinnedPosts'] }, (oldData: any) => {
            if (!oldData) return oldData;
            if (oldData.posts) {
              return {
                ...oldData,
                posts: oldData.posts.map((p: Post | undefined) => updateFn(p)),
              };
            }
            return oldData;
          });

          // Update individual ['post', postId] cache
          queryClient.setQueryData(['post', postId], (oldData: any) => {
            if (!oldData) return oldData;
            if (oldData.post) {
              return {
                ...oldData,
                post: updateFn(oldData.post),
              };
            }
            if (oldData._id === postId) {
              return updateFn(oldData);
            }
            return oldData;
          });
        };

        newSocket.on('post:like', (data) => {
          console.log('post:like received', data, 'user._id:', user?._id);

          const isCurrentUser = String(data.userId) === String(user?._id);
          updatePostInAllQueries(data.postId, (post) =>
            post && post._id === data.postId
              ? { ...post, likesCount: data.likesCount, ...(isCurrentUser ? { likedByMe: true } : {}) }
              : post
          );

          postLikeCallbacksRef.current.forEach((callback) => callback(data));
        });

        newSocket.on('post:unlike', (data) => {
          console.log('post:unlike received', data, 'user._id:', user?._id);

          const isCurrentUser = String(data.userId) === String(user?._id);
          updatePostInAllQueries(data.postId, (post) =>
            post && post._id === data.postId
              ? { ...post, likesCount: data.likesCount, ...(isCurrentUser ? { likedByMe: false } : {}) }
              : post
          );

          postUnlikeCallbacksRef.current.forEach((callback) => callback(data));
        });

        // Helper to remove a post from savedPosts caches
        const removePostFromSavedQueries = (postId: string) => {
          const removeFromPages = (oldData: any) => {
            if (!oldData) return oldData;
            if (oldData.pages) {
              return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                  ...page,
                  posts: page.posts?.filter((p: any) => p && p._id !== postId),
                })),
              };
            }
            return oldData;
          };

          queryClient.setQueriesData({ queryKey: ['savedPosts'] }, removeFromPages);
          queryClient.setQueriesData({ queryKey: ['userSavedPosts'] }, removeFromPages);
        };

        newSocket.on('post:save', (data) => {
          console.log('post:save received', data, 'user._id:', user?._id);

          const isCurrentUser = String(data.userId) === String(user?._id);
          updatePostInAllQueries(data.postId, (post) =>
            post && post._id === data.postId
              ? { ...post, savesCount: data.savesCount, ...(isCurrentUser ? { savedByMe: true } : {}) }
              : post
          );

          // Invalidate savedPosts so the newly saved post appears in real-time
          queryClient.invalidateQueries({ queryKey: ['savedPosts'] });
          queryClient.invalidateQueries({ queryKey: ['userSavedPosts'] });

          postSaveCallbacksRef.current.forEach((callback) => callback(data));
        });

        newSocket.on('post:unsave', (data) => {
          console.log('post:unsave received', data, 'user._id:', user?._id);

          const isCurrentUser = String(data.userId) === String(user?._id);
          updatePostInAllQueries(data.postId, (post) =>
            post && post._id === data.postId
              ? { ...post, savesCount: data.savesCount, ...(isCurrentUser ? { savedByMe: false } : {}) }
              : post
          );

          // Remove from savedPosts so it disappears immediately
          removePostFromSavedQueries(data.postId);

          postUnsaveCallbacksRef.current.forEach((callback) => callback(data));
        });

        newSocket.on('post:repost', (data) => {
          console.log('post:repost received', data, 'user._id:', user?._id);

          const isCurrentUser = String(data.userId) === String(user?._id);
          updatePostInAllQueries(data.postId, (post) =>
            post && post._id === data.postId
              ? { ...post, repostsCount: data.repostsCount, ...(isCurrentUser ? { repostedByMe: true } : {}) }
              : post
          );

          postRepostCallbacksRef.current.forEach((callback) => callback(data));
        });

        newSocket.on('post:unrepost', (data) => {
          console.log('post:unrepost received', data, 'user._id:', user?._id);

          const isCurrentUser = String(data.userId) === String(user?._id);
          updatePostInAllQueries(data.postId, (post) =>
            post && post._id === data.postId
              ? { ...post, repostsCount: data.repostsCount, ...(isCurrentUser ? { repostedByMe: false } : {}) }
              : post
          );

          postUnrepostCallbacksRef.current.forEach((callback) => callback(data));
        });

        newSocket.on('post:view', (data) => {
          console.log('post:view received', data, 'user._id:', user?._id);

          updatePostInAllQueries(data.postId, (post) =>
            post && post._id === data.postId ? { ...post, viewsCount: data.viewsCount } : post
          );

          postViewCallbacksRef.current.forEach((callback) => callback(data));
        });

        newSocket.on('post:pin', (data) => {
          console.log('post:pin received', data);
          queryClient.invalidateQueries({ queryKey: ['pinnedPosts'] });
          queryClient.invalidateQueries({ queryKey: ['userPosts'] });
          postPinCallbacksRef.current.forEach((callback) => callback(data));
        });

        newSocket.on('post:unpin', (data) => {
          console.log('post:unpin received', data);
          queryClient.invalidateQueries({ queryKey: ['pinnedPosts'] });
          queryClient.invalidateQueries({ queryKey: ['userPosts'] });
          postUnpinCallbacksRef.current.forEach((callback) => callback(data));
        });

        newSocket.on('user:view', (data) => {
          console.log('user:view received', data);
          queryClient.setQueriesData({ queryKey: ['userProfile'] }, (oldData: any) => {
            if (!oldData) return oldData;
            if (oldData.user && oldData.user._id === data.userId) {
              return { ...oldData, user: { ...oldData.user, viewsCount: data.viewsCount } };
            }
            return oldData;
          });
          userViewCallbacksRef.current.forEach((callback) => callback(data));
        });

        newSocket.on('post:comment', (data) => {
          console.log('post:comment received', data, 'user._id:', user?._id);

          if (String(data.userId) !== String(user?._id)) {
            console.log('updating cache for post:comment (not current user)');
            updatePostInAllQueries(data.postId, (post) =>
              post && post._id === data.postId ? { ...post, commentsCount: data.commentsCount } : post
            );
          } else {
            console.log('skipping cache updates for post:comment (current user)');
          }

          queryClient.invalidateQueries({ queryKey: ['comments', data.postId] });

          postCommentCallbacksRef.current.forEach((callback) => callback(data));
        });

        newSocket.on('comment:reply', (data) => {
          console.log('comment:reply received', data, 'user._id:', user?._id);

          if (String(data.userId) !== String(user?._id)) {
            console.log('updating cache for comment:reply (not current user)');
            updatePostInAllQueries(data.postId, (post) =>
              post && post._id === data.postId ? { ...post, commentsCount: data.commentsCount } : post
            );
            updateCommentInAllQueries(data.commentId, (comment) =>
              comment && comment._id === data.commentId ? { ...comment, repliesCount: data.repliesCount } : comment
            );
          } else {
            console.log('skipping cache updates for comment:reply (current user)');
          }

          queryClient.invalidateQueries({ queryKey: ['replies', data.commentId] });
          queryClient.invalidateQueries({ queryKey: ['comments', data.postId] });

          commentReplyCallbacksRef.current.forEach((callback) => callback(data));
        });

        newSocket.on('comment:like', (data) => {
          console.log('comment:like received', data);

          updateCommentInAllQueries(data.commentId, (comment) =>
            comment && comment._id === data.commentId ? { ...comment, likesCount: data.likesCount } : comment
          );

          commentLikeCallbacksRef.current.forEach((callback) => callback(data));
        });

        newSocket.on('comment:unlike', (data) => {
          console.log('comment:unlike received', data);

          updateCommentInAllQueries(data.commentId, (comment) =>
            comment && comment._id === data.commentId ? { ...comment, likesCount: data.likesCount } : comment
          );

          commentUnlikeCallbacksRef.current.forEach((callback) => callback(data));
        });

        newSocket.on('comment:deleted', (data) => {
          console.log('comment:deleted received', data, 'user._id:', user?._id);

          // Update post's comments count in all queries
          updatePostInAllQueries(data.postId, (post) =>
            post && post._id === data.postId ? { ...post, commentsCount: data.commentsCount } : post
          );

          // Invalidate comments cache for the post
          queryClient.invalidateQueries({ queryKey: ['comments', data.postId] });
          queryClient.invalidateQueries({ queryKey: ['replies'] });

          commentDeletedCallbacksRef.current.forEach((callback) => callback(data));
        });

        newSocket.on('user:follow', (data) => {
          console.log('user:follow received', data, 'user._id:', user?._id);

          if (String(data.followerId) === String(user?._id)) {
            console.log('current user followed someone, updating target user followingByMe to true');
            updateUserInAllQueries(data.targetUserId, (targetUser) =>
              targetUser && targetUser._id === data.targetUserId
                ? { ...targetUser, followingByMe: true, isFollowing: true }
                : targetUser
            );
          } else {
            console.log('updating cache for user:follow (not current user)');
            updateUserInAllQueries(data.targetUserId, (targetUser) =>
              targetUser && targetUser._id === data.targetUserId
                ? { ...targetUser, followersCount: data.followersCount }
                : targetUser
            );
          }

          userFollowCallbacksRef.current.forEach((callback) => callback(data));
        });

        newSocket.on('user:unfollow', (data) => {
          console.log('user:unfollow received', data, 'user._id:', user?._id);

          if (String(data.followerId) === String(user?._id)) {
            console.log('current user unfollowed someone, updating target user followingByMe to false');
            updateUserInAllQueries(data.targetUserId, (targetUser) =>
              targetUser && targetUser._id === data.targetUserId
                ? { ...targetUser, followingByMe: false, isFollowing: false }
                : targetUser
            );
          } else {
            console.log('updating cache for user:unfollow (not current user)');
            updateUserInAllQueries(data.targetUserId, (targetUser) =>
              targetUser && targetUser._id === data.targetUserId
                ? { ...targetUser, followersCount: data.followersCount }
                : targetUser
            );
          }

          userUnfollowCallbacksRef.current.forEach((callback) => callback(data));
        });

        newSocket.on('post:created', (post) => {
          console.log('post:created received', post);

          // Update posts cache for both regular and infinite query formats
          queryClient.setQueriesData<any>({ queryKey: ['posts'] }, (oldData: any) => {
            if (!oldData) return oldData;

            // Handle infinite query format (data.pages)
            if (oldData.pages) {
              return {
                ...oldData,
                pages: oldData.pages.map((page: any, index: number) => {
                  if (index === 0) {
                    return {
                      ...page,
                      posts: [post, ...(page.posts || page.items || [])],
                      items: [post, ...(page.items || page.posts || [])],
                    };
                  }
                  return page;
                }),
              };
            }

            // Handle regular array format
            if (Array.isArray(oldData)) {
              return [post, ...oldData];
            }

            // Handle regular object format
            return {
              ...oldData,
              posts: [post, ...(oldData.posts || oldData.items || [])],
              items: [post, ...(oldData.items || oldData.posts || [])],
            };
          });

          postCreatedCallbacksRef.current.forEach((callback) => callback(post));
        });

        newSocket.on('post:updated', (post) => {
          console.log('post:updated received', post);

          // Update post in all queries
          updatePostInAllQueries(post._id, (p) => (p && p._id === post._id ? post : p));

          postUpdatedCallbacksRef.current.forEach((callback) => callback(post));
        });

        newSocket.on('post:deleted', (postId) => {
          console.log('post:deleted received', postId);

          queryClient.removeQueries({ queryKey: ['post', postId] });

          queryClient.setQueriesData<any>({ queryKey: ['posts'] }, (oldData: any) => {
            if (!oldData) return oldData;

            // Handle infinite query format (data.pages)
            if (oldData.pages) {
              return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                  ...page,
                  posts: (page.posts || page.items || []).filter((p: Post) => p && p._id !== postId),
                  items: (page.items || page.posts || []).filter((p: Post) => p && p._id !== postId),
                })),
              };
            }

            // Handle regular array format
            if (Array.isArray(oldData)) {
              return oldData.filter((p: Post) => p && p._id !== postId);
            }

            // Handle regular object format
            return {
              ...oldData,
              posts: (oldData.posts || oldData.items || []).filter((p: Post) => p && p._id !== postId),
              items: (oldData.items || oldData.posts || []).filter((p: Post) => p && p._id !== postId),
            };
          });

          postDeletedCallbacksRef.current.forEach((callback) => callback(postId));
        });

        socketRef.current = newSocket;
        setSocket(newSocket);
      }
    } else {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    }

    return () => {
      if (!user) {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
          setSocket(null);
          setConnectionState('disconnected');
        }
      }
    };
  }, [user, queryClient]);

  // Reset unread count when user navigates to notifications page
  useEffect(() => {
    if (location.pathname === '/notifications') {
      const timer = setTimeout(() => setUnreadCount(0), 0);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connectionState,
        unreadCount,
        setUnreadCount,
        onNewNotification,
        onPostLike,
        onPostUnlike,
        onPostSave,
        onPostUnsave,
        onPostRepost,
        onPostUnrepost,
        onPostComment,
        onCommentReply,
        onCommentLike,
        onCommentUnlike,
        onCommentDeleted,
        onPostCreated,
        onPostUpdated,
        onPostDeleted,
        onUserFollow,
        onUserUnfollow,
        onPostView,
        onPostPin,
        onPostUnpin,
        onUserView,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
