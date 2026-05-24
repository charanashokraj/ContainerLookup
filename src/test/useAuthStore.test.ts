import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../store/useAuthStore';

// Supabase is mocked in setup.ts

beforeEach(() => {
  useAuthStore.setState({ profile: null, profiles: [], initialized: false });
  vi.clearAllMocks();
});

describe('initialize — no session', () => {
  it('sets initialized=true with profile=null when no session', async () => {
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().initialized).toBe(true);
    expect(useAuthStore.getState().profile).toBeNull();
  });
});

describe('initialize — active session', () => {
  it('loads profile and sets it when status is active', async () => {
    const { supabase } = await import('../lib/supabase');
    const mockProfile = {
      id: 'user-1', email: 'admin@test.com', name: 'Admin',
      role: 'admin', status: 'active', created_at: '', activated_at: null,
    };
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: { user: { id: 'user-1', email: 'admin@test.com', user_metadata: { name: 'Admin', role: 'admin', status: 'active' } } } },
    } as any);
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    } as any);

    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().profile?.name).toBe('Admin');
    expect(useAuthStore.getState().profile?.role).toBe('admin');
  });

  it('signs out and sets profile=null when status is pending', async () => {
    const { supabase } = await import('../lib/supabase');
    const pendingProfile = {
      id: 'user-2', email: 'user@test.com', name: 'User',
      role: 'user', status: 'pending', created_at: '', activated_at: null,
    };
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: { user: { id: 'user-2', email: 'user@test.com', user_metadata: {} } } },
    } as any);
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: pendingProfile, error: null }),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    } as any);

    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().profile).toBeNull();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});

describe('login', () => {
  it('returns error message on auth failure', async () => {
    const { supabase } = await import('../lib/supabase');
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials' },
    } as any);

    const err = await useAuthStore.getState().login('bad@test.com', 'wrongpw');
    expect(err).toBe('Invalid credentials');
    expect(useAuthStore.getState().profile).toBeNull();
  });

  it('sets profile on successful login with active account', async () => {
    const { supabase } = await import('../lib/supabase');
    const user = { id: 'u1', email: 'ok@test.com', user_metadata: {} };
    const profile = { id: 'u1', email: 'ok@test.com', name: 'OK User', role: 'user', status: 'active', created_at: '', activated_at: null };

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user, session: { access_token: 'tok' } },
      error: null,
    } as any);
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: profile, error: null }),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    } as any);

    const err = await useAuthStore.getState().login('ok@test.com', 'correctpw');
    expect(err).toBeNull();
    expect(useAuthStore.getState().profile?.name).toBe('OK User');
  });

  it('rejects pending accounts with informative message', async () => {
    const { supabase } = await import('../lib/supabase');
    const user = { id: 'u2', email: 'pending@test.com', user_metadata: {} };
    const profile = { id: 'u2', status: 'pending', role: 'user', name: 'Pending', email: 'pending@test.com', created_at: '', activated_at: null };

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user, session: {} }, error: null,
    } as any);
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: profile, error: null }),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    } as any);

    const err = await useAuthStore.getState().login('pending@test.com', 'pw');
    expect(err).toContain('pending');
    expect(useAuthStore.getState().profile).toBeNull();
  });
});

describe('logout', () => {
  it('clears profile and calls supabase signOut', async () => {
    useAuthStore.setState({ profile: { id: 'u', email: 'e@e.com', name: 'U', role: 'user', status: 'active', created_at: '', activated_at: null } });
    const { supabase } = await import('../lib/supabase');

    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().profile).toBeNull();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});

describe('register', () => {
  it('returns error when signup fails', async () => {
    const { supabase } = await import('../lib/supabase');
    vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Email already in use' },
    } as any);

    const err = await useAuthStore.getState().register('Test', 'dup@test.com', 'pw12345678');
    expect(err).toBe('Email already in use');
  });

  it('returns null and signs out on successful registration', async () => {
    const { supabase } = await import('../lib/supabase');
    vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
      data: { user: { id: 'new-u' }, session: null }, error: null,
    } as any);

    const err = await useAuthStore.getState().register('New User', 'new@test.com', 'pw12345678');
    expect(err).toBeNull();
    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(useAuthStore.getState().profile).toBeNull();
  });
});
