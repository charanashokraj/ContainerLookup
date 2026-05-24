import { useState, useEffect } from 'react';
import {
  Upload,
  Download,
  Trash2,
  User,
  Container,
  FileDown,
  Settings,
  Zap,
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { FilterBar } from './components/FilterBar';
import { ContainerTable } from './components/ContainerTable';
import { ContainerDetail } from './components/ContainerDetail';
import { UploadModal } from './components/UploadModal';
import { SettingsModal } from './components/SettingsModal';
import { useStore } from './store/useStore';
import { exportSapUpdateReport, exportFullReport } from './lib/exporter';
import { fetchAutoTracking, loadGithubSettings } from './lib/githubSync';
import type { ContainerRecord, FilterState } from './types';

const DEFAULT_FILTERS: FilterState = {
  carrier: '',
  customer: '',
  destination: '',
  status: '',
  priority: '',
  suggestedAction: '',
  search: '',
  etaFrom: '',
  etaTo: '',
};

export default function App() {
  const containers = useStore((s) => s.containers);
  const currentUser = useStore((s) => s.currentUser);
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const clearAllContainers = useStore((s) => s.clearAllContainers);
  const mergeAutoTracking = useStore((s) => s.mergeAutoTracking);
  const lastAutoTrackAt = useStore((s) => s.lastAutoTrackAt);
  const sessions = useStore((s) => s.sessions);

  const [showUpload, setShowUpload] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<ContainerRecord | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [editingUser, setEditingUser] = useState(false);
  const [userInput, setUserInput] = useState(currentUser);
  const [autoFetchBanner, setAutoFetchBanner] = useState<string | null>(null);

  // On mount: silently try to load latest auto-tracking results
  useEffect(() => {
    async function tryAutoFetch() {
      const settings = loadGithubSettings();
      if (!settings.owner || !settings.repo) return;
      const baseUrl = `https://${settings.owner}.github.io/${settings.repo}`;
      const data = await fetchAutoTracking(baseUrl);
      if (!data || !data.updatedAt || data.trackedCount === 0) return;

      // Only merge if newer than what we have
      if (lastAutoTrackAt && data.updatedAt <= lastAutoTrackAt) return;

      mergeAutoTracking(data.results, data.updatedAt, data.trackedCount);
      setAutoFetchBanner(
        `Auto-tracking updated ${new Date(data.updatedAt).toLocaleString()} — ${data.trackedCount} containers refreshed automatically.`
      );
      setTimeout(() => setAutoFetchBanner(null), 8000);
    }
    tryAutoFetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSaveUser() {
    setCurrentUser(userInput.trim() || 'User');
    setEditingUser(false);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top Nav */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Container className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800">Container Tracking</h1>
              {sessions[0] && (
                <p className="text-xs text-slate-400">
                  Last upload: {sessions[0].filename} — {sessions[0].containerCount} containers
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* User identity */}
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-200">
              <User className="w-4 h-4 text-slate-400" />
              {editingUser ? (
                <input
                  autoFocus
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onBlur={handleSaveUser}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveUser()}
                  className="w-28 bg-transparent outline-none text-slate-800"
                />
              ) : (
                <button onClick={() => { setEditingUser(true); setUserInput(currentUser); }}>
                  {currentUser}
                </button>
              )}
            </div>

            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-4 h-4" /> Upload SAP Report
            </button>

            <button
              onClick={() => setShowSettings(true)}
              title="Automated tracking settings"
              className="flex items-center gap-2 px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
            >
              <Zap className="w-4 h-4" /> Auto-Track
            </button>

            {containers.length > 0 && (
              <>
                <button
                  onClick={() => exportSapUpdateReport(containers)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  <Download className="w-4 h-4" /> Export SAP Updates
                </button>

                <button
                  onClick={() => exportFullReport(containers)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                >
                  <FileDown className="w-4 h-4" /> Full Report
                </button>

                <button
                  onClick={() => {
                    if (confirm('Clear all containers? This cannot be undone.')) {
                      clearAllContainers();
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors border border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Auto-track banner */}
      {autoFetchBanner && (
        <div className="bg-violet-600 text-white text-sm px-6 py-2 flex items-center gap-2">
          <Zap className="w-4 h-4 shrink-0" />
          {autoFetchBanner}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-screen-2xl mx-auto px-6 py-6">
        <Dashboard />
        {containers.length > 0 && (
          <FilterBar filters={filters} onChange={setFilters} />
        )}
        <ContainerTable filters={filters} onSelect={setSelectedContainer} />
      </main>

      {/* Modals */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {selectedContainer && (
        <ContainerDetail
          container={selectedContainer}
          onClose={() => setSelectedContainer(null)}
        />
      )}
    </div>
  );
}
