import { api } from './client';

export const requestPasswordOtp = async (email: string) => {
  const { data } = await api.post('/api/password/request-otp', { email });
  return data;
};

export const verifyAndResetPassword = async (payload: any) => {
  // payload: { email, otp, newPassword, confirmPassword }
  const { data } = await api.post('/api/password/verify-and-forgot-password', payload);
  return data;
};

export const updatePasswordLoggedIn = async (payload: any) => {
  // payload: { email, currentPassword, newPassword, confirmPassword }
  const { data } = await api.post('/api/password/update-password', payload);
  return data;
};
