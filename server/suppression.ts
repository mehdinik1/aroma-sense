import { db } from './db.ts'

export async function isSuppressed(email: string) {
  return !!(await db.prepare('SELECT 1 FROM email_suppressions WHERE email = ?').bind(email.toLowerCase()).first())
}
