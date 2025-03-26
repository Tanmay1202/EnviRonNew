import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr: false, // Disable HMR to eliminate WebSocket errors
    proxy: {
      '/classify-waste': {
        target: 'http://localhost:3000', // Backend server port (change to 3001 if needed)
        changeOrigin: true,
        secure: false,
      },
    },
  },
});