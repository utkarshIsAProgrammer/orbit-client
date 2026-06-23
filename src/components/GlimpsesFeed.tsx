import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Loader2 } from "lucide-react";
import type { Glimpse, User } from "../types";
import { apiFetch } from "../utils/api";
import { logger } from "../utils/logger";
import GlimpseViewer from "./GlimpseViewer";

interface GlimpsesFeedProps {
  user: User | null;
}

export default function GlimpsesFeed({ user }: GlimpsesFeedProps) {
  const [glimpses, setGlimpses] = useState<Glimpse[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch glimpse feed
  const fetchGlimpses = async () => {
    try {
      const res = await apiFetch("/api/glimpses/feed");
      const data = await res.json();
      if (res.ok && data.success) {
        setGlimpses(data.glimpses || []);
      }
    } catch (err) {
      logger.error("Failed to load glimpses", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlimpses();
  }, []);

  // Listen for real-time glimpse events
  useEffect(() => {
    const handleGlimpseCreated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setGlimpses((prev) => {
        // Deduplicate
        if (prev.some((g) => g._id === detail._id)) return prev;
        return [detail, ...prev];
      });
    };

    const handleGlimpseViewed = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setGlimpses((prev) =>
        prev.map((g) => {
          if (g._id !== detail.glimpseId) return g;
          return {
            ...g,
            viewers: detail.viewers,
            viewsRemaining: detail.remainingViews,
          };
        })
      );
    };

    const handleGlimpseOneViewLeft = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setGlimpses((prev) =>
        prev.map((g) => {
          if (g._id !== detail.glimpseId) return g;
          return { ...g, viewsRemaining: 1 };
        })
      );
    };

    const handleGlimpseExpired = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setGlimpses((prev) => prev.filter((g) => g._id !== detail.glimpseId));
    };

    window.addEventListener("glimpse:created", handleGlimpseCreated);
    window.addEventListener("glimpse:viewed", handleGlimpseViewed);
    window.addEventListener("glimpse:one-view-left", handleGlimpseOneViewLeft);
    window.addEventListener("glimpse:expired", handleGlimpseExpired);

    return () => {
      window.removeEventListener("glimpse:created", handleGlimpseCreated);
      window.removeEventListener("glimpse:viewed", handleGlimpseViewed);
      window.removeEventListener("glimpse:one-view-left", handleGlimpseOneViewLeft);
      window.removeEventListener("glimpse:expired", handleGlimpseExpired);
    };
  }, []);

  // Handle creating a new glimpse
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCreating(true);
    try {
      const formData = new FormData();
      formData.append("media", file);

      const res = await apiFetch("/api/glimpses", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // The socket event will add it to the list
        // But also add it locally in case socket is slow
        setGlimpses((prev) => {
          if (prev.some((g) => g._id === data.glimpse._id)) return prev;
          return [data.glimpse, ...prev];
        });
      }    } catch (err) {
        logger.error("Failed to create glimpse", err);
        window.dispatchEvent(
          new CustomEvent("showToast", {
            detail: { message: "Failed to create glimpse. Image may be too large or unsupported.", type: "error" },
          })
        );
    } finally {
      setIsCreating(false);
      e.target.value = "";
    }
  };

  // Open viewer for a specific glimpse
  const handleOpenViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  // Mark a glimpse as viewed locally (optimistic update)
  const handleLocalView = (glimpseId: string) => {
    setGlimpses((prev) =>
      prev.map((g) => {
        if (g._id !== glimpseId) return g;
        const newRemaining = Math.max(0, g.viewsRemaining - 1);
        return {
          ...g,
          viewedByMe: true,
          viewsRemaining: newRemaining,
          viewers: [
            ...g.viewers,
            { user: user?._id || "", viewedAt: new Date().toISOString() },
          ],
        };
      })
    );
  };

  // Group glimpses by author (so one user's multiple glimpses show as a single ring)
  const authorsMap = new Map<string, { user: typeof glimpses[0]["author"]; glimpses: Glimpse[] }>();
  glimpses.forEach((g) => {
    if (!authorsMap.has(g.author._id)) {
      authorsMap.set(g.author._id, { user: g.author, glimpses: [] });
    }
    authorsMap.get(g.author._id)!.glimpses.push(g);
  });

  const authorGlimpses = Array.from(authorsMap.values());

  if (loading) {
    return (
      <div className="flex items-center gap-3 px-1 py-4 overflow-x-auto">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-zinc-800/60"
          />
        ))}
      </div>
    );
  }

  // Only show if there are glimpses or user can create one
  const hasGlimpses = glimpses.length > 0;

  return (
    <>
      <div className="relative w-full">
        <div
          ref={scrollRef}
          className="flex items-center gap-3 px-1 py-3 overflow-x-auto scrollbar-thin scroll-smooth"
          style={{ scrollbarWidth: "thin" }}
        >
          {/* Create glimpse button (only for authenticated users) */}
          {user && (
            <div className="flex flex-col items-center gap-1 shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isCreating}
                className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-zinc-600 hover:border-white/50 bg-zinc-900/50 hover:bg-zinc-800/50 transition-all cursor-pointer disabled:opacity-50"
                title="Add a glimpse"
              >
                {isCreating ? (
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                ) : (
                  <Plus className="h-5 w-5 text-zinc-400" />
                )}
              </button>
              <span className="text-[9px] font-bold text-zinc-500">Add</span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Only show glimpses section if there are glimpses */}
          {hasGlimpses && (
            <>
              {/* Divider line */}
              {user && (
                <div className="h-12 w-px bg-zinc-800 shrink-0" />
              )}

              {/* Author rings */}
              <AnimatePresence mode="popLayout">
                {authorGlimpses.map(({ user: author, glimpses: authorG }) => {
                  const allViewed = authorG.every((g) => g.viewedByMe);
                  const anyOneViewLeft = authorG.some(
                    (g) => g.viewsRemaining === 1
                  );
                  const unviewedCount = authorG.filter((g) => !g.viewedByMe).length;

                  return (
                    <motion.button
                      key={author._id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => {
                        // Open the first unviewed glimpse, or the first one
                        const firstUnviewed = authorG.find((g) => !g.viewedByMe);
                        const targetG = firstUnviewed || authorG[0];
                        const idx = glimpses.findIndex(
                          (g) => g._id === targetG._id
                        );
                        if (idx >= 0) handleOpenViewer(idx);
                      }}
                      className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer"
                    >
                      <div
                        className={`relative h-16 w-16 rounded-full p-[2.5px] transition-all ${
                          anyOneViewLeft && !allViewed
                            ? "bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500"
                            : allViewed
                            ? "bg-zinc-700"
                            : "bg-gradient-to-br from-violet-400 via-fuchsia-300 to-sky-400"
                        }`}
                      >
                        {/* Blink animation when 1 view left */}
                        {anyOneViewLeft && !allViewed && (
                          <motion.div
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                            className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500"
                          />
                        )}

                        <img
                          src={author.profilePic?.url || ""}
                          alt={author.fullName}
                          className="relative h-full w-full rounded-full object-cover border-2 border-zinc-950"
                        />

                        {/* Unviewed count badge */}
                        {unviewedCount > 0 && (
                          <div className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[8px] font-bold text-white border-2 border-zinc-950">
                            {unviewedCount}
                          </div>
                        )}

                        {/* Blinking "1 left" badge */}
                        {anyOneViewLeft && !allViewed && (
                          <motion.div
                            animate={{ opacity: [1, 0.4, 1] }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                            className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-full bg-amber-500 px-1.5 py-[1px] text-[7px] font-bold text-white border border-zinc-950 whitespace-nowrap"
                          >
                            1 left
                          </motion.div>
                        )}
                      </div>
                      <span
                        className={`text-[9px] font-bold truncate max-w-16 text-center ${
                          allViewed ? "text-zinc-500" : "text-zinc-300"
                        }`}
                      >
                        {author.fullName.split(" ")[0]}
                      </span>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </>
          )}

          {/* Empty state when no glimpses */}
          {!hasGlimpses && !loading && (
            <p className="text-[11px] text-zinc-500 py-4 pl-2">
              No glimpses yet — create one to share a moment
            </p>
          )}
        </div>
      </div>

      {/* Full-screen glimpse viewer */}
      <AnimatePresence>
        {viewerOpen && glimpses.length > 0 && (
          <GlimpseViewer
            glimpses={glimpses}
            initialIndex={viewerIndex}
            onClose={() => setViewerOpen(false)}
            onView={handleLocalView}
          />
        )}
      </AnimatePresence>
    </>
  );
}
