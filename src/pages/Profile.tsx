import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getUserProfileByUsername, recordProfileView, shareUserProfile } from '../api/users';
import { getPosts, deletePost, unpinPost } from '../api/posts';
import { getFollowers, getFollowing } from '../api/follows';
import { getPinnedPosts } from '../api/users';
import { useToggleFollowUser } from '../hooks/useFollows';
import { getSavedPosts } from '../api/saves';
import { getRepostedPosts } from '../api/reposts';
import { User } from '../types/api';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import PostCard from '../components/PostCard';
import Modal from '../components/Modal';
import { toast } from 'sonner';
import { SkeletonProfile } from '../components/Skeleton';
import {
  UserCheck,
  UserPlus,
  UserX,
  Share2,
  RotateCw,
  X,
  FileText,
  Bookmark,
  Repeat,
  Pin,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

// ... [FollowModal component remains the same as before - keeping it compact] ...
interface FollowModalProps {
  userId: string;
  type: 'followers' | 'following';
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | undefined;
}

const FollowModal: React.FC<FollowModalProps> = ({ userId, type, isOpen, onClose, currentUserId }) => {
  const { onUserFollow, onUserUnfollow } = useSocket();
  const toggleFollow = useToggleFollowUser();
  const [loadingMore, setLoadingMore] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [followingMap, setFollowingMap] = useState<{ [id: string]: boolean }>({});

  const loadInitialList = async () => {
    try {
      setLoading(true);
      const res = type === 'followers' ? await getFollowers(userId, 15) : await getFollowing(userId, 15);
      if (res.success) {
        const rawList = type === 'followers' ? res.followers : res.following;
        const userList = rawList?.map((item: any) => (type === 'followers' ? item.follower : item.following)) || [];
        setUsers(userList);
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
        const maps: any = {};
        userList.forEach((u: any) => {
          maps[u._id] = u.isFollowing || false;
        });
        setFollowingMap(maps);
      }
    } catch {
      toast.error('Failed to load list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      const timer = setTimeout(() => loadInitialList(), 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, userId, type]);

  useEffect(() => {
    if (!isOpen) return;
    const handleFollow = (data: any) => {
      if (data.followerId === currentUserId) {
        setFollowingMap((prev) => ({ ...prev, [data.targetUserId]: true }));
        setUsers((prev) =>
          prev.map((u) => (u._id === data.targetUserId ? { ...u, isFollowing: true, followingByMe: true } : u))
        );
      }
    };
    const handleUnfollow = (data: any) => {
      if (data.followerId === currentUserId) {
        setFollowingMap((prev) => ({ ...prev, [data.targetUserId]: false }));
        setUsers((prev) =>
          prev.map((u) => (u._id === data.targetUserId ? { ...u, isFollowing: false, followingByMe: false } : u))
        );
      }
    };
    const unsub1 = onUserFollow(handleFollow);
    const unsub2 = onUserUnfollow(handleUnfollow);
    return () => {
      unsub1();
      unsub2();
    };
  }, [isOpen, currentUserId, onUserFollow, onUserUnfollow]);

  const loadMoreUsers = async () => {
    if (!nextCursor || loading || loadingMore) return;
    try {
      setLoadingMore(true);
      const res =
        type === 'followers' ? await getFollowers(userId, 15, nextCursor) : await getFollowing(userId, 15, nextCursor);
      if (res.success) {
        const rawList = type === 'followers' ? res.followers : res.following;
        const userList = rawList?.map((item: any) => (type === 'followers' ? item.follower : item.following)) || [];
        setUsers((prev) => [...prev, ...userList]);
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
      }
    } catch {
      toast.error('Failed to load more users.');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) loadMoreUsers();
      },
      { rootMargin: '100px', threshold: 0.1 }
    );
    const sentinel = document.getElementById('follow-modal-sentinel');
    if (sentinel) observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isOpen, hasMore, loadingMore]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-orbit-card border border-orbit-border rounded-3xl w-full max-w-md p-6 space-y-4 shadow-xl relative max-h-[85vh] flex flex-col animate-scale-up text-xs">
        <div className="flex justify-between items-center border-b border-orbit-border pb-3 shrink-0">
          <h3 className="font-display font-semibold text-white uppercase tracking-wider text-sm">
            {type === 'followers' ? 'Followers' : 'Following'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-orbit-muted hover:text-white rounded-full hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-1">
          {loading && users.length === 0 ? (
            <div className="text-center py-8 text-xs text-orbit-muted animate-pulse">Loading...</div>
          ) : users.length === 0 ? (
            <p className="text-center py-8 text-[#8b949e] italic mb-0">No users found.</p>
          ) : (
            users.map((u) => {
              const uPic =
                u.profilePic?.url ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop';
              const isFollowing = followingMap[u._id];
              const isMe = currentUserId === u._id;
              return (
                <div
                  key={u._id}
                  className="flex items-center justify-between gap-3 bg-black/20 border border-orbit-border p-3 rounded-2xl hover:border-orbit-accent/35 transition-colors"
                >
                  <Link to={`/profile/${u.username}`} onClick={onClose} className="flex items-center gap-2.5 truncate">
                    <img
                      src={uPic}
                      alt={u.username}
                      className="w-8.5 h-8.5 rounded-full object-cover border border-orbit-border"
                    />
                    <div className="truncate">
                      <p className="font-semibold text-white leading-tight truncate">{u.fullName}</p>
                      <p className="text-[10px] text-orbit-muted font-mono leading-none">@{u.username}</p>
                    </div>
                  </Link>
                  {!isMe && currentUserId && (
                    <button
                      onClick={() => {
                        const previousState = followingMap[u._id];
                        setFollowingMap((prev) => ({ ...prev, [u._id]: !previousState }));
                        toggleFollow.mutate(u._id, {
                          onSuccess: (data) => {
                            setFollowingMap((prev) => ({ ...prev, [u._id]: data.following }));
                          },
                          onError: () => {
                            setFollowingMap((prev) => ({ ...prev, [u._id]: previousState }));
                          },
                        });
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
                        isFollowing
                          ? 'bg-white/5 text-rose-400 border border-white/10 hover:bg-rose-500/15'
                          : 'bg-orbit-accent text-orbit-accent-foreground'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
          {hasMore && (
            <div id="follow-modal-sentinel" className="py-4 flex items-center justify-center">
              {loadingMore && (
                <div className="flex items-center gap-2 text-xs text-orbit-muted animate-pulse">
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading more...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Profile() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const {
    onUserFollow,
    onUserUnfollow,
    onPostView,
    onPostPin,
    onPostUnpin,
    onPostLike,
    onPostUnlike,
    onPostSave,
    onPostUnsave,
    onPostRepost,
    onPostUnrepost,
    onPostDeleted,
  } = useSocket();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toggleFollow = useToggleFollowUser();

  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; postId: string }>({ isOpen: false, postId: '' });
  const [activeTab, setActiveTab] = useState<'posts' | 'pinned' | 'reposts' | 'saves'>('posts');

  const {
    data: profileData,
    isLoading: loading,
    error: profileError,
  } = useQuery({
    queryKey: ['userProfile', username],
    queryFn: async () => {
      const res = await getUserProfileByUsername(username!);
      if (res.success && res.user) await recordProfileView(res.user._id).catch(() => undefined);
      return res;
    },
    enabled: !!username,
  });

  const profileUser = profileData?.user || null;
  const isFollowing = profileUser?.followingByMe || false;
  const isMe = !!currentUser && !!profileUser && currentUser._id === profileUser._id;

  // Posts Query
  const {
    data: postsData,
    isLoading: postsLoading,
    isFetchingNextPage: loadingMorePosts,
    fetchNextPage: fetchNextPosts,
    hasNextPage: hasNextPosts,
  } = useInfiniteQuery({
    queryKey: ['userPosts', profileUser?._id],
    queryFn: async ({ pageParam }) => {
      if (!profileUser) throw new Error('No user');
      const res = await getPosts({ limit: 10, cursor: pageParam, authorId: profileUser._id });
      return res;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    enabled: !!profileUser,
  });

  // Pinned Posts Query — always enabled so data is ready on tab switch (no flash)
  const { data: pinnedData, isLoading: pinnedLoading } = useQuery({
    queryKey: ['pinnedPosts', profileUser?._id],
    queryFn: async () => {
      if (!profileUser) return { posts: [] };
      const res = await getPinnedPosts(profileUser._id);
      return res;
    },
    enabled: !!profileUser,
  });

  const pinnedPostsData = pinnedData?.posts || [];

  // Reposts Query
  const {
    data: repostsData,
    isLoading: repostsLoading,
    isFetchingNextPage: loadingMoreReposts,
    fetchNextPage: fetchNextReposts,
    hasNextPage: hasNextReposts,
  } = useInfiniteQuery({
    queryKey: ['userReposts'],
    queryFn: async ({ pageParam }) => {
      const res = await getRepostedPosts(10, pageParam);
      return res;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    enabled: isMe && activeTab === 'reposts',
  });

  // Saved Posts Query
  const {
    data: savedPostsData,
    isLoading: savedPostsLoading,
    isFetchingNextPage: loadingMoreSavedPosts,
    fetchNextPage: fetchNextSavedPosts,
    hasNextPage: hasNextSavedPosts,
  } = useInfiniteQuery({
    queryKey: ['userSavedPosts'],
    queryFn: async ({ pageParam }) => {
      const res = await getSavedPosts(10, pageParam);
      return res;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    enabled: isMe && activeTab === 'saves',
  });

  // Merge pinned posts at top of posts array
  const allPosts = postsData?.pages.flatMap((page) => page.posts || page.items || []) || [];
  const pinnedPosts = allPosts.filter((p: any) => p.pinnedByMe);
  const regularPosts = allPosts.filter((p: any) => !p.pinnedByMe);
  const posts = [...pinnedPosts, ...regularPosts];

  const reposts = repostsData?.pages.flatMap((page) => page.posts || []) || [];
  const savedPosts = savedPostsData?.pages.flatMap((page) => page.posts || []) || [];

  useInfiniteScroll({
    hasMore: hasNextPosts,
    isLoading: loadingMorePosts,
    loadMore: fetchNextPosts,
  });
  useInfiniteScroll({
    hasMore: hasNextReposts,
    isLoading: loadingMoreReposts,
    loadMore: fetchNextReposts,
  });
  useInfiniteScroll({
    hasMore: hasNextSavedPosts,
    isLoading: loadingMoreSavedPosts,
    loadMore: fetchNextSavedPosts,
  });

  useEffect(() => {
    if (profileError) {
      toast.error('Failed to load profile.');
      navigate('/');
    }
  }, [profileError, navigate]);

  useEffect(() => {
    if (!profileUser) return;
    const handleFollow = (data: any) => {
      queryClient.setQueriesData({ queryKey: ['userProfile', username] }, (oldData: any) => {
        if (!oldData || !oldData.user) return oldData;
        let updatedUser = { ...oldData.user };

        if (data.targetUserId === profileUser._id) {
          updatedUser.followersCount = data.followersCount;
          if (String(data.followerId) === String(currentUser?._id)) {
            updatedUser.followingByMe = true;
          }
        }

        if (data.followerId === profileUser._id) {
          updatedUser.followingCount = (updatedUser.followingCount || 0) + 1;
        }

        return { ...oldData, user: updatedUser };
      });
    };
    const handleUnfollow = (data: any) => {
      queryClient.setQueriesData({ queryKey: ['userProfile', username] }, (oldData: any) => {
        if (!oldData || !oldData.user) return oldData;
        let updatedUser = { ...oldData.user };

        if (data.targetUserId === profileUser._id) {
          updatedUser.followersCount = data.followersCount;
          if (String(data.followerId) === String(currentUser?._id)) {
            updatedUser.followingByMe = false;
          }
        }

        if (data.followerId === profileUser._id) {
          updatedUser.followingCount = Math.max(0, (updatedUser.followingCount || 0) - 1);
        }

        return { ...oldData, user: updatedUser };
      });
    };
    const handleView = (data: any) => {
      // Update post viewsCount in all caches when a view event comes in
      queryClient.setQueriesData({ queryKey: ['posts'] }, (oldData: any) => {
        if (!oldData) return oldData;
        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              posts: page.posts?.map((p: any) => (p._id === data.postId ? { ...p, viewsCount: data.viewsCount } : p)),
              items: page.items?.map((p: any) => (p._id === data.postId ? { ...p, viewsCount: data.viewsCount } : p)),
            })),
          };
        }
        return oldData;
      });
      queryClient.setQueriesData({ queryKey: ['userPosts', profileUser._id] }, (oldData: any) => {
        if (!oldData) return oldData;
        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              posts: page.posts?.map((p: any) => (p._id === data.postId ? { ...p, viewsCount: data.viewsCount } : p)),
            })),
          };
        }
        return oldData;
      });
      queryClient.setQueryData(['post', data.postId], (oldData: any) => {
        if (!oldData) return oldData;
        if (oldData.post) {
          return { ...oldData, post: { ...oldData.post, viewsCount: data.viewsCount } };
        }
        if (oldData._id === data.postId) {
          return { ...oldData, viewsCount: data.viewsCount };
        }
        return oldData;
      });
    };
    const unsub1 = onUserFollow(handleFollow);
    const unsub2 = onUserUnfollow(handleUnfollow);
    const unsub3 = onPostView(handleView);
    const unsub4 = onPostPin((data: any) => {
      if (data.userId === profileUser._id) {
        queryClient.invalidateQueries({ queryKey: ['pinnedPosts', profileUser._id] });
        queryClient.invalidateQueries({ queryKey: ['userPosts', profileUser._id] });
      }
    });
    const unsub5 = onPostUnpin((data: any) => {
      if (data.userId === profileUser._id) {
        queryClient.invalidateQueries({ queryKey: ['pinnedPosts', profileUser._id] });
        queryClient.invalidateQueries({ queryKey: ['userPosts', profileUser._id] });
      }
    });

    // Post like/unlike/save/unsave/repost/unrepost handlers
    const handlePostLike = (data: any) => {
      queryClient.setQueriesData({ queryKey: ['userPosts', profileUser._id] }, (oldData: any) => {
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
      queryClient.setQueryData(['post', data.postId], (oldData: any) => {
        if (!oldData) return oldData;
        if (oldData.post)
          return { ...oldData, post: { ...oldData.post, likesCount: data.likesCount, likedByMe: true } };
        if (oldData._id === data.postId) return { ...oldData, likesCount: data.likesCount, likedByMe: true };
        return oldData;
      });
    };

    const handlePostUnlike = (data: any) => {
      queryClient.setQueriesData({ queryKey: ['userPosts', profileUser._id] }, (oldData: any) => {
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
      queryClient.setQueryData(['post', data.postId], (oldData: any) => {
        if (!oldData) return oldData;
        if (oldData.post)
          return { ...oldData, post: { ...oldData.post, likesCount: data.likesCount, likedByMe: false } };
        if (oldData._id === data.postId) return { ...oldData, likesCount: data.likesCount, likedByMe: false };
        return oldData;
      });
    };

    const handlePostSave = (data: any) => {
      queryClient.setQueriesData({ queryKey: ['userPosts', profileUser._id] }, (oldData: any) => {
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
      queryClient.setQueryData(['post', data.postId], (oldData: any) => {
        if (!oldData) return oldData;
        if (oldData.post)
          return { ...oldData, post: { ...oldData.post, savesCount: data.savesCount, savedByMe: true } };
        if (oldData._id === data.postId) return { ...oldData, savesCount: data.savesCount, savedByMe: true };
        return oldData;
      });
    };

    const handlePostUnsave = (data: any) => {
      queryClient.setQueriesData({ queryKey: ['userPosts', profileUser._id] }, (oldData: any) => {
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
      queryClient.setQueryData(['post', data.postId], (oldData: any) => {
        if (!oldData) return oldData;
        if (oldData.post)
          return { ...oldData, post: { ...oldData.post, savesCount: data.savesCount, savedByMe: false } };
        if (oldData._id === data.postId) return { ...oldData, savesCount: data.savesCount, savedByMe: false };
        return oldData;
      });
    };

    const handlePostRepost = (data: any) => {
      queryClient.setQueriesData({ queryKey: ['userPosts', profileUser._id] }, (oldData: any) => {
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
      queryClient.setQueryData(['post', data.postId], (oldData: any) => {
        if (!oldData) return oldData;
        if (oldData.post)
          return { ...oldData, post: { ...oldData.post, repostsCount: data.repostsCount, repostedByMe: true } };
        if (oldData._id === data.postId) return { ...oldData, repostsCount: data.repostsCount, repostedByMe: true };
        return oldData;
      });
    };

    const handlePostUnrepost = (data: any) => {
      queryClient.setQueriesData({ queryKey: ['userPosts', profileUser._id] }, (oldData: any) => {
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
      queryClient.setQueryData(['post', data.postId], (oldData: any) => {
        if (!oldData) return oldData;
        if (oldData.post)
          return { ...oldData, post: { ...oldData.post, repostsCount: data.repostsCount, repostedByMe: false } };
        if (oldData._id === data.postId) return { ...oldData, repostsCount: data.repostsCount, repostedByMe: false };
        return oldData;
      });
    };

    const handlePostDeleted = (data: any) => {
      queryClient.setQueriesData({ queryKey: ['userPosts', profileUser._id] }, (oldData: any) => {
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

    const unsubLike = onPostLike(handlePostLike);
    const unsubUnlike = onPostUnlike(handlePostUnlike);
    const unsubSave = onPostSave(handlePostSave);
    const unsubUnsave = onPostUnsave(handlePostUnsave);
    const unsubRepost = onPostRepost(handlePostRepost);
    const unsubUnrepost = onPostUnrepost(handlePostUnrepost);
    const unsubDeleted = onPostDeleted(handlePostDeleted);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsubLike();
      unsubUnlike();
      unsubSave();
      unsubUnsave();
      unsubRepost();
      unsubUnrepost();
      unsubDeleted();
    };
  }, [
    profileUser,
    username,
    queryClient,
    onUserFollow,
    onUserUnfollow,
    onPostView,
    onPostPin,
    onPostUnpin,
    onPostLike,
    onPostUnlike,
    onPostSave,
    onPostUnsave,
    onPostRepost,
    onPostUnrepost,
    onPostDeleted,
    isMe,
  ]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      toast.error('Please sign in to follow.');
      return;
    }
    if (!profileUser || toggleFollow.isPending) return;
    toggleFollow.mutate(profileUser._id, { onError: () => toast.error('Failed to follow user.') });
  };

  const handleShareProfile = async () => {
    if (!profileUser) return;
    try {
      const res = await shareUserProfile(profileUser._id);
      const shareUrl = res?.shareUrl || `${window.location.origin}/profile/${profileUser.username}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    } catch {
      await navigator.clipboard.writeText(`${window.location.origin}/profile/${profileUser.username}`);
      toast.success('Link copied to clipboard!');
    }
  };

  const handlePostDelete = (postId: string) => setDeleteModal({ isOpen: true, postId });

  const confirmDeletePost = async () => {
    try {
      const res = await deletePost(deleteModal.postId);
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['userPosts', profileUser?._id] });
        queryClient.invalidateQueries({ queryKey: ['posts'] });
        toast.success('Post deleted successfully.');
      }
    } catch {
      toast.error('Failed to delete post.');
    } finally {
      setDeleteModal({ isOpen: false, postId: '' });
    }
  };

  const openFollowModal = (type: 'followers' | 'following') => {
    setFollowModalType(type);
    setIsFollowModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <RotateCw className="w-8 h-8 animate-spin text-orbit-accent" />
        <span className="text-xs text-orbit-muted mt-3 animate-pulse font-semibold">Loading profile...</span>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
        <h2 className="font-display font-semibold text-lg text-white">Profile Not Found</h2>
        <p className="text-sm text-orbit-muted">Selected user does not exist or has been removed.</p>
        <Link
          to="/"
          className="inline-block bg-orbit-accent text-orbit-accent-foreground px-5 py-2.5 rounded-full font-semibold text-xs cursor-pointer"
        >
          Return to Feed
        </Link>
      </div>
    );
  }

  const avatarPic =
    profileUser.profilePic?.url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop';
  const bannerBg =
    profileUser.bannerImage?.url ||
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=300&fit=crop';



  const getActivePosts = () => {
    switch (activeTab) {
      case 'pinned':
        return pinnedPostsData;
      case 'reposts':
        return reposts;
      case 'saves':
        return savedPosts;
      default:
        return posts;
    }
  };
  const getActiveLoading = () => {
    switch (activeTab) {
      case 'pinned':
        return pinnedLoading;
      case 'reposts':
        return repostsLoading;
      case 'saves':
        return savedPostsLoading;
      default:
        return postsLoading;
    }
  };
  const getActiveLoadingMore = () => {
    switch (activeTab) {
      case 'pinned':
        return false;
      case 'reposts':
        return loadingMoreReposts;
      case 'saves':
        return loadingMoreSavedPosts;
      default:
        return loadingMorePosts;
    }
  };
  const getActiveHasNext = () => {
    switch (activeTab) {
      case 'pinned':
        return false;
      case 'reposts':
        return hasNextReposts;
      case 'saves':
        return hasNextSavedPosts;
      default:
        return hasNextPosts;
    }
  };

  const activePosts = getActivePosts();
  const activeLoading = getActiveLoading();
  const activeLoadingMore = getActiveLoadingMore();
  const activeHasNext = getActiveHasNext();

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 md:px-6 space-y-6">
      {/* Profile Card */}
      <div className="bg-orbit-card border border-orbit-border rounded-3xl overflow-hidden relative shadow-2xl">
        <div className="h-44 relative overflow-hidden bg-zinc-950 border-b border-orbit-border">
          <img src={bannerBg} alt="canopy banner" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
        </div>
        <div className="px-6 pb-6 relative text-left">
          <div className="flex justify-between items-end -mt-11 mb-4">
            <img
              src={avatarPic}
              alt={profileUser.username}
              referrerPolicy="no-referrer"
              className="w-22 h-22 rounded-full object-cover border-4 border-orbit-card bg-orbit-card"
            />
            <div className="flex gap-2 text-xs flex-wrap justify-end">
              <button
                onClick={handleShareProfile}
                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full border border-orbit-border text-orbit-muted hover:text-white transition-all flex items-center justify-center cursor-pointer shrink-0"
                title="Copy Link"
              >
                <Share2 className="w-4 h-4" />
              </button>
              {isMe ? (
                <Link
                  to="/settings"
                  className="bg-white/5 hover:bg-orbit-accent hover:text-orbit-accent-foreground font-semibold flex items-center gap-1.5 px-4 py-2 rounded-full border border-orbit-border transition-all text-white cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <span>Edit Profile</span>
                </Link>
              ) : (
                currentUser && (
                  <button
                    onClick={handleFollowToggle}
                    className={`px-4 py-2 rounded-full font-semibold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                      isFollowing
                        ? 'bg-white/5 text-rose-400 border border-white/10 hover:bg-rose-500/15'
                        : 'bg-orbit-accent text-orbit-accent-foreground'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserX className="w-4 h-4" />
                        <span>Unfollow</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                )
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-2">
              <h1 className="font-display font-semibold text-xl text-white tracking-tight leading-none">
                {profileUser.fullName}
              </h1>
              <span className="text-[10px] text-zinc-500 font-mono font-bold">
                GENDER: {profileUser.gender?.toUpperCase()}
              </span>
            </div>
            <p className="text-xs font-mono text-orbit-muted">@{profileUser.username}</p>
            {profileUser.bio && (
              <p className="text-white/80 text-xs leading-relaxed font-sans max-w-xl whitespace-pre-wrap pt-1.5">
                {profileUser.bio}
              </p>
            )}
            <div className="flex gap-6 pt-4 text-xs font-mono text-orbit-muted select-none">
              <button
                onClick={() => openFollowModal('followers')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                <strong className="text-white text-sm">{profileUser.followersCount}</strong> followers
              </button>
              <button
                onClick={() => openFollowModal('following')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                <strong className="text-white text-sm">{profileUser.followingCount}</strong> following
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <section className="space-y-4">
        <div className="border-b border-orbit-border pb-3 flex items-center justify-start gap-4 sm:gap-6 text-xs flex-wrap">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex items-center gap-2 font-display text-sm font-medium transition-colors ${activeTab === 'posts' ? 'text-white border-b-2 border-orbit-accent pb-3' : 'text-orbit-muted hover:text-white pb-3'}`}
          >
            <FileText className="w-4.5 h-4.5" />
            <span>Posts</span>
          </button>
          <button
            onClick={() => setActiveTab('pinned')}
            className={`flex items-center gap-2 font-display text-sm font-medium transition-colors ${activeTab === 'pinned' ? 'text-white border-b-2 border-orbit-accent pb-3' : 'text-orbit-muted hover:text-white pb-3'}`}
          >
            <Pin className="w-4.5 h-4.5" />
            <span>Pinned</span>
          </button>
          {isMe && (
            <>
              <button
                onClick={() => setActiveTab('reposts')}
                className={`flex items-center gap-2 font-display text-sm font-medium transition-colors ${activeTab === 'reposts' ? 'text-white border-b-2 border-orbit-accent pb-3' : 'text-orbit-muted hover:text-white pb-3'}`}
              >
                <Repeat className="w-4.5 h-4.5" />
                <span>Reposts</span>
              </button>
              <button
                onClick={() => setActiveTab('saves')}
                className={`flex items-center gap-2 font-display text-sm font-medium transition-colors ${activeTab === 'saves' ? 'text-white border-b-2 border-orbit-accent pb-3' : 'text-orbit-muted hover:text-white pb-3'}`}
              >
                <Bookmark className="w-4.5 h-4.5" />
                <span>Saves</span>
              </button>
            </>
          )}
        </div>

        {/* Pinned posts banner */}
        {activeTab === 'posts' && pinnedPosts.length > 0 && (
          <div className="flex items-center gap-2 text-[10px] text-orbit-accent font-semibold uppercase tracking-wider border-b border-orbit-border/40 pb-2">
            <Pin className="w-3.5 h-3.5" />
            <span>
              {pinnedPosts.length} pinned post{pinnedPosts.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {activeLoading ? (
          <div role="status" aria-label="Loading profile content">
            <SkeletonProfile />
          </div>
        ) : activePosts.length === 0 ? (
          <div className="bg-orbit-card border border-orbit-border rounded-3xl p-12 text-center text-xs text-orbit-muted">
            {activeTab === 'reposts'
              ? 'No reposts yet.'
              : activeTab === 'saves'
                ? 'No saved posts yet.'
                : 'No posts shared yet.'}
          </div>
        ) : (
          <div className="space-y-5">
            {activePosts.map((post: any) => (
              <PostCard key={post._id} post={post} onDelete={handlePostDelete} />
            ))}
            {activeHasNext && (
              <div className="pt-8 flex items-center justify-center">
                {activeLoadingMore && (
                  <div className="flex items-center gap-2 text-xs text-orbit-muted animate-pulse">
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Loading more...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <FollowModal
        userId={profileUser._id}
        type={followModalType}
        isOpen={isFollowModalOpen}
        onClose={() => setIsFollowModalOpen(false)}
        currentUserId={currentUser?._id}
      />

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
