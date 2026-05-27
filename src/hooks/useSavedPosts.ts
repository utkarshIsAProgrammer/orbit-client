import { useQuery } from '@tanstack/react-query';
import { getSavedPosts } from '../api/saves';

export const useSavedPosts = (limit: number = 10, cursor?: string) => {
  return useQuery({
    queryKey: ['savedPosts', { limit, cursor }],
    queryFn: () => getSavedPosts(limit, cursor),
  });
};
