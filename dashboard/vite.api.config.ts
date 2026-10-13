// Bundles the Vercel Function: server/vercel-entry.ts → api/index.js (plain ESM JavaScript).
// npm packages (@vercel/blob) stay as imports; Vercel installs and traces them.
import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: false,
  build: {
    ssr: 'server/vercel-entry.ts',
    outDir: 'api',
    emptyOutDir: true,
    target: 'node22',
    minify: false,
    rollupOptions: { output: { format: 'es', entryFileNames: 'index.js' } },
  },
})
