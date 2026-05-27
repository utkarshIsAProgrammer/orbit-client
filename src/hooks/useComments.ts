import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPostComments, getCommentReplies, addComment, editComment, deleteComment } from '../api/comments';
import { toggleLikeComment } from '../api/likes';
import { Comment, Post } from '../types/api';

const updatePostInAllQueries = (
  queryClient: any,
  postId: string,
  updateFn: (post: Post | undefined) => Post | undefined
) => {
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
    if (Array.isArray(oldData)) {
      return oldData.map(updateFn);
    }
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

  queryClient.setQueriesData({ queryKey: ['searchPosts'] }, (oldData: any) => {
    if (!oldData) return oldData;
    if (Array.isArray(oldData)) {
      return oldData.map(updateFn);
    }
    return oldData;
  });

  queryClient.setQueryData(['post', postId], (oldData: any) => {
    if (!oldData) return oldData;
    if (oldData._id === postId) {
      return updateFn(oldData);
    }
    if (oldData.post) {
      return { ...oldData, post: updateFn(oldData.post) };
    }
    return oldData;
  });
};

const updateCommentInAllQueries = (
  queryClient: any,
  commentId: string,
  updateFn: (comment: Comment | undefined) => Comment | undefined
) => {
  // Update ['comments'] cache
  queryClient.setQueriesData({ queryKey: ['comments'] }, (oldData: any) => {
    if (!oldData) return oldData;
    if (oldData.pages) {
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          comments: page.comments?.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c)),
          items: page.items?.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c)),
        })),
      };
    }
    if (Array.isArray(oldData)) {
      return oldData.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c));
    }
    return {
      ...oldData,
      comments: oldData.comments?.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c)),
      items: oldData.items?.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c)),
    };
  });

  // Update ['replies'] cache
  queryClient.setQueriesData({ queryKey: ['replies'] }, (oldData: any) => {
    if (!oldData) return oldData;
    if (oldData.pages) {
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          replies: page.replies?.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c)),
          comments: page.comments?.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c)),
          items: page.items?.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c)),
        })),
      };
    }
    if (Array.isArray(oldData)) {
      return oldData.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c));
    }
    return {
      ...oldData,
      replies: oldData.replies?.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c)),
      comments: oldData.comments?.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c)),
      items: oldData.items?.map((c: Comment | undefined) => (c && c._id === commentId ? updateFn(c) : c)),
    };
  });
};

export const usePostComments = (postId: string | undefined) => {
  return useQuery({
    queryKey: ['comments', postId],
    queryFn: () => (postId ? getPostComments(postId) : Promise.reject(new Error('No post ID'))),
    enabled: !!postId,
  });
};

export const useCommentReplies = (commentId: string | undefined) => {
  return useQuery({
    queryKey: ['replies', commentId],
    queryFn: () => (commentId ? getCommentReplies(commentId) : Promise.reject(new Error('No comment ID'))),
    enabled: !!commentId,
  });
};

export const useAddComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, content, parentId }: { postId: string; content: string; parentId?: string | null }) =>
      addComment(postId, content, parentId),
    onSuccess: (data, variables) => {
      const updatePostCommentsCount = (oldPost: Post | undefined) =>
        oldPost
          ? {
              ...oldPost,
              commentsCount: (oldPost.commentsCount || 0) + 1,
            }
          : oldPost;

      updatePostInAllQueries(queryClient, variables.postId, updatePostCommentsCount);

      if (variables.parentId) {
        // Increment parent comment's repliesCount
        const updateCommentRepliesCount = (oldComment: Comment | undefined) =>
          oldComment
            ? {
                ...oldComment,
                repliesCount: (oldComment.repliesCount || 0) + 1,
              }
            : oldComment;

        updateCommentInAllQueries(queryClient, variables.parentId, updateCommentRepliesCount);

        queryClient.setQueryData(['replies', variables.parentId], (oldReplies: Comment[] | undefined) => {
          if (!oldReplies) return [data.comment];
          const replyExists = oldReplies.some((r) => r._id === data.comment._id);
          if (replyExists) return oldReplies;
          return [data.comment, ...oldReplies];
        });
      } else {
        queryClient.setQueryData(['comments', variables.postId], (oldComments: Comment[] | undefined) => {
          if (!oldComments) return [data.comment];
          const commentExists = oldComments.some((c) => c._id === data.comment._id);
          if (commentExists) return oldComments;
          return [data.comment, ...oldComments];
        });
      }
    },
  });
};

export const useEditComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) => editComment(commentId, content),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      queryClient.invalidateQueries({ queryKey: ['replies'] });
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: (_, commentId) => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      queryClient.invalidateQueries({ queryKey: ['replies'] });
    },
  });
};

export const useToggleLikeComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => toggleLikeComment(commentId),
    onSuccess: (data, commentId) => {
      const updateCommentInQuery = (oldComment: Comment) => ({
        ...oldComment,
        likedByMe: data.liked,
        likesCount: data.likesCount,
      });

      queryClient.setQueriesData({ queryKey: ['comments'] }, (oldData: any) => {
        if (!oldData) return oldData;
        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              comments: page.comments?.map(updateCommentInQuery),
              items: page.items?.map(updateCommentInQuery),
            })),
          };
        }
        if (Array.isArray(oldData)) {
          return oldData.map(updateCommentInQuery);
        }
        return oldData;
      });

      queryClient.setQueriesData({ queryKey: ['replies'] }, (oldData: any) => {
        if (!oldData) return oldData;
        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              replies: page.replies?.map(updateCommentInQuery),
              comments: page.comments?.map(updateCommentInQuery),
              items: page.items?.map(updateCommentInQuery),
            })),
          };
        }
        if (Array.isArray(oldData)) {
          return oldData.map(updateCommentInQuery);
        }
        return oldData;
      });
    },
  });
};
