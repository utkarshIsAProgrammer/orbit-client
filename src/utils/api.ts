// ── Per-endpoint TTL configuration ──────────────────────────────────
// Longer TTLs for stable data, shorter for frequently-changing feeds.
const TTL_CONFIG: { pattern: RegExp; ttl: number }[] = [
  // User profile data — rare changes
  { pattern: /\/api\/users\/(getUserByUsername|getUserById)/, ttl: 60_000 },          // 60s
  { pattern: /\/api\/users\/(getSuggestedUsers|getAll)/, ttl: 30_000 },               // 30s
  { pattern: /\/api\/users\/getPinnedPosts/, ttl: 60_000 },                           // 60s
  // Notifications — relatively stable
  { pattern: /\/api\/notifications\/(getNotifications|getUnreadCount)/, ttl: 30_000 }, // 30s
  // Posts / feed — changes frequently
  { pattern: /\/api\/posts\/(getAllPosts|getPost|getPostBySlug)/, ttl: 15_000 },       // 15s
  { pattern: /\/api\/posts\/getPostsByHashtag/, ttl: 15_000 },                         // 15s
  // Comments — moderately stable
  { pattern: /\/api\/comments\/(getAllCommentsForPost|getComment)/, ttl: 20_000 },     // 20s
  { pattern: /\/api\/comments\/(getAllComments|getCommentReplies)/, ttl: 20_000 },     // 20s
  // Saves / reposts — user-specific, moderate
  { pattern: /\/api\/saves\/(getSavedPosts|getSaveFolders)/, ttl: 30_000 },            // 30s
  { pattern: /\/api\/reposts\/getRepostedPosts/, ttl: 30_000 },                        // 30s
  // Follow — moderate
  { pattern: /\/api\/follow\/(getFollowers|getFollowing)/, ttl: 30_000 },              // 30s
  // Search — cached briefly since results can shift
  { pattern: /\/api\/search/, ttl: 30_000 },                                            // 30s
  // Chat — short TTL, near-real-time
  { pattern: /\/api\/chat\/(getConversations|getMessages)/, ttl: 10_000 },              // 10s
];

function getTTL(url: string): number {
  for (const { pattern, ttl } of TTL_CONFIG) {
    if (pattern.test(url)) return ttl;
  }
  return 10_000; // default 10s
}

// ── Cache store ─────────────────────────────────────────────────────
const cache = new Map<string, { data: any; expiry: number }>();

// ── Request deduplication store ─────────────────────────────────────
const pendingRequests = new Map<string, Promise<Response>>();

/**
 * Read the CSRF token from the non-httpOnly cookie set by the server.
 * Used by apiFetch to include the CSRF header on state-changing requests.
 */
function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match ? match[1]! : null;
}

export function clearCache(pattern?: string) {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}

/**
 * Invalidate all cache entries whose URL matches any of the given 
 * keyword patterns. Call this after mutations to keep the cache fresh.
 */
export function invalidateCache(patterns: string[]) {
  for (const key of cache.keys()) {
    if (patterns.some((p) => key.includes(p))) cache.delete(key);
  }
}

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method || "GET";
  const basePath = url.split("?")[0]!;

  // On mutations, invalidate related cache entries then proceed
  if (method !== "GET") {
    // Invalidate based on the endpoint being mutated
    if (basePath.includes("/posts/")) {
      invalidateCache(["/api/posts/", "/api/feed/"]);
    }
    if (basePath.includes("/users/")) {
      invalidateCache(["/api/users/"]);
    }
    if (basePath.includes("/comments/")) {
      invalidateCache(["/api/comments/", "/api/posts/"]);
    }
    if (basePath.includes("/saves/")) {
      invalidateCache(["/api/saves/", "/api/posts/"]);
    }
    if (basePath.includes("/reposts/")) {
      invalidateCache(["/api/reposts/", "/api/posts/"]);
    }
    if (basePath.includes("/follow/")) {
      invalidateCache(["/api/follow/", "/api/users/"]);
    }
    if (basePath.includes("/notifications/")) {
      invalidateCache(["/api/notifications/"]);
    }
    if (basePath.includes("/chat/")) {
      invalidateCache(["/api/chat/"]);
    }
    if (basePath.includes("/likes/")) {
      invalidateCache(["/api/posts/", "/api/comments/"]);
    }

    // Include CSRF header from the non-httpOnly cookie (double-submit pattern)
    const csrfToken = getCsrfToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };
    if (csrfToken) {
      headers["x-csrf-token"] = csrfToken;
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
  }

  // ── GET: check cache ───────────────────────────────────────────
  const cached = cache.get(url);
  if (cached && Date.now() < cached.expiry) {
    return new Response(JSON.stringify(cached.data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Request deduplication ───────────────────────────────────────
  // Check if there's already an identical request in flight
  const pending = pendingRequests.get(url);
  if (pending) {
    return pending;
  }

  // Create the request promise and store it
  const requestPromise = fetch(url, {
    ...options,
    credentials: "include",
  }).finally(() => {
    // Remove from pending requests when complete
    pendingRequests.delete(url);
  });

  // Store the promise for deduplication
  pendingRequests.set(url, requestPromise);

  const res = await requestPromise;

  if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
    try {
      const clone = res.clone();
      const data = await clone.json();
      cache.set(url, { data, expiry: Date.now() + getTTL(url) });
    } catch {
      // Not cacheable
    }
  }

  return res;
}
