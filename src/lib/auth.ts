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

export interface GithubUserSettings {
  owner: string;
  repo: string;
  pat: string;
}

const USERS_CACHE_KEY = 'ct-users-v1';
const SESSION_KEY     = 'ct-session-v1';
const SALT            = 'ct-2026-salt';
const USERS_PATH      = 'data/users.json';

// ── Crypto ───────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password + SALT);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
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
  for (let i = pw.length; i < length; i++) pw.push(all[Math.floor(Math.random() * all.length)]);
  for (let i = pw.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pw[i], pw[j]] = [pw[j], pw[i]];
  }
  return pw.join('');
}

// ── Local cache ───────────────────────────────────────────────────────────────

export function loadUsersFromCache(): User[] {
  try { return JSON.parse(localStorage.getItem(USERS_CACHE_KEY) ?? '[]'); }
  catch { return []; }
}

export function cacheUsers(users: User[]): void {
  localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
}

// ── GitHub-backed storage ─────────────────────────────────────────────────────

/**
 * Fetch users from raw.githubusercontent.com — works from any browser, any device.
 * Returns null if the file doesn't exist yet (first run) or on network error.
 */
export async function loadUsersFromGithub(owner: string, repo: string): Promise<User[] | null> {
  try {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/${USERS_PATH}?t=${Date.now()}`;
    const res = await fetch(url);
    if (res.status === 404) return null;   // file not created yet → first run
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch { return null; }
}

/**
 * Commit users to GitHub. Creates the file on first write, updates with SHA on subsequent writes.
 * Requires a PAT with `repo` scope.
 */
export async function saveUsersToGithub(
  users: User[],
  { owner, repo, pat }: GithubUserSettings
): Promise<void> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${USERS_PATH}`;
  const headers = {
    Authorization: `token ${pat}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  // Get current SHA (needed to update an existing file)
  let sha: string | undefined;
  const shaRes = await fetch(apiUrl, { headers });
  if (shaRes.ok) {
    const meta = await shaRes.json() as { sha?: string };
    sha = meta.sha;
  }

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(users, null, 2))));
  const res = await fetch(apiUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `chore: update users [skip ci]`,
      content,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(`GitHub API ${res.status}: ${err.message ?? res.statusText}`);
  }
}

// ── Session ───────────────────────────────────────────────────────────────────

export function getSession(users: User[]): User | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as User;
    // Re-validate against live user list
    const live = users.find(u => u.id === cached.id);
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
  users: User[], email: string, password: string
): Promise<{ user: User | null; error: string | null }> {
  const hash = await hashPassword(password);
  const user = users.find(
    u => u.email.toLowerCase() === email.toLowerCase().trim() && u.passwordHash === hash
  );
  if (!user)                       return { user: null, error: 'Invalid email or password.' };
  if (user.status === 'pending')   return { user: null, error: 'Account pending admin approval.' };
  if (user.status === 'disabled')  return { user: null, error: 'Account disabled — contact admin.' };
  return { user, error: null };
}

export async function buildNewUser(
  users: User[], email: string, name: string, password: string,
  role: 'admin' | 'user' = 'user', status: 'active' | 'pending' = 'pending'
): Promise<{ user: User | null; users: User[] | null; error: string | null }> {
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase().trim()))
    return { user: null, users: null, error: 'An account with this email already exists.' };
  const hash    = await hashPassword(password);
  const newUser: User = {
    id:          crypto.randomUUID(),
    email:       email.toLowerCase().trim(),
    name:        name.trim(),
    passwordHash: hash,
    role,
    status,
    createdAt:   new Date().toISOString(),
    activatedAt: status === 'active' ? new Date().toISOString() : null,
  };
  return { user: newUser, users: [...users, newUser], error: null };
}
