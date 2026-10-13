import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { platformApi } from './server/platformApi'

export default defineConfig({
  plugins: [react(), tailwindcss(), platformApi()],
  server: {
    port: 5173,
    strictPort: true,
    // For testing MoonPay webhooks locally through `cloudflared tunnel`. On these hosts
    // server/platformApi.ts serves only the webhook endpoint and refuses everything else.
    allowedHosts: ['.trycloudflare.com'],
    // Vite's defaults plus data/ (webhook token, received events).
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/data/**'] },
  },
})
