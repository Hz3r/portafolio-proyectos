import argon2 from 'argon2'
import { createApp } from '../src/app.ts'
import { createDb } from '../src/db.ts'
import type { Storage } from '../src/storage.ts'
import { TEST_DATABASE_URL } from './global-setup.ts'

export const db = createDb(TEST_DATABASE_URL)
export const removed: string[] = []

const storage: Storage = {
  presignUpload: async (key) => `https://bucket.test/upload/${key}`,
  presignRead: async (key) => `https://bucket.test/read/${key}`,
  put: async () => {},
  remove: async (keys) => void removed.push(...keys),
}

export const app = createApp({
  db,
  storage,
  jwtSecret: 'test-secret-test-secret-test-secret-1234',
  publicApiUrl: 'http://api.test',
  corsOrigins: ['http://admin.test'],
})

export async function reset() {
  removed.length = 0
  await db.$executeRawUnsafe('TRUNCATE "Media", "Project", "Tag", "AdminUser", "SiteSettings" CASCADE')
  await db.adminUser.create({
    data: { email: 'admin@test.dev', passwordHash: await argon2.hash('correct-horse') },
  })
}

export async function login(): Promise<string> {
  const res = await app.request('/auth/login', json('POST', { email: 'admin@test.dev', password: 'correct-horse' }))
  return (await res.json()).token
}

export function json(method: string, body?: unknown, token?: string): RequestInit {
  return {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  }
}
