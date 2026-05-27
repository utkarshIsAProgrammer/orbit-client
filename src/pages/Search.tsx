import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { searchUsers, searchPosts } from '../api/search';
import { useToggleFollowUser } from '../hooks/useFollows';
import { User, Post } from '../types/api';
import PostCard from '../components/PostCard';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { SkeletonFeed, Skeleton } from '../components/Skeleton';
import { Search as SearchIcon, Users, FileText, Sparkles, UserCheck, UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function Search() {
  const { user: currentUser } = useAuth();
  const toggleFollow = useToggleFollowUser();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'posts'>('posts');
  const [searchTrigger, setSearchTrigger] = useState(0);

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['searchUsers', query, activeTab, searchTrigger],
    queryFn: async () => {
      if (!query.trim() || activeTab !== 'users') return { users: [] };
      const res = await searchUsers(query.trim());
      return res;
    },
    enabled: activeTab === 'users',
  });

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['searchPosts', query, activeTab, searchTrigger],
    queryFn: async () => {
      if (!query.trim() || activeTab !== 'posts') return { posts: [] };
      const res = await searchPosts(query.trim());
      return res;
    },
    enabled: activeTab === 'posts',
  });

  const userHits = usersData?.users || [];
  const postHits = postsData?.posts || [];
  const loading = usersLoading || postsLoading;

  const handleKeydown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setSearchTrigger((prev) => prev + 1);
    }
  };

  const handleFollowToggle = (userId: string) => {
    if (!currentUser) {
      toast.error('Please sign in to follow others.');
      return;
    }
    if (toggleFollow.isPending) return;

    toggleFollow.mutate(userId, {
      onSuccess: (data) => {
        toast.success(data.following ? 'Following user.' : 'Unfollowed user.');
      },
      onError: () => {
        toast.error('Failed to follow user.');
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 md:px-6 space-y-6">
      {/* Search Header */}
      <div className="space-y-1">
        <h1 className="font-display font-semibold text-2xl text-white flex items-center gap-2">
          <SearchIcon className="w-5.5 h-5.5 text-orbit-accent" />
          <span>Search</span>
        </h1>
        <p className="text-xs text-orbit-muted">Find posts, comments, or people on the platform.</p>
      </div>

      {/* Input Control bar */}
      <div className="flex gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-orbit-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeydown}
            placeholder={activeTab === 'posts' ? 'Enter keywords...' : 'Enter username or full name...'}
            className="w-full bg-orbit-card border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl pl-11 pr-4 py-3.5 text-white transition-all text-sm"
          />
        </div>
        <button
          onClick={() => setSearchTrigger((prev) => prev + 1)}
          className="bg-orbit-accent hover:opacity-95 text-orbit-accent-foreground text-xs font-semibold px-6 py-3.5 rounded-full transition-all active:scale-[0.98] cursor-pointer shrink-0 whitespace-nowrap"
        >
          Search
        </button>
      </div>

      {/* Mode selectors */}
      <div className="flex border-b border-orbit-border text-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-2 px-4 sm:px-6 py-3 border-b-2 font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'posts'
              ? 'border-orbit-accent text-orbit-accent text-white'
              : 'border-transparent text-orbit-muted hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Posts ({postHits.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 sm:px-6 py-3 border-b-2 font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-orbit-accent text-orbit-accent text-white'
              : 'border-transparent text-orbit-muted hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>People ({userHits.length})</span>
        </button>
      </div>

      {/* Display Grid results */}
      {loading ? (
        <div role="status" aria-label="Searching" className="py-6">
          {activeTab === 'posts' ? (
            <SkeletonFeed count={3} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-orbit-card border border-orbit-border rounded-3xl p-4 flex items-center gap-3"
                >
                  <Skeleton variant="circular" width={40} height={40} />
                  <div className="flex-1 space-y-2">
                    <Skeleton width="60%" />
                    <Skeleton width="40%" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'posts' ? (
        postHits.length === 0 ? (
          <div className="bg-orbit-card border border-orbit-border rounded-3xl p-16 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-zinc-500 mx-auto" />
            <h3 className="font-display font-medium text-white text-sm">No results found</h3>
            <p className="text-xs text-orbit-muted max-w-xs mx-auto">
              Try trying some different keywords or searching for people.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {postHits.map((post: Post) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
        )
      ) : userHits.length === 0 ? (
        <div className="bg-orbit-card border border-orbit-border rounded-3xl p-16 text-center space-y-2">
          <Users className="w-8 h-8 text-zinc-500 mx-auto" />
          <h3 className="font-display font-medium text-white text-sm">No results found</h3>
          <p className="text-xs text-orbit-muted max-w-xs mx-auto">
            We couldn&apos;t find any users matching your query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userHits.map((hit: User) => {
            const hitPic =
              hit.profilePic?.url ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop';
            const isSelected = hit.followingByMe;
            const isMe = currentUser && currentUser._id === hit._id;

            return (
              <div
                key={hit._id}
                className="bg-orbit-card border border-orbit-border rounded-3xl p-4 flex items-center justify-between gap-3 hover:border-orbit-accent/35 transition-all text-xs"
              >
                <Link to={`/profile/${hit.username}`} className="flex items-center gap-3 min-w-0 flex-1">
                  <img
                    src={hitPic}
                    alt={hit.username}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full border border-orbit-border object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="font-semibold text-white leading-snug hover:text-orbit-accent transition-colors truncate">
                      {hit.fullName}
                    </h4>
                    <p className="text-[10px] text-orbit-muted font-mono leading-none truncate">@{hit.username}</p>
                  </div>
                </Link>

                {!isMe && currentUser && (
                  <button
                    onClick={() => handleFollowToggle(hit._id)}
                    className={`px-3 py-1.5 rounded-full font-semibold flex items-center gap-1 transition-all cursor-pointer text-xs shrink-0 whitespace-nowrap ${
                      isSelected
                        ? 'bg-white/5 text-rose-400 border border-white/10 hover:bg-rose-500/15'
                        : 'bg-orbit-accent text-orbit-accent-foreground'
                    }`}
                  >
                    {isSelected ? (
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
          })}
        </div>
      )}
    </div>
  );
}
