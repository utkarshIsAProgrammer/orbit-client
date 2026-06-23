import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import GlimpseViewer from "../GlimpseViewer";

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
  X: (props: any) => <span {...props}>X</span>,
  Eye: (props: any) => <span {...props}>Eye</span>,
  Users: (props: any) => <span {...props}>Users</span>,
}));

const imageGlimpse = {
  _id: "glimpse1",
  author: {
    _id: "user1",
    username: "alice",
    fullName: "Alice",
    profilePic: { url: "/alice.jpg" },
  },
  media: { url: "/image.jpg" },
  mediaType: "image" as const,
  viewers: [],
  maxViews: 2,
  viewsRemaining: 2,
  viewedByMe: false,
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  createdAt: new Date().toISOString(),
};

const videoGlimpse = {
  ...imageGlimpse,
  _id: "glimpse2",
  media: { url: "/video.mp4" },
  mediaType: "video" as const,
  viewsRemaining: 1,
};

const defaultProps = {
  glimpses: [imageGlimpse, videoGlimpse],
  initialIndex: 0,
  onClose: vi.fn(),
  onView: vi.fn(),
};

describe("GlimpseViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    global.URL.createObjectURL = vi.fn(() => "blob:mock");
    global.URL.revokeObjectURL = vi.fn();
  });

  it("renders an <img> for image-type glimpses", () => {
    render(<GlimpseViewer {...defaultProps} />);
    const img = screen.getByAltText("");
    expect(img.tagName).toBe("IMG");
    expect(img).toHaveAttribute("src", "/image.jpg");
  });

  it("renders a <video> element for video-type glimpses", () => {
    render(<GlimpseViewer {...defaultProps} initialIndex={1} />);
    const video = document.querySelector("video");
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute("src", "/video.mp4");
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveAttribute("autoPlay");
    expect(video).toHaveAttribute("playsInline");
  });

  it("shows urgency badge when viewsRemaining is 1", () => {
    render(<GlimpseViewer {...defaultProps} initialIndex={1} />);
    expect(screen.getByText("Only 1 view left!")).toBeInTheDocument();
  });

  it("renders views remaining badge with correct count", () => {
    render(<GlimpseViewer {...defaultProps} />);
    expect(screen.getByText("2/2")).toBeInTheDocument();
  });

  it("renders without crashing when given an empty array", () => {
    const { container } = render(
      <GlimpseViewer glimpses={[]} initialIndex={0} onClose={vi.fn()} onView={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });
});
