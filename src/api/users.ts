import { api } from './client';

export const getAllUsers = async (limit: number = 20, cursor?: string) => {
  const query = new URLSearchParams();
  query.append('limit', limit.toString());
  if (cursor) query.append('cursor', cursor);
  const { data } = await api.get(`/api/users?${query.toString()}`);
  return data;
};

export const updateProfile = async (formData: FormData) => {
  const { data } = await api.put('/api/users/update-profile', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const deleteAccount = async (credentials: any) => {
  const { data } = await api.delete('/api/users/delete-account', {
    data: credentials,
  });
  return data;
};

export const shareUserProfile = async (userId: string) => {
  const { data } = await api.post(`/api/users/${userId}/share`);
  return data;
};

export const recordProfileView = async (userId: string) => {
  const { data } = await api.post(`/api/users/${userId}/view`);
  return data;
};

export const getUserProfileByUsername = async (username: string) => {
  const { data } = await api.get(`/api/users/username/${username}`);
  return data;
};

export const getUserById = async (userId: string) => {
  const { data } = await api.get(`/api/users/${userId}`);
  return data;
};

// User suggestions (who to follow)
export const getUserSuggestions = async (limit: number = 5) => {
  const { data } = await api.get(`/api/users/suggestions?limit=${limit}`);
  return data;
};

// Get pinned posts for a user
export const getPinnedPosts = async (userId: string) => {
  const { data } = await api.get(`/api/users/${userId}/pinned`);
  return data;
};
