import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toggleFollowUser } from '../api/follows';
import { User } from '../types/api';

const updateUserInAllQueries = (
  queryClient: any,
  userId: string,
  updateFn: (user: User | undefined) => User | undefined
) => {
  queryClient.setQueriesData({ queryKey: ['userProfile'] }, (oldData: any) => {
    if (!oldData) return oldData;
    if (oldData.user && oldData.user._id === userId) {
      return { ...oldData, user: updateFn(oldData.user) };
    }
    return oldData;
  });

  queryClient.setQueriesData({ queryKey: ['users'] }, (oldData: any) => {
    if (!oldData) return oldData;
    if (oldData.pages) {
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          users: page.users?.map(updateFn),
          items: page.items?.map(updateFn),
        })),
      };
    }
    if (Array.isArray(oldData)) {
      return oldData.map(updateFn);
    }
    if (oldData.users) {
      return { ...oldData, users: oldData.users.map(updateFn) };
    }
    return oldData;
  });

  queryClient.setQueriesData({ queryKey: ['searchUsers'] }, (oldData: any) => {
    if (!oldData) return oldData;
    if (oldData.pages) {
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          users: page.users?.map(updateFn),
        })),
      };
    }
    if (Array.isArray(oldData)) {
      return oldData.map(updateFn);
    }
    if (oldData.users) {
      return { ...oldData, users: oldData.users.map(updateFn) };
    }
    return oldData;
  });

  // Update ['userSuggestions'] cache
  queryClient.setQueriesData({ queryKey: ['userSuggestions'] }, (oldData: any) => {
    if (!oldData) return oldData;
    if (Array.isArray(oldData)) {
      return oldData.map(updateFn);
    }
    if (oldData.users) {
      return { ...oldData, users: oldData.users.map(updateFn) };
    }
    return oldData;
  });

  queryClient.setQueriesData({ queryKey: ['followers'] }, (oldData: any) => {
    if (!oldData) return oldData;
    if (oldData.pages) {
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          followers: page.followers?.map((follow: any) => ({
            ...follow,
            follower: follow.follower && follow.follower._id === userId ? updateFn(follow.follower) : follow.follower,
          })),
        })),
      };
    }
    if (oldData.followers) {
      return {
        ...oldData,
        followers: oldData.followers?.map((follow: any) => ({
          ...follow,
          follower: follow.follower && follow.follower._id === userId ? updateFn(follow.follower) : follow.follower,
        })),
      };
    }
    return oldData;
  });

  // Update ['following'] cache (following have nested 'following' object)
  queryClient.setQueriesData({ queryKey: ['following'] }, (oldData: any) => {
    if (!oldData) return oldData;
    if (oldData.pages) {
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          following: page.following?.map((follow: any) => ({
            ...follow,
            following:
              follow.following && follow.following._id === userId ? updateFn(follow.following) : follow.following,
          })),
        })),
      };
    }
    if (oldData.following) {
      return {
        ...oldData,
        following: oldData.following?.map((follow: any) => ({
          ...follow,
          following:
            follow.following && follow.following._id === userId ? updateFn(follow.following) : follow.following,
        })),
      };
    }
    return oldData;
  });
};

export const useToggleFollowUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => toggleFollowUser(userId),
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ['userProfile'] });
      await queryClient.cancelQueries({ queryKey: ['users'] });
      await queryClient.cancelQueries({ queryKey: ['followers'] });
      await queryClient.cancelQueries({ queryKey: ['following'] });

      const previousUserProfile = queryClient.getQueriesData({ queryKey: ['userProfile'] });
      const previousUsers = queryClient.getQueriesData({ queryKey: ['users'] });
      const previousFollowers = queryClient.getQueriesData({ queryKey: ['followers'] });
      const previousFollowing = queryClient.getQueriesData({ queryKey: ['following'] });

      updateUserInAllQueries(queryClient, userId, (user) => {
        if (!user) return user;
        const newFollowingByMe = !user.followingByMe;
        return {
          ...user,
          followingByMe: newFollowingByMe,
          followersCount: newFollowingByMe
            ? (user.followersCount || 0) + 1
            : Math.max(0, (user.followersCount || 0) - 1),
        };
      });

      return { previousUserProfile, previousUsers, previousFollowers, previousFollowing };
    },
    onError: (err, userId, context) => {
      if (context?.previousUserProfile) {
        queryClient.setQueriesData({ queryKey: ['userProfile'] }, context.previousUserProfile);
      }
      if (context?.previousUsers) {
        queryClient.setQueriesData({ queryKey: ['users'] }, context.previousUsers);
      }
      if (context?.previousFollowers) {
        queryClient.setQueriesData({ queryKey: ['followers'] }, context.previousFollowers);
      }
      if (context?.previousFollowing) {
        queryClient.setQueriesData({ queryKey: ['following'] }, context.previousFollowing);
      }
    },
    onSuccess: (data, userId) => {
      updateUserInAllQueries(queryClient, userId, (user) => {
        if (!user) return user;
        return {
          ...user,
          followingByMe: data.following,
          followersCount:
            data.followersCount ??
            (data.following ? (user.followersCount || 0) + 1 : Math.max(0, (user.followersCount || 0) - 1)),
        };
      });
      // NOTE: intentionally NOT invalidating queries here to prevent the follow button
      // from flipping back to 'Follow' due to race conditions with socket events.
      // The socket event (user:follow/user:unfollow) already updates all caches
      // via updateUserInAllQueries in SocketContext.tsx.
    },
  });
};
