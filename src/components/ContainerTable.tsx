import { useEffect, useState } from 'react';
import { ExternalLink, Eye, CheckCircle, AlertTriangle, RefreshCw, MapPin, Ship, Package, X, User } from 'lucide-react';
import type { ContainerRecord, FilterState, Priority, ReviewStatus } from '../types';
import { PriorityBadge, StatusBadge } from './Badge';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import { getTrackingUrl } from '../lib/carriers';
import { format, parseISO, isValid } from 'date-fns';

function fmt(dateStr: string | null | undefined): string {
  if (!dateStr) return '–';
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return dateStr;
    return format(d, 'dd/MM/yy');
  } catch { return dateStr; }
}

function fmtDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '–';
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return dateStr;
    return format(d, 'dd/MM/yy HH:mm');
  } catch { return dateStr; }
}

interface Props {
  filters: FilterState;
  onSelect: (container: ContainerRecord) => void;
}

function applyFilters(containers: ContainerRecord[], f: FilterState): ContainerRecord[] {
  return containers.filter(c => {
    if (f.search) {
      const q = f.search.toLowerCase();
      const hit = c.containerNumber.toLowerCase().includes(q) ||
                  c.bookingNumber.toLowerCase().includes(q) ||
                  (c.shipmentNumber ?? '').toLowerCase().includes(q) ||
                  c.customer.toLowerCase().includes(q) ||
                  c.destinationPort.toLowerCase().includes(q) ||
                  c.carrier.toLowerCase().includes(q);
      if (!hit) return false;
    }
    if (f.status      && c.reviewStatus    !== f.status)      return false;
    if (f.priority    && c.priority        !== f.priority)    return false;
    if (f.carrier     && c.carrier         !== f.carrier)     return false;
    if (f.customer    && c.customer        !== f.customer)    return false;
    if (f.destination && c.destinationPort !== f.destination) return false;
    if (f.uploadedBy  && c.uploadedBy      !== f.uploadedBy)  return false;
    return true;
  });
}

const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];
const PRIORITY_COLORS: Record<Priority, string> = {
  High: '#f87171', Medium: '#fbbf24', Low: '#4ade80',
};

const REVIEW_STATUSES: ReviewStatus[] = [
  'Action Required', 'Pending Review', 'No Update Required', 'Auto-Reviewed', 'Completed',
];
const REVIEW_COLORS: Record<ReviewStatus, string> = {
  'Action Required': '#fb923c',
  'Pending Review': '#facc15',
  'No Update Required': '#60a5fa',
  'Auto-Reviewed': '#22d3ee',
  'Completed': '#4ade80',
};

interface Anchor { id: string; x: number; y: number; }

const ETA_CHANGED: React.CSSProperties = { color: '#fb923c', fontWeight: 600 };

