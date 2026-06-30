import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react':   ['react', 'react-dom'],
            'vendor-motion':  ['motion', 'framer-motion'],
            'vendor-zustand': ['zustand'],
            'vendor-pdf':     ['pdf-lib', 'pdfjs-dist'],
            'vendor-office':  ['mammoth', 'xlsx', 'jszip'],
            'vendor-qr':      ['qrcode', 'jsqr', '@zxing/browser', '@zxing/library'],
            'vendor-ui':      ['lucide-react', 'cmdk', 'clsx', 'nanoid'],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  };
});
