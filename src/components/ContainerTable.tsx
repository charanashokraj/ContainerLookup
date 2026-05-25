import { useEffect, useState } from 'react';
import { ExternalLink, Eye, CheckCircle, AlertTriangle, RefreshCw, MapPin, Ship, Package, X, User } from 'lucide-react';
import type { ContainerRecord, FilterState, Priority, ReviewStatus } from '../types';
import { PriorityBadge, StatusBadge } from './Badge';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import { getTrackingUrl } from '../lib/carriers';
import { format, parse, parseISO, isValid } from 'date-fns';

// Attempt to parse a date string in any of these formats (in order)
const DATE_FORMATS = [
  'yyyy-MM-dd',   // ISO — most reliable, try first
  'M/d/yy',      // US 2-digit year  e.g. 3/16/26
  'M/d/yyyy',    // US 4-digit year  e.g. 3/16/2026
  'dd/MM/yyyy',  // AU/EU            e.g. 16/03/2026
  'dd-MM-yyyy',  // dash separator   e.g. 16-03-2026
  'MM/dd/yyyy',  // US padded        e.g. 03/16/2026
];
const REF = new Date(2000, 0, 1);

function parseDate(dateStr: string): Date | null {
  for (const fmt of DATE_FORMATS) {
    try {
      const d = fmt === 'yyyy-MM-dd' ? parseISO(dateStr) : parse(dateStr, fmt, REF);
      if (isValid(d)) return d;
    } catch { /* try next */ }
  }
  return null;
}

function fmt(dateStr: string | null | undefined): string {
  if (!dateStr) return '–';
  const d = parseDate(dateStr.trim());
  return d ? format(d, 'dd/MM/yyyy') : dateStr;
}

function fmtDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '–';
  const d = parseDate(dateStr.trim());
  return d ? format(d, 'dd/MM/yyyy HH:mm') : dateStr;
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
  High: '#dc2626', Medium: '#d97706', Low: '#16a34a',
};

const REVIEW_STATUSES: ReviewStatus[] = [
  'Action Required', 'Pending Review', 'No Update Required', 'Auto-Reviewed', 'Completed',
];
const REVIEW_COLORS: Record<ReviewStatus, string> = {
  'Action Required': '#ea580c',
  'Pending Review': '#ca8a04',
  'No Update Required': '#2563eb',
  'Auto-Reviewed': '#0891b2',
  'Completed': '#16a34a',
};

interface Anchor { id: string; x: number; y: number; }

