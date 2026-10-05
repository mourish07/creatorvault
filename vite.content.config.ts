import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.tsx')
      },
      output: {
        format: 'iife',
        entryFileNames: 'src/content/index.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'index.css' || assetInfo.name === 'content.css') {
            return 'src/content/content.css';
          }
          return 'src/content/[name]-[hash][extname]';
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
