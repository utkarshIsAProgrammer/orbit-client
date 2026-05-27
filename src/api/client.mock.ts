import { AxiosRequestConfig } from 'axios';

// ─── Types ──────────────────────────────────────────────────────────
interface LocalDB {
  users: any[];
  posts: any[];
  comments: any[];
  follows: { _id: string; followerId: string; followingId: string; createdAt: string }[];
  likes: { _id: string; userId: string; targetId: string; targetType: 'post' | 'comment' }[];
  saves: { _id: string; userId: string; postId: string; folder?: string; createdAt: string }[];
  reposts: { _id: string; userId: string; postId: string; createdAt: string }[];
  notifications: any[];
  currentUser: any | null;
}

// ─── Seed Data ──────────────────────────────────────────────────────
const DEFAULT_USERS = [
  {
    _id: 'u1',
    username: 'stella_orion',
    fullName: 'Stella Orion',
    email: 'stella@orbit.social',
    gender: 'female',
    bio: 'Astrophysicist & cosmos designer. Living in the high orbits of clean typography.',
    profilePic: {
      url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
      public_id: 'pic_stella',
    },
    bannerImage: {
      url: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?w=800&h=300&fit=crop',
      public_id: 'banner_stella',
    },
    followersCount: 1420,
    followingCount: 382,
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    _id: 'u2',
    username: 'alex_mercer',
    fullName: 'Alex Mercer',
    email: 'alex@orbit.social',
    gender: 'male',
    bio: 'Creative Director & UI/UX Craftsman. Pixel precision is not an option; it is gravity.',
    profilePic: {
      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
      public_id: 'pic_alex',
    },
    bannerImage: {
      url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=300&fit=crop',
      public_id: 'banner_alex',
    },
    followersCount: 2901,
    followingCount: 421,
    createdAt: '2026-02-10T11:30:00Z',
  },
  {
    _id: 'u3',
    username: 'gravity_craft',
    fullName: 'Arthur Newton',
    email: 'arthur@orbit.social',
    gender: 'others',
    bio: 'Keplerian dynamics simplified. Building orbital trajectories with pure mathematical beauty.',
    profilePic: {
      url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
      public_id: 'pic_arthur',
    },
    bannerImage: {
      url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=300&fit=crop',
      public_id: 'banner_arthur',
    },
    followersCount: 840,
    followingCount: 190,
    createdAt: '2026-03-05T14:20:00Z',
  },
];

const DEFAULT_POSTS = [
  {
    _id: 'post_1',
    title: 'The Gravity of Spacing in UI Engineering',
    slug: 'gravity-of-spacing-ui',
    content:
      'Just as orbital coordinates dictate the distance between celestial bodies, margins and padding govern the gravitational forces in human-computer interfaces. Generous negative space is not space empty; it is a breathing lung of focus.\n\nWhen we tighten bounds too much, visual elements collide, creating friction and cognitive noise. Aim for intentional scale-multiples (like 4px, 8px, 16px, 24px, 48px) and notice how layout stabilizes automatically. Build for comfort.',
    image: {
      url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&h=450&fit=crop',
      public_id: 'post_img_1',
    },
    author: 'u2',
    likesCount: 142,
    commentsCount: 3,
    repostsCount: 18,
    savesCount: 54,
    sharesCount: 22,
    viewsCount: 2101,
    createdAt: '25 minutes ago',
  },
  {
    _id: 'post_2',
    title: 'Orbits and Keplerian Mechanics in Modern Web Layouts',
    slug: 'orbits-kepler-mechanics',
    content:
      "Johannes Kepler discovered that planets move in ellipses, sweeping out equal areas in equal times. In front-end animation, we can replicate these celestial ease-curves. Standard linear transitions look robotic. Elliptical/spline paths using modern engines like Motion provide acceleration peaks mimic actual physics.\n\nLet's keep interfaces orbiting beautifully with the physical expectations of natural systems.",
    image: {
      url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=450&fit=crop',
      public_id: 'post_img_2',
    },
    author: 'u1',
    likesCount: 89,
    commentsCount: 1,
    repostsCount: 12,
    savesCount: 32,
    sharesCount: 8,
    viewsCount: 1210,
    createdAt: '3 hours ago',
  },
];

const DEFAULT_COMMENTS = [
  {
    _id: 'comment_1',
    content: 'Completely agree with this layout philosophy. Whitespace is the true hero of premium editorial designs.',
    author: 'u1',
    post: 'post_1',
    parent: null,
    likesCount: 12,
    createdAt: '20 minutes ago',
  },
  {
    _id: 'comment_2',
    content: 'How do you reconcile this on high-density data tables? Do we reduce spacing thresholds?',
    author: 'u3',
    post: 'post_1',
    parent: null,
    likesCount: 4,
    createdAt: '15 minutes ago',
  },
  {
    _id: 'comment_3',
    content:
      'For data density, we transition scale tiers—e.g. padding switches from 16px to 8px, but we maintain the relative grid. Always aligned!',
    author: 'u2',
    post: 'post_1',
    parent: 'comment_2',
    likesCount: 8,
    createdAt: '10 minutes ago',
  },
];

