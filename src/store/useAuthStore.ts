import { create } from 'zustand';
import type { User, GithubUserSettings, RegistrationConfig } from '../lib/auth';
import {
  loadUsersFromCache, loadUsersFromGithub, saveUsersToGithub,
  cacheUsers, getSession, setSession, clearSession,
  detectGithubPages, loadRegistrationConfig,
} from '../lib/auth';
import { loadGithubSettings } from '../lib/githubSync';

interface AuthStore {
  currentUser:        User | null;
  users:              User[];
  initialized:        boolean;
  ghSettings:         GithubUserSettings | null;     // admin PAT (only on admin's device)
  registrationConfig: RegistrationConfig | null;      // public registration PAT (from GitHub)

  initialize:     () => Promise<void>;
  login:          (user: User) => void;
  logout:         () => void;
  setUsers:       (users: User[], commit?: boolean) => Promise<void>;
  activateUser:   (id: string) => Promise<void>;
  deactivateUser: (id: string) => Promise<void>;
  deleteUser:     (id: string) => Promise<void>;
  promoteToAdmin: (id: string) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  currentUser:        null,
  users:              loadUsersFromCache(),
  initialized:        false,
  ghSettings:         null,
  registrationConfig: null,

  async initialize() {
    // ── Determine owner/repo for reading ──────────────────────────────────
    // Priority: (1) stored settings  (2) GitHub Pages URL auto-detection
    // Reading from raw.githubusercontent.com needs NO PAT — works on any device.
    const stored    = loadGithubSettings();
    const urlDetect = detectGithubPages();

    const owner = stored.owner || urlDetect?.owner || '';
    const repo  = stored.repo  || urlDetect?.repo  || '';

    // PAT is only required for WRITE operations (activate, create, etc.)
    const ghSettings: GithubUserSettings | null =
      stored.owner && stored.repo && stored.pat
        ? stored
        : null;

    let users: User[] = [];
    let registrationConfig: RegistrationConfig | null = null;

    if (owner && repo) {
      // Fetch users and registration config in parallel — no PAT needed for public repo reads
      const [remote, config] = await Promise.all([
        loadUsersFromGithub(owner, repo),
        loadRegistrationConfig(owner, repo),
      ]);
      if (remote !== null) {
        users = remote;
        cacheUsers(users);           // keep local cache fresh
      } else {
        users = loadUsersFromCache(); // network error fallback
      }
      registrationConfig = config;
    } else {
      // No GitHub info at all (e.g. running on localhost without settings)
      users = loadUsersFromCache();
    }

    const currentUser = getSession(users);
    set({ users, currentUser, initialized: true, ghSettings, registrationConfig });
  },

  login(user) {
    setSession(user);
    set({ currentUser: user });
  },

  logout() {
    clearSession();
    set({ currentUser: null });
  },

  async setUsers(users, commit = true) {
    cacheUsers(users);
    set({ users });
    const { ghSettings } = get();
    if (commit && ghSettings) {
      await saveUsersToGithub(users, ghSettings);
    }
  },

  async activateUser(id) {
    await get().setUsers(
      get().users.map(u =>
        u.id === id ? { ...u, status: 'active' as const, activatedAt: new Date().toISOString() } : u
      )
    );
  },

  async deactivateUser(id) {
    await get().setUsers(
      get().users.map(u =>
        u.id === id ? { ...u, status: 'disabled' as const } : u
      )
    );
  },

  async deleteUser(id) {
    await get().setUsers(get().users.filter(u => u.id !== id));
  },

  async promoteToAdmin(id) {
    await get().setUsers(
      get().users.map(u =>
        u.id === id ? { ...u, role: 'admin' as const } : u
      )
    );
  },
}));
