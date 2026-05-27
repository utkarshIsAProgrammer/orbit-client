import { api } from './client';

export const getUnreadNotificationsCount = async () => {
  const { data } = await api.get('/api/notifications/unread-count');
  return data;
};

export const getNotifications = async (limit: number = 20, cursor?: string) => {
  const query = new URLSearchParams();
  query.append('limit', limit.toString());
  if (cursor) query.append('cursor', cursor); // cursor is compound string e.g., "{timestamp}_{notificationId}"

  const { data } = await api.get(`/api/notifications?${query.toString()}`);
  return data;
};

export const markAllNotificationsRead = async () => {
  const { data } = await api.put('/api/notifications/mark-as-read');
  return data;
};

export const markSingleNotificationRead = async (notificationId: string) => {
  const { data } = await api.put(`/api/notifications/mark-as-read/${notificationId}`);
  return data;
};

export const deleteNotification = async (notificationId: string) => {
  const { data } = await api.delete(`/api/notifications/${notificationId}`);
  return data;
};

export const clearAllNotifications = async () => {
  const { data } = await api.delete('/api/notifications/clear-all');
  return data;
};
