import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      sentryVitePlugin({
        org: process.env.SENTRY_ORG || "orbit-app",
        project: process.env.SENTRY_PROJECT || "orbit-frontend",
        authToken: process.env.SENTRY_AUTH_TOKEN,
        disable: !process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          assets: "./dist/assets/**",
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'motion/react'],
            icons: ['lucide-react'],
            socket: ['socket.io-client'],
            three: ['three'],
            gsap: ['gsap'],
            cropper: ['react-easy-crop'],
            chat: ['./src/components/Chat.tsx'],
            feed: ['./src/components/Feed.tsx'],
            profile: ['./src/components/Profile.tsx'],
            landing: ['./src/components/LandingPage.tsx'],
            leftnav: ['./src/components/LeftSidebar.tsx'],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: 'http://localhost:5006',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Origin', 'http://localhost:5006');
            });
          },
        },
        '/socket.io': {
          target: 'ws://localhost:5006',
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});
