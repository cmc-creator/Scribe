import crypto from 'crypto';
import { getDatabase } from '../db/database';
import { generateToken } from '../middleware/auth';

interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  password_hash: string | null;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
}

function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): string {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, expectedHash] = storedHash.split(':');
  if (!salt || !expectedHash) return false;
  const actualHash = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(actualHash, Buffer.from(expectedHash, 'hex'));
}

function toAuthenticatedUser(user: StoredUser): AuthenticatedUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function needsInitialSetup(): Promise<boolean> {
  const result = await getDatabase().execute({ sql: 'SELECT id FROM users LIMIT 1', args: [] });
  return result.rows.length === 0;
}

export async function createInitialAdmin(input: { email: string; name: string; password: string; setupSecret: string }): Promise<{ token: string; user: AuthenticatedUser }> {
  const expectedSecret = process.env.INITIAL_ADMIN_SETUP_SECRET;
  if (!expectedSecret) throw new Error('Initial administrator setup is not configured.');
  const providedSecret = Buffer.from(input.setupSecret);
  const configuredSecret = Buffer.from(expectedSecret);
  if (providedSecret.length !== configuredSecret.length || !crypto.timingSafeEqual(providedSecret, configuredSecret)) {
    throw new Error('Invalid administrator setup secret.');
  }
  if (!(await needsInitialSetup())) throw new Error('An administrator account already exists.');

  const user: AuthenticatedUser = { id: crypto.randomUUID(), email: input.email.toLowerCase(), name: input.name, role: 'admin' };
  await getDatabase().execute({
    sql: 'INSERT INTO users (id, email, name, role, password_hash) VALUES (?, ?, ?, ?, ?)',
    args: [user.id, user.email, user.name, user.role, hashPassword(input.password)],
  });
  return { user, token: generateToken(user) };
}

export async function signIn(email: string, password: string): Promise<{ token: string; user: AuthenticatedUser } | null> {
  const result = await getDatabase().execute({ sql: 'SELECT id, email, name, role, password_hash FROM users WHERE email = ?', args: [email.toLowerCase()] });
  const user = result.rows[0] as unknown as StoredUser | undefined;
  if (!user?.password_hash || !verifyPassword(password, user.password_hash)) return null;
  const authenticatedUser = toAuthenticatedUser(user);
  return { user: authenticatedUser, token: generateToken(authenticatedUser) };
}
