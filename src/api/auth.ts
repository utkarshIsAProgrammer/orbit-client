import { api } from './client';

export const loginUser = async (credentials: any) => {
  const { data } = await api.post('/api/auth/login', credentials);
  return data;
};

export const signupUser = async (formData: FormData) => {
  const { data } = await api.post('/api/auth/signup', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const logoutUser = async () => {
  const { data } = await api.post('/api/auth/logout');
  return data;
};

export const getCurrentUser = async () => {
  const { data } = await api.get('/api/auth/me');
  return data;
};
