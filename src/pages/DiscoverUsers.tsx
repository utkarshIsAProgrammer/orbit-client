import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllUsers } from '../api/users';
import { useToggleFollowUser } from '../hooks/useFollows';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { toast } from 'sonner';
import { Skeleton } from '../components/Skeleton';
import { Users, RotateCw, Compass, UserCheck, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { useInfiniteQuery } from '@tanstack/react-query';

export default function DiscoverUsers() {
  const { user: currentUser } = useAuth();
  const toggleFollow = useToggleFollowUser();

  const {
    data: usersData,
    isLoading: loading,
    isFetchingNextPage: loadingMore,
    fetchNextPage,
    hasNextPage: hasMore,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['users'],
    queryFn: async ({ pageParam }) => {
      const res = await getAllUsers(12, pageParam);
      return res;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
  });

  const usersList = usersData?.pages.flatMap((page) => page.users || []) || [];

  const { elementRef } = useInfiniteScroll({
    hasMore,
    isLoading: loadingMore,
    loadMore: fetchNextPage,
  });

  const handleFollowToggle = (targetId: string) => {
    if (!currentUser) {
      toast.error('Please sign in to follow others.');
      return;
    }
    if (toggleFollow.isPending) return;

    toggleFollow.mutate(targetId, {
      onSuccess: (data) => {
        toast.success(data.following ? 'Following user.' : 'Unfollowed user.');
      },
      onError: () => {
        toast.error('Failed to follow user.');
      },
    });
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 md:px-6 space-y-6 text-xs text-left">
      {/* Header indexes */}
      <div className="border-b border-orbit-border pb-4 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="font-display font-semibold text-2xl text-white flex items-center gap-2">
            <Users className="w-5.5 h-5.5 text-orbit-accent" />
            <span>Find People</span>
          </h1>
          <p className="text-xs text-orbit-muted">Discover new friends, professionals, and interesting people.</p>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-all cursor-pointer shrink-0"
          title="Refresh recommendation list"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div role="status" aria-label="Loading users" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-orbit-card border border-orbit-border rounded-3xl overflow-hidden">
              <div className="h-16 bg-white/5" />
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between -mt-10">
                  <Skeleton variant="circular" width={52} height={52} />
                  <Skeleton width={60} height={24} variant="rectangular" className="rounded-full" />
                </div>
                <Skeleton width="60%" />
                <Skeleton width="40%" />
                <Skeleton count={2} />
              </div>
            </div>
          ))}
        </div>
      ) : usersList.length === 0 ? (
        <div className="bg-orbit-card border border-orbit-border rounded-3xl p-16 text-center space-y-3">
          <Compass className="w-12 h-12 text-zinc-500 mx-auto" />
          <h3 className="font-display font-medium text-white text-sm">No users found</h3>
          <p className="text-xs text-orbit-muted">Check back later for new recommendations!</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {usersList.map((userNode, index) => {
              const userPic =
                userNode.profilePic?.url ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop';
              const userBanner =
                userNode.bannerImage?.url ||
                'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=100&fit=crop';
              const isMe = currentUser && currentUser._id === userNode._id;
              const isFollowing = userNode.followingByMe;

              return (
                <motion.div
                  key={userNode._id}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.08 }}
                  className="bg-orbit-card border border-orbit-border rounded-3xl overflow-hidden shadow-xl hover:border-orbit-accent/35 transition-all flex flex-col justify-between group"
                >
                  {/* Banner canopy backdrop */}
                  <div className="h-16 relative overflow-hidden bg-zinc-950 border-b border-orbit-border">
                    <img
                      src={userBanner}
                      alt="banner background"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* Profile contents */}
                  <div className="p-4 flex-1 flex flex-col text-left space-y-3 relative">
                    {/* Avatar offsetting */}
                    <div className="flex justify-between items-start -mt-10 mb-1 z-10">
                      <img
                        src={userPic}
                        alt={userNode.username}
                        referrerPolicy="no-referrer"
                        className="w-13 h-13 rounded-full object-cover bg-orbit-card border-2 border-orbit-card"
                      />

                      {!isMe && currentUser && (
                        <button
                          onClick={() => handleFollowToggle(userNode._id)}
                          className={`px-3 py-1.5 rounded-full font-semibold flex items-center gap-1 transition-all cursor-pointer text-xs shrink-0 whitespace-nowrap ${
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

                    <div className="space-y-1 flex-1">
                      <Link
                        to={`/profile/${userNode.username}`}
                        className="font-display font-semibold text-sm text-white hover:text-orbit-accent transition-colors block leading-tight"
                      >
                        {userNode.fullName}
                      </Link>
                      <p className="text-[10px] text-orbit-muted font-mono leading-none">@{userNode.username}</p>

                      {userNode.bio && (
                        <p className="text-white/60 text-[11px] font-sans line-clamp-2 leading-relaxed pt-1 flex-1 text-left">
                          {userNode.bio}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="border-t border-orbit-border pt-2.5 flex justify-between font-mono text-[10px] text-zinc-500">
                      <span>{userNode.followersCount} followers</span>
                      <span>{userNode.followingCount} following</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

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
