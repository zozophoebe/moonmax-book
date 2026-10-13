// One small key→JSON store, two backends:
//   local dev  → files (platform.config.json, data/*.json), same layout as before
//   Vercel     → a private Vercel Blob store (needs BLOB_READ_WRITE_TOKEN, set when the store is connected)

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { del, get, list, put } from '@vercel/blob'

export interface Storage {
  get<T>(key: string): Promise<T | null>
  set(key: string, value: unknown): Promise<void>
  del(keys: string[]): Promise<void>
  list(prefix: string): Promise<string[]>
}

// Keys look like "config", "webhook.local", "events/<signature>". Nothing else is accepted,
// so a key can never escape the data directory or the blob prefix.
function assertKey(key: string) {
  if (!/^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/.test(key) || key.includes('..')) throw new Error(`bad storage key: ${key}`)
}

export function fileStorage(root: string): Storage {
  const fileOf = (key: string) => {
    assertKey(key)
    return key === 'config' ? path.join(root, 'platform.config.json') : path.join(root, 'data', `${key}.json`)
  }
  return {
    async get<T>(key: string) {
      try {
        return JSON.parse(await readFile(fileOf(key), 'utf8')) as T
      } catch {
        return null
      }
    },
    async set(key, value) {
      const file = fileOf(key)
      await mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
      await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: key === 'config' ? 0o644 : 0o600 })
    },
    async del(keys) {
      await Promise.all(keys.map((k) => rm(fileOf(k), { force: true })))
    },
    async list(prefix) {
      assertKey(prefix.replace(/\/$/, ''))
      const dir = path.join(root, 'data', prefix)
      try {
        return (await readdir(dir)).filter((f) => f.endsWith('.json')).map((f) => `${prefix.replace(/\/?$/, '/')}${f.slice(0, -5)}`)
      } catch {
        return []
      }
    },
  }
}

// One account's own space inside the shared store: its keys live under `prefix`.
// Caches of public data ("*.cache": chain reads, exchange rates) stay shared by everyone.
export function scopedStorage(root: Storage, prefix: string): Storage {
  if (!prefix) return root
  const keyOf = (key: string) => (key.endsWith('.cache') ? key : `${prefix}${key}`)
  return {
    get<T>(key: string) {
      return root.get<T>(keyOf(key))
    },
    set: (key, value) => root.set(keyOf(key), value),
    del: (keys) => root.del(keys.map(keyOf)),
    list: async (p) => (await root.list(`${prefix}${p}`)).map((key) => key.slice(prefix.length)),
  }
}

const BLOB_PREFIX = 'moonmax/'

export function blobStorage(): Storage {
  const pathOf = (key: string) => {
    assertKey(key)
    return `${BLOB_PREFIX}${key}.json`
  }
  return {
    async get<T>(key: string) {
      // useCache: false — a write must be visible on the very next read (settings, webhook token).
      const res = await get(pathOf(key), { access: 'private', useCache: false }).catch(() => null)
      if (!res || res.statusCode !== 200) return null
      try {
        return JSON.parse(await new Response(res.stream).text()) as T
      } catch {
        return null
      }
    },
    async set(key, value) {
      await put(pathOf(key), JSON.stringify(value), { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json' })
    },
    async del(keys) {
      if (keys.length) await del(keys.map(pathOf))
    },
    async list(prefix) {
      const keys: string[] = []
      let cursor: string | undefined
      do {
        const page = await list({ prefix: `${BLOB_PREFIX}${prefix}`, cursor, limit: 1000 })
        for (const b of page.blobs) keys.push(b.pathname.slice(BLOB_PREFIX.length).replace(/\.json$/, ''))
        cursor = page.hasMore ? page.cursor : undefined
      } while (cursor)
      return keys
    },
  }
}
