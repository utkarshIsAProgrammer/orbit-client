import React, { useRef, useState } from "react";
import { Check, CheckCheck, Loader2, CornerDownLeft } from "lucide-react";
import type { Message } from "../types";

interface MessageBubbleProps {
  msg: Message;
  isMe: boolean;
  userId: string;
  groupedReactions: Record<string, { count: number; hasReacted: boolean }>;
  handleContextMenu: (e: React.MouseEvent | { clientX: number; clientY: number; preventDefault: () => void }, message: Message) => void;
  handleReaction: (message: Message, emoji: string) => void;
  formatMessageTime: (isoString: string) => string;
  onSwipeToReply?: (message: Message) => void;
}

function arePropsEqual(prev: MessageBubbleProps, next: MessageBubbleProps): boolean {
  if (prev.msg._id !== next.msg._id) return false;
  if (prev.msg.text !== next.msg.text) return false;
  if (prev.msg.isDeleted !== next.msg.isDeleted) return false;
  if (prev.msg.seen !== next.msg.seen) return false;
  if (prev.msg.isEdited !== next.msg.isEdited) return false;
  if (prev.isMe !== next.isMe) return false;

  // Compare replyTo
  if (prev.msg.replyTo?._id !== next.msg.replyTo?._id) return false;
  if (prev.msg.replyTo?.text !== next.msg.replyTo?.text) return false;

  // Compare reactions deeply
  const prevReactions = prev.msg.reactions || [];
  const nextReactions = next.msg.reactions || [];
  if (prevReactions.length !== nextReactions.length) return false;
  for (let i = 0; i < prevReactions.length; i++) {
    const pr = prevReactions[i];
    const nr = nextReactions[i];
    if (pr.emoji !== nr.emoji) return false;
    const pSender = typeof pr.sender === "string" ? pr.sender : pr.sender?._id;
    const nSender = typeof nr.sender === "string" ? nr.sender : nr.sender?._id;
    if (pSender !== nSender) return false;
  }

  // Compare grouped reactions
  const prevKeys = Object.keys(prev.groupedReactions);
  const nextKeys = Object.keys(next.groupedReactions);
  if (prevKeys.length !== nextKeys.length) return false;
  for (const key of prevKeys) {
    if (!next.groupedReactions[key]) return false;
    if (prev.groupedReactions[key].count !== next.groupedReactions[key].count) return false;
    if (prev.groupedReactions[key].hasReacted !== next.groupedReactions[key].hasReacted) return false;
  }

  // Compare attachments
  const prevAttachments = prev.msg.attachments || [];
  const nextAttachments = next.msg.attachments || [];
  if (prevAttachments.length !== nextAttachments.length) return false;

  return true;
}

