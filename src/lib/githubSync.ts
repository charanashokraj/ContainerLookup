import type { ContainerRecord } from '../types';

export interface GithubSettings {
  pat: string;
  owner: string;
  repo: string;
}

const CONTAINERS_PATH = 'data/containers.json';

async function getFileSha(settings: GithubSettings, path: string): Promise<string | null> {
  const resp = await fetch(
    `https://api.github.com/repos/${settings.owner}/${settings.repo}/contents/${path}`,
    { headers: { Authorization: `token ${settings.pat}`, Accept: 'application/vnd.github+json' } }
  );
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.sha ?? null;
}

export async function syncContainersToGithub(
  settings: GithubSettings,
  containers: ContainerRecord[]
): Promise<void> {
  // Serialize only the fields the tracking script needs (keep file small)
  const payload = containers
    .filter((c) => c.reviewStatus !== 'Completed')
    .map((c) => ({
      id: c.id,
      bookingNumber: c.bookingNumber,
      containerNumber: c.containerNumber,
      carrier: c.carrier,
      sapStatus: c.sapStatus,
      sapEta: c.sapEta,
      reviewStatus: c.reviewStatus,
    }));

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))));
  const sha = await getFileSha(settings, CONTAINERS_PATH);

  const resp = await fetch(
    `https://api.github.com/repos/${settings.owner}/${settings.repo}/contents/${CONTAINERS_PATH}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${settings.pat}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `chore: sync container list ${new Date().toISOString()}`,
        content,
        ...(sha ? { sha } : {}),
      }),
    }
  );

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(`GitHub API error ${resp.status}: ${body.message ?? resp.statusText}`);
  }
}

export interface AutoTrackingResult {
  autoTracked: boolean;
  checkedAt: string;
  source?: string;
  error?: string | null;
  eta?: string | null;
  dischargeDate?: string | null;
  releaseDate?: string | null;
  emptyReturnDate?: string | null;
  currentStatus?: string | null;
  lastEventDescription?: string | null;
  lastEventDate?: string | null;
}

export interface AutoTrackingFile {
  updatedAt: string | null;
  containerCount: number;
  trackedCount: number;
  results: Record<string, AutoTrackingResult>;
}

export async function fetchAutoTracking(baseUrl: string): Promise<AutoTrackingFile | null> {
  try {
    // Strip trailing slash and append path
    const url = baseUrl.replace(/\/$/, '') + '/auto-tracking.json';
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

const SETTINGS_KEY = 'container-tracking-github-settings';

export function loadGithubSettings(): GithubSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { pat: '', owner: 'charanashokraj', repo: 'ContainerLookup' };
}

export function saveGithubSettings(s: GithubSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}
