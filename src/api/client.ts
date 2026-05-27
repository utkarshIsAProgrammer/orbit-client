// ─── Client Facade ──────────────────────────────────────────────────
// In development (no VITE_API_URL), the full mock client supplies fake
// data for preview. In production, only the real axios client is bundled.
//
// Vite replaces `import.meta.env.DEV` at build time, so the dynamic
// import of the mock module is tree-shaken away in production builds.

export { setNavigateFunction, realAxiosClient } from './client.real';

import { realApi } from './client.real';

const IS_MOCK_MODE = !import.meta.env.VITE_API_URL;

let api = realApi;

// This branch is eliminated by Vite's tree-shaker in production builds
// because import.meta.env.DEV is replaced with `false` at compile time.
if (import.meta.env.DEV && IS_MOCK_MODE) {
  const { mockApi } = await import('./client.mock');
  api = mockApi;
}

export { api };
