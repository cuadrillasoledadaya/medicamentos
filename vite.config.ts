import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  // Expose dev server on the local network so the PWA can be opened
  // from a phone on the same WiFi. `host: true` binds to 0.0.0.0 and
  // also makes Vite print the network URL in the terminal.
  server: {
    host: true,
    port: 5173,
    strictPort: false,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'Medicamentos',
        short_name: 'Medicamentos',
        description: 'Control de medicamentos familiar',
        theme_color: '#0ea5e9',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern:
              /^https:\/\/cmoydmfdhssxdmwqlueg\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
        ],
      },
    }),
  ],
});
