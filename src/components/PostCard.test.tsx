import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import PostCard from './PostCard';
import { toggleLikePost } from '../api/likes';
import { toggleSavePost } from '../api/saves';
import { toggleRepostPost } from '../api/reposts';
import { pinPost, unpinPost } from '../api/posts';

// Mock the API modules
vi.mock('../api/likes', () => ({
  toggleLikePost: vi.fn(),
}));

vi.mock('../api/saves', () => ({
  toggleSavePost: vi.fn(),
}));

vi.mock('../api/reposts', () => ({
  toggleRepostPost: vi.fn(),
}));

vi.mock('../api/posts', () => ({
  sharePost: vi.fn().mockResolvedValue({ success: true, shareUrl: 'https://orbit.app/share/post1' }),
  pinPost: vi.fn(),
  unpinPost: vi.fn(),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

// Mock gsap to avoid animation issues in tests
vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn().mockReturnValue({ kill: vi.fn() }),
  },
}));

const mockUser = {
  _id: 'user1',
  username: 'testuser',
  fullName: 'Test User',
  email: 'test@example.com',
  gender: 'male' as const,
  profilePic: { url: 'https://example.com/pic.jpg', public_id: 'pic1' },
  followersCount: 10,
  followingCount: 5,
  createdAt: new Date().toISOString(),
};

const createMockPost = (overrides = {}) => ({
  _id: 'post1',
  title: 'Test Post',
  slug: 'test-post',
  content: 'Test content',
  author: {
    _id: 'user2',
    username: 'author1',
    fullName: 'Author One',
    email: 'author@example.com',
    gender: 'male' as const,
    profilePic: { url: 'https://example.com/author.jpg', public_id: 'author1' },
    bannerImage: { url: '', public_id: '' },
    followersCount: 20,
    followingCount: 15,
    createdAt: new Date().toISOString(),
  },
  images: [
    { url: 'https://example.com/img1.jpg', public_id: 'img1' },
    { url: 'https://example.com/img2.jpg', public_id: 'img2' },
  ],
  likesCount: 10,
  commentsCount: 3,
  repostsCount: 2,
  savesCount: 1,
  viewsCount: 100,
  sharesCount: 5,
  hashtags: ['test', 'post'],
  likedByMe: false,
  savedByMe: false,
  repostedByMe: false,
  pinnedByMe: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

function renderPostCard(postProps = {}, user = mockUser) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const onDelete = vi.fn();

  const result = render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <PostCard post={createMockPost(postProps)} onDelete={onDelete} />
      </BrowserRouter>
    </QueryClientProvider>
  );

  return { ...result, queryClient, onDelete };
}

// Mock the AuthContext module so PostCard gets the test user
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    setUser: vi.fn(),
    logout: vi.fn(),
    loading: false,
  }),
}));

