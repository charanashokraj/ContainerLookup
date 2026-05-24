import type { AppState } from '../types';

const STORAGE_KEY = 'container-tracking-app';

const DEFAULT_STATE: AppState = {
  containers: [],
  sessions: [],
  currentUser: 'User',
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    console.warn('Could not save state to localStorage');
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
