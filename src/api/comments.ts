import { api } from './client';

export const getPostComments = async (postId: string, limit: number = 10, cursor?: string) => {
  const query = new URLSearchParams();
  query.append('limit', limit.toString());
  if (cursor) query.append('cursor', cursor);

  const { data } = await api.get(`/api/comments/${postId}?${query.toString()}`);
  return data;
};

export const getCommentReplies = async (commentId: string, limit: number = 10, cursor?: string) => {
  const query = new URLSearchParams();
  query.append('limit', limit.toString());
  if (cursor) query.append('cursor', cursor);

  const { data } = await api.get(`/api/comments/replies/${commentId}?${query.toString()}`);
  return data;
};

export const addComment = async (postId: string, content: string, parentId?: string | null) => {
  const payload: { content: string; parent?: string | null } = { content };
  if (parentId) {
    payload.parent = parentId;
  }
  const { data } = await api.post(`/api/comments/${postId}`, payload);
  return data;
};

export const editComment = async (commentId: string, content: string) => {
  const { data } = await api.put(`/api/comments/${commentId}`, { content });
  return data;
};

export const deleteComment = async (commentId: string) => {
  const { data } = await api.delete(`/api/comments/${commentId}`);
  return data;
};
