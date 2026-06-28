import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: '0.0.0.0',
      port: 3001,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET ?? 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})