const MessageBubble = React.memo(function MessageBubble({
  msg,
  isMe,
  userId,
  groupedReactions,
  handleContextMenu,
  handleReaction,
  formatMessageTime,
  onSwipeToReply,
}: MessageBubbleProps) {
  // Swipe-to-reply state — ref-based for 60fps
  const [showSwipeBadge, setShowSwipeBadge] = useState(false);
  const swipeBarRef = useRef<HTMLDivElement>(null);
  const swipeOffsetRef = useRef(0);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const isSwipingRef = useRef(false);

  // Long-press timer
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    isSwipingRef.current = false;
    swipeOffsetRef.current = 0;
    setShowSwipeBadge(false);
    if (swipeBarRef.current) {
      swipeBarRef.current.style.transition = '';
      swipeBarRef.current.style.transform = isMe ? 'translateX(6px)' : 'translateX(-6px)';
      swipeBarRef.current.style.opacity = '0';
    }

    touchTimerRef.current = setTimeout(() => {
      // Long press context menu (only if not swiping)
      if (!isSwipingRef.current && touch) {
        const msgEl = document.getElementById(`msg-${msg._id}`);
        const msgRect = msgEl?.getBoundingClientRect();
        const x = msgRect ? (isMe ? msgRect.right : msgRect.left) : touch.clientX;
        const y = msgRect ? msgRect.bottom + 4 : touch.clientY;
        handleContextMenu(
          { clientX: x, clientY: y, preventDefault: () => {} } as any,
          msg
        );
      }
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;

    // Only start swipe if horizontal movement exceeds vertical by enough margin
    if (!isSwipingRef.current && Math.abs(deltaX) > 15 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      isSwipingRef.current = true;
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
    }

    if (isSwipingRef.current) {
      const maxOffset = 100;
      const offset = isMe
        ? Math.min(Math.max(0, -deltaX), maxOffset)
        : Math.min(Math.max(0, deltaX), maxOffset);
      swipeOffsetRef.current = offset;

      // Direct CSS transform for 60fps
      if (swipeBarRef.current) {
        const barX = isMe ? -offset + (offset > 0 ? 6 : 0) : offset - 6;
        swipeBarRef.current.style.transition = 'none';
        swipeBarRef.current.style.transform = `translateX(${barX}px)`;
        swipeBarRef.current.style.opacity = offset > 0 ? '1' : '0';
      }

      if (offset > 20 && !showSwipeBadge) {
        setShowSwipeBadge(true);
      } else if (offset <= 20 && showSwipeBadge) {
        setShowSwipeBadge(false);
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }

    if (isSwipingRef.current && swipeOffsetRef.current > 60 && onSwipeToReply) {
      onSwipeToReply(msg);
    }

    swipeOffsetRef.current = 0;
    setShowSwipeBadge(false);
    if (swipeBarRef.current) {
      swipeBarRef.current.style.transform = isMe ? 'translateX(6px)' : 'translateX(-6px)';
      swipeBarRef.current.style.opacity = '0';
    }
    isSwipingRef.current = false;
    touchStartXRef.current = 0;
    touchStartYRef.current = 0;
  };

  // Check if message was deleted for current user
  const deletedForMe = msg.deletedFor?.includes(userId);

  return (
    <div
      id={`msg-${msg._id}`}
      className={`relative overflow-hidden flex gap-3 max-w-[85%] ${isMe ? "ml-auto flex-row-reverse" : "mr-auto"}`}
      onContextMenu={(e) => handleContextMenu(e, msg)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {/* Swipe-to-reply visual indicator — CSS transform for 60fps */}
      <div
        ref={swipeBarRef}
        className={`absolute inset-y-0 w-1.5 bg-indigo-500/50 pointer-events-none ${isMe ? "right-0 rounded-l-full rounded-r-none" : "left-0 rounded-r-full"}`}
        style={{ transform: isMe ? 'translateX(6px)' : 'translateX(-6px)', opacity: 0, transition: 'transform 200ms ease-out, opacity 200ms ease-out' }}
      />
      {/* Reply icon that slides in on swipe */}
      {showSwipeBadge && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 z-10 pointer-events-none ${isMe ? "right-3" : "left-3"}`}
        >
          <div className="flex items-center gap-1.5 bg-indigo-500/20 backdrop-blur-sm rounded-full px-2.5 py-1 border border-indigo-400/30">
            <CornerDownLeft className="h-3 w-3 text-indigo-300" />
            <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider">Reply</span>
          </div>
        </div>
      )}
      {!isMe && (
        <div className="w-8 shrink-0 flex items-end">
          <img loading="lazy"
            src={msg.sender.profilePic?.url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100"}
            alt={msg.sender.fullName}
            className="h-7 w-7 rounded-full object-cover border border-zinc-800"
          />
        </div>
      )}

      <div className="space-y-1 text-left flex flex-col items-end">
        <div
          className={`rounded-2xl px-3.5 py-2 text-xs border relative group/bubble select-text ${
            isMe
              ? "bg-indigo-950/70 text-white border-indigo-800/40 rounded-tr-none"
              : "bg-zinc-900/80 text-zinc-100 border-zinc-800 rounded-tl-none"
          }`}
        >
          {msg.isDeleted || deletedForMe ? (
            <span className="italic text-zinc-500 text-[11px]">This message was deleted</span>
          ) : (
            <>
              {msg.replyTo && (
                <div
                  className="flex items-start gap-2 mb-2 pb-2 border-l-2 border-blue-500/40 pl-2.5 cursor-pointer hover:bg-zinc-800/30 rounded-r-lg -ml-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Scroll to the replied message if it's in view
                    const el = document.getElementById(`msg-${msg.replyTo?._id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "center" });
                      el.classList.add("ring-1", "ring-blue-500/30", "rounded-2xl");
                      setTimeout(() => el.classList.remove("ring-1", "ring-blue-500/30", "rounded-2xl"), 2000);
                    }
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider leading-tight">
                      {msg.replyTo.sender.fullName}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate leading-relaxed mt-0.5">
                      {msg.replyTo.text || (msg.replyTo.attachments && msg.replyTo.attachments.length > 0 ? "📎 Attachment" : "")}
                    </p>
                  </div>
                  <CornerDownLeft className="h-3 w-3 text-zinc-500 shrink-0 mt-1" />
                </div>
              )}
              <p className="leading-relaxed whitespace-pre-wrap select-text break-word pr-1.5">{msg.text}</p>
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mt-2 space-y-1.5 max-w-sm rounded-xl overflow-hidden border border-zinc-800">
                  {msg.attachments.map((att, aIdx) => (
                    <img loading="lazy"
                      key={aIdx}
                      src={att.url}
                      alt={`Attachment from ${msg.sender.fullName}`}
                      className="w-full h-auto max-h-60 object-cover cursor-pointer hover:opacity-90"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent("openImagePreview", { detail: att.url }));
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {Object.keys(groupedReactions).length > 0 && !msg.isDeleted && !deletedForMe && (
          <div className="flex gap-1 mt-1">
            {Object.entries(groupedReactions).map(([emoji, data]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(msg, emoji)}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${
                  data.hasReacted
                    ? "bg-indigo-500/20 border-indigo-400/30"
                    : "bg-zinc-800/50 border-zinc-700/50"
                }`}
              >
                <span>{emoji}</span>
                <span className="text-[10px]">{data.count}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 px-1.5 text-[9px] font-bold text-zinc-550 select-none">
          {msg.isEdited && !msg.isDeleted && !deletedForMe && <span>edited</span>}
          <span>{formatMessageTime(msg.createdAt)}</span>
          {isMe && (
            <span title={(msg as any)._pending ? 'Sending...' : msg.seen ? 'Seen' : 'Sent'}>
              {(msg as any)._pending ? (
                <Loader2 className="h-3 w-3 text-zinc-550 animate-spin" />
              ) : msg.seen ? (
                <CheckCheck className="h-3.5 w-3.5 text-sky-400" />
              ) : (
                <Check className="h-3.5 w-3.5 text-zinc-550" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}, arePropsEqual);

export default MessageBubble;
