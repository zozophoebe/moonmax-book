// Vercel Function entry. Bundled to api/index.js by `npm run build:api` (vite.api.config.ts),
// because Vercel compiles .ts functions with the TypeScript JS API, which TypeScript 7 no longer ships.
// vercel.json rewrites every /api/* request here as /api?path=…

import { handleApi } from './api'
import { blobStorage } from './storage'

function handle(request: Request): Promise<Response> {
  const sessionSecret = process.env.MOONMAX_SESSION_SECRET
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  return handleApi(request, {
    storage: blobStorage(),
    runtime: 'vercel',
    auth: sessionSecret ? { sessionSecret } : null,
    google: clientId && clientSecret ? { clientId, clientSecret } : null,
  })
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE }
