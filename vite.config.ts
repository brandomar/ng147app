import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables with VITE_ prefix
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  // Vite automatically exposes VITE_ prefixed variables to the client
  // Just use them for server config (proxy)
  const SUPABASE_URL = env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

  // Log for debugging (will show during build/dev start)
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('⚠️ Missing Supabase environment variables. Check your .env file.');
  } else {
    console.log('✅ Supabase configuration loaded');
  }

  return {
    plugins: [react()],
    build: {
      target: 'esnext',
      rollupOptions: {
        output: {
          format: 'es'
        }
      }
    },
    server: {
      port: 5173,
      strictPort: true,
      host: true,
      proxy: {
        '/supabase-functions': {
          target: SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : 'http://localhost:54321/functions/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/supabase-functions/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        }
      }
    },
    optimizeDeps: {
      include: ['lucide-react'],
    },
    define: {
      global: 'globalThis',
    },
    envPrefix: 'VITE_',
  };
});