export function ContainerTable({ filters, onSelect }: Props) {
  const containers        = useStore(s => s.containers);
  const markChecked       = useStore(s => s.markChecked);
  const approveUpdate     = useStore(s => s.approveUpdate);
  const authUser          = useStore(s => s.currentUser);
  const setManualPriority = useStore(s => s.setManualPriority);
  const setReviewStatus   = useStore(s => s.setReviewStatus);
  const isAdmin           = useAuthStore(s => s.profile?.role === 'admin');

  const [priorityAnchor, setPriorityAnchor] = useState<Anchor | null>(null);
  const [reviewAnchor, setReviewAnchor]     = useState<Anchor | null>(null);

  // Close popovers on outside click
  useEffect(() => {
    function onDoc() {
      setPriorityAnchor(null);
      setReviewAnchor(null);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const openPriority = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPriorityAnchor(priorityAnchor?.id === id ? null : { id, x: rect.left, y: rect.bottom + 6 });
    setReviewAnchor(null);
  };

  const openReview = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setReviewAnchor(reviewAnchor?.id === id ? null : { id, x: rect.left, y: rect.bottom + 6 });
    setPriorityAnchor(null);
  };

  const filtered = applyFilters(containers, filters);

  // ── Empty states ─────────────────────────────────────────────────────────
  if (containers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-28 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px dashed rgba(255,255,255,0.1)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}>
          <Package size={28} style={{ color: '#06b6d4' }} />
        </div>
        <p className="text-base font-semibold text-white mb-1">No containers loaded</p>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Upload a SAP report to get started</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px dashed rgba(255,255,255,0.1)' }}>
        <p className="text-sm font-medium text-white mb-1">No containers match your filters</p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Try adjusting or clearing the filters above</p>
      </div>
    );
  }

  // Find container for current popover
  const priorityTarget = priorityAnchor ? containers.find(c => c.id === priorityAnchor.id) : null;
  const reviewTarget   = reviewAnchor   ? containers.find(c => c.id === reviewAnchor.id)   : null;

  return (
    <>
      {/* ── Priority popover ────────────────────────────────────────────── */}
      {priorityAnchor && priorityTarget && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: priorityAnchor.x,
            top: priorityAnchor.y,
            zIndex: 9999,
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            padding: '10px 12px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
            minWidth: 180,
          }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>SET PRIORITY</span>
            <button onClick={() => setPriorityAnchor(null)}>
              <X size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {PRIORITIES.map(p => (
              <button
                key={p}
                onClick={() => { setManualPriority(priorityTarget.id, p); setPriorityAnchor(null); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-left"
                style={{
                  background: priorityTarget.priority === p ? `${PRIORITY_COLORS[p]}22` : 'rgba(255,255,255,0.03)',
                  color: PRIORITY_COLORS[p],
                  border: priorityTarget.priority === p ? `1px solid ${PRIORITY_COLORS[p]}55` : '1px solid transparent',
                }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORITY_COLORS[p] }} />
                {p}
                {priorityTarget.manualPriority === p && <span className="ml-auto text-xs opacity-50">manual</span>}
              </button>
            ))}
            {(priorityTarget.manualPriority ?? null) !== null && (
              <button
                onClick={() => { setManualPriority(priorityTarget.id, null); setPriorityAnchor(null); }}
                className="mt-1 px-3 py-1 rounded-lg text-xs text-center transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
                Reset to auto
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Review status popover ────────────────────────────────────────── */}
      {reviewAnchor && reviewTarget && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: reviewAnchor.x,
            top: reviewAnchor.y,
            zIndex: 9999,
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            padding: '10px 12px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
            minWidth: 200,
          }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>SET REVIEW STATUS</span>
            <button onClick={() => setReviewAnchor(null)}>
              <X size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {REVIEW_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => { setReviewStatus(reviewTarget.id, s); setReviewAnchor(null); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-left"
                style={{
                  background: reviewTarget.reviewStatus === s ? `${REVIEW_COLORS[s]}22` : 'rgba(255,255,255,0.03)',
                  color: REVIEW_COLORS[s],
                  border: reviewTarget.reviewStatus === s ? `1px solid ${REVIEW_COLORS[s]}55` : '1px solid transparent',
                }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: REVIEW_COLORS[s] }} />
                {s}
              </button>
            ))}
          </div>
          {(reviewTarget.reviewStatusUserSet ?? false) && (
            <p className="mt-2 text-xs text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Manually set — auto-tracking won't override
            </p>
          )}
        </div>
      )}

      {/* ── Main table ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Priority','Shipment No','Container','Booking','Carrier','Customer','SAP Status','SAP ETA','Carrier ETA','Last Event','Review','Suggested Action','Last Checked',
                  ...(isAdmin ? ['Uploaded By'] : []),
                  ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap"
                    style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => {
                const trackingUrl  = getTrackingUrl(c.carrier, c.bookingNumber, c.containerNumber);
                const isUrgent     = c.reviewStatus === 'Action Required';
                const isPending    = c.reviewStatus === 'Pending Review';
                const etaMismatch  = c.carrierEta && c.carrierEta !== c.sapEta;

                return (
                  <tr key={c.id}
                    style={{
                      borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      background: isUrgent ? 'rgba(249,115,22,0.04)' : isPending ? 'rgba(234,179,8,0.03)' : 'transparent',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = isUrgent ? 'rgba(249,115,22,0.07)' : 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = isUrgent ? 'rgba(249,115,22,0.04)' : isPending ? 'rgba(234,179,8,0.03)' : 'transparent')}>

                    {/* Priority — clickable */}
                    <td className="px-4 py-3">
                      <PriorityBadge
                        priority={c.priority}
                        isManual={(c.manualPriority ?? null) !== null}
                        onClick={(e: React.MouseEvent) => openPriority(e, c.id)}
                      />
                    </td>

                    {/* Shipment number */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {c.shipmentNumber || '–'}
                      </span>
                    </td>

                    {/* Container number */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold" style={{ color: '#67e8f9' }}>
                        {c.containerNumber || '–'}
                      </span>
                    </td>

                    {/* Booking */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        {c.bookingNumber || '–'}
                      </span>
                    </td>

                    {/* Carrier */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        {c.carrier || '–'}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3 max-w-32">
                      <span className="text-xs truncate block" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        {c.customer || '–'}
                      </span>
                    </td>

                    {/* SAP Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {c.sapStatus || '–'}
                      </span>
                    </td>

                    {/* SAP ETA */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{fmt(c.sapEta)}</span>
                    </td>

                    {/* Carrier ETA */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.carrierEta ? (
                        <span className="text-xs" style={etaMismatch ? ETA_CHANGED : { color: 'rgba(255,255,255,0.5)' }}>
                          {fmt(c.carrierEta)}
                          {etaMismatch && <span className="ml-1 text-xs">↑</span>}
                        </span>
                      ) : <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>–</span>}
                    </td>

                    {/* Last Carrier Event */}
                    <td className="px-4 py-3 max-w-52">
                      <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {c.carrierEvents.lastEventDescription ?? '–'}
                      </p>
                      {c.carrierEvents.currentLocation && (
                        <p className="flex items-center gap-1 mt-0.5 text-xs truncate" style={{ color: 'rgba(6,182,212,0.7)' }}>
                          <MapPin size={10} className="shrink-0" />{c.carrierEvents.currentLocation}
                        </p>
                      )}
                      {c.carrierEvents.vesselName && !c.carrierEvents.currentLocation && (
                        <p className="flex items-center gap-1 mt-0.5 text-xs truncate" style={{ color: 'rgba(6,182,212,0.6)' }}>
                          <Ship size={10} className="shrink-0" />{c.carrierEvents.vesselName}
                        </p>
                      )}
                    </td>

                    {/* Review Status — clickable */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge
                        status={c.reviewStatus}
                        isUserSet={c.reviewStatusUserSet ?? false}
                        onClick={(e: React.MouseEvent) => openReview(e, c.id)}
                      />
                    </td>

                    {/* Suggested Action */}
                    <td className="px-4 py-3 max-w-44">
                      <span className="text-xs truncate block" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {c.suggestedAction}
                      </span>
                    </td>

                    {/* Last Checked */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {c.trackingCheckedAt ? fmtDateTime(c.trackingCheckedAt) : '–'}
                      </span>
                    </td>

                    {/* Uploaded By — admin only */}
                    {isAdmin && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1 text-xs"
                          style={{ color: c.uploadedBy ? 'rgba(167,139,250,0.8)' : 'rgba(255,255,255,0.2)' }}>
                          {c.uploadedBy && <User size={10} />}
                          {c.uploadedBy || '–'}
                        </span>
                      </td>
                    )}

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="View details" onClick={() => onSelect(c)} color="#67e8f9">
                          <Eye size={14} />
                        </IconBtn>

                        {trackingUrl && (
                          <a href={trackingUrl} target="_blank" rel="noopener noreferrer"
                            title="Open carrier tracking"
                            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                            style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.15)'; e.currentTarget.style.color = '#60a5fa'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}>
                            <ExternalLink size={14} />
                          </a>
                        )}

                        {c.reviewStatus === 'Action Required' && (
                          <IconBtn title="Approve update" onClick={() => approveUpdate(c.id, authUser)} color="#4ade80">
                            <CheckCircle size={14} />
                          </IconBtn>
                        )}

                        {c.reviewStatus !== 'Completed' && !c.markedChecked && (
                          <IconBtn title="Mark as checked" onClick={() => markChecked(c.id, authUser)} color="rgba(255,255,255,0.5)">
                            <RefreshCw size={14} />
                          </IconBtn>
                        )}

                        <IconBtn title="Flag for review" color="#facc15"
                          onClick={() => {
                            const reason = prompt('Reason for pending review:');
                            if (reason) useStore.getState().markPendingReview(c.id, reason);
                          }}>
                          <AlertTriangle size={14} />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 flex items-center justify-between"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {filtered.length} of {containers.length} containers
          </span>
          {filtered.length < containers.length && (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(6,182,212,0.1)', color: '#67e8f9', border: '1px solid rgba(6,182,212,0.2)' }}>
              {containers.length - filtered.length} filtered out
            </span>
          )}
        </div>
      </div>
    </>
  );
}

function IconBtn({ children, title, onClick, color }: {
  children: React.ReactNode; title: string; onClick: () => void; color: string;
}) {
  return (
    <button title={title} onClick={onClick}
      className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
      style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)' }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}18`; e.currentTarget.style.color = color; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}>
      {children}
    </button>
  );
}
