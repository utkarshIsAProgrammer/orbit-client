import { api } from './client';

export const searchUsers = async (query: string, limit: number = 20) => {
  const { data } = await api.get(`/api/search/users?q=${encodeURIComponent(query)}&limit=${limit}`);
  return data;
};

export const searchPosts = async (query: string, limit: number = 20) => {
  const { data } = await api.get(`/api/search/posts?q=${encodeURIComponent(query)}&limit=${limit}`);
  return data;
};
