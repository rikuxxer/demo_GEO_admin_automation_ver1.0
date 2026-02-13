import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  mode: 'production',
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, '../../src'),
    },
  },
  define: {
    'import.meta.env.MODE': JSON.stringify('production'),
    'import.meta.env.DEV': JSON.stringify(false),
    'import.meta.env.PROD': JSON.stringify(true),
  },
  build: {
    target: 'esnext',
    outDir: 'build',
    sourcemap: false,
    // recharts が "X is not a constructor" で落ちるため terser ではなく esbuild で minify
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // recharts を単体チャンクにし、minify 時の "X is not a constructor" を防ぐ
          if (id.includes('node_modules/recharts')) {
            return 'recharts';
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['recharts'],
  },
  envPrefix: 'VITE_',
});
