import { readFileSync } from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// `vite build --mode extension` packages the app as a Chrome extension:
// relative asset paths, separate output folder, the toolbar popup page,
// and extension/manifest.json (version synced to package.json).
function chromeExtension(): Plugin {
  return {
    name: 'chrome-extension',
    apply: 'build',
    generateBundle() {
      const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
      const manifest = JSON.parse(readFileSync('extension/manifest.json', 'utf8'))
      manifest.version = pkg.version
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(manifest, null, 2),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env vars (no VITE_ prefix required) — these stay server-side
  // in the dev proxy and are never bundled into client code.
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.PROFISEE_TARGET ?? ''
  // A target with a path is the full instance URL (https://host/<instance>):
  // drop the /profisee prefix instead of appending it to that path
  const targetHasPath = /^https?:\/\/[^/]+\/./.test(target)
  // QA_CLIENT_ID: unattended-authentication client ID used as the X-Api-Key
  const apiKey = env.PROFISEE_API_KEY ?? env.QA_CLIENT_ID ?? ''
  const isExtension = mode === 'extension'

  return {
    base: isExtension ? './' : '/expression-flow/',
    plugins: [react(), tailwindcss(), ...(isExtension ? [chromeExtension()] : [])],
    build: isExtension
      ? {
          outDir: 'dist-extension',
          rollupOptions: { input: ['index.html', 'popup.html'] },
        }
      : undefined,
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
              rewrite: targetHasPath
                ? (path) => path.replace(/^\/profisee/, '')
                : undefined,
            },
          }
        : undefined,
    },
  }
})