// ─── Database Initialisation ────────────────────────────────────────
function initLocalDB(): LocalDB {
  const stored = localStorage.getItem('orbit_virtual_db');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      /* fall through */
    }
  }

  const db: LocalDB = {
    users: [...DEFAULT_USERS],
    posts: [...DEFAULT_POSTS],
    comments: [...DEFAULT_COMMENTS],
    follows: [
      { _id: 'f1', followerId: 'u2', followingId: 'u1', createdAt: new Date().toISOString() },
      { _id: 'f2', followerId: 'u1', followingId: 'u2', createdAt: new Date().toISOString() },
    ],
    likes: [
      { _id: 'l1', userId: 'u1', targetId: 'post_1', targetType: 'post' },
      { _id: 'l2', userId: 'u2', targetId: 'post_2', targetType: 'post' },
    ],
    saves: [{ _id: 's1', userId: 'u1', postId: 'post_1', createdAt: new Date().toISOString() }],
    reposts: [{ _id: 'rp1', userId: 'u2', postId: 'post_2', createdAt: new Date().toISOString() }],
    notifications: [
      {
        _id: 'notif_1',
        type: 'like',
        sender: {
          _id: 'u1',
          username: 'stella_orion',
          fullName: 'Stella Orion',
          profilePic: { url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop' },
        },
        post: { _id: 'post_1', title: 'The Gravity of Spacing in UI Engineering', slug: 'gravity-of-spacing-ui' },
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      },
      {
        _id: 'notif_2',
        type: 'follow',
        sender: {
          _id: 'u3',
          username: 'gravity_craft',
          fullName: 'Arthur Newton',
          profilePic: { url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop' },
        },
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      },
    ],
    currentUser: {
      _id: 'u2',
      username: 'alex_mercer',
      fullName: 'Alex Mercer',
      email: 'alex@orbit.social',
      gender: 'male',
      bio: 'Creative Director & UI/UX Craftsman. Pixel precision is not an option; it is gravity.',
      profilePic: {
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
        public_id: 'pic_alex',
      },
      bannerImage: {
        url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=300&fit=crop',
        public_id: 'banner_alex',
      },
      followersCount: 2901,
      followingCount: 421,
      createdAt: '2026-02-10T11:30:00Z',
    },
  };

  localStorage.setItem('orbit_virtual_db', JSON.stringify(db));
  return db;
}

let localDB = initLocalDB();

function saveDB() {
  localStorage.setItem('orbit_virtual_db', JSON.stringify(localDB));
}

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Mock API Object ────────────────────────────────────────────────
export const mockApi = {
  // ── GET ────────────────────────────────────────────────────────────
  get: async <T = any>(url: string, _config?: AxiosRequestConfig): Promise<{ data: T }> => {
    await delay();

    const normalizedUrl = url.replace(/^\/api/, '');

    // Suggested users
    if (normalizedUrl === '/users/suggested') {
      if (!localDB.currentUser) {
        return Promise.reject({ response: { status: 401, data: { success: false, message: 'Unauthorized' } } });
      }
      const followingIds = localDB.follows
        .filter((f) => f.followerId === localDB.currentUser._id)
        .map((f) => f.followingId);
      followingIds.push(localDB.currentUser._id);
      const suggested = localDB.users
        .filter((u) => !followingIds.includes(u._id))
        .slice(0, 5)
        .map((u) => ({
          _id: u._id,
          fullName: u.fullName,
          username: u.username,
          profilePic: u.profilePic,
          bio: u.bio,
          followersCount: u.followersCount,
        }));
      return { data: { success: true, users: suggested } as any };
    }

    // Pinned posts
    if (normalizedUrl.includes('/pinned')) {
      return { data: { success: true, posts: [] } as any };
    }

    // Save folders
    if (normalizedUrl === '/saves/folders') {
      return { data: { success: true, folders: ['default', 'inspiration', 'read-later'] } as any };
    }

    // Auth check
    if (normalizedUrl === '/auth/me' || normalizedUrl === '/users/me') {
      if (!localDB.currentUser) {
        return Promise.reject({
          response: { status: 401, data: { success: false, message: 'Unauthorized - No token' } },
        });
      }
      return { data: { success: true, user: localDB.currentUser } as any };
    }

    // List all users
    if (
      normalizedUrl.startsWith('/users') &&
      !normalizedUrl.includes('update-profile') &&
      !normalizedUrl.includes('share') &&
      !normalizedUrl.includes('view') &&
      normalizedUrl.match(/^\/users\/?(\?.*)?$/)
    ) {
      const q = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
      const limit = parseInt(q.get('limit') || '10', 10);
      const cursor = q.get('cursor');

      let filtered = [...localDB.users];
      let startIndex = 0;
      if (cursor) {
        const foundIndex = filtered.findIndex((u) => u._id === cursor);
        if (foundIndex !== -1) startIndex = foundIndex + 1;
      }

      const items = filtered.slice(startIndex, startIndex + limit);
      const hasMore = startIndex + limit < filtered.length;
      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]._id : undefined;

      return { data: { success: true, users: items, nextCursor, hasMore } as any };
    }

    // Single user by username
    if (normalizedUrl.startsWith('/users/profile/')) {
      const uname = normalizedUrl.replace('/users/profile/', '');
      const user = localDB.users.find((u) => u.username === uname);
      if (!user) {
        return Promise.reject({ response: { status: 404, data: { message: 'User profile not found!' } } });
      }
      return { data: { success: true, user } as any };
    }

    // Single user by ID
    if (
      normalizedUrl.startsWith('/users/') &&
      !normalizedUrl.includes('/') &&
      !normalizedUrl.endsWith('followers') &&
      !normalizedUrl.endsWith('following') &&
      !normalizedUrl.endsWith('view') &&
      !normalizedUrl.endsWith('share')
    ) {
      const userId = normalizedUrl.replace('/users/', '');
      const user = localDB.users.find((u) => u._id === userId);
      if (!user) return Promise.reject({ response: { status: 404, data: { message: 'User not found!' } } });
      return { data: { success: true, user } as any };
    }

    // Posts
    if (normalizedUrl.startsWith('/posts')) {
      const singlePostMatch = normalizedUrl.match(/^\/posts\/([a-zA-Z0-9_-]+)\/?$/);
      if (singlePostMatch) {
        const pId = singlePostMatch[1];
        const post = localDB.posts.find((p) => p._id === pId || p.slug === pId);
        if (!post) return Promise.reject({ response: { status: 404, data: { message: 'Post not found!' } } });

        const authorObj = localDB.users.find(
          (u) => u._id === (typeof post.author === 'string' ? post.author : post.author._id)
        );
        return {
          data: {
            success: true,
            post: {
              ...post,
              author: authorObj || post.author,
              likedByMe: localDB.currentUser
                ? localDB.likes.some(
                    (l) => l.userId === localDB.currentUser._id && l.targetId === post._id && l.targetType === 'post'
                  )
                : false,
              savedByMe: localDB.currentUser
                ? localDB.saves.some((s) => s.userId === localDB.currentUser._id && s.postId === post._id)
                : false,
              repostedByMe: localDB.currentUser
                ? localDB.reposts.some((r) => r.userId === localDB.currentUser._id && r.postId === post._id)
                : false,
            },
          } as any,
        };
      }

      if (normalizedUrl.startsWith('/posts?')) {
        const q = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
        const limit = parseInt(q.get('limit') || '10', 10);
        const cursor = q.get('cursor');
        const authorId = q.get('author') || q.get('userId');

        let items = [...localDB.posts];
        if (authorId)
          items = items.filter((p) => (typeof p.author === 'string' ? p.author : p.author._id) === authorId);

        items = items.map((p) => {
          const authorUser = localDB.users.find(
            (u) => u._id === (typeof p.author === 'string' ? p.author : p.author._id)
          );
          return {
            ...p,
            author: authorUser || p.author,
            likedByMe: localDB.currentUser
              ? localDB.likes.some(
                  (l) => l.userId === localDB.currentUser._id && l.targetId === p._id && l.targetType === 'post'
                )
              : false,
            savedByMe: localDB.currentUser
              ? localDB.saves.some((s) => s.userId === localDB.currentUser._id && s.postId === p._id)
              : false,
            repostedByMe: localDB.currentUser
              ? localDB.reposts.some((r) => r.userId === localDB.currentUser._id && r.postId === p._id)
              : false,
          };
        });

        let startIndex = 0;
        if (cursor) {
          const foundIdx = items.findIndex((p) => p._id === cursor);
          if (foundIdx !== -1) startIndex = foundIdx + 1;
        }

        const paged = items.slice(startIndex, startIndex + limit);
        const hasMore = startIndex + limit < items.length;
        const nextCursor = hasMore && paged.length > 0 ? paged[paged.length - 1]._id : undefined;

        return { data: { success: true, posts: paged, nextCursor, hasMore } as any };
      }
    }

    // Followers / Following
    if (normalizedUrl.startsWith('/follows/')) {
      const parts = normalizedUrl.split('/');
      const targetUserId = parts[2];
      const type = parts[3];
      const q = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
      const limit = parseInt(q.get('limit') || '10', 10);
      const cursor = q.get('cursor');

      let usersList: any[] = [];
      if (type === 'followers') {
        const followerIds = localDB.follows.filter((f) => f.followingId === targetUserId).map((f) => f.followerId);
        usersList = localDB.users.filter((u) => followerIds.includes(u._id));
      } else {
        const followingIds = localDB.follows.filter((f) => f.followerId === targetUserId).map((f) => f.followingId);
        usersList = localDB.users.filter((u) => followingIds.includes(u._id));
      }

      let startIndex = 0;
      if (cursor) {
        const found = usersList.findIndex((u) => u._id === cursor);
        if (found !== -1) startIndex = found + 1;
      }
      const page = usersList.slice(startIndex, startIndex + limit);
      const hasMore = startIndex + limit < usersList.length;
      const nextCursor = hasMore && page.length > 0 ? page[page.length - 1]._id : undefined;

      return { data: { success: true, users: page, nextCursor, hasMore } as any };
    }

    // Saved posts
    if (normalizedUrl.startsWith('/saves')) {
      const q = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
      const limit = parseInt(q.get('limit') || '10', 10);
      const cursor = q.get('cursor');

      if (!localDB.currentUser) return Promise.reject({ response: { status: 401, data: { message: 'Unauthorized' } } });

      const mySaves = localDB.saves.filter((s) => s.userId === localDB.currentUser?._id);
      let matchedPosts = localDB.posts.filter((p) => mySaves.some((s) => s.postId === p._id));

      matchedPosts = matchedPosts.map((p) => {
        const authorUser = localDB.users.find(
          (u) => u._id === (typeof p.author === 'string' ? p.author : p.author._id)
        );
        return {
          ...p,
          author: authorUser || p.author,
          likedByMe: localDB.likes.some(
            (l) => l.userId === localDB.currentUser?._id && l.targetId === p._id && l.targetType === 'post'
          ),
          savedByMe: true,
          repostedByMe: localDB.reposts.some((r) => r.userId === localDB.currentUser?._id && r.postId === p._id),
        };
      });

      let startIndex = 0;
      if (cursor) {
        const idx = matchedPosts.findIndex((p) => p._id === cursor);
        if (idx !== -1) startIndex = idx + 1;
      }
      const items = matchedPosts.slice(startIndex, startIndex + limit);
      const hasMore = startIndex + limit < matchedPosts.length;
      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]._id : undefined;

      return { data: { success: true, saves: items, nextCursor, hasMore } as any };
    }

    // Comments
    if (normalizedUrl.startsWith('/comments') && !normalizedUrl.startsWith('/comments/replies')) {
      const parts = normalizedUrl.split('/');
      const pId = parts[2];
      const q = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
      const limit = parseInt(q.get('limit') || '10', 10);
      const cursor = q.get('cursor');

      let postComments = localDB.comments.filter((c) => c.post === pId && !c.parent);
      postComments = postComments.map((c) => {
        const authorObj = localDB.users.find((u) => u._id === (typeof c.author === 'string' ? c.author : c.author._id));
        return {
          ...c,
          author: authorObj || c.author,
          likedByMe: localDB.currentUser
            ? localDB.likes.some(
                (l) => l.userId === localDB.currentUser._id && l.targetId === c._id && l.targetType === 'comment'
              )
            : false,
        };
      });

      let startIndex = 0;
      if (cursor) {
        const foundIdx = postComments.findIndex((c) => c._id === cursor);
        if (foundIdx !== -1) startIndex = foundIdx + 1;
      }
      const items = postComments.slice(startIndex, startIndex + limit);
      const hasMore = startIndex + limit < postComments.length;
      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]._id : undefined;

      return { data: { success: true, comments: items, nextCursor, hasMore } as any };
    }

    // Comment replies
    if (normalizedUrl.startsWith('/comments/replies/')) {
      const commentId = normalizedUrl.replace('/comments/replies/', '');
      const q = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
      const limit = parseInt(q.get('limit') || '10', 10);
      const cursor = q.get('cursor');

      let replies = localDB.comments.filter((c) => c.parent === commentId);
      replies = replies.map((r) => {
        const authorUser = localDB.users.find(
          (u) => u._id === (typeof r.author === 'string' ? r.author : r.author._id)
        );
        return {
          ...r,
          author: authorUser || r.author,
          likedByMe: localDB.currentUser
            ? localDB.likes.some(
                (l) => l.userId === localDB.currentUser._id && l.targetId === r._id && l.targetType === 'comment'
              )
            : false,
        };
      });

      let startIndex = 0;
      if (cursor) {
        const idx = replies.findIndex((r) => r._id === cursor);
        if (idx !== -1) startIndex = idx + 1;
      }
      const items = replies.slice(startIndex, startIndex + limit);
      const hasMore = startIndex + limit < replies.length;
      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]._id : undefined;

      return { data: { success: true, replies: items, nextCursor, hasMore } as any };
    }

    // Global comments
    if (normalizedUrl === '/comments') {
      const q = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
      const limit = parseInt(q.get('limit') || '10', 10);
      const cursor = q.get('cursor');

      let items = localDB.comments.map((c) => {
        const authorUser = localDB.users.find(
          (u) => u._id === (typeof c.author === 'string' ? c.author : c.author._id)
        );
        return {
          ...c,
          author: authorUser || c.author,
          likedByMe: localDB.currentUser
            ? localDB.likes.some(
                (l) => l.userId === localDB.currentUser._id && l.targetId === c._id && l.targetType === 'comment'
              )
            : false,
        };
      });

      let startIndex = 0;
      if (cursor) {
        const idx = items.findIndex((i) => i._id === cursor);
        if (idx !== -1) startIndex = idx + 1;
      }
      const page = items.slice(startIndex, startIndex + limit);
      const hasMore = startIndex + limit < items.length;
      const nextCursor = hasMore && page.length > 0 ? page[page.length - 1]._id : undefined;

      return { data: { success: true, comments: page, nextCursor, hasMore } as any };
    }

    // Notifications
    if (normalizedUrl.startsWith('/notifications')) {
      if (normalizedUrl.includes('unread-count')) {
        const unreadList = localDB.notifications.filter((n) => !n.isRead);
        return { data: { success: true, count: unreadList.length } as any };
      }

      const q = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
      const limit = parseInt(q.get('limit') || '10', 10);
      const cursor = q.get('cursor');

      let items = [...localDB.notifications].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      let startIndex = 0;
      if (cursor) {
        const idMatched = cursor.split('_')[1];
        if (idMatched) {
          const idx = items.findIndex((n) => n._id === idMatched);
          if (idx !== -1) startIndex = idx + 1;
        }
      }

      const page = items.slice(startIndex, startIndex + limit);
      const hasMore = startIndex + limit < items.length;
      const nextCursor =
        hasMore && page.length > 0
          ? `${new Date(page[page.length - 1].createdAt).getTime()}_${page[page.length - 1]._id}`
          : undefined;

      return { data: { success: true, notifications: page, nextCursor, hasMore } as any };
    }

    // Search
    if (normalizedUrl.startsWith('/search/')) {
      const q = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
      const queryStr = (q.get('q') || '').toLowerCase();
      const limit = parseInt(q.get('limit') || '10', 10);

      if (normalizedUrl.startsWith('/search/users')) {
        const hits = localDB.users
          .filter(
            (u) =>
              u.username.toLowerCase().includes(queryStr) ||
              u.fullName.toLowerCase().includes(queryStr) ||
              (u.bio && u.bio.toLowerCase().includes(queryStr))
          )
          .slice(0, limit);
        return { data: { success: true, users: hits } as any };
      }

      if (normalizedUrl.startsWith('/search/posts')) {
        const hits = localDB.posts
          .filter((p) => p.title.toLowerCase().includes(queryStr) || p.content.toLowerCase().includes(queryStr))
          .map((p) => {
            const authorUser = localDB.users.find(
              (u) => u._id === (typeof p.author === 'string' ? p.author : p.author._id)
            );
            return { ...p, author: authorUser || p.author };
          })
          .slice(0, limit);
        return { data: { success: true, posts: hits } as any };
      }
    }

    return Promise.reject({ response: { status: 404, data: { message: 'Path not found in mock router.' } } });
  },

  // ── POST ──────────────────────────────────────────────────────────
  post: async <T = any>(url: string, data?: any, _config?: AxiosRequestConfig): Promise<{ data: T }> => {
    await delay();

    const normalizedUrl = url.replace(/^\/api/, '');

    if (normalizedUrl === '/auth/login') {
      const { email, password } = data || {};
      if (!email || !password)
        return Promise.reject({
          response: { status: 400, data: { success: false, message: 'Email and password are required!' } },
        });

      const foundUser = localDB.users.find((u) => u.email === email);
      if (!foundUser)
        return Promise.reject({ response: { status: 400, data: { success: false, message: 'Invalid credentials!' } } });

      localDB.currentUser = foundUser;
      saveDB();
      return { data: { success: true, message: 'Logged in successfully!', user: foundUser } as any };
    }

    if (normalizedUrl === '/auth/signup') {
      let parsed: any = {};
      if (data instanceof FormData) {
        parsed.username = data.get('username');
        parsed.fullName = data.get('fullName');
        parsed.gender = data.get('gender');
        parsed.email = data.get('email');
        parsed.password = data.get('password');
        parsed.bio = data.get('bio');
      } else {
        parsed = data;
      }

      if (!parsed.username || !parsed.fullName || !parsed.email || !parsed.password) {
        return Promise.reject({
          response: { status: 400, data: { success: false, message: 'Required fields missing!' } },
        });
      }

      if (localDB.users.some((u) => u.username === parsed.username || u.email === parsed.email)) {
        return Promise.reject({
          response: { status: 400, data: { success: false, message: 'Username or email already exists!' } },
        });
      }

      const newUser = {
        _id: 'u_' + Date.now(),
        username: parsed.username.toLowerCase(),
        fullName: parsed.fullName,
        email: parsed.email,
        gender: parsed.gender || 'others',
        bio: parsed.bio || '',
        profilePic: {
          url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
          public_id: 'pic_new',
        },
        bannerImage: {
          url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&h=300&fit=crop',
          public_id: 'banner_new',
        },
        followersCount: 0,
        followingCount: 0,
        createdAt: new Date().toISOString(),
      };

      localDB.users.push(newUser);
      localDB.currentUser = newUser;
      saveDB();
      return { data: { success: true, message: 'Signup successful!', user: newUser } as any };
    }

    if (normalizedUrl === '/auth/logout') {
      localDB.currentUser = null;
      saveDB();
      return { data: { success: true, message: 'Logged out!' } as any };
    }

    if (normalizedUrl === '/posts') {
      if (!localDB.currentUser) return Promise.reject({ response: { status: 401, data: { message: 'Unauthorized' } } });

      let parsed: any = {};
      if (data instanceof FormData) {
        parsed.title = data.get('title');
        parsed.content = data.get('content');
      } else {
        parsed = data;
      }

      if (!parsed.title || !parsed.content) {
        return Promise.reject({
          response: { status: 400, data: { success: false, message: 'Title and content are required!' } },
        });
      }

      const newPost = {
        _id: 'post_' + Date.now(),
        title: parsed.title,
        slug: parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        content: parsed.content,
        image:
          Math.random() > 0.3
            ? {
                url: [
                  'https://images.unsplash.com/photo-1518364538800-6bcb3f25da49?w=800&h=450&fit=crop',
                  'https://images.unsplash.com/photo-1454789548928-9efd52dc4031?w=800&h=450&fit=crop',
                  'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&h=450&fit=crop',
                ][Math.floor(Math.random() * 3)],
                public_id: 'p_img_' + Date.now(),
              }
            : undefined,
        author: localDB.currentUser._id,
        likesCount: 0,
        commentsCount: 0,
        repostsCount: 0,
        savesCount: 0,
        sharesCount: 0,
        viewsCount: 1,
        createdAt: 'Just now',
      };

      localDB.posts.unshift(newPost);
      saveDB();
      return { data: { success: true, message: 'Post launched into orbit!', post: newPost } as any };
    }

    // Share
    if (normalizedUrl.startsWith('/posts/') && normalizedUrl.endsWith('/share')) {
      const pId = normalizedUrl.split('/')[2];
      const post = localDB.posts.find((p) => p._id === pId);
      if (post) {
        post.sharesCount = (post.sharesCount || 0) + 1;
        saveDB();
      }
      return { data: { success: true, shareUrl: `${window.location.origin}/post/${pId}` } as any };
    }

    // View record
    if (normalizedUrl.endsWith('/view')) {
      return { data: { success: true } as any };
    }

    // Share profile
    if (normalizedUrl.endsWith('/share')) {
      const uId = normalizedUrl.split('/')[2];
      const user = localDB.users.find((u) => u._id === uId);
      return { data: { success: true, shareUrl: `${window.location.origin}/profile/${user?.username || uId}` } as any };
    }

    // Password
    if (normalizedUrl === '/password/request-otp') {
      return { data: { success: true, message: 'Demo OTP (653021) sent to email!' } as any };
    }

    if (normalizedUrl === '/password/verify-and-forgot-password') {
      const { email, otp, newPassword } = data || {};
      if (!email || !otp || !newPassword)
        return Promise.reject({
          response: { status: 400, data: { success: false, message: 'All verify fields are required!' } },
        });
      if (otp !== '653021')
        return Promise.reject({
          response: { status: 400, data: { success: false, message: 'Invalid or expired OTP!' } },
        });
      return { data: { success: true, message: 'Password updated successfully! Re-login.' } as any };
    }

    if (normalizedUrl === '/password/update-password') {
      if (!localDB.currentUser) return Promise.reject({ response: { status: 401, data: { message: 'Unauthorized' } } });
      localDB.currentUser = null;
      saveDB();
      return { data: { success: true, message: 'Password updated! Re-login required.' } as any };
    }

    // Like post
    if (normalizedUrl.startsWith('/likes/post/')) {
      if (!localDB.currentUser)
        return Promise.reject({ response: { status: 401, data: { message: 'Login required' } } });
      const pId = normalizedUrl.replace('/likes/post/', '');
      const post = localDB.posts.find((p) => p._id === pId);
      if (!post) return Promise.reject({ response: { status: 404, data: { message: 'Post not found' } } });

      const existingLikeIdx = localDB.likes.findIndex(
        (l) => l.userId === localDB.currentUser._id && l.targetId === pId && l.targetType === 'post'
      );
      let liked = false;
      if (existingLikeIdx !== -1) {
        localDB.likes.splice(existingLikeIdx, 1);
        post.likesCount = Math.max(0, post.likesCount - 1);
        localDB.notifications = localDB.notifications.filter(
          (n) => !(n.type === 'like' && n.sender._id === localDB.currentUser._id && n.post?._id === pId)
        );
      } else {
        localDB.likes.push({
          _id: 'l' + Date.now(),
          userId: localDB.currentUser._id,
          targetId: pId,
          targetType: 'post',
        });
        post.likesCount += 1;
        liked = true;
        if (post.author !== localDB.currentUser._id) {
          localDB.notifications.push({
            _id: 'notif_' + Date.now(),
            type: 'like',
            sender: {
              _id: localDB.currentUser._id,
              username: localDB.currentUser.username,
              fullName: localDB.currentUser.fullName,
              profilePic: localDB.currentUser.profilePic,
            },
            post: { _id: post._id, title: post.title, slug: post.slug },
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
      saveDB();
      return { data: { success: true, liked, likesCount: post.likesCount } as any };
    }

    // Like comment
    if (normalizedUrl.startsWith('/likes/comment/')) {
      if (!localDB.currentUser)
        return Promise.reject({ response: { status: 401, data: { message: 'Login required' } } });
      const commentId = normalizedUrl.replace('/likes/comment/', '');
      const comment = localDB.comments.find((c) => c._id === commentId);
      if (!comment) return Promise.reject({ response: { status: 404, data: { message: 'Comment not found' } } });

      const idx = localDB.likes.findIndex(
        (l) => l.userId === localDB.currentUser._id && l.targetId === commentId && l.targetType === 'comment'
      );
      let liked = false;
      if (idx !== -1) {
        localDB.likes.splice(idx, 1);
        comment.likesCount = Math.max(0, comment.likesCount - 1);
      } else {
        localDB.likes.push({
          _id: 'lc' + Date.now(),
          userId: localDB.currentUser._id,
          targetId: commentId,
          targetType: 'comment',
        });
        comment.likesCount += 1;
        liked = true;
      }
      saveDB();
      return { data: { success: true, liked, likesCount: comment.likesCount } as any };
    }

    // Repost
    if (normalizedUrl.startsWith('/reposts/')) {
      if (!localDB.currentUser)
        return Promise.reject({ response: { status: 401, data: { message: 'Login required' } } });
      const pId = normalizedUrl.replace('/reposts/', '');
      const post = localDB.posts.find((p) => p._id === pId);
      if (!post) return Promise.reject({ response: { status: 404, data: { message: 'Post not found' } } });
      if (post.author === localDB.currentUser._id)
        return Promise.reject({
          response: { status: 400, data: { success: false, message: 'You cannot repost your own post!' } },
        });

      const idx = localDB.reposts.findIndex((r) => r.userId === localDB.currentUser._id && r.postId === pId);
      let reposted = false;
      if (idx !== -1) {
        localDB.reposts.splice(idx, 1);
        post.repostsCount = Math.max(0, post.repostsCount - 1);
        localDB.notifications = localDB.notifications.filter(
          (n) => !(n.type === 'repost' && n.sender._id === localDB.currentUser._id && n.post?._id === pId)
        );
      } else {
        localDB.reposts.push({
          _id: 'rp_' + Date.now(),
          userId: localDB.currentUser._id,
          postId: pId,
          createdAt: new Date().toISOString(),
        });
        post.repostsCount += 1;
        reposted = true;
        localDB.notifications.push({
          _id: 'notif_' + Date.now(),
          type: 'repost',
          sender: {
            _id: localDB.currentUser._id,
            username: localDB.currentUser.username,
            fullName: localDB.currentUser.fullName,
            profilePic: localDB.currentUser.profilePic,
          },
          post: { _id: post._id, title: post.title, slug: post.slug },
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
      saveDB();
      return { data: { success: true, reposted, repostsCount: post.repostsCount } as any };
    }

    // Save
    if (normalizedUrl.startsWith('/saves/')) {
      if (!localDB.currentUser)
        return Promise.reject({ response: { status: 401, data: { message: 'Login required' } } });
      const pId = normalizedUrl.replace('/saves/', '');
      const post = localDB.posts.find((p) => p._id === pId);
      if (!post) return Promise.reject({ response: { status: 404, data: { message: 'Post not found' } } });

      const idx = localDB.saves.findIndex((s) => s.userId === localDB.currentUser._id && s.postId === pId);
      let saved = false;
      if (idx !== -1) {
        localDB.saves.splice(idx, 1);
        post.savesCount = Math.max(0, post.savesCount - 1);
        localDB.notifications = localDB.notifications.filter(
          (n) => !(n.type === 'save' && n.sender._id === localDB.currentUser._id && n.post?._id === pId)
        );
      } else {
        localDB.saves.push({
          _id: 'sv_' + Date.now(),
          userId: localDB.currentUser._id,
          postId: pId,
          createdAt: new Date().toISOString(),
        });
        post.savesCount += 1;
        saved = true;
        if (post.author !== localDB.currentUser._id) {
          localDB.notifications.push({
            _id: 'notif_' + Date.now(),
            type: 'save',
            sender: {
              _id: localDB.currentUser._id,
              username: localDB.currentUser.username,
              fullName: localDB.currentUser.fullName,
              profilePic: localDB.currentUser.profilePic,
            },
            post: { _id: post._id, title: post.title, slug: post.slug },
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
      saveDB();
      return { data: { success: true, saved, savesCount: post.savesCount } as any };
    }

    // Pin / Unpin
    if (normalizedUrl.includes('/pin') || normalizedUrl.includes('/unpin')) {
      if (!localDB.currentUser)
        return Promise.reject({ response: { status: 401, data: { message: 'Login required' } } });
      return { data: { success: true, message: 'Post pinned/unpinned!', pinnedPosts: [] } as any };
    }

    // Folders
    if (normalizedUrl.startsWith('/saves/folders')) {
      return { data: { success: true, folders: ['General', 'Favorites', 'Read Later'] } as any };
    }

    // Follow
    if (normalizedUrl.startsWith('/follows/')) {
      if (!localDB.currentUser)
        return Promise.reject({ response: { status: 401, data: { message: 'Login required' } } });
      const targetUserId = normalizedUrl.replace('/follows/', '');
      if (targetUserId === localDB.currentUser._id)
        return Promise.reject({ response: { status: 400, data: { message: 'You cannot follow yourself!' } } });

      const targetUser = localDB.users.find((u) => u._id === targetUserId);
      if (!targetUser) return Promise.reject({ response: { status: 404, data: { message: 'Target user not found' } } });

      const existingFollowIdx = localDB.follows.findIndex(
        (f) => f.followerId === localDB.currentUser._id && f.followingId === targetUserId
      );
      let following = false;
      if (existingFollowIdx !== -1) {
        localDB.follows.splice(existingFollowIdx, 1);
        targetUser.followersCount = Math.max(0, targetUser.followersCount - 1);
        localDB.currentUser.followingCount = Math.max(0, localDB.currentUser.followingCount - 1);
        localDB.notifications = localDB.notifications.filter(
          (n) => !(n.type === 'follow' && n.sender._id === localDB.currentUser._id)
        );
      } else {
        localDB.follows.push({
          _id: 'fl_' + Date.now(),
          followerId: localDB.currentUser._id,
          followingId: targetUserId,
          createdAt: new Date().toISOString(),
        });
        targetUser.followersCount += 1;
        localDB.currentUser.followingCount += 1;
        following = true;
        localDB.notifications.push({
          _id: 'notif_' + Date.now(),
          type: 'follow',
          sender: {
            _id: localDB.currentUser._id,
            username: localDB.currentUser.username,
            fullName: localDB.currentUser.fullName,
            profilePic: localDB.currentUser.profilePic,
          },
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
      saveDB();
      return { data: { success: true, following } as any };
    }

    // Add comment
    if (normalizedUrl.startsWith('/comments/')) {
      if (!localDB.currentUser)
        return Promise.reject({ response: { status: 401, data: { message: 'Login required' } } });
      const pId = normalizedUrl.replace('/comments/', '');
      const post = localDB.posts.find((p) => p._id === pId);
      if (!post) return Promise.reject({ response: { status: 404, data: { message: 'Post not found' } } });

      const { content, parent } = data || {};
      if (!content)
        return Promise.reject({ response: { status: 400, data: { message: 'Comment content cannot be empty' } } });

      const newComment = {
        _id: 'comment_' + Date.now(),
        content,
        author: localDB.currentUser._id,
        post: pId,
        parent: parent || null,
        likesCount: 0,
        createdAt: 'Just now',
      };
      localDB.comments.push(newComment);
      post.commentsCount += 1;

      if (post.author !== localDB.currentUser._id && !parent) {
        localDB.notifications.push({
          _id: 'notif_' + Date.now(),
          type: 'comment',
          sender: {
            _id: localDB.currentUser._id,
            username: localDB.currentUser.username,
            fullName: localDB.currentUser.fullName,
            profilePic: localDB.currentUser.profilePic,
          },
          post: { _id: post._id, title: post.title, slug: post.slug },
          comment: { _id: newComment._id, content: newComment.content },
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
      saveDB();

      return {
        data: {
          success: true,
          message: 'Comment orbitalized!',
          comment: { ...newComment, author: localDB.currentUser },
        } as any,
      };
    }

    return Promise.reject({ response: { status: 404, data: { message: 'Method POST not found on mock router.' } } });
  },

  // ── PUT ────────────────────────────────────────────────────────────
  put: async <T = any>(url: string, data?: any, _config?: AxiosRequestConfig): Promise<{ data: T }> => {
    await delay();
    const normalizedUrl = url.replace(/^\/api/, '');

    // Folders
    if (normalizedUrl === '/saves/folders' || normalizedUrl.startsWith('/saves/folders/')) {
      return { data: { success: true, message: 'Folder updated!', folders: [] } as any };
    }

    // Update profile
    if (normalizedUrl === '/users/update-profile') {
      if (!localDB.currentUser) return Promise.reject({ response: { status: 401, data: { message: 'Unauthorized' } } });

      let parsed: any = {};
      if (data instanceof FormData) {
        parsed.username = data.get('username');
        parsed.fullName = data.get('fullName');
        parsed.gender = data.get('gender');
        parsed.bio = data.get('bio');
      } else {
        parsed = data;
      }

      const userIdx = localDB.users.findIndex((u) => u._id === localDB.currentUser._id);
      if (userIdx !== -1) {
        const u = localDB.users[userIdx];
        if (parsed.username) u.username = parsed.username.toLowerCase();
        if (parsed.fullName) u.fullName = parsed.fullName;
        if (parsed.gender) u.gender = parsed.gender;
        if (parsed.bio !== undefined) u.bio = parsed.bio;
        localDB.currentUser = { ...u };
        saveDB();
      }

      return { data: { success: true, message: 'Profile updated successfully!', user: localDB.currentUser } as any };
    }

    // Update post
    if (normalizedUrl.startsWith('/posts/')) {
      if (!localDB.currentUser) return Promise.reject({ response: { status: 401, data: { message: 'Unauthorized' } } });
      const pId = normalizedUrl.replace('/posts/', '');
      const postIdx = localDB.posts.findIndex((p) => p._id === pId);
      if (postIdx === -1) return Promise.reject({ response: { status: 404, data: { message: 'Post not found' } } });

      const post = localDB.posts[postIdx];
      if ((typeof post.author === 'string' ? post.author : post.author._id) !== localDB.currentUser._id) {
        return Promise.reject({
          response: { status: 403, data: { message: 'Forbidden - You do not own this post.' } },
        });
      }

      let parsed: any = {};
      if (data instanceof FormData) {
        parsed.title = data.get('title');
        parsed.content = data.get('content');
      } else {
        parsed = data;
      }

      if (parsed.title) {
        post.title = parsed.title;
        post.slug = parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      }
      if (parsed.content) post.content = parsed.content;
      saveDB();
      return { data: { success: true, message: 'Post updated successfully!', post } as any };
    }

    // Update comment
    if (normalizedUrl.startsWith('/comments/')) {
      if (!localDB.currentUser) return Promise.reject({ response: { status: 401, data: { message: 'Unauthorized' } } });
      const commentId = normalizedUrl.replace('/comments/', '');
      const commentIdx = localDB.comments.findIndex((c) => c._id === commentId);
      if (commentIdx === -1)
        return Promise.reject({ response: { status: 404, data: { message: 'Comment not found' } } });

      const comment = localDB.comments[commentIdx];
      if (comment.author !== localDB.currentUser._id)
        return Promise.reject({ response: { status: 403, data: { message: 'Forbidden' } } });

      const { content } = data || {};
      if (content) comment.content = content;
      saveDB();
      return { data: { success: true, comment } as any };
    }

    // Mark notifications as read
    if (normalizedUrl === '/notifications/mark-as-read') {
      localDB.notifications.forEach((n) => (n.isRead = true));
      saveDB();
      return { data: { success: true, message: 'All notifications orbit marked read!' } as any };
    }

    // Mark single notification as read
    if (normalizedUrl.startsWith('/notifications/mark-as-read/')) {
      const notifId = normalizedUrl.replace('/notifications/mark-as-read/', '');
      const findNotif = localDB.notifications.find((n) => n._id === notifId);
      if (findNotif) findNotif.isRead = true;
      saveDB();
      return { data: { success: true } as any };
    }

    return Promise.reject({ response: { status: 404, data: { message: 'Method PUT not found on mock router.' } } });
  },

  // ── PATCH ──────────────────────────────────────────────────────────
  patch: async <T = any>(url: string, data?: any, _config?: AxiosRequestConfig): Promise<{ data: T }> => {
    await delay();
    const normalizedUrl = url.replace(/^\/api/, '');

    if (normalizedUrl.includes('/folder')) {
      return { data: { success: true, message: 'Folder updated!' } as any };
    }

    return Promise.reject({ response: { status: 404, data: { message: 'Method PATCH not found on mock router.' } } });
  },

  // ── DELETE ─────────────────────────────────────────────────────────
  delete: async <T = any>(url: string, _config?: AxiosRequestConfig): Promise<{ data: T }> => {
    await delay();
    const normalizedUrl = url.replace(/^\/api/, '');

    // Delete post
    if (normalizedUrl.startsWith('/posts/')) {
      if (!localDB.currentUser) return Promise.reject({ response: { status: 401, data: { message: 'Unauthorized' } } });
      const pId = normalizedUrl.replace('/posts/', '');
      const idx = localDB.posts.findIndex((p) => p._id === pId);
      if (idx === -1) return Promise.reject({ response: { status: 404, data: { message: 'Post not found' } } });

      const post = localDB.posts[idx];
      if ((typeof post.author === 'string' ? post.author : post.author._id) !== localDB.currentUser._id) {
        return Promise.reject({ response: { status: 403, data: { message: 'Forbidden' } } });
      }

      localDB.posts.splice(idx, 1);
      localDB.comments = localDB.comments.filter((c) => c.post !== pId);
      localDB.saves = localDB.saves.filter((s) => s.postId !== pId);
      localDB.likes = localDB.likes.filter((l) => !(l.targetId === pId && l.targetType === 'post'));
      localDB.reposts = localDB.reposts.filter((r) => r.postId !== pId);
      localDB.notifications = localDB.notifications.filter((n) => n.post?._id !== pId);
      saveDB();
      return { data: { success: true, message: 'Post deleted from universe!' } as any };
    }

    // Delete comment
    if (normalizedUrl.startsWith('/comments/')) {
      if (!localDB.currentUser) return Promise.reject({ response: { status: 401, data: { message: 'Unauthorized' } } });
      const commentId = normalizedUrl.replace('/comments/', '');
      const commentIdx = localDB.comments.findIndex((c) => c._id === commentId);
      if (commentIdx === -1)
        return Promise.reject({ response: { status: 404, data: { message: 'Comment not found' } } });

      const comment = localDB.comments[commentIdx];
      if (comment.author !== localDB.currentUser._id)
        return Promise.reject({ response: { status: 403, data: { message: 'Forbidden' } } });

      localDB.comments = localDB.comments.filter((c) => c._id !== commentId && c.parent !== commentId);
      const post = localDB.posts.find((p) => p._id === comment.post);
      if (post) post.commentsCount = Math.max(0, post.commentsCount - 1);
      saveDB();
      return { data: { success: true, message: 'Comment and nested threads removed!' } as any };
    }

    // Delete folder
    if (normalizedUrl.startsWith('/saves/folders/')) {
      return { data: { success: true, message: 'Folder deleted!' } as any };
    }

    // Delete account
    if (normalizedUrl.startsWith('/users/delete-account')) {
      if (!localDB.currentUser) return Promise.reject({ response: { status: 401, data: { message: 'Unauthorized' } } });
      localDB.users = localDB.users.filter((u) => u._id !== localDB.currentUser._id);
      localDB.currentUser = null;
      saveDB();
      return { data: { success: true, message: 'Account deleted from orbit.' } as any };
    }

    return Promise.reject({ response: { status: 404, data: { message: 'Method DELETE not found on mock router.' } } });
  },
};
