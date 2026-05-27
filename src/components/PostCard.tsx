import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Post } from '../types/api';
import { useAuth } from '../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toggleLikePost } from '../api/likes';
import { toggleSavePost } from '../api/saves';
import { toggleRepostPost } from '../api/reposts';
import { sharePost, pinPost, unpinPost, recordPostView } from '../api/posts';
import { toast } from 'sonner';
import { gsap } from 'gsap';
import {
  Heart,
  MessageSquare,
  Repeat2,
  Bookmark,
  Share2,
  Trash2,
  Edit3,
  Eye,
  ChevronLeft,
  ChevronRight,
  Pin,
  PinOff,
  Maximize2,
} from 'lucide-react';
import ImageLightbox from './ImageLightbox';

interface PostCardProps {
  post: Post;
  onDelete?: (postId: string) => void;
  index?: number;
}

const PostCard: React.FC<PostCardProps> = ({ post: initialPost, onDelete, index = 0 }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [post, setPost] = useState<Post>(initialPost);
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchSwiped = useRef(false);

  const cardRef = useRef<HTMLElement>(null);
  const pendingInteraction = useRef(0); // counter prevents useEffect reset during optimistic updates
  const recordedViewIdRef = useRef<string | null>(null);

  // Get images array (support both old `image` and new `images`)
  // Filter out entries with empty URLs to avoid blank src warnings
  const rawImages = post.images || (post.image ? [post.image] : []);
  const images = rawImages.filter((img) => img && img.url);
  const hasMultipleImages = images.length > 1;

  useEffect(() => {
    if (pendingInteraction.current > 0) return;
    setPost(initialPost);
  }, [initialPost]);

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 50, scale: 0.9 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: 'back.out(1.4)',
          delay: index * 0.1,
        }
      );
    }
  }, [index]);

  const author =
    typeof post.author === 'object' && post.author !== null
      ? post.author
      : { _id: post.author || 'unknown', username: 'unknown', fullName: 'User', profilePic: { url: '' } };
  const authorName = author.fullName || 'User';
  const authorHandle = author.username || 'user';
  const authorPic = author.profilePic?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authorHandle}`;

  const isOwner = user && user._id === author._id; // Helper to invalidate savedPosts queries so saved/unsaved changes appear in real-time
  const invalidateSavedPosts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['savedPosts'] });
  }, [queryClient]);

  // Auto-record view when the post card scrolls into the viewport
  useEffect(() => {
    if (!user || isOwner || !post._id) return;
    if (recordedViewIdRef.current === post._id) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          recordedViewIdRef.current = post._id;
          recordPostView(post._id).catch(() => {
            // Silently ignore — view recording is non-critical
          });
          observer.disconnect();
        }
      },
      { threshold: 0.3, rootMargin: '100px' }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [user, post._id, isOwner]);

  const updatePostInAllQueries = useCallback(
    (postId: string, updateFn: (post: Post | undefined) => Post | undefined) => {
      queryClient.setQueriesData({ queryKey: ['posts'] }, (oldData: any) => {
        if (!oldData) return oldData;
        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              posts: page.posts?.map(updateFn),
              items: page.items?.map(updateFn),
            })),
          };
        }
        if (Array.isArray(oldData)) return oldData.map(updateFn);
        return oldData;
      });

      queryClient.setQueriesData({ queryKey: ['userPosts'] }, (oldData: any) => {
        if (!oldData) return oldData;
        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              posts: page.posts?.map(updateFn),
              items: page.items?.map(updateFn),
            })),
          };
        }
        return oldData;
      });

      queryClient.setQueriesData({ queryKey: ['savedPosts'] }, (oldData: any) => {
        if (!oldData) return oldData;
        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              posts: page.posts?.map(updateFn),
            })),
          };
        }
        return oldData;
      });

      queryClient.setQueriesData({ queryKey: ['userSavedPosts'] }, (oldData: any) => {
        if (!oldData) return oldData;
        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              posts: page.posts?.map(updateFn),
            })),
          };
        }
        return oldData;
      });

      queryClient.setQueriesData({ queryKey: ['userReposts'] }, (oldData: any) => {
        if (!oldData) return oldData;
        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              posts: page.posts?.map(updateFn),
            })),
          };
        }
        return oldData;
      });

      queryClient.setQueriesData({ queryKey: ['searchPosts'] }, (oldData: any) => {
        if (!oldData) return oldData;
        if (Array.isArray(oldData)) return oldData.map(updateFn);
        return oldData;
      });

      queryClient.setQueryData(['post', postId], (oldData: any) => {
        if (!oldData) return oldData;
        if (oldData.post) return { ...oldData, post: updateFn(oldData.post) };
        if (oldData._id === postId) return updateFn(oldData);
        return oldData;
      });
    },
    [queryClient]
  );

  const removePostFromSavedQueries = useCallback(
    (postId: string) => {
      const removeFromPages = (oldData: any) => {
        if (!oldData) return oldData;
        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              posts: page.posts?.filter((p: Post) => p._id !== postId),
            })),
          };
        }
        return oldData;
      };

      queryClient.setQueriesData({ queryKey: ['savedPosts'] }, removeFromPages);
      queryClient.setQueriesData({ queryKey: ['userSavedPosts'] }, removeFromPages);
    },
    [queryClient]
  );

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('Please login to react to posts.');
      return;
    }
    if (isLiking) return;

    const previousState = { ...post };
    const nextLiked = !post.likedByMe;
    const nextCount = post.likesCount + (nextLiked ? 1 : -1);
    const optimisticPost = { ...post, likedByMe: nextLiked, likesCount: Math.max(0, nextCount) };
    setPost(optimisticPost);
    pendingInteraction.current += 1;
    updatePostInAllQueries(post._id, (p) => (p && p._id === post._id ? optimisticPost : p));

    try {
      setIsLiking(true);
      const res = await toggleLikePost(post._id);
      if (res.success) {
        const finalPost = {
          ...post,
          likedByMe: res.liked,
          likesCount: res.likesCount ?? (res.liked ? post.likesCount + 1 : Math.max(0, post.likesCount - 1)),
        };
        setPost(finalPost);
        updatePostInAllQueries(post._id, (p) => (p && p._id === post._id ? finalPost : p));
      }
    } catch (err: any) {
      setPost(previousState);
      updatePostInAllQueries(post._id, (p) => (p && p._id === post._id ? previousState : p));
      toast.error(err.response?.data?.message || 'Failed to update like status.');
    } finally {
      setIsLiking(false);
      pendingInteraction.current -= 1;
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('Please login to save posts.');
      return;
    }
    if (isSaving) return;

    const previousState = { ...post };
    const nextSaved = !post.savedByMe;
    const nextCount = post.savesCount + (nextSaved ? 1 : -1);
    const optimisticPost = { ...post, savedByMe: nextSaved, savesCount: Math.max(0, nextCount) };
    setPost(optimisticPost);
    pendingInteraction.current += 1;
    updatePostInAllQueries(post._id, (p) => (p && p._id === post._id ? optimisticPost : p));

    try {
      setIsSaving(true);
      const res = await toggleSavePost(post._id);
      if (res.success) {
        const finalPost = {
          ...post,
          savedByMe: res.saved,
          savesCount: res.savesCount ?? (res.saved ? post.savesCount + 1 : Math.max(0, post.savesCount - 1)),
        };
        setPost(finalPost);
        updatePostInAllQueries(post._id, (p) => (p && p._id === post._id ? finalPost : p));
        if (res.saved) {
          invalidateSavedPosts();
        } else {
          removePostFromSavedQueries(post._id);
        }
        toast.success(res.saved ? 'Added to your saved visual logs.' : 'Removed from saves.');
      }
    } catch (err: any) {
      setPost(previousState);
      updatePostInAllQueries(post._id, (p) => (p && p._id === post._id ? previousState : p));
      toast.error(err.response?.data?.message || 'Failed to update bookmark.');
    } finally {
      setIsSaving(false);
      pendingInteraction.current -= 1;
    }
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('Please login to repost.');
      return;
    }
    if (author._id === user._id) {
      toast.error('You cannot repost your own post!');
      return;
    }
    if (isReposting) return;

    const previousState = { ...post };
    const nextReposted = !post.repostedByMe;
    const nextCount = post.repostsCount + (nextReposted ? 1 : -1);
    const optimisticPost = { ...post, repostedByMe: nextReposted, repostsCount: Math.max(0, nextCount) };
    setPost(optimisticPost);
    pendingInteraction.current += 1;
    updatePostInAllQueries(post._id, (p) => (p && p._id === post._id ? optimisticPost : p));

    try {
      setIsReposting(true);
      const res = await toggleRepostPost(post._id);
      if (res.success) {
        const finalPost = {
          ...post,
          repostedByMe: res.reposted,
          repostsCount: res.repostsCount ?? (res.reposted ? post.repostsCount + 1 : Math.max(0, post.repostsCount - 1)),
        };
        setPost(finalPost);
        updatePostInAllQueries(post._id, (p) => (p && p._id === post._id ? finalPost : p));
        toast.success(res.reposted ? 'Reposted to your profile feed!' : 'Repost undone.');
      }
    } catch (err: any) {
      setPost(previousState);
      updatePostInAllQueries(post._id, (p) => (p && p._id === post._id ? previousState : p));
      toast.error(err.response?.data?.message || 'Failed to repost interaction.');
    } finally {
      setIsReposting(false);
      pendingInteraction.current -= 1;
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await sharePost(post._id);
      if (res?.shareUrl || res?.success) {
        const shareLink = res.shareUrl || `${window.location.origin}/post/${post._id}`;
        await navigator.clipboard.writeText(shareLink);
        toast.success('Orbit share link copied to clipboard!');
        const finalPost = { ...post, sharesCount: (post.sharesCount || 0) + 1 };
        setPost(finalPost);
        updatePostInAllQueries(post._id, (p) => (p && p._id === post._id ? finalPost : p));
      }
    } catch (err) {
      const fallLink = `${window.location.origin}/post/${post._id}`;
      await navigator.clipboard.writeText(fallLink);
      toast.success('Post link copied to clipboard!');
    }
  };

  const handlePinToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !isOwner) return;

    const previousState = { ...post };
    const nextPinned = !post.pinnedByMe;
    setPost((prev) => ({ ...prev, pinnedByMe: nextPinned }));

    try {
      if (nextPinned) {
        const res = await pinPost(post._id);
        if (res.success) {
          toast.success('Post pinned to profile!');
          queryClient.invalidateQueries({ queryKey: ['userPosts'] });
          queryClient.invalidateQueries({ queryKey: ['pinnedPosts'] });
        } else {
          setPost(previousState);
        }
      } else {
        const res = await unpinPost(post._id);
        if (res.success) {
          toast.success('Post unpinned.');
          queryClient.invalidateQueries({ queryKey: ['userPosts'] });
          queryClient.invalidateQueries({ queryKey: ['pinnedPosts'] });
        } else {
          setPost(previousState);
        }
      }
    } catch (err: any) {
      setPost(previousState);
      toast.error(err.response?.data?.message || 'Failed to toggle pin.');
    }
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchSwiped.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.touches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 30) {
      touchSwiped.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || !hasMultipleImages) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      e.preventDefault();
      if (delta > 0) {
        setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      } else {
        setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      }
    }
    touchStartX.current = null;
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (touchSwiped.current) return;
    e.preventDefault();
    e.stopPropagation();
    setLightboxOpen(true);
  };

  return (
    <article
      ref={cardRef}
      aria-label={`Post by ${authorHandle}: ${post.title}`}
      className="bg-orbit-card border border-orbit-border rounded-2xl md:rounded-3xl overflow-hidden hover:border-orbit-accent/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-300"
    >
      {/* Post Header */}
      <div className="p-3 md:p-5 lg:p-6 flex items-start gap-3 justify-between">
        <Link
          to={`/profile/${authorHandle}`}
          className="flex gap-2.5 md:gap-3.5 items-center group"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-9 h-9 md:w-11 md:h-11 rounded-full border border-orbit-border p-0.5 group-hover:border-orbit-accent transition-colors shrink-0">
            <img
              src={authorPic}
              alt={authorHandle}
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-white group-hover:text-orbit-accent transition-colors text-xs md:text-sm">
                {authorName}
              </span>
              <span className="text-[9px] md:text-[10px] text-orbit-muted/80 font-mono leading-none bg-orbit-bg border border-orbit-border px-1.5 md:px-2 py-0.5 rounded-full">
                @{authorHandle}
              </span>
            </div>
            <div className="text-[9px] md:text-[10px] text-orbit-muted/60 mt-0.5">Shared {post.createdAt}</div>
          </div>
        </Link>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {/* Pin/Unpin */}
          {isOwner && (
            <button
              onClick={handlePinToggle}
              className={`p-1.5 md:p-2 rounded-full transition-all cursor-pointer ${
                post.pinnedByMe
                  ? 'text-orbit-accent bg-orbit-accent/10'
                  : 'text-orbit-muted hover:text-white hover:bg-white/5'
              }`}
              title={post.pinnedByMe ? 'Unpin from profile' : 'Pin to profile'}
            >
              {post.pinnedByMe ? (
                <PinOff className="w-3.5 h-3.5 md:w-4 md:h-4" />
              ) : (
                <Pin className="w-3.5 h-3.5 md:w-4 md:h-4" />
              )}
            </button>
          )}
          {isOwner && (
            <Link
              to={`/post/${post._id}/edit`}
              className="p-1.5 md:p-2 text-orbit-muted hover:text-white hover:bg-white/5 rounded-full transition-all"
              title="Edit Post"
            >
              <Edit3 className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </Link>
          )}
          {isOwner && onDelete && (
            <button
              onClick={() => onDelete(post._id)}
              className="p-1.5 md:p-2 text-orbit-muted hover:text-red-400 hover:bg-white/5 rounded-full transition-all cursor-pointer"
              title="Delete Post"
            >
              <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Post Body */}
      <Link to={`/post/${post._id}`} className="block px-3 md:px-5 lg:px-6 pb-3 md:pb-5">
        <h2 className="font-display font-medium text-base md:text-lg text-white mb-1.5 md:mb-2 tracking-tight line-clamp-1 hover:text-orbit-accent transition-colors">
          {post.title}
        </h2>
        <p className="text-white/80 text-xs md:text-sm leading-relaxed whitespace-pre-wrap line-clamp-3">
          {post.content}
        </p>

        {/* Images Gallery */}
        {images.length > 0 && (
          <div
            className="mt-3 md:mt-4 rounded-xl md:rounded-2xl overflow-hidden border border-orbit-border relative group/image cursor-pointer"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleImageClick}
          >
            <img
              src={images[currentImageIndex].url}
              alt={`${post.title} - image ${currentImageIndex + 1}`}
              referrerPolicy="no-referrer"
              className="w-full object-cover max-h-72 md:max-h-96 hover:scale-[1.01] transition-transform duration-300"
              draggable={false}
            />
            {/* Expand to lightbox button */}
            <div className="absolute top-2 right-2 opacity-0 group-hover/image:opacity-100 transition-opacity">
              <span className="p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white flex items-center justify-center cursor-pointer">
                <Maximize2 className="w-3.5 h-3.5" />
              </span>
            </div>
            {hasMultipleImages && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white opacity-0 group-hover/image:opacity-100 transition-opacity cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white opacity-0 group-hover/image:opacity-100 transition-opacity cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                        i === currentImageIndex ? 'bg-white w-3' : 'bg-white/50'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCurrentImageIndex(i);
                      }}
                    />
                  ))}
                </div>
              </>
            )}
            {/* Pinned badge */}
            {post.pinnedByMe && (
              <div className="absolute top-2 left-2 bg-orbit-accent/90 text-orbit-accent-foreground text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Pin className="w-3 h-3" />
                <span>Pinned</span>
              </div>
            )}
          </div>
        )}
      </Link>

      {/* Post Stats & Actions Footer */}
      <div className="border-t border-orbit-border bg-black/30 px-3 md:px-5 lg:px-6 py-2.5 md:py-3.5 flex items-center justify-between text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-orbit-muted/80 select-none gap-1 sm:gap-2">
        <div className="flex items-center flex-wrap gap-x-1.5 sm:gap-x-2 md:gap-x-3 lg:gap-x-4">
          <button
            onClick={handleLike}
            aria-label={post.likedByMe ? 'Unlike this post' : 'Like this post'}
            className={`flex items-center gap-0.5 md:gap-1 hover:text-rose-500 transition-colors cursor-pointer shrink-0 ${post.likedByMe ? 'text-rose-500 font-black' : ''}`}
          >
            <Heart
              className={`w-3 h-3 md:w-3.5 md:h-3.5 ${post.likedByMe ? 'fill-current text-rose-500' : 'text-orbit-muted'}`}
            />
            <span className="font-mono">{post.likesCount}</span>
          </button>

          <Link
            to={`/post/${post._id}`}
            className="flex items-center gap-0.5 md:gap-1 hover:text-white transition-colors shrink-0"
          >
            <MessageSquare className="w-3 h-3 md:w-3.5 md:h-3.5 text-orbit-muted hover:text-white transition-colors" />
            <span className="font-mono">{post.commentsCount}</span>
          </Link>

          <button
            onClick={handleRepost}
            aria-label={post.repostedByMe ? 'Undo repost' : 'Repost this post'}
            className={`flex items-center gap-0.5 md:gap-1 hover:text-white transition-colors cursor-pointer shrink-0 ${post.repostedByMe ? 'text-orbit-accent font-black' : ''}`}
          >
            <Repeat2
              className={`w-3 h-3 md:w-3.5 md:h-3.5 ${post.repostedByMe ? 'text-orbit-accent' : 'text-orbit-muted'}`}
            />
            <span className="font-mono">{post.repostsCount}</span>
          </button>

          <button
            onClick={handleSave}
            aria-label={post.savedByMe ? 'Remove from saved' : 'Save this post'}
            className={`flex items-center gap-0.5 md:gap-1 hover:text-amber-500 transition-colors cursor-pointer shrink-0 ${post.savedByMe ? 'text-amber-500 font-black' : ''}`}
          >
            <Bookmark
              className={`w-3 h-3 md:w-3.5 md:h-3.5 ${post.savedByMe ? 'fill-current text-amber-500' : 'text-orbit-muted'}`}
            />
            <span className="font-mono">{post.savesCount}</span>
          </button>
        </div>

        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <div className="flex items-center gap-0.5 text-orbit-muted/50" title={`${post.viewsCount || 0} views`}>
            <Eye className="w-3 h-3 md:w-3.5 md:h-3.5" />
            <span className="font-mono text-[9px] md:text-[10px]">{post.viewsCount || 0}</span>
          </div>
          <button
            onClick={handleShare}
            className="p-1 text-orbit-muted hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
            title="Copy share link"
          >
            <Share2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
          </button>
        </div>
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        images={images}
        currentIndex={currentImageIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(i) => setCurrentImageIndex(i)}
        title={post.title}
      />
    </article>
  );
};

export default PostCard;
