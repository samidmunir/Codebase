import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // VECTOR_API_PROXY points the dev server at another API, e.g. the end-to-end test server.
  const env = loadEnv(mode, new URL('.', import.meta.url).pathname, 'VECTOR_');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': env.VECTOR_API_PROXY ?? 'http://127.0.0.1:4000',
      },
    },
  };
});
