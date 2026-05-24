import { create } from 'zustand';
import type { User } from '../lib/auth';
import { getSession, setSession, clearSession, loadUsers, saveUsers } from '../lib/auth';

interface AuthStore {
  currentUser: User | null;
  users: User[];
  login: (user: User) => void;
  logout: () => void;
  refreshUsers: () => void;
  activateUser: (id: string) => void;
  deactivateUser: (id: string) => void;
  deleteUser: (id: string) => void;
  promoteToAdmin: (id: string) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  currentUser: getSession(),
  users:       loadUsers(),

  login(user) {
    setSession(user);
    set({ currentUser: user });
  },

  logout() {
    clearSession();
    set({ currentUser: null });
  },

  refreshUsers() {
    set({ users: loadUsers() });
  },

  activateUser(id) {
    const users = loadUsers().map(u =>
      u.id === id ? { ...u, status: 'active' as const, activatedAt: new Date().toISOString() } : u
    );
    saveUsers(users);
    set({ users });
  },

  deactivateUser(id) {
    const users = loadUsers().map(u =>
      u.id === id ? { ...u, status: 'disabled' as const } : u
    );
    saveUsers(users);
    set({ users });
  },

  deleteUser(id) {
    const users = loadUsers().filter(u => u.id !== id);
    saveUsers(users);
    set({ users });
  },

  promoteToAdmin(id) {
    const users = loadUsers().map(u =>
      u.id === id ? { ...u, role: 'admin' as const } : u
    );
    saveUsers(users);
    set({ users });
  },
}));
