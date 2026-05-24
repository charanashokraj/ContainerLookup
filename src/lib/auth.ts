export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'user';
  status: 'pending' | 'active' | 'disabled';
  createdAt: string;
  activatedAt: string | null;
}

const USERS_KEY    = 'ct-users-v1';
const SESSION_KEY  = 'ct-session-v1';
const SALT         = 'ct-2026-salt';

// ── Crypto ───────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const enc  = new TextEncoder();
  const data = enc.encode(password + SALT);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generatePassword(length = 14): string {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower   = 'abcdefghjkmnpqrstuvwxyz';
  const digits  = '23456789';
  const special = '@#!$';
  const all     = upper + lower + digits + special;
  const pw: string[] = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  for (let i = pw.length; i < length; i++)
    pw.push(all[Math.floor(Math.random() * all.length)]);
  for (let i = pw.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pw[i], pw[j]] = [pw[j], pw[i]];
  }
  return pw.join('');
}

// ── Storage ───────────────────────────────────────────────────────────────────

export function loadUsers(): User[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]'); }
  catch { return []; }
}

export function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// ── Session ───────────────────────────────────────────────────────────────────

export function getSession(): User | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as User;
    const live   = loadUsers().find(u => u.id === cached.id);
    if (!live || live.status !== 'active') return null;
    return live;
  } catch { return null; }
}

export function setSession(user: User): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

// ── Operations ────────────────────────────────────────────────────────────────

export async function attemptLogin(
  email: string, password: string
): Promise<{ user: User | null; error: string | null }> {
  const hash = await hashPassword(password);
  const user = loadUsers().find(
    u => u.email.toLowerCase() === email.toLowerCase().trim() && u.passwordHash === hash
  );
  if (!user)                        return { user: null, error: 'Invalid email or password.' };
  if (user.status === 'pending')    return { user: null, error: 'Account pending admin approval.' };
  if (user.status === 'disabled')   return { user: null, error: 'Account disabled — contact admin.' };
  return { user, error: null };
}

export async function registerUser(
  email: string, name: string, password: string
): Promise<{ user: User | null; error: string | null }> {
  const users = loadUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase().trim()))
    return { user: null, error: 'An account with this email already exists.' };
  const hash    = await hashPassword(password);
  const newUser: User = {
    id:          crypto.randomUUID(),
    email:       email.toLowerCase().trim(),
    name:        name.trim(),
    passwordHash: hash,
    role:        'user',
    status:      'pending',
    createdAt:   new Date().toISOString(),
    activatedAt: null,
  };
  saveUsers([...users, newUser]);
  return { user: newUser, error: null };
}

export async function createAdminUser(
  email: string, name: string, password: string
): Promise<User> {
  const hash  = await hashPassword(password);
  const admin: User = {
    id:          crypto.randomUUID(),
    email:       email.toLowerCase().trim(),
    name:        name.trim(),
    passwordHash: hash,
    role:        'admin',
    status:      'active',
    createdAt:   new Date().toISOString(),
    activatedAt: new Date().toISOString(),
  };
  saveUsers([admin, ...loadUsers()]);
  return admin;
}
