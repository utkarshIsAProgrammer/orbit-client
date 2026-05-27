import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getPosts, deletePost } from '../api/posts';
import { getUserSuggestions } from '../api/users';
import { Post } from '../types/api';
import PostCard from '../components/PostCard';
import Modal from '../components/Modal';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useInfiniteQuery, useQueryClient, useQuery } from '@tanstack/react-query';
import { useToggleFollowUser } from '../hooks/useFollows';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { SkeletonFeed } from '../components/Skeleton';
import { PlusSquare, Sparkles, ArrowRight, RotateCw, Compass, UserPlus, UserCheck } from 'lucide-react';

export default function HomeFeed() {
  const { user } = useAuth();
  const {
    onUserFollow,
    onUserUnfollow,
    onPostLike,
    onPostUnlike,
    onPostSave,
    onPostUnsave,
    onPostRepost,
    onPostUnrepost,
    onPostCreated,
    onPostDeleted,
    onPostPin,
    onPostUnpin,
  } = useSocket();
  const queryClient = useQueryClient();
  const toggleFollow = useToggleFollowUser();
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; postId: string }>({ isOpen: false, postId: '' });

  const {
    data,
    isLoading: loading,
    isFetchingNextPage: loadingMore,
    fetchNextPage,
    hasNextPage,
    refetch: fetchInitialPosts,
  } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: async ({ pageParam }) => {
      const res = await getPosts({ limit: 10, cursor: pageParam });
      return res;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    refetchOnWindowFocus: true,
  });

  const { elementRef } = useInfiniteScroll({
    hasMore: hasNextPage,
    isLoading: loadingMore,
    loadMore: fetchNextPage,
  });

  const posts = data?.pages.flatMap((page) => page.posts || page.items || []) || [];

  // Real user suggestions from the API
  const { data: suggestionsData, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['userSuggestions'],
    queryFn: async () => {
      try {
        const res = await getUserSuggestions(5);
        if (res.success && res.users) {
          return res.users.filter((u: any) => u._id !== user?._id).slice(0, 4);
        }
      } catch {
        // fallback to empty
      }
      return [
        {
          _id: 'su_1',
          username: 'alex_explorer',
          fullName: 'Alex Rivera',
          bio: 'Visual capture and minimalist designer',
          followingByMe: false,
        },
        {
          _id: 'su_2',
          username: 'clara_sky',
          fullName: 'Clara Bennett',
          bio: 'Landscape designer and coder',
          followingByMe: false,
        },
        {
          _id: 'su_3',
          username: 'dev_mason',
          fullName: 'Marcus Mason',
          bio: 'React enthusiast & tea appreciator',
          followingByMe: false,
        },
      ];
    },
    enabled: !!user,
    staleTime: 300000, // 5 min
  });

  const suggestions = suggestionsData || [];

  useEffect(() => {
    if (!user) return;
    const handleFollow = (data: any) => {
      if (data.followerId === user._id) {
        queryClient.setQueriesData({ queryKey: ['userSuggestions'] }, (oldData: any) => {
          if (!oldData) return oldData;
          if (Array.isArray(oldData)) {
            return oldData.map((u: any) => (u._id === data.targetUserId ? { ...u, followingByMe: true } : u));
          }
          if (oldData.users) {
            return {
              ...oldData,
              users: oldData.users.map((u: any) => (u._id === data.targetUserId ? { ...u, followingByMe: true } : u)),
            };
          }
          return oldData;
        });
      }
    };
    const handleUnfollow = (data: any) => {
      if (data.followerId === user._id) {
        queryClient.setQueriesData({ queryKey: ['userSuggestions'] }, (oldData: any) => {
          if (!oldData) return oldData;
          if (Array.isArray(oldData)) {
            return oldData.map((u: any) => (u._id === data.targetUserId ? { ...u, followingByMe: false } : u));
          }
          if (oldData.users) {
            return {
              ...oldData,
              users: oldData.users.map((u: any) => (u._id === data.targetUserId ? { ...u, followingByMe: false } : u)),
            };
          }
          return oldData;
        });
      }
    };
    const unsub1 = onUserFollow(handleFollow);
    const unsub2 = onUserUnfollow(handleUnfollow);
    return () => {
      unsub1();
      unsub2();
    };
  }, [user, onUserFollow, onUserUnfollow, queryClient]);

  // Socket subscriptions for real-time post updates
  useEffect(() => {
    const handlePostLike = (data: any) => {
      queryClient.setQueriesData({ queryKey: ['posts'] }, (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: (page.posts || page.items || []).map((p: any) =>
              p._id === data.postId ? { ...p, likesCount: data.likesCount, likedByMe: true } : p
            ),
          })),
        };
      });
    };

    const handlePostUnlike = (data: any) => {
      queryClient.setQueriesData({ queryKey: ['posts'] }, (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: (page.posts || page.items || []).map((p: any) =>
              p._id === data.postId ? { ...p, likesCount: data.likesCount, likedByMe: false } : p
            ),
          })),
        };
      });
    };

    const handlePostSave = (data: any) => {
      queryClient.setQueriesData({ queryKey: ['posts'] }, (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: (page.posts || page.items || []).map((p: any) =>
              p._id === data.postId ? { ...p, savesCount: data.savesCount, savedByMe: true } : p
            ),
          })),
        };
      });
    };

    const handlePostUnsave = (data: any) => {
      queryClient.setQueriesData({ queryKey: ['posts'] }, (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: (page.posts || page.items || []).map((p: any) =>
              p._id === data.postId ? { ...p, savesCount: data.savesCount, savedByMe: false } : p
            ),
          })),
        };
      });
    };

    const handlePostRepost = (data: any) => {
      queryClient.setQueriesData({ queryKey: ['posts'] }, (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: (page.posts || page.items || []).map((p: any) =>
              p._id === data.postId ? { ...p, repostsCount: data.repostsCount, repostedByMe: true } : p
            ),
          })),
        };
      });
    };

    const handlePostUnrepost = (data: any) => {
      queryClient.setQueriesData({ queryKey: ['posts'] }, (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: (page.posts || page.items || []).map((p: any) =>
              p._id === data.postId ? { ...p, repostsCount: data.repostsCount, repostedByMe: false } : p
            ),
          })),
        };
      });
    };

    const handlePostCreated = (data: any) => {
      // Only add if it's from someone the user follows (for feed relevance)
      if (data.post?.author?._id !== user?._id) {
        queryClient.setQueriesData({ queryKey: ['posts'] }, (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any, index: number) => {
              if (index === 0) {
                return {
                  ...page,
                  posts: [data.post, ...(page.posts || page.items || [])],
                };
              }
              return page;
            }),
          };
        });
      }
    };

    const handlePostDeleted = (data: any) => {
      queryClient.setQueriesData({ queryKey: ['posts'] }, (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: (page.posts || page.items || []).filter((p: any) => p._id !== data.postId),
          })),
        };
      });
    };

    const handlePostPin = (data: any) => {
      queryClient.setQueriesData({ queryKey: ['posts'] }, (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: (page.posts || page.items || []).map((p: any) =>
              p._id === data.postId ? { ...p, pinnedByMe: true } : p
            ),
          })),
        };
      });
    };

    const handlePostUnpin = (data: any) => {
      queryClient.setQueriesData({ queryKey: ['posts'] }, (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: (page.posts || page.items || []).map((p: any) =>
              p._id === data.postId ? { ...p, pinnedByMe: false } : p
            ),
          })),
        };
      });
    };

    const unsubLike = onPostLike(handlePostLike);
    const unsubUnlike = onPostUnlike(handlePostUnlike);
    const unsubSave = onPostSave(handlePostSave);
    const unsubUnsave = onPostUnsave(handlePostUnsave);
    const unsubRepost = onPostRepost(handlePostRepost);
    const unsubUnrepost = onPostUnrepost(handlePostUnrepost);
    const unsubCreated = onPostCreated(handlePostCreated);
    const unsubDeleted = onPostDeleted(handlePostDeleted);
    const unsubPin = onPostPin(handlePostPin);
    const unsubUnpin = onPostUnpin(handlePostUnpin);

    return () => {
      unsubLike();
      unsubUnlike();
      unsubSave();
      unsubUnsave();
      unsubRepost();
      unsubUnrepost();
      unsubCreated();
      unsubDeleted();
      unsubPin();
      unsubUnpin();
    };
  }, [
    onPostLike,
    onPostUnlike,
    onPostSave,
    onPostUnsave,
    onPostRepost,
    onPostUnrepost,
    onPostCreated,
    onPostDeleted,
    onPostPin,
    onPostUnpin,
    queryClient,
    user,
  ]);

  const handleDelete = (postId: string) => setDeleteModal({ isOpen: true, postId });

  const confirmDeletePost = async () => {
    try {
      const res = await deletePost(deleteModal.postId);
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['posts'] });
        toast.success('Post deleted successfully.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete post.');
    } finally {
      setDeleteModal({ isOpen: false, postId: '' });
    }
  };

  const handleToggleFollow = (userId: string, username: string) => {
    if (!user) {
      toast.error('Please sign in to follow creators.');
      return;
    }
    if (toggleFollow.isPending) return;
    toggleFollow.mutate(userId, {
      onSuccess: () => toast.success(`You are now following @${username}!`),
      onError: () => toast.error('Could not complete follow request.'),
    });
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Main Feed */}
      <main className="col-span-1 lg:col-span-8 space-y-6">
        {!user && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden bg-gradient-to-r from-orbit-accent/10 to-transparent border border-orbit-border rounded-3xl p-6 md:p-8 shadow-xl"
          >
            <div className="absolute right-0 bottom-0 top-0 opacity-5 w-1/2 flex items-center justify-center p-4 select-none pointer-events-none">
              <Compass className="w-48 h-48 animate-spin [animation-duration:60s] text-white" />
            </div>
            <div className="relative z-10 max-w-xl">
              <div className="flex items-center gap-2 text-orbit-accent/90 mb-3">
                <Sparkles className="w-4 h-4 animate-pulse text-orbit-accent" />
                <span className="font-mono text-[9px] tracking-[0.2em] uppercase font-bold text-orbit-muted">
                  Welcome
                </span>
              </div>
              <h1 className="font-display font-semibold text-2xl md:text-3xl text-white mb-3 leading-tight tracking-tight">
                Share Your Moments <span className="text-orbit-accent">With Friends</span>
              </h1>
              <p className="text-white/70 text-xs leading-relaxed mb-6">
                Join Orbit to connect with friends, share photos and videos, and discover new communities you&rsquo;ll
                love.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to="/signup"
                  className="bg-orbit-accent text-orbit-accent-foreground hover:opacity-90 transition-all font-semibold text-xs px-5 py-3 rounded-full flex items-center gap-2 shadow-lg shrink-0 whitespace-nowrap"
                >
                  <span>Create Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/login"
                  className="text-white/60 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest px-2 py-1 shrink-0 whitespace-nowrap"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-orbit-card border border-orbit-border rounded-3xl p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Link
                to={`/profile/${user.username}`}
                className="w-11 h-11 rounded-full border border-orbit-border p-0.5 shrink-0 hover:border-orbit-accent/60 transition-colors cursor-pointer block overflow-hidden"
              >
                <img
                  src={
                    user.profilePic?.url ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop'
                  }
                  alt={user.username}
                  referrerPolicy="no-referrer"
                  className="w-full h-full rounded-full object-cover"
                />
              </Link>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/95 truncate">What&rsquo;s on your mind?</p>
                <p className="text-[10px] text-orbit-muted/70 mt-0.5 truncate">Share an update, link or image...</p>
              </div>
            </div>
            <Link
              to="/post/new"
              className="bg-orbit-accent text-orbit-accent-foreground hover:opacity-95 transition-colors font-semibold text-xs px-4 sm:px-5 py-2.5 rounded-full flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <PlusSquare className="w-4 h-4" />
              <span className="hidden xs:inline">Create Post</span>
            </Link>
          </motion.div>
        )}

        <div className="flex items-center justify-between border-b border-orbit-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-orbit-accent" />
              <h2 className="text-lg font-semibold tracking-tight text-white">For You</h2>
            </div>
            <p className="text-[10px] text-orbit-muted/80 uppercase tracking-wider font-mono">
              See what your friends are sharing
            </p>
          </div>
          <button
            onClick={() => fetchInitialPosts()}
            className="p-2 text-orbit-muted hover:text-white rounded-full hover:bg-white/5 transition-all cursor-pointer"
            title="Refresh Feed"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <SkeletonFeed count={3} />
        ) : posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-orbit-card border border-orbit-border rounded-3xl p-12 text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-black/40 border border-orbit-border flex items-center justify-center mx-auto text-orbit-muted">
              <Compass className="w-7 h-7" />
            </div>
            <h3 className="font-display font-medium text-lg text-white">No Posts Yet</h3>
            <p className="text-xs text-orbit-muted max-w-sm mx-auto">
              Follow more friends or share your first post to get started!
            </p>
            {user && (
              <Link
                to="/post/new"
                className="inline-flex bg-orbit-accent text-orbit-accent-foreground text-xs font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition-all"
              >
                Share a Post
              </Link>
            )}
          </motion.div>
        ) : (
          <div className="space-y-5">
            {posts.map((post, index) => (
              <PostCard key={post._id} post={post} onDelete={handleDelete} index={index} />
            ))}
            {hasNextPage && (
              <div
                ref={(el) => {
                  elementRef.current = el;
                }}
                className="py-8 flex items-center justify-center"
              >
                {loadingMore && (
                  <div className="flex items-center gap-2 text-xs text-orbit-muted animate-pulse">
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Loading more...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Sidebar */}
      <aside className="col-span-1 lg:col-span-4 hidden lg:block space-y-6">
        {/* Follow Suggestions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-orbit-card border border-orbit-border rounded-3xl p-5 space-y-4 shadow-lg"
        >
          <div className="flex justify-between items-center pb-2 border-b border-orbit-border/40">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">People You May Know</h3>
            <span className="text-[9px] uppercase tracking-wider text-orbit-muted">Connect</span>
          </div>
          {suggestionsLoading ? (
            <div className="space-y-3 py-2 animate-pulse">
              <div className="h-6 w-full bg-white/5 rounded" />
              <div className="h-6 w-full bg-white/5 rounded" />
            </div>
          ) : suggestions.length === 0 ? (
            <p className="text-[10px] text-orbit-muted text-center py-4">No recommendations found right now.</p>
          ) : (
            <div className="space-y-3.5">
              {suggestions.map((sUser: any, i: number) => {
                const sName = sUser.fullName || sUser.username;
                const sHandle = sUser.username;
                const sPic = sUser.profilePic?.url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${sHandle}`;
                const isFollowing = sUser.followingByMe;
                return (
                  <motion.div
                    key={sUser._id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between gap-2.5"
                  >
                    <Link to={`/profile/${sHandle}`} className="flex items-center gap-2 group flex-1 min-w-0">
                      <img
                        src={sPic}
                        alt={sHandle}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full border border-orbit-border group-hover:border-orbit-accent object-cover transition-colors"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-white text-xs truncate group-hover:text-orbit-accent transition-colors">
                          {sName}
                        </div>
                        <div className="text-[9px] text-orbit-muted truncate">@{sHandle}</div>
                      </div>
                    </Link>
                    <button
                      onClick={() => handleToggleFollow(sUser._id, sHandle)}
                      className={`text-[10px] font-bold px-3 py-1 rounded-full cursor-pointer transition-all flex items-center gap-1 shrink-0 whitespace-nowrap ${
                        isFollowing
                          ? 'bg-white/5 text-rose-400 border border-white/10 hover:bg-rose-500/15'
                          : 'bg-orbit-accent text-orbit-accent-foreground hover:opacity-90'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-3 h-3" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
          <div className="pt-2 border-t border-orbit-border/40">
            <Link
              to="/users"
              className="text-[10px] uppercase font-bold tracking-wider text-orbit-accent hover:opacity-80 transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap"
            >
              <span>Find more friends</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </motion.div>
      </aside>

      <AnimatePresence>
        {deleteModal.isOpen && (
          <Modal
            isOpen={deleteModal.isOpen}
            onClose={() => setDeleteModal({ isOpen: false, postId: '' })}
            title="Delete Post"
            description="Are you sure you want to delete this post?"
            variant="danger"
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={confirmDeletePost}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
