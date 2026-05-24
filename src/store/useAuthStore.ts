import { create } from 'zustand';
import type { User, GithubUserSettings } from '../lib/auth';
import {
  loadUsersFromCache, loadUsersFromGithub, saveUsersToGithub,
  cacheUsers, getSession, setSession, clearSession,
} from '../lib/auth';
import { loadGithubSettings } from '../lib/githubSync';

interface AuthStore {
  currentUser:  User | null;
  users:        User[];
  initialized:  boolean;
  initError:    string | null;
  ghSettings:   GithubUserSettings | null;

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
  currentUser:  null,
  users:        loadUsersFromCache(),
  initialized:  false,
  initError:    null,
  ghSettings:   null,

  async initialize() {
    // Load GitHub settings (same key used by SettingsModal / auto-tracking)
    const gh = loadGithubSettings();
    const ghSettings: GithubUserSettings | null = gh.owner && gh.repo && gh.pat ? gh : null;
    set({ ghSettings });

    let users: User[] = [];
    if (ghSettings) {
      const remote = await loadUsersFromGithub(ghSettings.owner, ghSettings.repo);
      if (remote !== null) {
        users = remote;
        cacheUsers(users);              // refresh local cache
      } else {
        users = loadUsersFromCache();   // fallback to local cache while offline
      }
    } else {
      // No GitHub configured yet — use local cache only (first-run or offline)
      users = loadUsersFromCache();
    }

    const currentUser = getSession(users);
    set({ users, currentUser, initialized: true, initError: null });
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
    const users = get().users.map(u =>
      u.id === id ? { ...u, status: 'active' as const, activatedAt: new Date().toISOString() } : u
    );
    await get().setUsers(users);
  },

  async deactivateUser(id) {
    const users = get().users.map(u =>
      u.id === id ? { ...u, status: 'disabled' as const } : u
    );
    await get().setUsers(users);
  },

  async deleteUser(id) {
    await get().setUsers(get().users.filter(u => u.id !== id));
  },

  async promoteToAdmin(id) {
    const users = get().users.map(u =>
      u.id === id ? { ...u, role: 'admin' as const } : u
    );
    await get().setUsers(users);
  },
}));
