import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPosts, getPostDetail, createPost, updatePost, deletePost, sharePost, recordPostView } from '../api/posts';
import { toggleLikePost } from '../api/likes';
import { toggleSavePost } from '../api/saves';
import { toggleRepostPost } from '../api/reposts';
import { Post } from '../types/api';

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
    if (oldData.post) {
      return { ...oldData, post: updateFn(oldData.post) };
    }
    if (oldData._id === postId) {
      return updateFn(oldData);
    }
    return oldData;
  });
};

const removePostFromSavedQueries = (queryClient: any, postId: string) => {
  queryClient.setQueriesData({ queryKey: ['savedPosts'] }, (oldData: any) => {
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
  });
};

export const usePosts = (params: { limit?: number; cursor?: string; authorId?: string } = {}) => {
  return useQuery({
    queryKey: ['posts', params],
    queryFn: () => getPosts(params),
  });
};

export const usePostDetail = (postId: string | undefined) => {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: () => (postId ? getPostDetail(postId) : Promise.reject(new Error('No post ID'))),
    enabled: !!postId,
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => createPost(formData),
    onSuccess: (data) => {
      if (data.post) {
        queryClient.setQueriesData({ queryKey: ['posts'] }, (oldData: any) => {
          if (!oldData) return oldData;
          if (oldData.pages) {
            return {
              ...oldData,
              pages: oldData.pages.map((page: any, index: number) => {
                if (index === 0) {
                  return {
                    ...page,
                    posts: [data.post, ...(page.posts || page.items || [])],
                    items: [data.post, ...(page.items || page.posts || [])],
                  };
                }
                return page;
              }),
            };
          }
          if (Array.isArray(oldData)) {
            return [data.post, ...oldData];
          }
          return {
            ...oldData,
            posts: [data.post, ...(oldData.posts || oldData.items || [])],
            items: [data.post, ...(oldData.items || oldData.posts || [])],
          };
        });
      }
    },
  });
};

export const useUpdatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, formData }: { postId: string; formData: FormData }) => updatePost(postId, formData),
    onSuccess: (data, variables) => {
      if (data.post) {
        updatePostInAllQueries(queryClient, variables.postId, (p) => (p && p._id === variables.postId ? data.post : p));
      }
    },
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: (_, postId) => {
      queryClient.removeQueries({ queryKey: ['post', postId] });
      queryClient.setQueriesData({ queryKey: ['posts'] }, (oldData: any) => {
        if (!oldData) return oldData;
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
        if (Array.isArray(oldData)) {
          return oldData.filter((p: Post) => p && p._id !== postId);
        }
        return {
          ...oldData,
          posts: (oldData.posts || oldData.items || []).filter((p: Post) => p && p._id !== postId),
          items: (oldData.items || oldData.posts || []).filter((p: Post) => p && p._id !== postId),
        };
      });
      removePostFromSavedQueries(queryClient, postId);
    },
  });
};

export const useToggleLikePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => toggleLikePost(postId),
    onSuccess: (data, postId) => {
      updatePostInAllQueries(queryClient, postId, (p) =>
        p && p._id === postId
          ? {
              ...p,
              likedByMe: data.liked,
              likesCount: data.likesCount,
            }
          : p
      );
    },
  });
};

export const useToggleSavePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => toggleSavePost(postId),
    onSuccess: (data, postId) => {
      updatePostInAllQueries(queryClient, postId, (p) =>
        p && p._id === postId
          ? {
              ...p,
              savedByMe: data.saved,
              savesCount: data.savesCount,
            }
          : p
      );
      if (!data.saved) {
        removePostFromSavedQueries(queryClient, postId);
      }
    },
  });
};

export const useToggleRepostPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => toggleRepostPost(postId),
    onSuccess: (data, postId) => {
      updatePostInAllQueries(queryClient, postId, (p) =>
        p && p._id === postId
          ? {
              ...p,
              repostedByMe: data.reposted,
              repostsCount: data.repostsCount,
            }
          : p
      );
    },
  });
};
