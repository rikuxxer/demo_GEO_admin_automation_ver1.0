import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  mode: 'development',
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, '../../src'),
    },
  },
  define: {
    'import.meta.env.MODE': JSON.stringify('development'),
    'import.meta.env.DEV': JSON.stringify(true),
    'import.meta.env.PROD': JSON.stringify(false),
  },
  build: {
    target: 'esnext',
    outDir: '../../build-dev',
    sourcemap: true,
    minify: false,
  },
  server: {
    port: 3000,
    open: true,
    host: true,
  },
  envPrefix: 'VITE_',
});
