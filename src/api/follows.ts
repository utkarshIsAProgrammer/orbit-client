import { api } from './client';

export const toggleFollowUser = async (userId: string) => {
  const { data } = await api.post(`/api/follows/${userId}`);
  return data;
};

export const getFollowers = async (userId: string, limit: number = 20, cursor?: string) => {
  const query = new URLSearchParams();
  query.append('limit', limit.toString());
  if (cursor) query.append('cursor', cursor);
  const { data } = await api.get(`/api/follows/${userId}/followers?${query.toString()}`);
  return data;
};

export const getFollowing = async (userId: string, limit: number = 20, cursor?: string) => {
  const query = new URLSearchParams();
  query.append('limit', limit.toString());
  if (cursor) query.append('cursor', cursor);
  const { data } = await api.get(`/api/follows/${userId}/following?${query.toString()}`);
  return data;
};