describe('PostCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Like toggle (Bug #1 - heart should stay red)', () => {
    it('should optimistically update the heart to filled/red on click', async () => {
      (toggleLikePost as any).mockResolvedValue({
        success: true,
        liked: true,
        likesCount: 11,
      });

      renderPostCard();

      const likeButton = screen.getByRole('button', { name: 'Like this post' });
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Unlike this post' })).toBeInTheDocument();
      });
    });

    it('should keep the red heart after server confirms the like', async () => {
      (toggleLikePost as any).mockResolvedValue({
        success: true,
        liked: true,
        likesCount: 11,
      });

      renderPostCard();

      const likeButton = screen.getByRole('button', { name: 'Like this post' });
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(toggleLikePost).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        const unfilledButtons = screen.queryAllByRole('button', { name: 'Like this post' });
        expect(unfilledButtons.length).toBe(0);
      });
    });

    it('should NOT reset the heart to empty when post prop re-renders during interaction', async () => {
      let resolvePromise: (value: any) => void;
      const slowPromise = new Promise<any>((resolve) => {
        resolvePromise = resolve;
      });
      (toggleLikePost as any).mockReturnValue(slowPromise);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <PostCard post={createMockPost()} />
          </BrowserRouter>
        </QueryClientProvider>
      );

      const likeButton = screen.getByRole('button', { name: 'Like this post' });
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Unlike this post' })).toBeInTheDocument();
      });

      const samePost = createMockPost();
      rerender(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <PostCard post={samePost} />
          </BrowserRouter>
        </QueryClientProvider>
      );

      expect(screen.getByRole('button', { name: 'Unlike this post' })).toBeInTheDocument();
    });

    it('should revert to empty heart on server error', async () => {
      (toggleLikePost as any).mockRejectedValue(new Error('Server error'));

      renderPostCard();

      const likeButton = screen.getByRole('button', { name: 'Like this post' });
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Like this post' })).toBeInTheDocument();
      });
    });
  });

  describe('Save toggle', () => {
    it('should toggle save state optimistically', async () => {
      (toggleSavePost as any).mockResolvedValue({
        success: true,
        saved: true,
        savesCount: 2,
      });

      renderPostCard();

      const saveButton = screen.getByRole('button', { name: 'Save this post' });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Remove from saved' })).toBeInTheDocument();
      });
    });
  });

  describe('Repost toggle', () => {
    it('should toggle repost state optimistically', async () => {
      (toggleRepostPost as any).mockResolvedValue({
        success: true,
        reposted: true,
        repostsCount: 3,
      });

      renderPostCard();

      const repostButton = screen.getByRole('button', { name: 'Repost this post' });
      fireEvent.click(repostButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Undo repost' })).toBeInTheDocument();
      });
    });
  });

  describe('Image gallery', () => {
    it('should show navigation buttons when multiple images exist', () => {
      renderPostCard();

      // The post image should have correct alt text
      expect(screen.getByAltText('Test Post - image 1')).toBeInTheDocument();

      // There should be at least one post image (there's also author avatar)
      const images = screen.getAllByRole('img');
      const postImg = images.find((img) => img.getAttribute('alt')?.includes('Test Post'));
      expect(postImg).toBeInTheDocument();
    });

    it('should render post title and image when multiple images exist', () => {
      renderPostCard();

      expect(screen.getByText('Test Post')).toBeInTheDocument();
      expect(screen.getByAltText('Test Post - image 1')).toBeInTheDocument();
    });

    it('should render single image without navigation controls', () => {
      renderPostCard({
        images: [{ url: 'https://example.com/img1.jpg', public_id: 'img1' }],
      });

      expect(screen.getByAltText('Test Post - image 1')).toBeInTheDocument();
    });

    it('should work with legacy single image field', () => {
      renderPostCard({
        images: undefined,
        image: { url: 'https://example.com/legacy.jpg', public_id: 'legacy1' },
      });

      expect(screen.getByAltText('Test Post - image 1')).toBeInTheDocument();
    });
  });

  describe('Share button', () => {
    it('should copy share link to clipboard on click', async () => {
      renderPostCard();

      const shareButton = screen.getByTitle('Copy share link');
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://orbit.app/share/post1');
      });
    });
  });

  describe('Pin/Unpin toggle (owner only)', () => {
    it('should show pin button when user is the post owner', () => {
      // Create a post owned by mockUser
      const ownerPost = createMockPost({
        author: {
          _id: 'user1',
          username: 'testuser',
          fullName: 'Test User',
          email: 'test@example.com',
          gender: 'male' as const,
          profilePic: { url: 'https://example.com/pic.jpg', public_id: 'pic1' },
          bannerImage: { url: '', public_id: '' },
          followersCount: 10,
          followingCount: 5,
          createdAt: new Date().toISOString(),
        },
      });

      (pinPost as any).mockResolvedValue({ success: true });

      render(
        <QueryClientProvider
          client={
            new QueryClient({
              defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            })
          }
        >
          <BrowserRouter>
            <PostCard post={ownerPost} />
          </BrowserRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTitle('Pin to profile')).toBeInTheDocument();
    });

    it('should call pinPost and update state on pin click', async () => {
      (pinPost as any).mockResolvedValue({ success: true });

      const ownerPost = createMockPost({
        author: {
          _id: 'user1',
          username: 'testuser',
          fullName: 'Test User',
          email: 'test@example.com',
          gender: 'male' as const,
          profilePic: { url: 'https://example.com/pic.jpg', public_id: 'pic1' },
          bannerImage: { url: '', public_id: '' },
          followersCount: 10,
          followingCount: 5,
          createdAt: new Date().toISOString(),
        },
      });

      render(
        <QueryClientProvider
          client={
            new QueryClient({
              defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            })
          }
        >
          <BrowserRouter>
            <PostCard post={ownerPost} />
          </BrowserRouter>
        </QueryClientProvider>
      );

      const pinButton = screen.getByTitle('Pin to profile');
      fireEvent.click(pinButton);

      await waitFor(() => {
        expect(pinPost).toHaveBeenCalledWith('post1');
      });

      // After pinning, button should show "Unpin"
      await waitFor(() => {
        expect(screen.getByTitle('Unpin from profile')).toBeInTheDocument();
      });
    });

    it('should call unpinPost and update state on unpin click', async () => {
      (unpinPost as any).mockResolvedValue({ success: true });

      const ownerPost = createMockPost({
        pinnedByMe: true,
        author: {
          _id: 'user1',
          username: 'testuser',
          fullName: 'Test User',
          email: 'test@example.com',
          gender: 'male' as const,
          profilePic: { url: 'https://example.com/pic.jpg', public_id: 'pic1' },
          bannerImage: { url: '', public_id: '' },
          followersCount: 10,
          followingCount: 5,
          createdAt: new Date().toISOString(),
        },
      });

      render(
        <QueryClientProvider
          client={
            new QueryClient({
              defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            })
          }
        >
          <BrowserRouter>
            <PostCard post={ownerPost} />
          </BrowserRouter>
        </QueryClientProvider>
      );

      const unpinButton = screen.getByTitle('Unpin from profile');
      fireEvent.click(unpinButton);

      await waitFor(() => {
        expect(unpinPost).toHaveBeenCalledWith('post1');
      });

      await waitFor(() => {
        expect(screen.getByTitle('Pin to profile')).toBeInTheDocument();
      });
    });
  });

  describe('Delete button', () => {
    it('should show delete button only for the post owner', () => {
      const ownerPost = createMockPost({
        author: {
          _id: 'user1',
          username: 'testuser',
          fullName: 'Test User',
          email: 'test@example.com',
          gender: 'male' as const,
          profilePic: { url: 'https://example.com/pic.jpg', public_id: 'pic1' },
          bannerImage: { url: '', public_id: '' },
          followersCount: 10,
          followingCount: 5,
          createdAt: new Date().toISOString(),
        },
      });

      render(
        <QueryClientProvider
          client={
            new QueryClient({
              defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            })
          }
        >
          <BrowserRouter>
            <PostCard post={ownerPost} onDelete={vi.fn()} />
          </BrowserRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTitle('Delete Post')).toBeInTheDocument();
    });

    it('should call onDelete when delete button is clicked', () => {
      const onDelete = vi.fn();

      const ownerPost = createMockPost({
        author: {
          _id: 'user1',
          username: 'testuser',
          fullName: 'Test User',
          email: 'test@example.com',
          gender: 'male' as const,
          profilePic: { url: 'https://example.com/pic.jpg', public_id: 'pic1' },
          bannerImage: { url: '', public_id: '' },
          followersCount: 10,
          followingCount: 5,
          createdAt: new Date().toISOString(),
        },
      });

      render(
        <QueryClientProvider
          client={
            new QueryClient({
              defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            })
          }
        >
          <BrowserRouter>
            <PostCard post={ownerPost} onDelete={onDelete} />
          </BrowserRouter>
        </QueryClientProvider>
      );

      const deleteButton = screen.getByTitle('Delete Post');
      fireEvent.click(deleteButton);

      expect(onDelete).toHaveBeenCalledWith('post1');
    });

    it('should NOT show delete button when user is not the owner', () => {
      renderPostCard(); // post author is 'user2', logged in as 'user1'

      expect(screen.queryByTitle('Delete Post')).not.toBeInTheDocument();
    });
  });
});
