import { useState, useEffect, useRef } from 'react';
import {
  Upload, Download, Trash2, FileDown, Settings,
  Zap, BookOpen, RefreshCw, CheckCircle2, AlertCircle,
  LogOut, Users, Crown, Ship,
} from 'lucide-react';
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
};

// ── Root: initialization → landing / auth / app routing ──────────────────────

export default function App() {
  const { currentUser, users, initialized, initialize } = useAuthStore();

  type Page = 'landing' | 'login' | 'register';
  const [page, setPage] = useState<Page>('landing');

  // Run once on mount: fetch users from GitHub, hydrate session
  useEffect(() => { initialize(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading spinner while fetching users from GitHub ──
  if (!initialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5"
        style={{ background: '#04071a' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', boxShadow: '0 0 30px rgba(6,182,212,0.4)' }}>
          <Ship size={22} className="text-white" />
        </div>
        <div className="flex items-center gap-3">
          <RefreshCw size={16} className="animate-spin" style={{ color: '#67e8f9' }} />
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading ContainerFlow…</span>
        </div>
      </div>
    );
  }

  // If already logged in, go straight to the app
  if (currentUser) return <MainApp />;

  const isFirstRun = users.length === 0;

  // First run → skip landing, go straight to admin setup
  if (isFirstRun) {
    return (
      <AuthPage
        isFirstRun
        onBack={() => {}}
        onSuccess={() => window.location.reload()}
      />
    );
  }

  if (page === 'login' || page === 'register') {
    return (
      <AuthPage
        initialMode={page}
        isFirstRun={false}
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
  const containers       = useStore(s => s.containers);
  const clearAllContainers = useStore(s => s.clearAllContainers);
  const mergeAutoTracking  = useStore(s => s.mergeAutoTracking);
  const lastAutoTrackAt    = useStore(s => s.lastAutoTrackAt);
  const sessions           = useStore(s => s.sessions);

  const authUser  = useAuthStore(s => s.currentUser);
  const logout    = useAuthStore(s => s.logout);
  const isAdmin   = authUser?.role === 'admin';

  const [showUpload,      setShowUpload]      = useState(false);
  const [showSettings,    setShowSettings]    = useState(false);
  const [showHelp,        setShowHelp]        = useState(false);
  const [showAdminPanel,  setShowAdminPanel]  = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<ContainerRecord | null>(null);
  const [filters,           setFilters]           = useState<FilterState>(DEFAULT_FILTERS);
  const [autoFetchBanner,   setAutoFetchBanner]   = useState<string | null>(null);

  type CheckPhase = 'idle' | 'triggering' | 'waiting' | 'done' | 'error';
  const [checkPhase,   setCheckPhase]   = useState<CheckPhase>('idle');
  const [checkMessage, setCheckMessage] = useState('');
  const lastTriggerRef = useRef<number>(0);

  // ── Auto-fetch on mount + 4h background poll ──────────────────────────────
  useEffect(() => {
    const settings = loadGithubSettings();
    if (!settings.owner || !settings.repo) return;
    const baseUrl = `https://${settings.owner}.github.io/${settings.repo}`;

    const run = async () => {
      const data = await fetchAutoTracking(baseUrl);
      if (!data?.updatedAt || data.trackedCount === 0) return false;
      if (lastAutoTrackAt && data.updatedAt <= lastAutoTrackAt) return false;
      mergeAutoTracking(data.results, data.updatedAt, data.trackedCount);
      return true;
    };

    run().then(merged => {
      if (merged) {
        setAutoFetchBanner('Auto-tracking results loaded — statuses are up to date.');
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
  }, []);

  // ── Check All Now ─────────────────────────────────────────────────────────
  async function handleCheckAll() {
    const COOLDOWN = 2 * 60 * 1000;
    if (Date.now() - lastTriggerRef.current < COOLDOWN) {
      setCheckPhase('waiting');
      setCheckMessage('Workflow already triggered — checking for results…');
      return;
    }
    const settings = loadGithubSettings();
    if (!settings.owner || !settings.repo || !settings.pat) { setShowSettings(true); return; }
    const baseUrl   = `https://${settings.owner}.github.io/${settings.repo}`;
    const sinceIso  = lastAutoTrackAt ?? new Date(0).toISOString();
    try {
      setCheckPhase('triggering');
      setCheckMessage('Triggering GitHub Actions workflow…');
      await triggerTrackingWorkflow(settings, false);
      lastTriggerRef.current = Date.now();
      setCheckPhase('waiting');
      setCheckMessage('Workflow running — checking every 20s (2–4 min)…');
      const data = await pollForUpdatedResults(baseUrl, sinceIso, 6 * 60 * 1000, 20_000);
      if (data) {
        mergeAutoTracking(data.results, data.updatedAt, data.trackedCount);
        setCheckPhase('done');
        setCheckMessage(`Done — ${data.trackedCount} containers updated.`);
      } else {
        setCheckPhase('done');
        setCheckMessage('Workflow still running. Results will appear on next page visit.');
      }
    } catch (err) {
      setCheckPhase('error');
      setCheckMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setTimeout(() => { setCheckPhase('idle'); setCheckMessage(''); }, 12_000);
  }

  function handleLogout() {
    logout();
    window.location.reload();
  }

  if (showHelp) return <HelpPage onBack={() => setShowHelp(false)} />;

  return (
    <div className="min-h-screen" style={{ background: '#070c1a' }}>

      {/* ── Top Nav ──────────────────────────────────────────────────── */}
      <header style={{
        background: 'linear-gradient(135deg, #060b18 0%, #0d1b2e 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.4)',
      }} className="sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', boxShadow: '0 0 16px rgba(6,182,212,0.3)' }}>
              <Ship size={18} strokeWidth={2.5} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">ContainerFlow</h1>
              {sessions[0] && (
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
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
                  background: checkPhase === 'error' ? 'rgba(239,68,68,0.2)' :
                              checkPhase === 'done'  ? 'rgba(34,197,94,0.2)' :
                              checkPhase !== 'idle'  ? 'rgba(245,158,11,0.2)' : 'rgba(6,182,212,0.15)',
                  border: `1px solid ${checkPhase === 'error' ? 'rgba(239,68,68,0.4)' : checkPhase === 'done' ? 'rgba(34,197,94,0.4)' : checkPhase !== 'idle' ? 'rgba(245,158,11,0.4)' : 'rgba(6,182,212,0.35)'}`,
                  color: checkPhase === 'error' ? '#f87171' : checkPhase === 'done' ? '#4ade80' : checkPhase !== 'idle' ? '#fbbf24' : '#67e8f9',
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
                  style={{ color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
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

            {/* Admin panel */}
            {isAdmin && (
              <button onClick={() => setShowAdminPanel(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.25)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.15)')}>
                <Crown size={13} /> <Users size={13} />
              </button>
            )}

            {/* User + Logout */}
            <div className="flex items-center gap-2 pl-2 ml-1"
              style={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold uppercase"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: 'white' }}>
                {authUser?.name.charAt(0) ?? '?'}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium text-white">{authUser?.name}</p>
                {isAdmin && <p className="text-xs" style={{ color: '#a78bfa' }}>Admin</p>}
              </div>
              <button onClick={handleLogout} title="Sign out"
                className="ml-1 p-1.5 rounded-lg transition-all"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Auto-track banner */}
      {autoFetchBanner && (
        <div className="text-white text-sm px-6 py-2 flex items-center gap-2"
          style={{ background: 'linear-gradient(90deg, #7c3aed, #6d28d9)' }}>
          <Zap size={14} className="shrink-0" /> {autoFetchBanner}
        </div>
      )}

      {/* Check-all status banner */}
      {checkPhase !== 'idle' && checkMessage && (
        <div className="text-white text-sm px-6 py-2 flex items-center gap-2"
          style={{ background: checkPhase === 'error' ? '#dc2626' : checkPhase === 'done' ? '#059669' : '#d97706' }}>
          {checkPhase === 'triggering' || checkPhase === 'waiting'
            ? <RefreshCw size={14} className="shrink-0 animate-spin" />
            : checkPhase === 'done' ? <CheckCircle2 size={14} className="shrink-0" />
            : <AlertCircle size={14} className="shrink-0" />}
          {checkMessage}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-screen-2xl mx-auto px-6 py-6" style={{ minHeight: 'calc(100vh - 56px)' }}>
        <Dashboard />
        {containers.length > 0 && <FilterBar filters={filters} onChange={setFilters} />}
        <ContainerTable filters={filters} onSelect={setSelectedContainer} />
      </main>

      {/* Modals */}
      {showUpload     && <UploadModal onClose={() => setShowUpload(false)} />}
      {showSettings   && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showAdminPanel && <AdminUsersPanel onClose={() => setShowAdminPanel(false)} />}
      {selectedContainer && (
        <ContainerDetail container={selectedContainer} onClose={() => setSelectedContainer(null)} />
      )}
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
    ? { background: `${color}22`, border: `1px solid ${color}44`, color }
    : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.7)' };

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
