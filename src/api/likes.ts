import { api } from './client';

export const toggleLikePost = async (postId: string) => {
  const { data } = await api.post(`/api/likes/post/${postId}`);
  return data;
};

export const toggleLikeComment = async (commentId: string) => {
  const { data } = await api.post(`/api/likes/comment/${commentId}`);
  return data;
};
