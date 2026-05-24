import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ── Mock Supabase so tests never hit the network ──────────────────────────────
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession:             vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithPassword:     vi.fn(),
      signUp:                 vi.fn(),
      signOut:                vi.fn().mockResolvedValue({}),
      onAuthStateChange:      vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      setSession:             vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select:  vi.fn().mockReturnThis(),
      insert:  vi.fn().mockReturnThis(),
      upsert:  vi.fn().mockReturnThis(),
      update:  vi.fn().mockReturnThis(),
      delete:  vi.fn().mockReturnThis(),
      eq:      vi.fn().mockReturnThis(),
      neq:     vi.fn().mockReturnThis(),
      order:   vi.fn().mockReturnThis(),
      single:  vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

// ── Mock localStorage ─────────────────────────────────────────────────────────
const store: Record<string, string> = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem:    (k: string) => store[k] ?? null,
    setItem:    (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear:      () => { Object.keys(store).forEach(k => delete store[k]); },
  },
});

// ── Silence console.warn/error for cleaner test output ────────────────────────
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
