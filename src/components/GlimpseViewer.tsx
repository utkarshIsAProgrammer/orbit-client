import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Eye, Users } from "lucide-react";
import type { Glimpse } from "../types";
import { apiFetch } from "../utils/api";
import { logger } from "../utils/logger";

interface GlimpseViewerProps {
  glimpses: Glimpse[];
  initialIndex: number;
  onClose: () => void;
  onView: (glimpseId: string) => void;
}

export default function GlimpseViewer({
  glimpses,
  initialIndex,
  onClose,
  onView,
}: GlimpseViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const progressRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentGlimpse = glimpses[currentIndex];

  // Duration each glimpse is shown (ms) — shorter when views are running out for urgency
  const DURATION = currentGlimpse?.viewsRemaining === 1 ? 3000 : 5000;

  // Mark glimpse as viewed on the server
  const markViewed = useCallback(
    async (glimpseId: string) => {
      if (viewedIds.has(glimpseId)) return;
      setViewedIds((prev) => new Set(prev).add(glimpseId));
      onView(glimpseId);

      try {
        await apiFetch(`/api/glimpses/${glimpseId}/view`, { method: "POST" });
      } catch (err) {
        logger.error("Failed to mark glimpse as viewed", err);
      }
    },
    [viewedIds, onView]
  );

  // Auto-advance progress
  useEffect(() => {
    if (isPaused || !currentGlimpse) return;

    progressRef.current = 0;
    setProgress(0);

    // Mark as viewed immediately when shown
    markViewed(currentGlimpse._id);

    const interval = 30; // update every 30ms for smooth progress
    const step = (interval / DURATION) * 100;

    timerRef.current = setInterval(() => {
      progressRef.current += step;
      setProgress(Math.min(progressRef.current, 100));

      if (progressRef.current >= 100) {
        clearInterval(timerRef.current!);
        // Advance to next glimpse
        if (currentIndex < glimpses.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          onClose();
        }
      }
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, currentGlimpse?._id, isPaused, DURATION, glimpses.length, onClose, markViewed]);

  // Handle tap left/right to navigate
  const handleContainerClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;

    if (x < third) {
      // Tap left — go to previous
      if (currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      }
    } else if (x > third * 2) {
      // Tap right — go to next
      if (currentIndex < glimpses.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        onClose();
      }
    } else {
      // Tap middle — toggle pause
      setIsPaused((prev) => !prev);
    }
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") {
        if (currentIndex < glimpses.length - 1) setCurrentIndex((prev) => prev + 1);
        else onClose();
      }
      if (e.key === "ArrowLeft") {
        if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
      }
      if (e.key === " ") {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, glimpses.length, onClose]);

  if (!currentGlimpse) return null;

  // Determine if this glimpse should be blinking (1 view left)
  const isBlinking = currentGlimpse.viewsRemaining === 1 && !currentGlimpse.viewedByMe;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={handleContainerClick}
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-6 right-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-all cursor-pointer"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative w-full max-w-2xl max-h-[90vh] mx-4" onClick={(e) => e.stopPropagation()}>
        {/* Progress bars row */}
        <div className="absolute -top-8 left-0 right-0 flex gap-1.5 z-10">
          {glimpses.map((g, idx) => (
            <div
              key={g._id}
              className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden"
            >
              <div
                className="h-full rounded-full transition-all duration-100 ease-linear"
                style={{
                  width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? "100%" : "0%",
                  backgroundColor: idx === currentIndex && isBlinking ? "#fbbf24" : "white",
                }}
              />
            </div>
          ))}
        </div>

        {/* Author info overlay at top */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
          <img
            src={currentGlimpse.author.profilePic?.url || ""}
            alt={currentGlimpse.author.fullName}
            className="h-10 w-10 rounded-full object-cover border-2 border-white/30 shadow-lg"
          />
          <div>
            <p className="text-sm font-bold text-white drop-shadow-lg">
              {currentGlimpse.author.fullName}
            </p>
            <p className="text-[10px] text-white/80 drop-shadow-lg">
              @{currentGlimpse.author.username}
            </p>
          </div>

          {/* Views remaining badge */}
          <div className={`ml-3 flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold ${
            isBlinking
              ? "bg-amber-500/30 text-amber-300 border border-amber-400/50"
              : "bg-white/10 text-white/80 border border-white/20"
          }`}>
            <Eye className="h-3 w-3" />
            {currentGlimpse.viewsRemaining}/{currentGlimpse.maxViews}
          </div>
        </div>

        {/* Blinking indicator when 1 view left */}
        {isBlinking && (
          <div className="absolute top-4 right-16 z-10">
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
              className="flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400/50 px-3 py-1 text-[10px] font-bold text-amber-300"
            >
              <Users className="h-3 w-3" />
              Only 1 view left!
            </motion.div>
          </div>
        )}

        {/* The glimpse media (image or video) */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl">
          {currentGlimpse.mediaType === "video" ? (
            <video
              src={currentGlimpse.media.url}
              className="w-full max-h-[80vh]"
              controls
              autoPlay
              muted
              playsInline
              draggable={false}
            />
          ) : (
            <img
              src={currentGlimpse.media.url}
              alt=""
              className="w-full object-contain max-h-[80vh]"
              draggable={false}
            />
          )}

          {/* Pause overlay */}
          <AnimatePresence>
            {isPaused && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black/30"
              >
                <div className="rounded-full bg-white/20 px-6 py-3 backdrop-blur-sm">
                  <p className="text-sm font-bold text-white">Paused</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tap hints on first load */}
          {progress < 5 && !isPaused && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-white/40">
              Tap sides to navigate · Tap center to pause
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
