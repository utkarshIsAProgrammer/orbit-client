import { api } from './client';

export const toggleSavePost = async (postId: string, folderId?: string) => {
  const body: any = {};
  if (folderId) body.folder = folderId;
  const { data } = await api.post(`/api/saves/${postId}`, body);
  return data;
};

export const getSavedPosts = async (limit: number = 10, cursor?: string, folderId?: string) => {
  const query = new URLSearchParams();
  query.append('limit', limit.toString());
  if (cursor) query.append('cursor', cursor);
  if (folderId) query.append('folder', folderId);
  const { data } = await api.get(`/api/saves?${query.toString()}`);
  return data;
};

// --- Folder Management ---
export const createFolder = async (name: string) => {
  const { data } = await api.post('/api/saves/folders', { name });
  return data;
};

export const getFolders = async () => {
  const { data } = await api.get('/api/saves/folders');
  return data;
};

export const updateFolder = async (folderId: string, name: string) => {
  const { data } = await api.put(`/api/saves/folders/${folderId}`, { name });
  return data;
};

export const deleteFolder = async (folderId: string) => {
  const { data } = await api.delete(`/api/saves/folders/${folderId}`);
  return data;
};
