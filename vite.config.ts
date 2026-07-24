import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env vars (no VITE_ prefix required) — these stay server-side
  // in the dev proxy and are never bundled into client code.
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.PROFISEE_TARGET ?? ''
  // QA_CLIENT_ID: unattended-authentication client ID used as the X-Api-Key
  const apiKey = env.PROFISEE_API_KEY ?? env.QA_CLIENT_ID ?? ''

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Respect PORT when set (e.g. by preview tooling); default 5173
      port: Number(env.PORT) || 5173,
      proxy: target
        ? {
            '/profisee': {
              target,
              changeOrigin: true,
              // Corp servers often use internal CA certs
              secure: false,
              headers: apiKey ? { 'X-Api-Key': apiKey } : undefined,
            },
          }
        : undefined,
    },
  }
})
