import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/bufalo-panel/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Búfalo — Panel',
        short_name: 'Búfalo',
        description: 'Panel del dueño: ventas, caja, respaldos y avisos de tus sucursales.',
        lang: 'es',
        start_url: '/bufalo-panel/',
        scope: '/bufalo-panel/',
        display: 'standalone',
        background_color: '#faf6f1',
        theme_color: '#8a3b12',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Solo se guarda sin conexión el "cascarón" de la app. Los datos (Supabase) NUNCA se cachean:
      // un panel financiero no debe mostrar cifras viejas como si fueran actuales.
      workbox: { navigateFallback: 'index.html', runtimeCaching: [] },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}'] },
});
