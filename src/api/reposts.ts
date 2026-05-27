import { api } from './client';

export const toggleRepostPost = async (postId: string) => {
  const { data } = await api.post(`/api/reposts/${postId}`);
  return data;
};

export const getRepostedPosts = async (limit: number = 10, cursor?: string) => {
  const query = new URLSearchParams();
  query.append('limit', limit.toString());
  if (cursor) query.append('cursor', cursor);
  const { data } = await api.get(`/api/reposts?${query.toString()}`);
  return data;
};
