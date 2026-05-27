import { api } from './client';

export interface GetPostsParams {
  limit?: number;
  cursor?: string;
  authorId?: string;
}

export const getPosts = async (params: GetPostsParams = {}) => {
  const query = new URLSearchParams();
  if (params.limit) query.append('limit', params.limit.toString());
  if (params.cursor) query.append('cursor', params.cursor);
  if (params.authorId) query.append('author', params.authorId);

  const queryString = query.toString();
  const url = `/api/posts?${queryString}`;
  const { data } = await api.get(url);
  return data;
};

export const getPostDetail = async (postId: string) => {
  // Auto-detect if postId is a valid MongoDB ObjectID or a slug
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(postId);
  const endpoint = isObjectId ? `/api/posts/${postId}` : `/api/posts/slug/${encodeURIComponent(postId)}`;
  const { data } = await api.get(endpoint);
  return data;
};

export const createPost = async (formData: FormData) => {
  const { data } = await api.post('/api/posts', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const updatePost = async (postId: string, formData: FormData) => {
  const { data } = await api.put(`/api/posts/${postId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const deletePost = async (postId: string) => {
  const { data } = await api.delete(`/api/posts/${postId}`);
  return data;
};

export const sharePost = async (postId: string) => {
  const { data } = await api.post(`/api/posts/${postId}/share`);
  return data;
};

export const recordPostView = async (postId: string) => {
  const { data } = await api.post(`/api/posts/${postId}/view`);
  return data;
};

// Pin / Unpin post
export const pinPost = async (postId: string) => {
  const { data } = await api.post(`/api/posts/${postId}/pin`);
  return data;
};

export const unpinPost = async (postId: string) => {
  const { data } = await api.post(`/api/posts/${postId}/unpin`);
  return data;
};
