import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadGithubSettings, saveGithubSettings } from '../lib/githubSync';

describe('loadGithubSettings', () => {
  beforeEach(() => localStorage.clear());

  it('returns defaults when nothing stored', () => {
    const s = loadGithubSettings();
    expect(s.pat).toBe('');
    expect(s.owner).toBe('charanashokraj');
    expect(s.repo).toBe('ContainerLookup');
  });

  it('returns stored values', () => {
    saveGithubSettings({ pat: 'ghp_test', owner: 'myuser', repo: 'myrepo' });
    const s = loadGithubSettings();
    expect(s.pat).toBe('ghp_test');
    expect(s.owner).toBe('myuser');
    expect(s.repo).toBe('myrepo');
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('container-tracking-github-settings', '{invalid json}');
    const s = loadGithubSettings();
    expect(s.pat).toBe('');
  });
});

describe('saveGithubSettings', () => {
  beforeEach(() => localStorage.clear());

  it('persists all fields', () => {
    saveGithubSettings({ pat: 'abc', owner: 'u', repo: 'r' });
    const raw = localStorage.getItem('container-tracking-github-settings');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toEqual({ pat: 'abc', owner: 'u', repo: 'r' });
  });
});

describe('fetchAutoTracking', () => {
  it('returns null on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'));
    const { fetchAutoTracking } = await import('../lib/githubSync');
    const result = await fetchAutoTracking('https://example.com');
    expect(result).toBeNull();
  });

  it('returns null on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const { fetchAutoTracking } = await import('../lib/githubSync');
    const result = await fetchAutoTracking('https://example.com');
    expect(result).toBeNull();
  });

  it('returns parsed JSON on success', async () => {
    const payload = { updatedAt: '2025-06-01T00:00:00Z', containerCount: 5, trackedCount: 3, results: {} };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(payload) });
    const { fetchAutoTracking } = await import('../lib/githubSync');
    const result = await fetchAutoTracking('https://example.com');
    expect(result?.trackedCount).toBe(3);
  });
});

describe('triggerTrackingWorkflow', () => {
  it('throws when GitHub API returns error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 403,
      json: () => Promise.resolve({ message: 'Forbidden' }),
    });
    const { triggerTrackingWorkflow } = await import('../lib/githubSync');
    await expect(triggerTrackingWorkflow({ pat: 'x', owner: 'u', repo: 'r' }))
      .rejects.toThrow('GitHub API 403');
  });

  it('resolves on 204 No Content', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 204, json: vi.fn() });
    const { triggerTrackingWorkflow } = await import('../lib/githubSync');
    await expect(triggerTrackingWorkflow({ pat: 'x', owner: 'u', repo: 'r' }))
      .resolves.toBeUndefined();
  });
});
