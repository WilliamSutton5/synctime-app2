import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // The local-first application has no runtime environment configuration.
  envDir: false,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png',
        'apple-touch-icon.png',
      ],
      manifest: {
        name: 'SyncTime',
        short_name: 'SyncTime',
        description: 'A simple employee timesheet application.',
        theme_color: '#173a3a',
        background_color: '#f6f4ed',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache only the compiled app shell. Timesheets stay in localStorage
        // and are never placed in the service-worker cache.
        navigateFallback: '/index.html',
        runtimeCaching: [],
      },
    }),
  ],
})
