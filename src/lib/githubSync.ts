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
  // Stable identifiers — used for fallback matching when container IDs change after re-upload
  containerNumber?: string;
  bookingNumber?: string;
  // Location data
  currentLocation?: string | null;
  vesselName?: string | null;
  portOfLoading?: string | null;
  portOfDischarge?: string | null;
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

// ── Workflow trigger & status ────────────────────────────────────────────────

export async function triggerTrackingWorkflow(
  settings: GithubSettings,
  forceAll = false
): Promise<void> {
  const resp = await fetch(
    `https://api.github.com/repos/${settings.owner}/${settings.repo}/actions/workflows/track.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `token ${settings.pat}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ ref: 'main', inputs: { force_all: String(forceAll) } }),
    }
  );
  // GitHub returns 204 No Content on success
  if (!resp.ok && resp.status !== 204) {
    const body = await resp.json().catch(() => ({})) as { message?: string };
    throw new Error(`GitHub API ${resp.status}: ${body.message ?? resp.statusText}`);
  }
}

export interface WorkflowRun {
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: string | null;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
}

export async function getLatestWorkflowRun(
  settings: GithubSettings
): Promise<WorkflowRun | null> {
  try {
    const resp = await fetch(
      `https://api.github.com/repos/${settings.owner}/${settings.repo}/actions/workflows/track.yml/runs?per_page=1`,
      {
        headers: {
          Authorization: `token ${settings.pat}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );
    if (!resp.ok) return null;
    const data = await resp.json() as { workflow_runs?: Array<{
      status: string; conclusion: string | null;
      created_at: string; updated_at: string; html_url: string;
    }> };
    const run = data.workflow_runs?.[0];
    if (!run) return null;
    return {
      status: run.status as WorkflowRun['status'],
      conclusion: run.conclusion,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      htmlUrl: run.html_url,
    };
  } catch {
    return null;
  }
}

/**
 * Poll auto-tracking.json until its updatedAt is newer than `sinceIso`,
 * or until `timeoutMs` elapses. Returns the new data or null on timeout.
 */
export async function pollForUpdatedResults(
  baseUrl: string,
  sinceIso: string,
  timeoutMs = 5 * 60 * 1000,
  intervalMs = 20_000
): Promise<AutoTrackingFile | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const data = await fetchAutoTracking(baseUrl);
    if (data?.updatedAt && data.updatedAt > sinceIso) return data;
  }
  return null;
}

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
