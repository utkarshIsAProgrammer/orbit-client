import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  Send,
  Image as ImageIcon,
  Search,
  Smile,
  Trash2,
  Edit2,
  X,
  Check,
  CheckCheck,
  Loader2,
  CornerDownLeft,
  ArrowLeft,
  Copy,
  Share2,
  User,
} from "lucide-react";
import { Socket } from "socket.io-client";
import { User as UserType, Conversation, Message, MessageReaction } from "../types";
import GlassCard from "./GlassCard";
import Skeleton from "./Skeleton";
import { apiFetch } from "../utils/api";
import { logger } from "../utils/logger";
import ValidationMessage from "./ValidationMessage";

interface ChatProps {
  user: UserType;
  socket: Socket | null;
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  onUserSelected: (username: string) => void;
  onBack: () => void;
}

export default function Chat({ user, socket, conversations, setConversations, onUserSelected, onBack }: ChatProps) {
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const [inputText, setInputText] = useState("");

  // New conversation / User Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Media attachments upload
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Typing indicator states
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Message edit state
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState("");

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    message: Message;
    x: number;
    y: number;
  } | null>(null);

  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [customEmoji, setCustomEmoji] = useState("");

  // Forward modal state
  const [forwardModal, setForwardModal] = useState<{
    message: Message;
    x: number;
    y: number;
  } | null>(null);

  // Messages pagination
  const [messagesCursor, setMessagesCursor] = useState<string | null>(null);
  const [messagesHasMore, setMessagesHasMore] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const messagesTopSentinelRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Sync socket ref
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);





  // Fetch messages when conversation is selected
  useEffect(() => {
    if (!selectedConv) {
      setMessages([]);
      setPartnerTyping(false);
      return;
    }

    const fetchMessages = async () => {
      setLoadingMsgs(true);
      setMessagesCursor(null);
      setMessagesHasMore(false);
      try {
        const res = await apiFetch(`/api/chats/conversations/${selectedConv._id}/messages?limit=20`);
        const data = await res.json();
        if (res.ok && data.success) {
          setMessages(data.messages || []);
          setMessagesCursor(data.nextCursor || null);
          setMessagesHasMore(data.hasMore || false);
          scrollToBottom();
        }
      } catch (err) {
        logger.error("Failed to fetch messages", err);
      } finally {
        setLoadingMsgs(false);
      }
    };

    fetchMessages();

    // Socket: Join room
    if (socketRef.current) {
      socketRef.current.emit("chat:join", { conversationId: selectedConv._id });
    }

    return () => {
      // Socket: Leave room
      if (socketRef.current && selectedConv) {
        socketRef.current.emit("chat:leave", { conversationId: selectedConv._id });
      }
    };
  }, [selectedConv]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // Handle Socket Events
  useEffect(() => {
    const s = socket;
    if (!s) return;

    // Listen for new messages
    s.on("message:new", (message: Message) => {
      // If message is for the current conversation, append it
      if (selectedConv && message.conversation === selectedConv._id) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
        scrollToBottom();
      }

      // Update conversations list to show last message
      setConversations((prev) => {
        return prev.map((c) => {
          if (c._id === message.conversation) {
            const isMeRecipient = message.recipient === user._id;
            const updatedUnread = (selectedConv && selectedConv._id === c._id)
              ? 0
              : isMeRecipient
                ? (c.unreadCounts?.[user._id] || 0) + 1
                : (c.unreadCounts?.[user._id] || 0);

            return {
              ...c,
              lastMessage: message,
              unreadCounts: {
                ...c.unreadCounts,
                [user._id]: updatedUnread
              }
            };
          }
          return c;
        }).sort((a, b) => new Date(b.lastMessage?.createdAt || b.updatedAt).getTime() - new Date(a.lastMessage?.createdAt || a.updatedAt).getTime());
      });
    });

    // Listen for message edits
    s.on("message:edit", (message: Message) => {
      if (selectedConv && message.conversation === selectedConv._id) {
        setMessages((prev) => prev.map((m) => (m._id === message._id ? message : m)));
      }
      // Update in conversations list
      setConversations((prev) =>
        prev.map((c) => (c._id === message.conversation ? { ...c, lastMessage: message } : c))
      );
    });

    // Listen for message deletions
    s.on("message:delete", ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, isDeleted: true, text: "This message was deleted", attachments: [] }
            : m
        )
      );
    });

    // Listen for message reactions
    s.on("message:reaction", (payload: { messageId: string; reaction: MessageReaction | null; type: "add" | "remove" }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id !== payload.messageId) return m;

          if (payload.type === "add" && payload.reaction) {
            const existingReactions = m.reactions || [];
            const filtered = existingReactions.filter(r => r.sender._id !== payload.reaction.sender._id || r.emoji !== payload.reaction.emoji);
            return { ...m, reactions: [...filtered, payload.reaction] };
          } else if (payload.type === "remove" && payload.reaction) {
            const existingReactions = m.reactions || [];
            const filtered = existingReactions.filter(r => r.sender._id !== payload.reaction.sender._id || r.emoji !== payload.reaction.emoji);
            return { ...m, reactions: filtered };
          }
          return m;
        })
      );
    });

    // Listen for conversation deletions
    s.on("conversation:delete", ({ conversationId }: { conversationId: string }) => {
      setConversations((prev) => prev.filter((c) => c._id !== conversationId));
      setSelectedConv((currentSelected) => {
        if (currentSelected?._id === conversationId) {
          return null;
        }
        return currentSelected;
      });
    });

    // Listen for conversation clearing
    s.on("conversation:clear", ({ conversationId }: { conversationId: string }) => {
      if (selectedConv && selectedConv._id === conversationId) {
        setMessages([]);
      }
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId ? { ...c, lastMessage: undefined } : c
        )
      );
    });

    // Listen for read receipts
    s.on("messages:seen", ({ conversationId, seenBy }: { conversationId: string; seenBy: string }) => {
      if (selectedConv && selectedConv._id === conversationId && seenBy !== user._id) {
        setMessages((prev) => prev.map((m) => (m.sender._id === user._id ? { ...m, seen: true } : m)));
      }
    });

    // Listen for typing indicators
    s.on("chat:typing", ({ conversationId, userId: typingUserId, isTyping: partnerIsTyping }: any) => {
      if (selectedConv && selectedConv._id === conversationId && typingUserId !== user._id) {
        setPartnerTyping(partnerIsTyping);
      }
    });

    // Listen for online presence status changes
    s.on("user:presence", ({ userId: presenceUserId, status }: { userId: string; status: "online" | "offline" }) => {
      setConversations((prev) =>
        prev.map((c) => {
          const other = c.participants.find((p) => p && p._id === presenceUserId);
          if (other) {
            return {
              ...c,
              presence: status as "online" | "offline",
            };
          }
          return c;
        })
      );
    });

    return () => {
      s.off("message:new");
      s.off("message:edit");
      s.off("message:delete");
      s.off("message:reaction");
      s.off("conversation:delete");
      s.off("conversation:clear");
      s.off("messages:seen");
      s.off("chat:typing");
      s.off("user:presence");
    };
  }, [socket, selectedConv, user]);

  // Fetch older messages (infinite scroll up)
  const fetchOlderMessages = async () => {
    if (!messagesCursor || loadingOlderMessages || !selectedConv) return;
    setLoadingOlderMessages(true);
    // Preserve scroll position: record the height before loading
    const container = document.querySelector('[class*="overflow-y-auto"][class*="scrollbar-thin"]');
    const prevScrollHeight = container?.scrollHeight || 0;
    try {
      const res = await apiFetch(`/api/chats/conversations/${selectedConv._id}/messages?limit=20&cursor=${messagesCursor}`);
      const data = await res.json();
      if (res.ok && data.success) {
        const newOnes = (data.messages || []).filter((m: any) => !messages.some((existing) => existing._id === m._id));
        setMessages((prev) => [...newOnes, ...prev]);
        setMessagesCursor(data.nextCursor || null);
        setMessagesHasMore(data.hasMore || false);
        // Restore scroll position after new messages are prepended
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - prevScrollHeight;
          }
        });
      }
    } catch (err) {
      logger.error("Failed to fetch older messages", err);
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  // IntersectionObserver for loading older messages
  useEffect(() => {
    if (!messagesHasMore || loadingOlderMessages || !selectedConv) return;
    const sentinel = messagesTopSentinelRef.current;
    if (!sentinel) return;

    // Find the scrollable parent
    let scrollParent: Element | null = null;
    let el: Element | null = sentinel.parentElement;
    while (el && el !== document.body) {
      const style = window.getComputedStyle(el);
      if (style.overflowY === "auto" || style.overflowY === "scroll" || style.overflow === "auto" || style.overflow === "scroll") {
        scrollParent = el;
        break;
      }
      el = el.parentElement;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchOlderMessages();
        }
      },
      { root: scrollParent, rootMargin: "100px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [messagesHasMore, loadingOlderMessages, messagesCursor, selectedConv]);

  // Scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  // Trigger typing notification
  const handleTyping = () => {
    if (!socketRef.current || !selectedConv) return;

    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit("chat:typing", { conversationId: selectedConv._id, isTyping: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (socketRef.current && selectedConv) {
        socketRef.current.emit("chat:typing", { conversationId: selectedConv._id, isTyping: false });
      }
    }, 2000);
  };

  // User search to start a new chat
  const handleUserSearch = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    setSearching(true);
    setShowSearchDropdown(true);
    try {
      const res = await apiFetch(`/api/search/users?q=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        // Exclude current user
        setSearchResults((data.users || []).filter((u: UserType) => u._id !== user._id));
      }
    } catch (e) {
      logger.error(e);
    } finally {
      setSearching(false);
    }
  };

  // Start chat with user
  const startConversation = async (recipientId: string) => {
    setShowSearchDropdown(false);
    setSearchQuery("");

    try {
      const res = await apiFetch("/api/chats/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.conversation) {
        // Select this conversation immediately
        setSelectedConv(data.conversation);
        // Add to list
        setConversations(prev => [data.conversation, ...prev]);
      }
    } catch (err) {
      logger.error("Failed to create conversation", err);
    }
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && attachments.length === 0) {
      setFieldErrors({ message: "Message cannot be empty." });
      return;
    }
    setFieldErrors({});
    if (!selectedConv || sendingMessage) return;

    setSendingMessage(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);

    if (socketRef.current) {
      socketRef.current.emit("chat:typing", { conversationId: selectedConv._id, isTyping: false });
    }

    try {
      const formData = new FormData();
      formData.append("text", inputText.trim());
      attachments.forEach((file) => {
        formData.append("files", file);
      });

      // Optimistic update for UI speed
      setInputText("");
      setAttachments([]);
      setAttachmentPreviews([]);

      const res = await apiFetch(`/api/chats/conversations/${selectedConv._id}/messages`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        logger.error("Message send failed", data.message);
      }
    } catch (err) {
      logger.error(err);
    } finally {
      setSendingMessage(false);
    }
  };

  // Edit message
  const handleEditMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editText.trim()) {
      setFieldErrors({ edit: "Message text is required." });
      return;
    }
    setFieldErrors({});
    if (!editingMessage) return;

    const msgId = editingMessage._id;
    const txt = editText;

    setEditingMessage(null);
    setEditText("");

    try {
      const res = await apiFetch(`/api/chats/messages/${msgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: txt }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        logger.error("Message edit failed");
      }
    } catch (e) {
      logger.error(e);
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    try {
      const res = await apiFetch(`/api/chats/messages/${messageId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        logger.error("Message deletion failed");
      }
    } catch (e) {
      logger.error(e);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiFetch(`/api/chats/conversations/${conversationId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConversations((prev) => prev.filter((c) => c._id !== conversationId));
        if (selectedConv?._id === conversationId) {
          setSelectedConv(null);
        }
      } else {
        logger.error("Failed to delete conversation", data.message);
      }
    } catch (err) {
      logger.error("Failed to delete conversation", err);
    }
  };

  // Clear chat history
  const handleClearChat = async () => {
    if (!selectedConv) return;
    try {
      const res = await apiFetch(`/api/chats/conversations/${selectedConv._id}/messages`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages([]);
        // Update local conversations list to reset lastMessage
        setConversations((prev) =>
          prev.map((c) =>
            c._id === selectedConv._id ? { ...c, lastMessage: undefined } : c
          )
        );
      } else {
        logger.error("Failed to clear chat", data.message);
      }
    } catch (err) {
      logger.error("Failed to clear chat", err);
    }
  };

  // Handle reaction
  const handleReaction = async (message: Message, emoji: string) => {
    try {
      const res = await apiFetch(`/api/chats/messages/${message._id}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        logger.error("Reaction failed");
      }
    } catch (err) {
      logger.error(err);
    }
  };

  // Handle custom emoji submission
  const handleCustomEmoji = async (message: Message) => {
    if (customEmoji.trim()) {
      await handleReaction(message, customEmoji.trim());
      setShowEmojiPicker(null);
      setCustomEmoji("");
    }
  };

  // Handle copy message
  const handleCopyMessage = async (message: Message) => {
    if (message.text) {
      await navigator.clipboard.writeText(message.text);
    }
    setContextMenu(null);
  };

  // Handle forward message
  const handleForwardMessage = async (targetConversationId: string) => {
    if (!forwardModal) return;
    try {
      const formData = new FormData();
      formData.append("text", `Forwarded: ${forwardModal.message.text}`);
      if (forwardModal.message.attachments && forwardModal.message.attachments.length > 0) {
        // We don't have the original files, so just forward text
      }
      const res = await apiFetch(`/api/chats/conversations/${targetConversationId}/messages`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setForwardModal(null);
      }
    } catch (err) {
      logger.error(err);
    }
  };

  // Context menu handlers
  const isEditable = (createdAtStr: string) => {
    const diffMs = Date.now() - new Date(createdAtStr).getTime();
    return diffMs <= 5 * 60 * 1000; // 5 minutes
  };

  const handleContextMenu = (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    setContextMenu({ message, x: e.clientX, y: e.clientY });
  };

  // Attachments handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const validFiles = files.slice(0, 5 - attachments.length);
    setAttachments((prev) => [...prev, ...validFiles]);

    const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
    setAttachmentPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
    setAttachmentPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const getPartner = (conv: Conversation) => {
    return conv.participants.find((p) => p && p._id !== user._id) || user;
  };

  const getPartnerPresence = (conv: Conversation) => {
    return conv.presence || "offline";
  };

  const formatMessageTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Group reactions by emoji and count them
  const getGroupedReactions = (reactions?: MessageReaction[]) => {
    if (!reactions || reactions.length === 0) return {};
    const grouped: Record<string, { count: number; hasReacted: boolean }> = {};
    reactions.forEach(r => {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { count: 0, hasReacted: false };
      }
      grouped[r.emoji].count++;
      if (r.sender._id === user._id) {
        grouped[r.emoji].hasReacted = true;
      }
    });
    return grouped;
  };

  return (
    <div className="w-full px-2 pb-24 pt-6 h-[calc(100vh-7rem)] relative select-text">
      <GlassCard animate={true} className="w-full h-full p-0 flex rounded-4xl overflow-hidden border-white/5 bg-zinc-950/20 backdrop-blur-xl">
        <AnimatePresence mode="wait">
          {!selectedConv ? (
            <motion.div
              key="conversations-list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full h-full flex flex-col"
            >
              <div className="p-4 pb-0 flex items-center gap-3 shrink-0">
                <button
                  onClick={onBack}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer shadow-sm"
                  title="Go Back to Home Feed"
                >
                  <ArrowLeft className="h-4.5 w-4.5" />
                </button>
                <h3 className="font-sans text-xs font-black text-white uppercase tracking-widest">
                  Messages
                </h3>
              </div>

              <div className="p-4 border-b border-zinc-800/30 relative z-20 shrink-0">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search usernames..."
                    value={searchQuery}
                    onChange={(e) => handleUserSearch(e.target.value)}
                    className="w-full rounded-full border border-zinc-800 bg-zinc-950/50 py-2.5 pl-10 pr-4 text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:bg-zinc-900 transition-all"
                  />
                </div>

                <AnimatePresence>
                  {showSearchDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute left-4 right-4 mt-2 rounded-2xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-2xl p-2 shadow-2xl max-h-60 overflow-y-auto"
                    >
                      <div className="flex items-center justify-between px-2 pb-1.5 border-b border-zinc-800">
                        <span className="text-[9px] font-black uppercase tracking-wider text-zinc-550">
                          Find Users
                        </span>
                        <button onClick={() => setShowSearchDropdown(false)}>
                          <X className="h-3 w-3 text-zinc-500 hover:text-white" />
                        </button>
                      </div>
                      {searching ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-4 w-4 animate-spin text-zinc-550" />
                        </div>
                      ) : searchResults.length === 0 ? (
                        <p className="text-[10px] text-zinc-550 text-center py-6 font-mono uppercase">
                          No users found
                        </p>
                      ) : (
                        <div className="space-y-0.5 mt-1.5">
                          {searchResults.map((usr) => (
                            <div
                              key={usr._id}
                              onClick={() => startConversation(usr._id)}
                              className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-zinc-800/60 cursor-pointer transition-colors"
                            >
                              <img
                                src={usr.profilePic?.url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100"}
                                alt=""
                                className="h-7 w-7 rounded-full object-cover border border-zinc-800"
                              />
                              <div className="text-left">
                                <p className="text-xs font-bold text-zinc-200 leading-tight">
                                  {usr.fullName}
                                </p>
                                <p className="text-[9px] text-zinc-500 font-bold">@{usr.username}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 p-3 scrollbar-thin">
                {loadingConvs ? (
                  <div className="space-y-3 p-2">
                    <Skeleton variant="profile-row" />
                    <Skeleton variant="profile-row" />
                    <Skeleton variant="profile-row" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-20 px-4">
                    <MessageSquare className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
                    <h4 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest leading-relaxed">
                      No conversations yet
                    </h4>
                    <p className="text-[10px] text-zinc-550 mt-1 font-mono uppercase">
                      Search for a user to start chatting
                    </p>
                  </div>
                ) : (
                  conversations.map((conv) => {
                    const partner = getPartner(conv);
                    const presence = getPartnerPresence(conv);
                    const unread = conv.unreadCounts?.[user._id] || 0;

                    return (
                      <div
                        key={conv._id}
                        onClick={() => setSelectedConv(conv)}
                        className="flex items-center gap-3 rounded-2xl p-3 cursor-pointer transition-all border hover:bg-zinc-900/30 text-zinc-300 border-transparent"
                      >
                        <div className="relative shrink-0">
                          <img
                            src={partner.profilePic?.url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100"}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover border border-zinc-800"
                          />
                          {presence === "online" && (
                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-zinc-950 shadow-md" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-xs font-black leading-tight truncate text-zinc-100 uppercase tracking-wide">
                              {partner.fullName}
                            </span>
                            {conv.lastMessage && (
                              <span className="text-[8.5px] font-mono text-zinc-500 shrink-0 mt-0.5">
                                {formatMessageTime(conv.lastMessage.createdAt)}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between items-center gap-2 mt-1">
                            <p className="text-[10.5px] truncate leading-tight flex-1 text-zinc-400">
                              {conv.lastMessage?.isDeleted ? (
                                <span className="italic">deleted message</span>
                              ) : conv.lastMessage?.text ? (
                                conv.lastMessage.text
                              ) : conv.lastMessage?.attachments && conv.lastMessage.attachments.length > 0 ? (
                                <span className="font-semibold text-zinc-300">sent attachment</span>
                              ) : (
                                <span className="italic">Start a conversation</span>
                              )}
                            </p>

                            {unread > 0 && (
                              <span className="h-4.5 min-w-4.5 px-1 rounded-full bg-white text-[9px] font-extrabold text-black flex items-center justify-center shadow-sm border border-zinc-200 shrink-0">
                                {unread}
                              </span>
                            )}

                            <button
                              onClick={(e) => handleDeleteConversation(conv._id, e)}
                              className="h-6 w-6 rounded-full flex items-center justify-center text-zinc-500 hover:text-red-450 hover:bg-white/5 transition-all cursor-pointer shrink-0 ml-1"
                              title="Delete Conversation"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="conversation-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full h-full flex flex-col"
            >
              <div className="p-4 border-b border-zinc-800/30 flex items-center justify-between shrink-0 bg-zinc-950/20 backdrop-blur-md relative z-10">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConv(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer shadow-sm"
                    title="Back to Conversations List"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div
                    className="relative cursor-pointer hover:opacity-85"
                    onClick={() => onUserSelected(getPartner(selectedConv).username)}
                  >
                    <img
                      src={getPartner(selectedConv).profilePic?.url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100"}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover border border-zinc-800"
                    />
                    {getPartnerPresence(selectedConv) === "online" && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-zinc-950" />
                    )}
                  </div>
                  <div className="text-left">
                    <h4
                      className="text-xs font-black text-white hover:underline cursor-pointer uppercase tracking-wider"
                      onClick={() => onUserSelected(getPartner(selectedConv).username)}
                    >
                      {getPartner(selectedConv).fullName}
                    </h4>
                    <p className="text-[9px] text-zinc-500 font-bold leading-none mt-0.5">
                      {getPartnerPresence(selectedConv) === "online" ? "Active now" : "Offline"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearChat}
                    className="flex h-8 px-3 items-center gap-1.5 rounded-full border border-zinc-200/10 hover:border-red-500/20 bg-white/5 hover:bg-red-550/10 text-zinc-400 hover:text-red-400 transition-all cursor-pointer shadow-sm text-[10px] font-black uppercase tracking-wider"
                    title="Clear All Chat History"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
                {loadingMsgs ? (
                  <div className="space-y-4 p-2">
                    {/* First batch loading — show 4 message bubble skeletons */}
                    <Skeleton variant="message-received" />
                    <Skeleton variant="message-sent" />
                    <Skeleton variant="message-received" />
                    <Skeleton variant="message-sent" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <MessageSquare className="h-8 w-8 text-zinc-700 animate-bounce mb-3" />
                    <h4 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest">
                      Say hello!
                    </h4>
                    <p className="text-[10px] text-zinc-550 mt-1 font-mono uppercase max-w-xs leading-relaxed">
                      Send the first message to start the conversation
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Top sentinel for infinite scroll (load older messages) */}
                    {messagesHasMore && (
                      <div ref={messagesTopSentinelRef} className="flex justify-center py-3">
                        {loadingOlderMessages ? (
                          <div className="space-y-3 w-full">
                            <Skeleton variant="message-received" />
                            <Skeleton variant="message-sent" />
                          </div>
                        ) : (
                          <Loader2 className="h-5 w-5 animate-spin text-zinc-550" />
                        )}
                      </div>
                    )}
                  {messages.map((msg, index) => {
                    const isMe = msg.sender._id === user._id;
                    const editable = isMe && isEditable(msg.createdAt) && !msg.isDeleted;
                    const groupedReactions = getGroupedReactions(msg.reactions);

                    return (
                      <div
                        key={msg._id}
                        className={`flex gap-3 max-w-[85%] ${isMe ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                        onContextMenu={(e) => handleContextMenu(e, msg)}
                      >
                        {!isMe && (
                          <div className="w-8 shrink-0 flex items-end">
                            <img loading="lazy"
                              src={msg.sender.profilePic?.url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100"}
                              alt=""
                              className="h-7 w-7 rounded-full object-cover border border-zinc-800"
                            />
                          </div>
                        )}

                        <div className="space-y-1 text-left flex flex-col items-end">
                          <div
                            className={`rounded-2xl px-3.5 py-2 text-xs border relative group/bubble select-text ${isMe
                              ? "bg-zinc-800 text-white border-zinc-700 rounded-tr-none"
                              : "bg-zinc-900/80 text-zinc-100 border-zinc-800 rounded-tl-none"
                              }`}
                          >
                            {msg.isDeleted ? (
                              <span className="italic text-zinc-500 text-[11px]">This message was deleted</span>
                            ) : (
                              <>
                                <p className="leading-relaxed whitespace-pre-wrap select-text break-word pr-1.5">{msg.text}</p>
                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className="mt-2 space-y-1.5 max-w-sm rounded-xl overflow-hidden border border-zinc-800">
                                    {msg.attachments.map((att, aIdx) => (
                                      <img
                                        key={aIdx}
                                        src={att.url}
                                        alt=""
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

                          {Object.keys(groupedReactions).length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {Object.entries(groupedReactions).map(([emoji, data]) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(msg, emoji)}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${data.hasReacted
                                    ? "bg-blue-500/20 border-blue-400/30"
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
                            {msg.isEdited && !msg.isDeleted && <span>edited</span>}
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {isMe && (
                              <span>
                                {msg.seen ? (
                                  <CheckCheck className="h-3 w-3 text-white" />
                                ) : (
                                  <Check className="h-3 w-3 text-zinc-650" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                  }
                </>
                )}
                <div ref={messagesEndRef} />
              </div>

              <AnimatePresence>
                {partnerTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="px-4 py-1 text-[9.5px] font-black text-zinc-500 font-mono text-left tracking-wide select-none"
                  >
                    {getPartner(selectedConv).fullName} is typing...
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-4 border-t border-zinc-800/30 shrink-0 bg-zinc-950/20 backdrop-blur-md relative z-10">
                {attachmentPreviews.length > 0 && (
                  <div className="flex gap-2 mb-3 bg-zinc-900/50 p-2.5 rounded-2xl border border-zinc-800 max-w-sm">
                    {attachmentPreviews.map((url, idx) => (
                      <div key={idx} className="relative h-14 w-14 rounded-lg overflow-hidden border border-zinc-800">
                        <img loading="lazy" src={url} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="absolute top-0.5 right-0.5 h-4 w-4 bg-zinc-950/80 hover:bg-zinc-900 text-zinc-300 hover:text-white rounded-full flex items-center justify-center scale-90"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {editingMessage ? (
                  <form onSubmit={handleEditMessageSubmit} className="flex gap-2 items-center">
                    <div className="grow relative">
                      <input
                        type="text"
                        required
                        onInvalid={(e) => e.preventDefault()}
                        value={editText}
                        onChange={(e) => { setEditText(e.target.value); clearFieldError("edit"); }}
                        className="w-full rounded-full border border-white/20 bg-zinc-900 px-4.5 py-3 text-xs text-white outline-none"
                      />
                      <span className="absolute right-4.5 top-3.5 text-[8.5px] font-mono text-zinc-550 uppercase">
                        Editing
                      </span>
                      <ValidationMessage message={fieldErrors.edit} />
                    </div>
                    <button
                      type="submit"
                      className="bg-white text-black text-xs font-bold px-4 py-2.5 rounded-full hover:bg-zinc-250 cursor-pointer shadow-md"
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingMessage(null)}
                      className="bg-zinc-800 text-zinc-300 text-xs font-bold px-4 py-2.5 rounded-full hover:bg-zinc-750 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex gap-2.5 items-center">
                    <div className="relative shrink-0">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={attachments.length >= 5}
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer pointer-events-none"
                      >
                        <ImageIcon className="h-4.5 w-4.5" />
                      </button>
                    </div>                    <div className="grow relative">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={inputText}
                      onInvalid={(e) => e.preventDefault()}
                      onChange={(e) => {
                        setInputText(e.target.value);
                        clearFieldError("message");
                        handleTyping();
                      }}
                      className="w-full rounded-full border border-zinc-800 bg-zinc-950/40 py-3 px-5 text-xs text-slate-100 placeholder-zinc-500 outline-none focus:border-white focus:bg-zinc-900/80 transition-all focus:ring-1 focus:ring-zinc-700"
                    />
                    <ValidationMessage message={fieldErrors.message} />

                      <span className="absolute right-4 top-3 text-[9px] text-zinc-650 hidden md:flex items-center gap-0.5 border border-zinc-800 px-1 rounded bg-zinc-950 select-none">
                        <CornerDownLeft className="h-2 w-2" /> Enter
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={sendingMessage || (!inputText.trim() && attachments.length === 0)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black hover:bg-zinc-250 cursor-pointer shadow-md disabled:opacity-30 disabled:hover:bg-white"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      {contextMenu && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            position: "fixed",
            left: contextMenu.x,
            top: contextMenu.y,
            transform: "translate(-50%, -100%)",
            zIndex: 1000,
          }}
          className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="flex flex-wrap gap-1 p-2 border-b border-zinc-800">
            {["👍", "❤️", "😂", "😮", "😢", "😠"].map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  handleReaction(contextMenu.message, emoji);
                  setContextMenu(null);
                }}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl hover:bg-zinc-800 transition-all"
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => {
                setShowEmojiPicker(contextMenu.message._id);
                setContextMenu(null);
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl hover:bg-zinc-800 transition-all"
            >
              <Smile className="h-4 w-4" />
            </button>
          </div>

          <div className="p-1">
            {!contextMenu.message.isDeleted && (
              <>
                <button
                  onClick={() => handleCopyMessage(contextMenu.message)}
                  className="w-full px-3 py-2.5 text-left text-xs font-bold text-zinc-200 hover:bg-zinc-800/60 rounded-xl flex items-center gap-2"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Message
                </button>
                <button
                  onClick={() => {
                    setForwardModal({
                      message: contextMenu.message,
                      x: contextMenu.x,
                      y: contextMenu.y,
                    });
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-2.5 text-left text-xs font-bold text-zinc-200 hover:bg-zinc-800/60 rounded-xl flex items-center gap-2"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Forward Message
                </button>
                {contextMenu.message.sender._id === user._id && isEditable(contextMenu.message.createdAt) && (
                  <>
                    <button
                      onClick={() => {
                        setEditingMessage(contextMenu.message);
                        setEditText(contextMenu.message.text);
                        setContextMenu(null);
                      }}
                      className="w-full px-3 py-2.5 text-left text-xs font-bold text-zinc-200 hover:bg-zinc-800/60 rounded-xl flex items-center gap-2"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit Message
                    </button>
                    <button
                      onClick={() => {
                        handleDeleteMessage(contextMenu.message._id);
                        setContextMenu(null);
                      }}
                      className="w-full px-3 py-2.5 text-left text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-xl flex items-center gap-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Message
                    </button>
                  </>
                )}
              </>
            )}
            <button
              onClick={() => setContextMenu(null)}
              className="w-full px-3 py-2.5 text-left text-xs font-bold text-zinc-400 hover:bg-zinc-800/60 rounded-xl flex items-center gap-2"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Custom Emoji Picker Modal */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 bg-black/50 flex items-center justify-center p-4"
            onClick={() => {
              setShowEmojiPicker(null);
              setCustomEmoji("");
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-widest">Add Emoji</h4>
                <button
                  onClick={() => {
                    setShowEmojiPicker(null);
                    setCustomEmoji("");
                  }}
                >
                  <X className="h-3.5 w-3.5 text-zinc-500 hover:text-white" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const msg = messages.find((m) => m._id === showEmojiPicker);
                  if (msg) handleCustomEmoji(msg);
                }}
                className="space-y-3"
              >
                <input
                  type="text"
                  placeholder="Type any emoji..."
                  value={customEmoji}
                  onChange={(e) => setCustomEmoji(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-white"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!customEmoji.trim()}
                  className="w-full rounded-xl bg-white text-black font-bold px-4 py-2.5 text-xs uppercase tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  Add Reaction
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forward Message Modal */}
      <AnimatePresence>
        {forwardModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setForwardModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 w-full max-w-sm shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-widest">Forward Message</h4>
                <button
                  onClick={() => setForwardModal(null)}
                >
                  <X className="h-3.5 w-3.5 text-zinc-500 hover:text-white" />
                </button>
              </div>

              <div className="mb-4 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
                <p className="text-xs text-zinc-300 leading-relaxed">{forwardModal.message.text}</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5">
                {conversations.length === 0 ? (
                  <p className="text-center text-[10px] text-zinc-500 font-mono uppercase py-4">No conversations yet</p>
                ) : (
                  conversations.map((conv) => {
                    const partner = getPartner(conv);
                    return (
                      <button
                        key={conv._id}
                        onClick={() => handleForwardMessage(conv._id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/60 text-left transition-colors"
                      >
                        <img
                          src={partner.profilePic?.url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100"}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover border border-zinc-800"
                        />
                        <div>
                          <p className="text-xs font-bold text-zinc-200">{partner.fullName}</p>
                          <p className="text-[9px] text-zinc-500 font-bold">@{partner.username}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800">
                <div className="text-[9px] font-mono text-zinc-500 uppercase mb-2">Or</div>
                <button
                  onClick={() => {
                    setForwardModal(null);
                    setSelectedConv(null);
                  }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-zinc-800/60"
                >
                  <User className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-xs font-bold text-zinc-200">Start a new conversation</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
