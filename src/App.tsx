import { useState, useEffect, useRef } from 'react';
import {
  Upload, Download, Trash2, FileDown, Settings,
  Zap, BookOpen, RefreshCw, CheckCircle2, AlertCircle,
  LogOut, Users, Crown, Ship, History, X, User,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { HelpPage } from './pages/HelpPage';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import AdminUsersPanel from './components/AdminUsersPanel';
import { Dashboard } from './components/Dashboard';
import { FilterBar } from './components/FilterBar';
import { ContainerTable } from './components/ContainerTable';
import { ContainerDetail } from './components/ContainerDetail';
import { UploadModal } from './components/UploadModal';
import { SettingsModal } from './components/SettingsModal';
import { useStore } from './store/useStore';
import { useAuthStore } from './store/useAuthStore';
import { exportSapUpdateReport, exportFullReport } from './lib/exporter';
import {
  fetchAutoTracking, loadGithubSettings,
  triggerTrackingWorkflow, pollForUpdatedResults,
} from './lib/githubSync';
import type { ContainerRecord, FilterState } from './types';

const DEFAULT_FILTERS: FilterState = {
  carrier: '', customer: '', destination: '', status: '',
  priority: '', suggestedAction: '', search: '', etaFrom: '', etaTo: '',
  autoTrackedOnly: false, uploadedBy: '',
};

// ── Root: initialization → landing / auth / app routing ──────────────────────

export default function App() {
  const { profile, initialized, initialize } = useAuthStore();

  type Page = 'landing' | 'login' | 'register' | 'setup';
  const [page, setPage] = useState<Page>('landing');

  useEffect(() => { initialize(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  if (!initialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5"
        style={{ background: '#f0f4f8' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', boxShadow: '0 0 30px rgba(6,182,212,0.3)' }}>
          <Ship size={22} className="text-white" />
        </div>
        <div className="flex items-center gap-3">
          <RefreshCw size={16} className="animate-spin" style={{ color: '#0891b2' }} />
          <span className="text-sm font-medium" style={{ color: '#64748b' }}>Loading ContainerFlow…</span>
        </div>
      </div>
    );
  }

  if (profile) return <MainApp />;

  if (page === 'login' || page === 'register' || page === 'setup') {
    return (
      <AuthPage
        initialMode={page === 'setup' ? 'setup' : page}
        onBack={() => setPage('landing')}
        onSuccess={() => window.location.reload()}
      />
    );
  }

  return (
    <LandingPage
      onSignIn={() => setPage('login')}
      onRegister={() => setPage('register')}
    />
  );
}

// ── Main App (authenticated) ──────────────────────────────────────────────────

function MainApp() {
  const containers         = useStore(s => s.containers);
  const clearAllContainers = useStore(s => s.clearAllContainers);
  const mergeAutoTracking  = useStore(s => s.mergeAutoTracking);
  const lastAutoTrackAt    = useStore(s => s.lastAutoTrackAt);
  const sessions           = useStore(s => s.sessions);
  const loadFromSupabase   = useStore(s => s.loadFromSupabase);
  const loaded             = useStore(s => s.loaded);
  const setCurrentUser     = useStore(s => s.setCurrentUser);

  const authProfile = useAuthStore(s => s.profile);
  const logout      = useAuthStore(s => s.logout);
  const isAdmin     = authProfile?.role === 'admin';

  // Load containers from Supabase on mount
  useEffect(() => { loadFromSupabase(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep currentUser in sync with auth profile
  useEffect(() => {
    if (authProfile?.name) setCurrentUser(authProfile.name);
  }, [authProfile?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const [showUpload,      setShowUpload]      = useState(false);
  const [showSettings,    setShowSettings]    = useState(false);
  const [showHelp,        setShowHelp]        = useState(false);
  const [showAdminPanel,  setShowAdminPanel]  = useState(false);
  const [showSessions,    setShowSessions]    = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<ContainerRecord | null>(null);
  const [filters,           setFilters]           = useState<FilterState>(DEFAULT_FILTERS);
  const [autoFetchBanner,   setAutoFetchBanner]   = useState<string | null>(null);

  type CheckPhase = 'idle' | 'triggering' | 'waiting' | 'done' | 'error';
  const [checkPhase,   setCheckPhase]   = useState<CheckPhase>('idle');
  const [checkMessage, setCheckMessage] = useState('');
  const lastTriggerRef = useRef<number>(0);

  // ── Auto-fetch once containers are loaded from Supabase + 4h background poll ─
  // Runs AFTER `loaded` becomes true so containers exist in the store for merging.
  // Uses raw.githubusercontent.com (available immediately after a commit; no deploy delay).
  useEffect(() => {
    if (!loaded) return;  // wait until Supabase load completes

    const settings = loadGithubSettings();
    if (!settings.owner || !settings.repo) return;

    // Always poll raw GitHub — available as soon as the workflow commits
    const rawBase = `https://raw.githubusercontent.com/${settings.owner}/${settings.repo}/main/public`;

    const run = async () => {
      const data = await fetchAutoTracking(rawBase);
      if (!data?.updatedAt) return false;
      // Merge if we have any tracked results (including from previous skipped runs)
      const hasResults = Object.values(data.results ?? {}).some(r => r.autoTracked);
      if (!hasResults) return false;
      if (lastAutoTrackAt && data.updatedAt <= lastAutoTrackAt) return false;
      mergeAutoTracking(data.results, data.updatedAt, data.trackedCount);
      return true;
    };

    run().then(merged => {
      if (merged) {
        setAutoFetchBanner('Carrier tracking results loaded — statuses are up to date.');
        setTimeout(() => setAutoFetchBanner(null), 6000);
      }
    });

    const iv = setInterval(async () => {
      const merged = await run();
      if (merged) {
        setAutoFetchBanner('Statuses refreshed automatically — tracking results updated.');
        setTimeout(() => setAutoFetchBanner(null), 6000);
      }
    }, 4 * 60 * 60 * 1000);

    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // ── Check All Now ─────────────────────────────────────────────────────────
  async function handleCheckAll() {
    const settings = loadGithubSettings();
    if (!settings.pat) {
      setCheckPhase('error');
      setCheckMessage('GitHub PAT not set — open ⚙ Settings to configure.');
      setTimeout(() => { setCheckPhase('idle'); setCheckMessage(''); }, 8000);
      return;
    }

    const rawBase = `https://raw.githubusercontent.com/${settings.owner}/${settings.repo}/main/public`;
    // Use a timestamp slightly before now so we only accept results from THIS run
    const sinceIso = new Date(Date.now() - 5000).toISOString();

    const COOLDOWN = 2 * 60 * 1000;
    if (Date.now() - lastTriggerRef.current < COOLDOWN) {
      setCheckPhase('waiting');
      setCheckMessage('Workflow already triggered — checking for latest results…');
      const data = await pollForUpdatedResults(rawBase, sinceIso, 12 * 60 * 1000, 20_000);
      if (data) {
        mergeAutoTracking(data.results, data.updatedAt, data.trackedCount);
        setCheckPhase('done');
        setCheckMessage(`Done — ${data.trackedCount} containers checked.`);
      } else {
        setCheckPhase('done');
        setCheckMessage('Still running. Results will load automatically when ready.');
      }
      setTimeout(() => { setCheckPhase('idle'); setCheckMessage(''); }, 12_000);
      return;
    }

    try {
      // Step 1 — sync the full container list to GitHub so the workflow sees ALL containers
      setCheckPhase('triggering');
      setCheckMessage(`Syncing ${containers.length} containers to GitHub…`);
      try {
        const { syncContainersToGithub } = await import('./lib/githubSync');
        await syncContainersToGithub(settings, containers);
      } catch (syncErr) {
        // Non-fatal — workflow will use whatever data/containers.json already has
        console.warn('[Check All] Sync failed:', syncErr);
        setCheckMessage('Sync partial — triggering workflow with existing container list…');
        await new Promise(r => setTimeout(r, 1500));
      }

      // Step 2 — trigger the workflow with force_all=true so nothing is skipped
      setCheckMessage('Triggering tracking workflow (force refresh)…');
      await triggerTrackingWorkflow(settings, true);  // ← always force re-check on manual run
      lastTriggerRef.current = Date.now();

      // Step 3 — show realistic timing estimate based on container count
      const estMins = Math.max(3, Math.ceil(containers.length / 10));
      setCheckPhase('waiting');
      setCheckMessage(`Tracking ${containers.length} containers — allow ~${estMins} min. Do not close this tab.`);

      // Poll up to 16 minutes — covers 70 containers × 90s Sinay timeout ÷ 10 workers + commit lag
      const pollTimeout = Math.max(12, estMins + 4) * 60 * 1000;
      const data = await pollForUpdatedResults(rawBase, sinceIso, pollTimeout, 20_000);
      if (data) {
        mergeAutoTracking(data.results, data.updatedAt, data.trackedCount);
        setCheckPhase('done');
        setCheckMessage(`Done — ${data.trackedCount} containers updated. Refresh the page if data is not visible.`);
      } else {
        setCheckPhase('done');
        setCheckMessage('Tracking complete. Reload the page to see results.');
      }
    } catch (err) {
      setCheckPhase('error');
      setCheckMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setTimeout(() => { setCheckPhase('idle'); setCheckMessage(''); }, 12_000);
  }

  async function handleLogout() {
    await logout();
    window.location.reload();
  }

  if (showHelp) return <HelpPage onBack={() => setShowHelp(false)} />;

  if (!loaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#f0f4f8' }}>
        <RefreshCw size={20} className="animate-spin" style={{ color: '#0891b2' }} />
        <span className="text-sm font-medium" style={{ color: '#64748b' }}>Loading container data…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#f0f4f8' }}>

      {/* ── Top Nav ──────────────────────────────────────────────────── */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 8px rgba(0,0,0,0.07)',
      }} className="sticky top-0 z-40">
        <div className="w-full px-3 py-3 flex items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', boxShadow: '0 2px 10px rgba(6,182,212,0.25)' }}>
              <Ship size={18} strokeWidth={2.5} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight" style={{ color: '#0f172a' }}>ContainerFlow</h1>
              {sessions[0] && (
                <p className="text-xs" style={{ color: '#94a3b8' }}>
                  {sessions[0].filename} · {sessions[0].containerCount} containers
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">

            <NavBtn onClick={() => setShowUpload(true)} primary>
              <Upload size={14} /> Upload SAP
            </NavBtn>

            <NavBtn onClick={() => setShowSettings(true)} color="#7c3aed">
              <Zap size={14} /> Auto-Track
            </NavBtn>

            {containers.length > 0 && (
              <button onClick={handleCheckAll}
                disabled={checkPhase === 'triggering' || checkPhase === 'waiting'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: checkPhase === 'error' ? '#fef2f2' :
                              checkPhase === 'done'  ? '#f0fdf4' :
                              checkPhase !== 'idle'  ? '#fffbeb' : '#ecfeff',
                  border: `1px solid ${checkPhase === 'error' ? '#fca5a5' : checkPhase === 'done' ? '#86efac' : checkPhase !== 'idle' ? '#fcd34d' : '#67e8f9'}`,
                  color: checkPhase === 'error' ? '#dc2626' : checkPhase === 'done' ? '#16a34a' : checkPhase !== 'idle' ? '#d97706' : '#0891b2',
                }}>
                {checkPhase === 'triggering' || checkPhase === 'waiting'
                  ? <RefreshCw size={13} className="animate-spin" />
                  : checkPhase === 'done' ? <CheckCircle2 size={13} />
                  : checkPhase === 'error' ? <AlertCircle size={13} />
                  : <RefreshCw size={13} />}
                {checkPhase === 'triggering' ? 'Starting…' : checkPhase === 'waiting' ? 'Running…' : checkPhase === 'done' ? 'Updated!' : checkPhase === 'error' ? 'Error' : 'Check All'}
              </button>
            )}

            {containers.length > 0 && (
              <>
                <NavBtn onClick={() => exportSapUpdateReport(containers)} color="#059669">
                  <Download size={14} /> Export SAP
                </NavBtn>
                <NavBtn onClick={() => exportFullReport(containers)}>
                  <FileDown size={14} /> Full Report
                </NavBtn>
                <button onClick={() => { if (confirm('Clear all containers?')) clearAllContainers(); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ color: '#dc2626', border: '1px solid #fca5a5', background: '#fef2f2' }}>
                  <Trash2 size={13} />
                </button>
              </>
            )}

            <NavBtn onClick={() => setShowHelp(true)}>
              <BookOpen size={14} /> Help
            </NavBtn>

            <NavBtn onClick={() => setShowSettings(true)}>
              <Settings size={14} />
            </NavBtn>

            {/* Sessions / uploads history (admin) */}
            {isAdmin && (
              <button onClick={() => setShowSessions(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: '#ecfeff', border: '1px solid #67e8f9', color: '#0891b2' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#cffafe')}
                onMouseLeave={e => (e.currentTarget.style.background = '#ecfeff')}>
                <History size={13} /> Uploads
              </button>
            )}

            {/* Admin panel */}
            {isAdmin && (
              <button onClick={() => setShowAdminPanel(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', color: '#7c3aed' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#ede9fe')}
                onMouseLeave={e => (e.currentTarget.style.background = '#f5f3ff')}>
                <Crown size={13} /> <Users size={13} />
              </button>
            )}

            {/* User + Logout */}
            <div className="flex items-center gap-2 pl-2 ml-1"
              style={{ borderLeft: '1px solid #e2e8f0' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold uppercase"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: 'white' }}>
                {authProfile?.name.charAt(0) ?? '?'}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold" style={{ color: '#0f172a' }}>{authProfile?.name}</p>
                {isAdmin && <p className="text-xs font-medium" style={{ color: '#7c3aed' }}>Admin</p>}
              </div>
              <button onClick={handleLogout} title="Sign out"
                className="ml-1 p-1.5 rounded-lg transition-all"
                style={{ color: '#94a3b8' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Auto-track banner */}
      {autoFetchBanner && (
        <div className="text-sm px-6 py-2 flex items-center gap-2"
          style={{ background: '#f5f3ff', borderBottom: '1px solid #c4b5fd', color: '#6d28d9' }}>
          <Zap size={14} className="shrink-0" /> {autoFetchBanner}
        </div>
      )}

      {/* Check-all status banner */}
      {checkPhase !== 'idle' && checkMessage && (
        <div className="text-sm px-6 py-2 flex items-center gap-2"
          style={{
            background: checkPhase === 'error' ? '#fef2f2' : checkPhase === 'done' ? '#f0fdf4' : '#fffbeb',
            borderBottom: `1px solid ${checkPhase === 'error' ? '#fca5a5' : checkPhase === 'done' ? '#86efac' : '#fcd34d'}`,
            color: checkPhase === 'error' ? '#dc2626' : checkPhase === 'done' ? '#16a34a' : '#92400e',
          }}>
          {checkPhase === 'triggering' || checkPhase === 'waiting'
            ? <RefreshCw size={14} className="shrink-0 animate-spin" />
            : checkPhase === 'done' ? <CheckCircle2 size={14} className="shrink-0" />
            : <AlertCircle size={14} className="shrink-0" />}
          {checkMessage}
        </div>
      )}

      {/* Main Content */}
      <main className="w-full px-3 py-6" style={{ minHeight: 'calc(100vh - 56px)' }}>
        <Dashboard />
        {containers.length > 0 && <FilterBar filters={filters} onChange={setFilters} />}
        <ContainerTable filters={filters} onSelect={setSelectedContainer} />
      </main>

      {/* Modals */}
      {showUpload     && <UploadModal onClose={() => setShowUpload(false)} />}
      {showSettings   && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showAdminPanel && <AdminUsersPanel onClose={() => setShowAdminPanel(false)} />}
      {showSessions   && <SessionsPanel onClose={() => setShowSessions(false)} onFilterUser={u => { setFilters(f => ({ ...f, uploadedBy: u })); setShowSessions(false); }} />}
      {selectedContainer && (
        <ContainerDetail container={selectedContainer} onClose={() => setSelectedContainer(null)} />
      )}
    </div>
  );
}

// ── Sessions Panel ────────────────────────────────────────────────────────────

function SessionsPanel({ onClose, onFilterUser }: { onClose: () => void; onFilterUser: (name: string) => void }) {
  const sessions   = useStore(s => s.sessions);
  const containers = useStore(s => s.containers);
  const deleteSession = useStore(s => s.deleteSession);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-xl max-h-[80vh] overflow-y-auto rounded-2xl"
        style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>

        <div className="flex items-center justify-between p-5 sticky top-0 z-10"
          style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h2 className="font-bold flex items-center gap-2" style={{ color: '#0f172a' }}><History size={16} style={{ color: '#0891b2' }} /> Upload History</h2>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>All container uploads across all users</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ color: '#94a3b8' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {sessions.length === 0 && (
            <p className="text-center text-sm py-8" style={{ color: '#94a3b8' }}>No uploads yet.</p>
          )}
          {sessions.map(s => {
            const count = containers.filter(c => c.sessionId === s.id).length;
            return (
              <div key={s.id} className="rounded-xl px-4 py-3 flex items-center justify-between gap-4"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>{s.filename || 'Unknown file'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: '#ecfeff', color: '#0891b2', border: '1px solid #67e8f9' }}>
                      {count} containers
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#7c3aed' }}>
                      <User size={10} />{s.uploadedBy || 'Unknown'}
                    </span>
                    <span className="text-xs" style={{ color: '#94a3b8' }}>
                      {s.uploadedAt ? format(parseISO(s.uploadedAt), 'dd MMM yyyy HH:mm') : '–'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => onFilterUser(s.uploadedBy)}
                    className="text-xs px-2.5 py-1 rounded-lg transition-all"
                    style={{ background: '#ecfeff', border: '1px solid #67e8f9', color: '#0891b2' }}
                    title="Filter table to this upload">
                    View
                  </button>
                  <button onClick={() => { if (confirm(`Delete ${count} containers from this upload?`)) deleteSession(s.id); }}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ color: '#dc2626', border: '1px solid #fca5a5', background: '#fef2f2' }}
                    title="Delete this upload's containers">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Shared nav button ─────────────────────────────────────────────────────────

function NavBtn({
  children, onClick, primary = false, color,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  color?: string;
}) {
  const bg = primary ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : color ? undefined : undefined;
  const base: React.CSSProperties = primary
    ? { background: bg!, boxShadow: '0 2px 10px rgba(6,182,212,0.25)', color: 'white' }
    : color
    ? { background: `${color}15`, border: `1px solid ${color}50`, color }
    : { background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569' };

  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={base}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
      {children}
    </button>
  );
}
