import { useRef, useState } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle2, GitBranch } from 'lucide-react';
import { parseFile } from '../lib/sapParser';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import { loadGithubSettings, syncContainersToGithub } from '../lib/githubSync';

interface Props { onClose: () => void; }

export function UploadModal({ onClose }: Props) {
  const importContainers = useStore(s => s.importContainers);
  const containers       = useStore(s => s.containers);
  const profile          = useAuthStore(s => s.profile);

  const [dragging,   setDragging]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [status,     setStatus]     = useState<'idle' | 'parsing' | 'saving' | 'syncing' | 'done'>('idle');
  const [error,      setError]      = useState<string | null>(null);
  const [syncNote,   setSyncNote]   = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ghSettings = loadGithubSettings();
  const hasGithub  = !!(ghSettings.pat && ghSettings.owner && ghSettings.repo);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    setSyncNote(null);
    try {
      setStatus('parsing');
      const records = await parseFile(file);
      if (records.length === 0) {
        setError('No valid container records found. Check that your file has the required columns.');
        setStatus('idle');
        return;
      }

      setStatus('saving');
      await importContainers(records, file.name, profile?.name ?? 'Unknown');

      // Auto-sync to GitHub for the tracking workflow
      if (hasGithub) {
        setStatus('syncing');
        try {
          // Get the freshly imported containers from the store
          const fresh = useStore.getState().containers;
          await syncContainersToGithub(ghSettings, fresh);
          setSyncNote(`${records.length} containers saved and synced to GitHub ✓`);
        } catch (syncErr) {
          setSyncNote(`Saved to database. GitHub sync failed: ${syncErr instanceof Error ? syncErr.message : 'unknown error'}. Open ⚙ Settings to sync manually.`);
        }
      } else {
        setSyncNote(`${records.length} containers saved. Open ⚙ Settings to sync to GitHub for auto-tracking.`);
      }

      setStatus('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to parse file.');
      setStatus('idle');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'done') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
        <div className="w-full max-w-md rounded-2xl p-8 text-center"
          style={{ background: 'linear-gradient(135deg, #0a111f, #0d1b2e)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <CheckCircle2 size={26} style={{ color: '#4ade80' }} />
          </div>
          <h3 className="font-bold text-white text-lg mb-2">Import Complete</h3>
          {syncNote && (
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{syncNote}</p>
          )}
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-lg rounded-2xl"
        style={{ background: 'linear-gradient(135deg, #0a111f, #0d1b2e)', border: '1px solid rgba(255,255,255,0.08)' }}>

        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="font-bold text-white">Upload SAP Report</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Drop zone */}
          <div
            className="rounded-xl p-10 text-center cursor-pointer transition-all"
            style={{
              border: `2px dashed ${dragging ? 'rgba(6,182,212,0.6)' : 'rgba(255,255,255,0.1)'}`,
              background: dragging ? 'rgba(6,182,212,0.06)' : 'rgba(255,255,255,0.02)',
            }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => inputRef.current?.click()}>
            <Upload size={32} className="mx-auto mb-3" style={{ color: 'rgba(6,182,212,0.6)' }} />
            <p className="text-sm font-medium text-white">Drop your SAP export here</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>or click to browse · .csv · .xlsx · .xls</p>
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          {/* Status messages */}
          {status === 'parsing' && <StatusRow msg="Parsing file…" />}
          {status === 'saving'  && <StatusRow msg="Saving to database…" />}
          {status === 'syncing' && <StatusRow msg="Syncing container list to GitHub…" />}

          {error && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
              <AlertCircle size={15} className="mt-0.5 shrink-0" /><span>{error}</span>
            </div>
          )}

          {/* GitHub sync status hint */}
          {!hasGithub && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg text-xs"
              style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', color: '#fcd34d' }}>
              <GitBranch size={13} className="mt-0.5 shrink-0" />
              <span>GitHub PAT not configured — open ⚙ Settings to enable Check All Now and auto-tracking.</span>
            </div>
          )}

          {/* Required columns */}
          <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <FileText size={11} /> Required columns (case-insensitive)
            </p>
            <div className="grid grid-cols-2 gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {['Booking Number','Container Number','Shipping Line / Carrier','SAP ETA','Current SAP Status','Last Event Date'].map(col => (
                <span key={col} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#06b6d4' }} />{col}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm"
      style={{ background: 'rgba(6,182,212,0.06)', color: '#67e8f9' }}>
      <div className="w-4 h-4 rounded-full border-2 animate-spin"
        style={{ borderColor: '#67e8f9', borderTopColor: 'transparent' }} />
      {msg}
    </div>
  );
}
