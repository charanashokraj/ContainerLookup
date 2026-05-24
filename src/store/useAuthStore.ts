import { create } from 'zustand';
import { supabase, type Profile } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthStore {
  profile:     Profile | null;
  profiles:    Profile[];       // all profiles — loaded by admin
  initialized: boolean;

  initialize:      () => Promise<void>;
  login:           (email: string, password: string) => Promise<string | null>;
  logout:          () => Promise<void>;
  register:        (name: string, email: string, password: string) => Promise<string | null>;
  setupAdmin:      (name: string, email: string, password: string) => Promise<string | null>;

  loadAllProfiles: () => Promise<void>;
  activateUser:    (id: string) => Promise<void>;
  deactivateUser:  (id: string) => Promise<void>;
  deleteUser:      (id: string) => Promise<void>;
  promoteToAdmin:  (id: string) => Promise<void>;
  createUser:      (name: string, email: string, password: string) => Promise<string | null>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loadOrEnsureProfile(user: User): Promise<Profile | null> {
  // Try reading the profile
  const { data, error: readErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (data) return data as Profile;

  // If we got a real DB error (not just "no rows"), log it for debugging
  if (readErr && readErr.code !== 'PGRST116') {
    console.warn('[Auth] Profile read error:', readErr.message);
  }

  // Profile missing (trigger may have failed) — create it from auth metadata
  const meta = user.user_metadata ?? {};
  const fallback = {
    id:     user.id,
    email:  user.email ?? '',
    name:   meta.name   ?? user.email?.split('@')[0] ?? 'User',
    role:   (meta.role   as string) ?? 'user',
    status: (meta.status as string) ?? 'pending',
  };

  // INSERT first; if the row already exists (concurrent trigger), fall back to SELECT
  const { data: inserted, error: insertErr } = await supabase
    .from('profiles')
    .insert(fallback)
    .select()
    .single();

  if (inserted) return inserted as Profile;

  // Row already existed but we couldn't read it first time — retry SELECT
  if (insertErr?.code === '23505') {
    const { data: retry } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    return (retry as Profile) ?? null;
  }

  console.warn('[Auth] Could not create profile:', insertErr?.message);
  return null;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>((set, get) => ({
  profile:     null,
  profiles:    [],
  initialized: false,

  // ── Init: restore existing session ───────────────────────────────────────
  async initialize() {
    const { data: { session } } = await supabase.auth.getSession();
    let profile: Profile | null = null;

    if (session?.user) {
      const p = await loadOrEnsureProfile(session.user);
      if (p?.status === 'active') {
        profile = p;
      } else {
        // Not yet active — sign out silently so we show the login page
        await supabase.auth.signOut();
      }
    }

    // Keep session in sync going forward
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) set({ profile: null });
    });

    set({ profile, initialized: true });
  },

  // ── Login ─────────────────────────────────────────────────────────────────
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;

    const p = await loadOrEnsureProfile(data.user);
    if (!p) { await supabase.auth.signOut(); return 'Profile not found. Contact your admin.'; }
    if (p.status === 'pending')  { await supabase.auth.signOut(); return 'Account pending admin approval.'; }
    if (p.status === 'disabled') { await supabase.auth.signOut(); return 'Account disabled. Contact your admin.'; }

    set({ profile: p });
    return null;
  },

  // ── Logout ────────────────────────────────────────────────────────────────
  async logout() {
    await supabase.auth.signOut();
    set({ profile: null });
  },

  // ── Self-registration (creates pending account) ───────────────────────────
  async register(name, email, password) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: 'user', status: 'pending' } },
    });
    if (error) return error.message;
    await supabase.auth.signOut(); // must wait for admin approval
    return null;
  },

  // ── First admin setup ─────────────────────────────────────────────────────
  async setupAdmin(name, email, password) {
    // If an admin already exists, try signing in with the provided credentials instead of blocking
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('status', 'active');

    if ((count ?? 0) > 0) {
      // Admin exists — try to sign in the user directly
      const { data: si, error: siErr } = await supabase.auth.signInWithPassword({ email, password });
      if (siErr) return 'An admin account already exists. Please sign in with your existing credentials.';
      if (!si?.user) return 'Sign-in failed. Try the Sign In page instead.';
      // Ensure their profile has admin/active status (in case it was incomplete)
      await supabase.from('profiles')
        .upsert({ id: si.user.id, email: si.user.email ?? email, name, role: 'admin', status: 'active' });
      await new Promise(r => setTimeout(r, 600));
      const p = await loadOrEnsureProfile(si.user);
      if (p) set({ profile: { ...p, status: 'active', role: 'admin' } as Profile });
      return null;
    }

    // Try creating the account
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: 'admin', status: 'active' } },
    });
    if (error) return error.message;

    // If no session back (email confirmation still on, or duplicate email)
    if (!data.session) {
      const { data: si, error: siErr } = await supabase.auth.signInWithPassword({ email, password });
      if (siErr || !si?.user) {
        return 'Account created but requires email confirmation. In Supabase → Auth → Sign In / Providers → Email, turn off "Confirm email" and try again.';
      }
      // Ensure profile is admin + active
      await supabase.from('profiles')
        .upsert({ id: si.user.id, email, name, role: 'admin', status: 'active' });
      await new Promise(r => setTimeout(r, 600));
      const p = await loadOrEnsureProfile(si.user);
      if (p?.status === 'active') set({ profile: p });
      return null;
    }

    // Normal path
    const userId = data.user!.id;
    await new Promise(r => setTimeout(r, 800));
    await supabase.from('profiles')
      .upsert({ id: userId, email, name, role: 'admin', status: 'active' });
    const p = await loadOrEnsureProfile(data.user!);
    if (p?.status === 'active') set({ profile: p });
    return null;
  },

  // ── Admin profile management ──────────────────────────────────────────────

  async loadAllProfiles() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) set({ profiles: data as Profile[] });
  },

  async activateUser(id) {
    await supabase.from('profiles')
      .update({ status: 'active', activated_at: new Date().toISOString() })
      .eq('id', id);
    await get().loadAllProfiles();
  },

  async deactivateUser(id) {
    await supabase.from('profiles').update({ status: 'disabled' }).eq('id', id);
    await get().loadAllProfiles();
  },

  async deleteUser(id) {
    await supabase.from('profiles').delete().eq('id', id);
    await get().loadAllProfiles();
  },

  async promoteToAdmin(id) {
    await supabase.from('profiles').update({ role: 'admin' }).eq('id', id);
    await get().loadAllProfiles();
  },

  async createUser(name, email, password) {
    const { data: { session: adminSession } } = await supabase.auth.getSession();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: 'user', status: 'active' } },
    });
    if (error) return error.message;

    // Restore admin session
    if (adminSession?.access_token && adminSession?.refresh_token) {
      await supabase.auth.setSession({
        access_token:  adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });
    }

    await get().loadAllProfiles();
    return null;
  },
}));
