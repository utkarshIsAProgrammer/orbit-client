export interface User {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  gender: 'male' | 'female' | 'others';
  bio?: string;
  profilePic?: { url: string; public_id: string };
  bannerImage?: { url: string; public_id: string };
  followersCount: number;
  followingCount: number;
  pinnedPosts?: string[];
  createdAt: string;
  updatedAt?: string;
  followingByMe?: boolean;
  isFollowing?: boolean;
}

export interface Post {
  _id: string;
  title: string;
  slug: string;
  content: string;
  images?: { url: string; public_id: string }[];
  image?: { url: string; public_id: string }; // backward compat
  author: User;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  savesCount: number;
  sharesCount?: number;
  viewsCount?: number;
  hashtags?: string[];
  createdAt: string;
  updatedAt: string;
  // Dynamic client states loaded per user context
  likedByMe?: boolean;
  savedByMe?: boolean;
  repostedByMe?: boolean;
  pinnedByMe?: boolean;
}

export interface Comment {
  _id: string;
  content: string;
  author: User;
  post: string;
  parent?: string | null;
  likesCount: number;
  repliesCount: number;
  createdAt: string;
  likedByMe?: boolean;
}

export type NotificationType = 'like' | 'comment' | 'follow' | 'repost' | 'save';

export interface Notification {
  _id: string;
  type: NotificationType;
  sender: Pick<User, '_id' | 'username' | 'fullName' | 'profilePic'>;
  post?: { _id: string; title: string; slug: string };
  comment?: { _id: string; content: string };
  isRead: boolean;
  createdAt: string;
}

export interface SaveFolder {
  _id: string;
  name: string;
  userId: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  items?: T[];
  posts?: Post[];
  comments?: Comment[];
  replies?: Comment[];
  notifications?: Notification[];
  users?: User[];
  folders?: SaveFolder[];
  nextCursor?: string;
  hasMore: boolean;
}
