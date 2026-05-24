import { create } from 'zustand';
import { supabase, type Profile } from '../lib/supabase';

interface AuthStore {
  profile:     Profile | null;
  profiles:    Profile[];       // all profiles — loaded by admin
  initialized: boolean;
  isFirstRun:  boolean;

  initialize:      () => Promise<void>;
  login:           (email: string, password: string) => Promise<string | null>;
  logout:          () => Promise<void>;
  register:        (name: string, email: string, password: string) => Promise<string | null>;
  setupAdmin:      (name: string, email: string, password: string) => Promise<string | null>;

  // Admin operations
  loadAllProfiles: () => Promise<void>;
  activateUser:    (id: string) => Promise<void>;
  deactivateUser:  (id: string) => Promise<void>;
  deleteUser:      (id: string) => Promise<void>;
  promoteToAdmin:  (id: string) => Promise<void>;
  createUser:      (name: string, email: string, password: string) => Promise<string | null>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  profile:     null,
  profiles:    [],
  initialized: false,
  isFirstRun:  false,

  async initialize() {
    // Check whether any active admin exists (determines first-run state)
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('status', 'active');

    const isFirstRun = (count ?? 0) === 0;

    // Restore session if one exists
    const { data: { session } } = await supabase.auth.getSession();
    let profile: Profile | null = null;

    if (session?.user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (data && data.status === 'active') {
        profile = data as Profile;
      } else if (data) {
        // Account exists but not active — sign them out silently
        await supabase.auth.signOut();
      }
    }

    // Keep session in sync going forward
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        set({ profile: null });
      }
    });

    set({ profile, isFirstRun, initialized: true });
  },

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      return 'Profile not found. Contact your admin.';
    }
    if (profile.status === 'pending') {
      await supabase.auth.signOut();
      return 'Account pending admin approval.';
    }
    if (profile.status === 'disabled') {
      await supabase.auth.signOut();
      return 'Account disabled. Contact your admin.';
    }

    set({ profile: profile as Profile, isFirstRun: false });
    return null;
  },

  async logout() {
    await supabase.auth.signOut();
    set({ profile: null });
  },

  async register(name, email, password) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: 'user', status: 'pending' } },
    });
    if (error) return error.message;
    // Sign out immediately — they need admin approval before using the app
    await supabase.auth.signOut();
    return null;
  },

  async setupAdmin(name, email, password) {
    // Attempt to create the account
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: 'admin', status: 'active' } },
    });

    if (error) return error.message;

    // If user is null the email already exists in Supabase — sign in instead
    const userId = data.user?.id ?? null;

    if (!userId) {
      // Try signing in (account already registered)
      const { data: si, error: siErr } = await supabase.auth.signInWithPassword({ email, password });
      if (siErr) {
        return 'Account already exists — please sign in normally, or use a different email address.';
      }
      if (!si.user) return 'Could not sign in. Try refreshing the page.';

      // Ensure the profile has admin/active status
      await supabase.from('profiles')
        .upsert({ id: si.user.id, email, name, role: 'admin', status: 'active' });

      await new Promise(r => setTimeout(r, 600));
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', si.user.id).single();
      if (profile) set({ profile: profile as Profile, isFirstRun: false });
      return null;
    }

    // Account created — if no session, email confirmation is required.
    // Try to sign in immediately; if that fails, tell the user to disable it.
    if (!data.session) {
      const { data: si, error: siErr } = await supabase.auth.signInWithPassword({ email, password });
      if (siErr || !si.user) {
        return 'Account created but email confirmation is required. In Supabase → Authentication → Providers → Email, turn off "Confirm email", then try again.';
      }
      await supabase.from('profiles')
        .upsert({ id: si.user.id, email, name, role: 'admin', status: 'active' });
      await new Promise(r => setTimeout(r, 600));
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', si.user.id).single();
      if (profile) set({ profile: profile as Profile, isFirstRun: false });
      return null;
    }

    // Normal path — trigger creates profile, wait briefly then fetch it
    await new Promise(r => setTimeout(r, 800));
    await supabase.from('profiles')
      .upsert({ id: userId, email, name, role: 'admin', status: 'active' });
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (profile) set({ profile: profile as Profile, isFirstRun: false });
    return null;
  },

  // ── Admin profile management ────────────────────────────────────────────

  async loadAllProfiles() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) set({ profiles: data as Profile[] });
  },

  async activateUser(id) {
    await supabase
      .from('profiles')
      .update({ status: 'active', activated_at: new Date().toISOString() })
      .eq('id', id);
    await get().loadAllProfiles();
  },

  async deactivateUser(id) {
    await supabase.from('profiles').update({ status: 'disabled' }).eq('id', id);
    await get().loadAllProfiles();
  },

  async deleteUser(id) {
    // Deleting the profile effectively blocks the user (they can't get past login check)
    await supabase.from('profiles').delete().eq('id', id);
    await get().loadAllProfiles();
  },

  async promoteToAdmin(id) {
    await supabase.from('profiles').update({ role: 'admin' }).eq('id', id);
    await get().loadAllProfiles();
  },

  async createUser(name, email, password) {
    // Save admin session so we can restore it after creating the new user
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