const ETA_CHANGED: React.CSSProperties = { color: '#ea580c', fontWeight: 600 };

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
        style={{ background: '#ffffff', border: '2px dashed #e2e8f0' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: '#ecfeff', border: '1px solid #67e8f9' }}>
          <Package size={28} style={{ color: '#0891b2' }} />
        </div>
        <p className="text-base font-semibold mb-1" style={{ color: '#0f172a' }}>No containers loaded</p>
        <p className="text-sm" style={{ color: '#94a3b8' }}>Upload a SAP report to get started</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-2xl"
        style={{ background: '#ffffff', border: '2px dashed #e2e8f0' }}>
        <p className="text-sm font-medium mb-1" style={{ color: '#0f172a' }}>No containers match your filters</p>
        <p className="text-xs" style={{ color: '#94a3b8' }}>Try adjusting or clearing the filters above</p>
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
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '10px 12px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.15)',
            minWidth: 180,
          }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: '#64748b' }}>SET PRIORITY</span>
            <button onClick={() => setPriorityAnchor(null)}>
              <X size={12} style={{ color: '#94a3b8' }} />
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {PRIORITIES.map(p => (
              <button
                key={p}
                onClick={() => { setManualPriority(priorityTarget.id, p); setPriorityAnchor(null); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-left"
                style={{
                  background: priorityTarget.priority === p ? `${PRIORITY_COLORS[p]}15` : '#f8fafc',
                  color: PRIORITY_COLORS[p],
                  border: priorityTarget.priority === p ? `1px solid ${PRIORITY_COLORS[p]}50` : '1px solid #e2e8f0',
                }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORITY_COLORS[p] }} />
                {p}
                {priorityTarget.manualPriority === p && <span className="ml-auto text-xs" style={{ color: '#94a3b8' }}>manual</span>}
              </button>
            ))}
            {(priorityTarget.manualPriority ?? null) !== null && (
              <button
                onClick={() => { setManualPriority(priorityTarget.id, null); setPriorityAnchor(null); }}
                className="mt-1 px-3 py-1 rounded-lg text-xs text-center transition-all"
                style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}>
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
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '10px 12px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.15)',
            minWidth: 200,
          }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: '#64748b' }}>SET REVIEW STATUS</span>
            <button onClick={() => setReviewAnchor(null)}>
              <X size={12} style={{ color: '#94a3b8' }} />
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {REVIEW_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => { setReviewStatus(reviewTarget.id, s); setReviewAnchor(null); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-left"
                style={{
                  background: reviewTarget.reviewStatus === s ? `${REVIEW_COLORS[s]}15` : '#f8fafc',
                  color: REVIEW_COLORS[s],
                  border: reviewTarget.reviewStatus === s ? `1px solid ${REVIEW_COLORS[s]}50` : '1px solid #e2e8f0',
                }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: REVIEW_COLORS[s] }} />
                {s}
              </button>
            ))}
          </div>
          {(reviewTarget.reviewStatusUserSet ?? false) && (
            <p className="mt-2 text-xs text-center" style={{ color: '#94a3b8' }}>
              Manually set — auto-tracking won't override
            </p>
          )}
        </div>
      )}

      {/* ── Main table ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {/* overflow-x + overflow-y both set so thead position:sticky works within this container */}
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 310px)' }}>
          <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Priority','Shipment No','Container','Booking','Carrier','Customer','SAP Status','SAP ETA','Carrier ETA','Last Event','Review','Suggested Action','Last Checked',
                  ...(isAdmin ? ['Uploaded By'] : []),
                  ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap"
                    style={{ color: '#64748b' }}>
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
                      borderBottom: idx < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                      background: isUrgent ? '#fff7ed' : isPending ? '#fefce8' : '#ffffff',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = isUrgent ? '#ffedd5' : '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = isUrgent ? '#fff7ed' : isPending ? '#fefce8' : '#ffffff')}>

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
                      <span className="font-mono text-xs" style={{ color: '#64748b' }}>
                        {c.shipmentNumber || '–'}
                      </span>
                    </td>

                    {/* Container number */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold" style={{ color: '#0891b2' }}>
                        {c.containerNumber || '–'}
                      </span>
                    </td>

                    {/* Booking */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs" style={{ color: '#475569' }}>
                        {c.bookingNumber || '–'}
                      </span>
                    </td>

                    {/* Carrier */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-semibold" style={{ color: '#334155' }}>
                        {c.carrier || '–'}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3 max-w-32">
                      <span className="text-xs truncate block" style={{ color: '#475569' }}>
                        {c.customer || '–'}
                      </span>
                    </td>

                    {/* SAP Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-medium" style={{ color: '#475569' }}>
                        {c.sapStatus || '–'}
                      </span>
                    </td>

                    {/* SAP ETA */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs" style={{ color: '#475569' }}>{fmt(c.sapEta)}</span>
                    </td>

                    {/* Carrier ETA */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.carrierEta ? (
                        <span className="text-xs" style={etaMismatch ? ETA_CHANGED : { color: '#475569' }}>
                          {fmt(c.carrierEta)}
                          {etaMismatch && <span className="ml-1 text-xs">↑</span>}
                        </span>
                      ) : <span className="text-xs" style={{ color: '#cbd5e1' }}>–</span>}
                    </td>

                    {/* Last Carrier Event */}
                    <td className="px-4 py-3" style={{ minWidth: 180, maxWidth: 260 }}>
                      <p className="text-xs leading-snug" style={{ color: '#475569', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {c.carrierEvents.lastEventDescription ?? '–'}
                      </p>
                      {c.carrierEvents.currentLocation && (
                        <p className="flex items-center gap-1 mt-0.5 text-xs" style={{ color: '#0891b2', whiteSpace: 'normal' }}>
                          <MapPin size={10} className="shrink-0" />{c.carrierEvents.currentLocation}
                        </p>
                      )}
                      {c.carrierEvents.vesselName && !c.carrierEvents.currentLocation && (
                        <p className="flex items-center gap-1 mt-0.5 text-xs" style={{ color: '#0891b2', whiteSpace: 'normal' }}>
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
                    <td className="px-4 py-3" style={{ minWidth: 160, maxWidth: 220 }}>
                      <span className="text-xs leading-snug" style={{ color: '#64748b', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {c.suggestedAction}
                      </span>
                    </td>

                    {/* Last Checked */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs" style={{ color: '#94a3b8' }}>
                        {c.trackingCheckedAt ? fmtDateTime(c.trackingCheckedAt) : '–'}
                      </span>
                    </td>

                    {/* Uploaded By — admin only */}
                    {isAdmin && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1 text-xs"
                          style={{ color: c.uploadedBy ? '#7c3aed' : '#cbd5e1' }}>
                          {c.uploadedBy && <User size={10} />}
                          {c.uploadedBy || '–'}
                        </span>
                      </td>
                    )}

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="View details" onClick={() => onSelect(c)} color="#0891b2">
                          <Eye size={14} />
                        </IconBtn>

                        {trackingUrl && (
                          <a href={trackingUrl} target="_blank" rel="noopener noreferrer"
                            title="Open carrier tracking"
                            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                            style={{ color: '#94a3b8', background: '#f1f5f9' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#2563eb'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#94a3b8'; }}>
                            <ExternalLink size={14} />
                          </a>
                        )}

                        {c.reviewStatus === 'Action Required' && (
                          <IconBtn title="Approve update" onClick={() => approveUpdate(c.id, authUser)} color="#16a34a">
                            <CheckCircle size={14} />
                          </IconBtn>
                        )}

                        {c.reviewStatus !== 'Completed' && !c.markedChecked && (
                          <IconBtn title="Mark as checked" onClick={() => markChecked(c.id, authUser)} color="#64748b">
                            <RefreshCw size={14} />
                          </IconBtn>
                        )}

                        <IconBtn title="Flag for review" color="#ca8a04"
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
          style={{ borderTop: '1px solid #f1f5f9' }}>
          <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>
            {filtered.length} of {containers.length} containers
          </span>
          {filtered.length < containers.length && (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: '#ecfeff', color: '#0891b2', border: '1px solid #67e8f9' }}>
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
      style={{ color: '#94a3b8', background: '#f1f5f9' }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}15`; e.currentTarget.style.color = color; }}
      onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#94a3b8'; }}>
      {children}
    </button>
  );
}
