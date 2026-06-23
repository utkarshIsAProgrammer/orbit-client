import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import GlimpsesFeed from "../GlimpsesFeed";

vi.mock("../../utils/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    button: ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, whileHover, whileTap, ...rest } = props;
      return <button {...rest}>{children}</button>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("lucide-react", () => ({
  Plus: (props: any) => <span {...props}>Plus</span>,
  Loader2: (props: any) => <span {...props}>Loader2</span>,
}));

vi.mock("../GlimpseViewer", () => ({
  default: ({ glimpses, initialIndex, onClose }: any) => (
    <div data-testid="glimpse-viewer" data-count={glimpses.length} data-index={initialIndex}>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

const mockUser = {
  _id: "user1",
  username: "testuser",
  fullName: "Test User",
  email: "test@example.com",
  profilePic: { url: "/test.jpg" },
  followersCount: 10,
  followingCount: 5,
  postsCount: 3,
  viewsCount: 100,
  sharesCount: 2,
  createdAt: "2024-01-01T00:00:00Z",
};

const mockGlimpse = {
  _id: "glimpse1",
  author: {
    _id: "user2",
    username: "alice",
    fullName: "Alice",
    profilePic: { url: "/alice.jpg" },
  },
  media: { url: "/media.jpg" },
  mediaType: "image" as const,
  viewers: [],
  maxViews: 2,
  viewsRemaining: 2,
  viewedByMe: false,
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  createdAt: new Date().toISOString(),
};

describe("GlimpsesFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => "blob:mock");
    global.URL.revokeObjectURL = vi.fn();
  });

  it("renders loading skeleton initially", () => {
    render(<GlimpsesFeed user={mockUser} />);
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows empty state and file input accepts images and videos", async () => {
    const { apiFetch } = await import("../../utils/api");
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, glimpses: [] }),
    });

    render(<GlimpsesFeed user={mockUser} />);

    const emptyText = await screen.findByText(/No glimpses yet/i);
    expect(emptyText).toBeInTheDocument();

    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("accept", "image/*,video/*");
  });

  it("renders without crashing when no user is provided", () => {
    const { container } = render(<GlimpsesFeed user={null} />);
    expect(container).toBeInTheDocument();
  });

  it("renders glimpse rings after loading completes", async () => {
    const { apiFetch } = await import("../../utils/api");
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, glimpses: [mockGlimpse] }),
    });

    render(<GlimpsesFeed user={mockUser} />);

    // Wait for glimpse author name to appear (Alice)
    const authorName = await screen.findByText("Alice");
    expect(authorName).toBeInTheDocument();
  });
});
