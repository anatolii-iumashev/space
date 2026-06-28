import { Elysia, t } from 'elysia'
import { nanoid } from 'nanoid'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'
import * as crypto from 'node:crypto'

export async function bootstrapDefaultUser() {
  const email = process.env.SPACE_USER_EMAIL
  const password = process.env.SPACE_USER_PASSWORD

  if (!email || !password) {
    console.warn('[auth] SPACE_USER_EMAIL or SPACE_USER_PASSWORD not set — no default user bootstrapped')
    return
  }

  const name = process.env.SPACE_USER_NAME || email.split('@')[0]
  const passwordHash = hashPassword(password)

  const existing = await db.select().from(users).where(eq(users.email, email)).get()
  if (existing) {
    await db.update(users).set({ passwordHash, name }).where(eq(users.email, email))
    console.log(`[auth] Default user updated: ${email}`)
  } else {
    await db.insert(users).values({ id: nanoid(), email, name, passwordHash })
    console.log(`[auth] Default user created: ${email}`)
  }
}

function hashPassword(password: string): string {
  return crypto.scryptSync(password, 'space-salt', 64).toString('hex')
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}

// Helper: extract userId from request, returns null if unauthorized
export async function authenticate(jwt: any, headers: any): Promise<string | null> {
  const token = headers.authorization?.replace('Bearer ', '')
  if (!token) return null

  try {
    const payload = await jwt.verify(token) as any
    if (!payload?.sub) return null

    const user = await db.select().from(users).where(eq(users.id, payload.sub)).get()
    return user ? user.id : null
  } catch {
    return null
  }
}

export const authPlugin = new Elysia({ prefix: '/auth' })
  .post('/register', async ({ set }) => {
    set.status = 403
    return { ok: false, error: 'Registration is disabled' }
  })

  .post('/login', async ({ body, jwt, set }) => {
    const user = await db.select().from(users).where(eq(users.email, body.email)).get()
    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      set.status = 401
      return { ok: false, error: 'Invalid credentials' }
    }

    const token = await jwt.sign({ sub: user.id, email: user.email })
    return {
      ok: true,
      data: { token, user: { id: user.id, email: user.email, name: user.name } },
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String(),
    }),
  })
