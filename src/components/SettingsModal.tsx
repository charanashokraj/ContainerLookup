import { useState } from 'react';
import {
  X,
  GitBranch,
  Key,
  Upload,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Info,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  loadGithubSettings,
  saveGithubSettings,
  syncContainersToGithub,
  fetchAutoTracking,
  type GithubSettings,
} from '../lib/githubSync';

interface Props { onClose: () => void }
type SyncStatus  = 'idle' | 'syncing'  | 'success' | 'error';
type FetchStatus = 'idle' | 'fetching' | 'success' | 'none'  | 'error';

const CARRIER_APIS = [
  {
    name: 'Maersk / ANL',
    secrets: ['MAERSK_CLIENT_ID', 'MAERSK_CLIENT_SECRET'],
    registerUrl: 'https://developer.maersk.com',
    note: 'Free developer account. Covers Maersk and ANL containers.',
    tag: 'Free',
  },
  {
    name: 'CMA CGM / ANL',
    secrets: ['CMACGM_API_KEY'],
    registerUrl: 'https://api-portal.cma-cgm.com',
    note: 'Free trial. Register → browse "Visibility" product → subscribe. Covers CMA CGM and ANL.',
    tag: 'Free trial',
  },
  {
    name: 'Hapag-Lloyd',
    secrets: ['HLAG_CLIENT_ID', 'HLAG_CLIENT_SECRET'],
    registerUrl: 'https://api-portal.hlag.com',
    note: 'Free developer portal. Subscribe to "Track & Trace" product.',
    tag: 'Free',
  },
  {
    name: 'MSC',
    secrets: ['MSC_API_KEY'],
    registerUrl: 'https://developerportal.msc.com',
    note: 'Free. Select "DPO-DCSATrackAndTrace-API-V2" in their API Catalogue.',
    tag: 'Free',
  },
  {
    name: 'Sinay — Universal (170+ carriers)',
    secrets: ['SINAY_API_KEY'],
    registerUrl: 'https://app.sinay.ai',
    note: 'Free API key in minutes. Covers ONE, Evergreen, Yang Ming, COSCO, ZIM, PIL, HMM and 160+ more. Best single key for maximum coverage.',
    tag: 'Free ★ Recommended',
    highlight: true,
  },
];

