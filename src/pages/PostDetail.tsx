import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getPostDetail, deletePost, sharePost, recordPostView } from '../api/posts';
import { getPostComments, getCommentReplies, deleteComment } from '../api/comments';
import { toggleLikePost, toggleLikeComment } from '../api/likes';
import { toggleSavePost } from '../api/saves';
import { toggleRepostPost } from '../api/reposts';
import { Post, Comment } from '../types/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAddComment } from '../hooks/useComments';
import Modal from '../components/Modal';
import ImageLightbox from '../components/ImageLightbox';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import { Skeleton } from '../components/Skeleton';
import {
  Heart,
  MessageSquare,
  Repeat2,
  Bookmark,
  Share2,
  Trash2,
  Edit3,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Compass,
  Send,
  Eye,
  MessageCircle,
  ShieldAlert,
  Maximize2,
} from 'lucide-react';

// Recursive Reddit-style Comment Node representing infinite nested threads
interface CommentNodeProps {
  comment: Comment;
  depth: number;
  user: any;
  commentReplies: { [id: string]: Comment[] };
  expandedComments: { [id: string]: boolean };
  loadingReplies: { [id: string]: boolean };
  onToggleExpand: (commentId: string) => void;
  onSetReplyTarget: (comment: Comment) => void;
  onToggleLike: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
}