export function SettingsModal({ onClose }: Props) {
  const containers        = useStore((s) => s.containers);
  const mergeAutoTracking = useStore((s) => s.mergeAutoTracking);
  const lastAutoTrackAt   = useStore((s) => s.lastAutoTrackAt);
  const autoTrackedCount  = useStore((s) => s.autoTrackedCount);

  const [settings, setSettings] = useState<GithubSettings>(loadGithubSettings);
  const [syncStatus,  setSyncStatus]  = useState<SyncStatus>('idle');
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle');
  const [syncMsg,  setSyncMsg]  = useState('');
  const [fetchMsg, setFetchMsg] = useState('');
  const [showApiDetails, setShowApiDetails] = useState(false);

  function handleSave() { saveGithubSettings(settings); }

  async function handleSync() {
    if (!settings.pat) { setSyncMsg('Enter your GitHub Personal Access Token first.'); setSyncStatus('error'); return; }
    if (containers.length === 0) { setSyncMsg('No containers loaded — upload a SAP report first.'); setSyncStatus('error'); return; }
    setSyncStatus('syncing'); setSyncMsg('');
    saveGithubSettings(settings);
    try {
      await syncContainersToGithub(settings, containers);
      const active = containers.filter(c => c.reviewStatus !== 'Completed').length;
      setSyncStatus('success');
      setSyncMsg(`✓ Synced ${active} active containers to GitHub. Now run the Auto-Track workflow.`);
    } catch (e: unknown) {
      setSyncStatus('error');
      setSyncMsg(e instanceof Error ? e.message : 'Unknown error syncing to GitHub.');
    }
  }

  async function handleFetch() {
    setFetchStatus('fetching'); setFetchMsg('');
    const baseUrl = `https://${settings.owner}.github.io/${settings.repo}`;
    const data = await fetchAutoTracking(baseUrl);
    if (!data) { setFetchStatus('error'); setFetchMsg('Could not reach the tracking results file. Make sure the workflow has run at least once.'); return; }
    if (!data.updatedAt) { setFetchStatus('none'); setFetchMsg('No results yet — run the Auto-Track workflow first.'); return; }
    mergeAutoTracking(data.results, data.updatedAt, data.trackedCount);
    setFetchStatus('success');
    setFetchMsg(`✓ Merged ${data.trackedCount} auto-tracked containers (last run: ${new Date(data.updatedAt).toLocaleString()}).`);
  }

  const activeCount = containers.filter(c => c.reviewStatus !== 'Completed').length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-violet-600" />
            <h2 className="text-lg font-semibold text-slate-800">Automated Tracking Setup</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">

          {/* How it works */}
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm text-violet-800 space-y-2">
            <p className="font-semibold flex items-center gap-1"><Info className="w-4 h-4" /> How it works</p>
            <ol className="list-decimal list-inside space-y-1 text-violet-700 text-xs">
              <li>Sync your container list to GitHub (Step 1 below)</li>
              <li>Add API keys as GitHub repository secrets (Step 2)</li>
              <li>The workflow runs automatically every Wednesday at 8 AM NZT — or trigger it manually</li>
              <li>Click "Load Latest Results" to pull results into the app</li>
            </ol>
          </div>

          {/* API coverage table */}
          <div>
            <button
              onClick={() => setShowApiDetails(v => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              {showApiDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Supported carrier APIs &amp; registration links
            </button>

            {showApiDetails && (
              <div className="mt-3 space-y-2">
                {CARRIER_APIS.map(api => (
                  <div key={api.name} className={`rounded-xl border p-3 ${api.highlight ? 'border-violet-300 bg-violet-50' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-slate-800">{api.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${api.highlight ? 'bg-violet-200 text-violet-800' : 'bg-green-100 text-green-700'}`}>
                            {api.tag}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{api.note}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Secrets: {api.secrets.map(s => <code key={s} className="bg-white border border-slate-200 rounded px-1 mx-0.5">{s}</code>)}
                        </p>
                      </div>
                      <a href={api.registerUrl} target="_blank" rel="noopener noreferrer"
                         className="shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        Register <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-slate-400 mt-1">
                  💡 <strong>Quickest setup:</strong> Register at <a href="https://app.sinay.ai" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">app.sinay.ai</a> and add <code className="bg-slate-100 px-1 rounded">SINAY_API_KEY</code> — one key covers all carriers.
                </p>
              </div>
            )}
          </div>

          {/* GitHub settings */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
              <GitBranch className="w-3 h-3" /> GitHub Repository
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Owner (username)</label>
                <input type="text" value={settings.owner}
                  onChange={e => setSettings(s => ({ ...s, owner: e.target.value }))}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Repository name</label>
                <input type="text" value={settings.repo}
                  onChange={e => setSettings(s => ({ ...s, repo: e.target.value }))}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1 flex items-center gap-1">
                <Key className="w-3 h-3" /> Personal Access Token (PAT)
                <a href="https://github.com/settings/tokens/new?description=ContainerTracking&scopes=repo"
                  target="_blank" rel="noopener noreferrer"
                  className="ml-auto text-blue-500 hover:underline flex items-center gap-0.5 text-xs">
                  Create one <ExternalLink className="w-3 h-3" />
                </a>
              </label>
              <input type="password" value={settings.pat}
                onChange={e => setSettings(s => ({ ...s, pat: e.target.value }))}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
              <p className="text-xs text-slate-400 mt-1">Needs <code className="bg-slate-100 px-1 rounded">repo</code> scope. Stored in your browser only — never sent anywhere else.</p>
            </div>
          </div>

          {/* Step 1 — Sync */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-slate-700">Step 1 — Sync Container List</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Writes {activeCount} active containers to <code className="bg-slate-100 px-1 rounded">data/containers.json</code> in your repo.
                </p>
              </div>
              <button onClick={handleSync} disabled={syncStatus === 'syncing'}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors disabled:opacity-50">
                {syncStatus === 'syncing'
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Syncing…</>
                  : <><Upload className="w-4 h-4" /> Sync to GitHub</>}
              </button>
            </div>
            {syncMsg && (
              <div className={`flex items-start gap-2 text-xs rounded-lg p-2 ${syncStatus === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {syncStatus === 'error' ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                {syncMsg}
              </div>
            )}
          </div>

          {/* Step 2 — Secrets */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-slate-700">Step 2 — Add API Secrets to GitHub</p>
            <ol className="text-xs text-slate-500 list-decimal list-inside space-y-1">
              <li>Register at <strong>any</strong> of the carrier API portals above (Sinay is the fastest — free key in 2 minutes)</li>
              <li>Go to <a href={`https://github.com/${settings.owner}/${settings.repo}/settings/secrets/actions`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-blue-500 hover:underline inline-flex items-center gap-0.5">
                  your repo → Settings → Secrets → Actions <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Add the secret names shown in the table above with their values</li>
            </ol>
          </div>

          {/* Step 3 — Run */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-slate-700">Step 3 — Run the Workflow</p>
            <p className="text-xs text-slate-500">Runs automatically every Wednesday at 8 AM NZT. To run now:</p>
            <a href={`https://github.com/${settings.owner}/${settings.repo}/actions/workflows/track.yml`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs hover:bg-slate-200 transition-colors">
              <GitBranch className="w-4 h-4" /> Open Actions → Auto-Track Containers → Run workflow
            </a>
          </div>

          {/* Step 4 — Load results */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-slate-700">Step 4 — Load Latest Results</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {lastAutoTrackAt
                    ? `Last loaded: ${new Date(lastAutoTrackAt).toLocaleString()} · ${autoTrackedCount} containers auto-tracked`
                    : 'No results loaded yet.'}
                </p>
              </div>
              <button onClick={handleFetch} disabled={fetchStatus === 'fetching'}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50">
                {fetchStatus === 'fetching'
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Loading…</>
                  : <><RefreshCw className="w-4 h-4" /> Load Latest Results</>}
              </button>
            </div>
            {fetchMsg && (
              <div className={`flex items-start gap-2 text-xs rounded-lg p-2 ${fetchStatus === 'error' || fetchStatus === 'none' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {fetchStatus === 'error' || fetchStatus === 'none' ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                {fetchMsg}
              </div>
            )}
          </div>

        </div>

        <div className="px-6 pb-6 border-t border-slate-100 pt-4">
          <button onClick={() => { handleSave(); onClose(); }}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