const CommentNode: React.FC<CommentNodeProps> = ({
  comment,
  depth,
  user,
  commentReplies,
  expandedComments,
  loadingReplies,
  onToggleExpand,
  onSetReplyTarget,
  onToggleLike,
  onDeleteComment,
}) => {
  const commAuthor = comment.author || { _id: '', username: 'unknown', fullName: 'User', profilePic: { url: '' } };
  const commPic =
    commAuthor.profilePic?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${commAuthor.username}`;
  const replies = commentReplies[comment._id] || [];
  const isExpanded = !!expandedComments[comment._id];
  const isLoading = !!loadingReplies[comment._id];

  return (
    <div
      className={`space-y-3 transition-all ${
        depth > 0 ? 'mt-3 pl-3.5 border-l-2 border-orbit-border/50 hover:border-orbit-accent/30' : ''
      }`}
    >
      {/* Dynamic Thread Card */}
      <div
        className={`bg-orbit-card/40 backdrop-blur-sm border/80 rounded-[24px] p-4.5 transition-all text-left relative ${
          comment.likedByMe
            ? 'border-rose-500/25 shadow-sm shadow-rose-500/5 bg-[#ffe4e6]/[0.015]'
            : 'border-orbit-border hover:border-orbit-accent/25'
        }`}
      >
        {/* Card Header information */}
        <div className="flex items-center justify-between">
          <Link to={`/profile/${commAuthor.username}`} className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full border border-orbit-border p-0.5 shrink-0">
              <img
                src={commPic}
                alt={commAuthor.username}
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-white/95 text-xs hover:text-orbit-accent transition-colors truncate block">
                {commAuthor.fullName}
              </span>
              <span className="text-[10px] text-orbit-muted font-mono block">@{commAuthor.username}</span>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 text-[9px] text-orbit-muted font-mono shrink-0">
            <span>
              {new Date(comment.createdAt).toLocaleDateString()}{' '}
              {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {user && user._id === commAuthor._id && (
              <button
                onClick={() => onDeleteComment(comment._id)}
                className="p-1 rounded-full text-[#8b949e] hover:text-rose-400 hover:bg-white/5 cursor-pointer transition-all"
                title="Delete Comment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Comment Message text */}
        <p className="text-white/85 text-xs md:text-sm pl-9 leading-relaxed text-left whitespace-pre-wrap mt-1">
          {comment.content}
        </p>

        {/* Action Row options */}
        <div className="pl-9 pt-2 flex flex-wrap items-center gap-4 text-[10px] text-orbit-muted font-extrabold tracking-widest uppercase select-none">
          {/* Toggle Like */}
          <button
            onClick={() => onToggleLike(comment._id)}
            className={`flex items-center gap-1 cursor-pointer transition-all ${
              comment.likedByMe ? 'text-rose-400 font-black scale-102' : 'hover:text-rose-400'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${comment.likedByMe ? 'fill-rose-400 text-rose-400' : ''}`} />
            <span>{comment.likesCount > 0 ? comment.likesCount : 'LIKE'}</span>
          </button>

          {/* Reply Form Trigger */}
          {user && (
            <button
              onClick={() => onSetReplyTarget(comment)}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            >
              <CornerDownRight className="w-3.5 h-3.5" />
              <span>REPLY</span>
            </button>
          )}

          {/* Toggle Replies Child List */}
          <button
            onClick={() => onToggleExpand(comment._id)}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>REPLIES {comment.repliesCount > 0 ? `(${comment.repliesCount})` : ''}</span>
          </button>
        </div>
      </div>

      {/* Children replies tree list */}
      {isExpanded && (
        <div className="pl-4 md:pl-6 space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 py-1.5 pl-6">
              <span className="w-2.5 h-2.5 border-2 border-orbit-accent border-r-transparent rounded-full animate-spin" />
              <span className="text-[10px] text-orbit-muted animate-pulse font-semibold">Fetching deep nodes...</span>
            </div>
          ) : replies.length === 0 ? (
            <p className="text-[10px] text-orbit-muted/70 italic pl-6 py-1">No nested replies here yet.</p>
          ) : (
            replies.map((reply) => (
              <CommentNode
                key={reply._id}
                comment={reply}
                depth={depth + 1}
                user={user}
                commentReplies={commentReplies}
                expandedComments={expandedComments}
                loadingReplies={loadingReplies}
                onToggleExpand={onToggleExpand}
                onSetReplyTarget={onSetReplyTarget}
                onToggleLike={onToggleLike}
                onDeleteComment={onDeleteComment}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default function PostDetail() {
  const { postId } = useParams();
  const { user } = useAuth();
  const {
    onCommentReply,
    onPostComment,
    onPostLike,
    onPostUnlike,
    onPostSave,
    onPostUnsave,
    onPostRepost,
    onPostUnrepost,
    onPostDeleted,
    onPostPin,
    onPostUnpin,
  } = useSocket();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addCommentMutation = useAddComment();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchSwiped = useRef(false);
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState('');

  const { data: post, isLoading: loadingPost } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      if (!postId) return null;
      const res = await getPostDetail(postId);
      if (res.success) {
        if (res.post?._id) {
          recordPostView(res.post._id).catch(() => {});
        }
        return res.post;
      }
      return null;
    },
    enabled: !!postId,
  });

  const { data: comments, isLoading: loadingComments } = useQuery({
    queryKey: ['comments', post?._id || 'pending'],
    queryFn: async () => {
      if (!post?._id) return [];
      const res = await getPostComments(post._id);
      if (res.success) {
        return res.comments || res.items || [];
      }
      return [];
    },
    enabled: !!post?._id,
  });

  // Only the post loading triggers the full-page skeleton;
  // comments show their own inline loading state below.
  const loading = loadingPost;

  // Replying target indicators
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);

  // Track reply states per comment ID
  const [expandedComments, setExpandedComments] = useState<{ [id: string]: boolean }>({});
  const [commentReplies, setCommentReplies] = useState<{ [id: string]: Comment[] }>({});
  const [loadingReplies, setLoadingReplies] = useState<{ [id: string]: boolean }>({});

  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReposting, setIsReposting] = useState(false);

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
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      e.preventDefault();
      if (delta > 0) {
        setCurrentImageIndex((prev) => {
          const imgs = post?.images?.filter((img) => img?.url);
          const len = imgs?.length || (post?.image?.url ? 1 : 0);
          return prev === 0 ? len - 1 : prev - 1;
        });
      } else {
        setCurrentImageIndex((prev) => {
          const imgs = post?.images?.filter((img) => img?.url);
          const len = imgs?.length || (post?.image?.url ? 1 : 0);
          return prev === len - 1 ? 0 : prev + 1;
        });
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

  // Delete Modals
  const [deletePostModal, setDeletePostModal] = useState<boolean>(false);
  const [deleteCommentModal, setDeleteCommentModal] = useState<{ isOpen: boolean; commentId: string }>({
    isOpen: false,
    commentId: '',
  });

  useEffect(() => {
    const unsubscribeComment = onPostComment((data: any) => {
      const newComment = data.comment;

      queryClient.setQueryData(['comments', post?._id || 'pending'], (oldComments: Comment[] | undefined) => {
        if (!oldComments) return [newComment];
        const commentExists = oldComments.some((c) => c._id === newComment._id);
        if (commentExists) return oldComments;
        return [newComment, ...oldComments];
      });
    });

    const unsubscribeReply = onCommentReply((data) => {
      const parentId = data.commentId;
      const newReply = data.reply;

      setCommentReplies((prev) => {
        const existingReplies = prev[parentId] || [];
        const replyExists = existingReplies.some((r) => r._id === newReply._id);
        if (replyExists) {
          return prev;
        }
        return {
          ...prev,
          [parentId]: [newReply, ...existingReplies],
        };
      });

      setExpandedComments((prev) => ({ ...prev, [parentId]: true }));
    });

    // Post like/unlike/save/unsave/repost/unrepost/pin/unpin handlers
    const handlePostLike = (data: any) => {
      if (data.postId === post?._id) {
        queryClient.setQueryData(['post', postId], (oldPost: Post | undefined) => {
          if (!oldPost) return oldPost;
          return {
            ...oldPost,
            likesCount: data.likesCount,
            likedByMe: true,
          };
        });
      }
    };

    const handlePostUnlike = (data: any) => {
      if (data.postId === post?._id) {
        queryClient.setQueryData(['post', postId], (oldPost: Post | undefined) => {
          if (!oldPost) return oldPost;
          return {
            ...oldPost,
            likesCount: data.likesCount,
            likedByMe: false,
          };
        });
      }
    };

    const handlePostSave = (data: any) => {
      if (data.postId === post?._id) {
        queryClient.setQueryData(['post', postId], (oldPost: Post | undefined) => {
          if (!oldPost) return oldPost;
          return {
            ...oldPost,
            savesCount: data.savesCount,
            savedByMe: true,
          };
        });
      }
    };

    const handlePostUnsave = (data: any) => {
      if (data.postId === post?._id) {
        queryClient.setQueryData(['post', postId], (oldPost: Post | undefined) => {
          if (!oldPost) return oldPost;
          return {
            ...oldPost,
            savesCount: data.savesCount,
            savedByMe: false,
          };
        });
      }
    };

    const handlePostRepost = (data: any) => {
      if (data.postId === post?._id) {
        queryClient.setQueryData(['post', postId], (oldPost: Post | undefined) => {
          if (!oldPost) return oldPost;
          return {
            ...oldPost,
            repostsCount: data.repostsCount,
            repostedByMe: true,
          };
        });
      }
    };

    const handlePostUnrepost = (data: any) => {
      if (data.postId === post?._id) {
        queryClient.setQueryData(['post', postId], (oldPost: Post | undefined) => {
          if (!oldPost) return oldPost;
          return {
            ...oldPost,
            repostsCount: data.repostsCount,
            repostedByMe: false,
          };
        });
      }
    };

    const handlePostDeleted = (data: any) => {
      if (data.postId === post?._id) {
        toast.error('This post has been deleted.');
        navigate('/');
      }
    };

    const handlePostPin = (data: any) => {
      if (data.postId === post?._id) {
        queryClient.setQueryData(['post', postId], (oldPost: Post | undefined) => {
          if (!oldPost) return oldPost;
          return {
            ...oldPost,
            pinnedByMe: true,
          };
        });
      }
    };

    const handlePostUnpin = (data: any) => {
      if (data.postId === post?._id) {
        queryClient.setQueryData(['post', postId], (oldPost: Post | undefined) => {
          if (!oldPost) return oldPost;
          return {
            ...oldPost,
            pinnedByMe: false,
          };
        });
      }
    };

    const unsubLike = onPostLike(handlePostLike);
    const unsubUnlike = onPostUnlike(handlePostUnlike);
    const unsubSave = onPostSave(handlePostSave);
    const unsubUnsave = onPostUnsave(handlePostUnsave);
    const unsubRepost = onPostRepost(handlePostRepost);
    const unsubUnrepost = onPostUnrepost(handlePostUnrepost);
    const unsubDeleted = onPostDeleted(handlePostDeleted);
    const unsubPin = onPostPin(handlePostPin);
    const unsubUnpin = onPostUnpin(handlePostUnpin);

    return () => {
      unsubscribeComment();
      unsubscribeReply();
      unsubLike();
      unsubUnlike();
      unsubSave();
      unsubUnsave();
      unsubRepost();
      unsubUnrepost();
      unsubDeleted();
      unsubPin();
      unsubUnpin();
    };
  }, [
    onPostComment,
    onCommentReply,
    onPostLike,
    onPostUnlike,
    onPostSave,
    onPostUnsave,
    onPostRepost,
    onPostUnrepost,
    onPostDeleted,
    onPostPin,
    onPostUnpin,
    postId,
    post?._id,
    queryClient,
    navigate,
  ]);

  // Expand and load recursive comments on the fly
  const handleToggleExpandCommentReplies = async (cId: string) => {
    const isExpanding = !expandedComments[cId];
    setExpandedComments((prev) => ({ ...prev, [cId]: isExpanding }));

    if (isExpanding && (!commentReplies[cId] || commentReplies[cId].length === 0)) {
      try {
        setLoadingReplies((prev) => ({ ...prev, [cId]: true }));
        const res = await getCommentReplies(cId);
        if (res.success) {
          setCommentReplies((prev) => ({
            ...prev,
            [cId]: res.replies || res.items || [],
          }));
        }
      } catch (err) {
        toast.error('Failed to load comment replies.');
      } finally {
        setLoadingReplies((prev) => ({ ...prev, [cId]: false }));
      }
    }
  };

  // Toggle liking of comments/replies recursively at any depth tree level
  const handleToggleLikeComment = async (commentId: string) => {
    try {
      const res = await toggleLikeComment(commentId);
      if (res.success) {
        // Update in root level comments (query data)
        queryClient.setQueryData(['comments', post?._id || 'pending'], (prev: Comment[] | undefined) => {
          if (!prev) return prev;
          return prev.map((c) => {
            if (c._id === commentId) {
              return {
                ...c,
                likedByMe: res.isLiked,
                likesCount:
                  res.likesCount !== undefined
                    ? res.likesCount
                    : res.isLiked
                      ? c.likesCount + 1
                      : Math.max(0, c.likesCount - 1),
              };
            }
            return c;
          });
        });

        // Update in recursive children comments mapping
        setCommentReplies((prev) => {
          const updated = { ...prev };
          Object.keys(updated).forEach((pId) => {
            updated[pId] = updated[pId].map((c) => {
              if (c._id === commentId) {
                return {
                  ...c,
                  likedByMe: res.isLiked,
                  likesCount:
                    res.likesCount !== undefined
                      ? res.likesCount
                      : res.isLiked
                        ? c.likesCount + 1
                        : Math.max(0, c.likesCount - 1),
                };
              }
              return c;
            });
          });
          return updated;
        });
      }
    } catch (err) {
      toast.error('Unable to update comment reaction.');
    }
  };

  // Add Comment Flow
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !post) {
      toast.error('Please sign in to comment.');
      return;
    }
    if (commentText.length < 1 || commentText.length > 1000) {
      toast.error('Comment must be between 1 and 1000 characters.');
      return;
    }

    try {
      await addCommentMutation.mutateAsync({ postId: post._id, content: commentText });
      setCommentText('');
      toast.success('Comment added.');
    } catch {
      toast.error('Failed to add comment.');
    }
  };

  // Add Nested Reply Flow
  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !replyTarget || !post) return;
    if (replyText.length < 1 || replyText.length > 1000) {
      toast.error('Reply must be between 1 and 1000 characters.');
      return;
    }

    try {
      const result = await addCommentMutation.mutateAsync({
        postId: post._id,
        content: replyText,
        parentId: replyTarget._id,
      });

      const parentId = replyTarget._id;
      let existingReplies = commentReplies[parentId] || [];

      if (!expandedComments[parentId] && existingReplies.length === 0) {
        try {
          const fetchRes = await getCommentReplies(parentId);
          if (fetchRes.success) {
            existingReplies = fetchRes.replies || fetchRes.items || [];
          }
        } catch {
          // ignore
        }
      }

      const newReply = result.comment;
      const replyExists = existingReplies.some((r) => r._id === newReply._id);

      if (!replyExists) {
        setCommentReplies((prev) => ({
          ...prev,
          [parentId]: [newReply, ...existingReplies],
        }));
      }

      setExpandedComments((prev) => ({ ...prev, [parentId]: true }));
      setReplyText('');
      setReplyTarget(null);
      toast.success('Reply added.');
    } catch (err) {
      toast.error('Failed to add reply.');
    }
  };

  // Delete Comment / Reply recursively from thread list
  const handleDeleteComment = (commentId: string) => {
    setDeleteCommentModal({ isOpen: true, commentId });
  };

  const confirmDeleteComment = async () => {
    try {
      const res = await deleteComment(deleteCommentModal.commentId);
      if (res.success) {
        // Update the comments query
        queryClient.setQueryData(['comments', post?._id || 'pending'], (oldComments: Comment[] | undefined) => {
          if (!oldComments) return oldComments;
          return oldComments.filter((c) => c._id !== deleteCommentModal.commentId);
        });

        // Update the post's commentsCount in the cache
        queryClient.setQueryData(['post', postId], (oldPost: any) => {
          if (!oldPost) return oldPost;
          return { ...oldPost, commentsCount: Math.max(0, (oldPost.commentsCount || 0) - 1) };
        });

        setCommentReplies((prev) => {
          const updated = { ...prev };
          // Remove from all parents nested array mapping
          Object.keys(updated).forEach((pId) => {
            updated[pId] = updated[pId].filter((c) => c._id !== deleteCommentModal.commentId);
          });
          // Cleanup deleted node's child storage
          delete updated[deleteCommentModal.commentId];
          return updated;
        });

        toast.success('Comment deleted.');
      }
    } catch {
      toast.error('Failed to delete comment.');
    } finally {
      setDeleteCommentModal({ isOpen: false, commentId: '' });
    }
  };

  const handleDeletePost = () => {
    setDeletePostModal(true);
  };

  const confirmDeletePost = async () => {
    if (!post) return;
    try {
      const res = await deletePost(post._id);
      if (res.success) {
        toast.success('Post deleted successfully.');
        navigate('/');
      }
    } catch (err) {
      toast.error('Failed to delete post.');
    } finally {
      setDeletePostModal(false);
    }
  };

  // Toggles Optimistic Actions
  const handleLike = async () => {
    if (!user || !post) return;
    if (isLiking) return;
    const previousState = { ...post };

    const nextLiked = !post.likedByMe;
    const optimisticPost = {
      ...post,
      likedByMe: nextLiked,
      likesCount: post.likesCount + (nextLiked ? 1 : -1),
    };

    // Update query data
    queryClient.setQueryData(['post', postId], optimisticPost);

    try {
      setIsLiking(true);
      const res = await toggleLikePost(post._id);
      if (res.success) {
        const finalPost = {
          ...post,
          likedByMe: res.liked,
          likesCount:
            res.likesCount !== undefined
              ? res.likesCount
              : res.liked
                ? post.likesCount + 1
                : Math.max(0, post.likesCount - 1),
        };
        queryClient.setQueryData(['post', postId], finalPost);
        queryClient.invalidateQueries({ queryKey: ['userPosts'] });
      }
    } catch (err) {
      queryClient.setQueryData(['post', postId], previousState);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSave = async () => {
    if (!user || !post) return;
    if (isSaving) return;
    const previousState = { ...post };

    const nextSaved = !post.savedByMe;
    const optimisticPost = {
      ...post,
      savedByMe: nextSaved,
      savesCount: post.savesCount + (nextSaved ? 1 : -1),
    };

    // Update query data
    queryClient.setQueryData(['post', postId], optimisticPost);

    try {
      setIsSaving(true);
      const res = await toggleSavePost(post._id);
      if (res.success) {
        const finalPost = {
          ...post,
          savedByMe: res.saved,
          savesCount:
            res.savesCount !== undefined
              ? res.savesCount
              : res.saved
                ? post.savesCount + 1
                : Math.max(0, post.savesCount - 1),
        };
        queryClient.setQueryData(['post', postId], finalPost);

        // Invalidate saved posts queries
        queryClient.invalidateQueries({ queryKey: ['savedPosts'] });
        queryClient.invalidateQueries({ queryKey: ['userSavedPosts'] });

        toast.success(res.saved ? 'Saved to your coordinate vault.' : 'Removed from vault.');
      }
    } catch (err) {
      queryClient.setQueryData(['post', postId], previousState);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRepost = async () => {
    if (!user || !post) return;
    if (post.author._id === user._id) {
      toast.error('You cannot repost your own posts!');
      return;
    }
    if (isReposting) return;
    const previousState = { ...post };

    const nextReposted = !post.repostedByMe;
    const optimisticPost = {
      ...post,
      repostedByMe: nextReposted,
      repostsCount: post.repostsCount + (nextReposted ? 1 : -1),
    };

    // Update query data
    queryClient.setQueryData(['post', postId], optimisticPost);

    try {
      setIsReposting(true);
      const res = await toggleRepostPost(post._id);
      if (res.success) {
        const finalPost = {
          ...post,
          repostedByMe: res.reposted,
          repostsCount:
            res.repostsCount !== undefined
              ? res.repostsCount
              : res.reposted
                ? post.repostsCount + 1
                : Math.max(0, post.repostsCount - 1),
        };
        queryClient.setQueryData(['post', postId], finalPost);
        queryClient.invalidateQueries({ queryKey: ['userReposts'] });
        toast.success(res.reposted ? 'Post reposted.' : 'Repost removed.');
      }
    } catch (err) {
      queryClient.setQueryData(['post', postId], previousState);
    } finally {
      setIsReposting(false);
    }
  };

  const handleShare = async () => {
    if (!post) return;
    try {
      const res = await sharePost(post._id);
      const shareLink = res?.shareUrl || `${window.location.origin}/post/${post._id}`;
      await navigator.clipboard.writeText(shareLink);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      const fallback = `${window.location.origin}/post/${post._id}`;
      await navigator.clipboard.writeText(fallback);
      toast.success('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6" role="status" aria-label="Loading post">
        <div className="bg-orbit-card border border-orbit-border rounded-3xl p-5 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton variant="circular" width={44} height={44} />
            <div className="flex-1 space-y-2">
              <Skeleton width="35%" />
              <Skeleton width="20%" />
            </div>
          </div>
          <Skeleton count={2} />
          <Skeleton width="60%" />
          <Skeleton variant="rectangular" height={300} />
        </div>
        <Skeleton variant="rectangular" height={120} />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto animate-bounce" />
        <h2 className="font-display font-medium text-lg text-white">Post Not Found</h2>
        <p className="text-sm text-orbit-muted">The requested post does not exist or has been deleted.</p>
        <Link
          to="/"
          className="inline-block bg-orbit-accent text-orbit-accent-foreground font-semibold text-xs px-5 py-2.5 rounded-full cursor-pointer"
        >
          Back to Feed
        </Link>
      </div>
    );
  }

  const author = post.author || { username: 'unknown', fullName: 'User', profilePic: { url: '' } };
  const authorPic =
    author.profilePic?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.username || 'unknown'}`;
  const authorHandle = author.username || 'unknown';

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 md:px-6 space-y-6">
      {/* Return Path Header */}
      <div className="flex items-center justify-between font-bold">
        <Link
          to="/"
          className="text-[10px] tracking-widest text-[#8b949e] hover:text-white flex items-center gap-1.5 transition-colors uppercase font-mono"
        >
          <Compass className="w-4 h-4 text-orbit-accent" />
          <span>BACK TO FEED</span>
        </Link>

        {user && user._id === author._id && (
          <div className="flex items-center gap-2">
            <Link
              to={`/post/${post._id}/edit`}
              className="border border-orbit-border hover:border-white hover:bg-white/5 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-all shrink-0 whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Post</span>
            </Link>
            <button
              onClick={handleDeletePost}
              className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Post</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Post Panel */}
      <article className="bg-orbit-card border border-orbit-border rounded-3xl p-5 md:p-8 space-y-6 shadow-2xl">
        {/* Author Bio Panel */}
        <div className="flex items-center gap-3 pb-4 border-b border-orbit-border justify-between">
          <Link to={`/profile/${authorHandle}`} className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full border border-orbit-border p-0.5">
              <img
                src={authorPic}
                alt={authorHandle}
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-semibold text-white/95 text-sm">{author.fullName}</h3>
              <p className="text-[10px] font-mono uppercase text-orbit-muted tracking-wider">@{authorHandle}</p>
            </div>
          </Link>

          <span className="text-[10px] text-orbit-muted tracking-wide uppercase font-mono">
            Shared: {post.createdAt}
          </span>
        </div>

        {/* Text Area */}
        <div className="space-y-4">
          <h1 className="text-2xl md:text-3xl text-white font-semibold leading-tight tracking-tight">{post.title}</h1>
          <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>

          {/* Images Gallery */}
          {(post.images?.length || post.image?.url) && (
            <div className="relative group/image">
              {(() => {
                const allImgs = post.images?.filter((img) => img?.url);
                const allImages = allImgs?.length ? allImgs : post.image?.url ? [post.image] : [];
                const hasMultiple = allImages.length > 1;
                const safeIndex = Math.min(currentImageIndex, allImages.length - 1);

                const prevImage = () => {
                  setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
                };
                const nextImage = () => {
                  setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
                };

                return (
                  <div className="rounded-3xl overflow-hidden border border-orbit-border">
                    <div
                      className="relative cursor-pointer"
                      onTouchStart={hasMultiple ? handleTouchStart : undefined}
                      onTouchMove={hasMultiple ? handleTouchMove : undefined}
                      onTouchEnd={hasMultiple ? handleTouchEnd : undefined}
                      onClick={handleImageClick}
                    >
                      <img
                        src={allImages[safeIndex]?.url}
                        alt={`${post.title} - image ${safeIndex + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-auto object-cover max-h-[500px] transition-opacity duration-300"
                        draggable={false}
                      />

                      {/* Expand to lightbox button */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover/image:opacity-100 transition-opacity">
                        <span className="p-2 bg-black/60 hover:bg-black/80 rounded-full text-white flex items-center justify-center cursor-pointer">
                          <Maximize2 className="w-4 h-4" />
                        </span>
                      </div>

                      {hasMultiple && (
                        <>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              prevImage();
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white opacity-0 group-hover/image:opacity-100 transition-all cursor-pointer"
                            aria-label="Previous image"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              nextImage();
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white opacity-0 group-hover/image:opacity-100 transition-all cursor-pointer"
                            aria-label="Next image"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                            {allImages.map((_, i) => (
                              <button
                                key={i}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setCurrentImageIndex(i);
                                }}
                                className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                                  i === safeIndex ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/70'
                                }`}
                                aria-label={`Go to image ${i + 1}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Dynamic Social Bars */}
        <div className="border-t border-orbit-border/50 pt-4 flex items-center justify-between text-[10px] font-bold tracking-widest uppercase text-orbit-muted select-none flex-wrap gap-x-2 gap-y-1">
          <div className="flex items-center flex-wrap gap-x-3 sm:gap-x-5">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 sm:gap-1.5 hover:text-rose-500 transition-colors cursor-pointer ${
                post.likedByMe ? 'text-rose-500 font-black' : ''
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${post.likedByMe ? 'fill-current text-rose-500 font-black' : 'text-orbit-muted'}`}
              />
              <span className="font-mono">{post.likesCount}</span>
            </button>

            <button className="flex items-center gap-1.5 text-white">
              <MessageSquare className="w-3.5 h-3.5 text-orbit-muted" />
              <span className="font-mono">{post.commentsCount}</span>
            </button>

            <button
              onClick={handleRepost}
              className={`flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer ${
                post.repostedByMe ? 'text-orbit-accent font-black' : ''
              }`}
            >
              <Repeat2 className={`w-3.5 h-3.5 ${post.repostedByMe ? 'text-orbit-accent' : 'text-orbit-muted'}`} />
              <span className="font-mono">{post.repostsCount}</span>
            </button>

            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 hover:text-amber-500 transition-colors cursor-pointer ${
                post.savedByMe ? 'text-amber-500 font-black' : ''
              }`}
            >
              <Bookmark
                className={`w-3.5 h-3.5 ${post.savedByMe ? 'fill-current text-amber-500 font-black' : 'text-orbit-muted'}`}
              />
              <span className="font-mono">{post.savesCount}</span>
            </button>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1 text-orbit-muted/50" title={`${post.viewsCount || 1} views`}>
              <Eye className="w-3.5 h-3.5" />
              <span className="font-mono">{post.viewsCount || 1}</span>
            </div>
            <button
              onClick={handleShare}
              className="p-1.5 hover:bg-white/5 rounded-full transition-all cursor-pointer"
              title="Copy Link to Clipboard"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </article>

      {/* Interactive Comment Input Area (Authenticated) */}
      <section className="bg-orbit-card border border-orbit-border rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-orbit-border pb-3.5">
          <MessageCircle className="w-4 h-4 text-orbit-accent" />
          <h2 className="text-xs uppercase font-bold tracking-wider text-white">Comments</h2>
        </div>

        {user ? (
          <form onSubmit={handleCommentSubmit} className="space-y-4">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
              className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-3 text-white transition-all text-xs resize-none"
              required
            />
            <div className="flex justify-between items-center pt-1">
              <span className="text-[10px] text-orbit-muted font-mono tracking-wider">
                LIMIT: {commentText.length}/1000
              </span>
              <button
                type="submit"
                disabled={addCommentMutation.isPending || !commentText.trim()}
                className="bg-orbit-accent text-orbit-accent-foreground font-semibold text-[11px] px-5 py-2.5 rounded-full flex items-center gap-1.5 transition-all disabled:opacity-50 hover:opacity-95 cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Send className="w-3 h-3" />
                <span>Add Comment</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-black/30 border border-orbit-border rounded-2xl p-6 text-center text-xs">
            <p className="text-orbit-muted mb-3">Please sign in to join the conversation.</p>
            <Link
              to="/login"
              className="bg-orbit-accent text-orbit-accent-foreground px-4 py-2 rounded-full font-bold text-[10px] uppercase tracking-wider inline-block"
            >
              Sign In
            </Link>
          </div>
        )}
      </section>

      {/* Recursive Comments Thread list */}
      <section className="space-y-4">
        <h3 className="font-display font-medium text-white text-sm">Comments Feed</h3>

        {loadingComments ? (
          <div className="bg-orbit-card border border-orbit-border rounded-3xl p-8 text-center">
            <div className="inline-block w-5 h-5 border-2 border-orbit-accent border-r-transparent rounded-full animate-spin" />
            <p className="text-xs text-orbit-muted mt-2">Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="bg-orbit-card border border-orbit-border rounded-3xl p-8 text-center text-xs text-orbit-muted">
            No comments yet. Be the first to share your thoughts!
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment: Comment) => (
              <CommentNode
                key={comment._id}
                comment={comment}
                depth={0}
                user={user}
                commentReplies={commentReplies}
                expandedComments={expandedComments}
                loadingReplies={loadingReplies}
                onToggleExpand={handleToggleExpandCommentReplies}
                onSetReplyTarget={setReplyTarget}
                onToggleLike={handleToggleLikeComment}
                onDeleteComment={handleDeleteComment}
              />
            ))}
          </div>
        )}
      </section>

      {/* Image Lightbox */}
      {post && (
        <ImageLightbox
          images={(() => {
            const imgs = post.images?.filter((img) => img?.url);
            return imgs?.length ? imgs : post.image?.url ? [post.image] : [];
          })()}
          currentIndex={currentImageIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onNavigate={(i) => setCurrentImageIndex(i)}
          title={post.title}
        />
      )}

      {/* Target Reply Overlay Modal Form */}
      {replyTarget && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-orbit-card border border-orbit-border rounded-3xl p-6 space-y-4 shadow-2xl relative animate-scale-up">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-orbit-accent">
              Reply to <span className="text-white font-mono">@{replyTarget.author?.username}</span>
            </h3>
            <div className="bg-black/40 border border-orbit-border/50 p-3.5 rounded-2xl text-[11px] text-orbit-muted max-h-24 overflow-y-auto">
              {`“${replyTarget.content}”`}
            </div>

            <form onSubmit={handleReplySubmit} className="space-y-4">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your reply..."
                rows={3}
                className="w-full bg-black/30 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-3 text-white text-xs resize-none"
                required
              />
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setReplyTarget(null)}
                  className="bg-transparent border border-orbit-border hover:border-white/30 text-white/60 hover:text-white px-5 py-2.5 rounded-full text-xs font-semibold cursor-pointer transition-colors shrink-0 whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="bg-orbit-accent hover:opacity-90 text-orbit-accent-foreground px-5 py-2.5 rounded-full text-xs font-semibold cursor-pointer transition-all shrink-0 whitespace-nowrap"
                >
                  <span>Send Reply</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Post Modal */}
      <AnimatePresence>
        {deletePostModal && (
          <Modal
            isOpen={deletePostModal}
            onClose={() => setDeletePostModal(false)}
            title="Delete Post"
            description="Are you sure you want to delete this post? This cannot be undone."
            variant="danger"
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={confirmDeletePost}
          />
        )}
      </AnimatePresence>

      {/* Delete Comment Modal */}
      <AnimatePresence>
        {deleteCommentModal.isOpen && (
          <Modal
            isOpen={deleteCommentModal.isOpen}
            onClose={() => setDeleteCommentModal({ isOpen: false, commentId: '' })}
            title="Delete Comment"
            description="Are you sure you want to delete this comment? All of its replies will also be removed."
            variant="danger"
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={confirmDeleteComment}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
