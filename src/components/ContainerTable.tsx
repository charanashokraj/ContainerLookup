import { ExternalLink, Eye, CheckCircle, AlertTriangle, RefreshCw, MapPin, Ship } from 'lucide-react';
import type { ContainerRecord, FilterState } from '../types';
import { PriorityBadge, StatusBadge } from './Badge';
import { useStore } from '../store/useStore';
import { getTrackingUrl } from '../lib/carriers';
import { format, parseISO, isValid } from 'date-fns';

function fmt(dateStr: string | null | undefined): string {
  if (!dateStr) return '–';
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return dateStr;
    return format(d, 'dd/MM/yyyy');
  } catch {
    return dateStr;
  }
}

interface Props {
  filters: FilterState;
  onSelect: (container: ContainerRecord) => void;
}

function applyFilters(containers: ContainerRecord[], f: FilterState): ContainerRecord[] {
  return containers.filter((c) => {
    if (f.search) {
      const q = f.search.toLowerCase();
      const match =
        c.containerNumber.toLowerCase().includes(q) ||
        c.bookingNumber.toLowerCase().includes(q) ||
        c.customer.toLowerCase().includes(q) ||
        c.destinationPort.toLowerCase().includes(q) ||
        c.carrier.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (f.status && c.reviewStatus !== f.status) return false;
    if (f.priority && c.priority !== f.priority) return false;
    if (f.carrier && c.carrier !== f.carrier) return false;
    if (f.customer && c.customer !== f.customer) return false;
    if (f.destination && c.destinationPort !== f.destination) return false;
    return true;
  });
}

export function ContainerTable({ filters, onSelect }: Props) {
  const containers = useStore((s) => s.containers);
  const markChecked = useStore((s) => s.markChecked);
  const approveUpdate = useStore((s) => s.approveUpdate);
  const currentUser = useStore((s) => s.currentUser);

  const filtered = applyFilters(containers, filters);

  if (containers.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-lg font-medium">No containers loaded</p>
        <p className="text-sm mt-1">Upload a SAP report to get started</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-lg font-medium">No containers match your filters</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Container</th>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Carrier</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">SAP Status</th>
              <th className="px-4 py-3">SAP ETA</th>
              <th className="px-4 py-3">Carrier ETA</th>
              <th className="px-4 py-3">Last Carrier Event</th>
              <th className="px-4 py-3">Review Status</th>
              <th className="px-4 py-3">Suggested Action</th>
              <th className="px-4 py-3">Last Checked</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((c) => {
                  const trackingUrl = getTrackingUrl(c.carrier, c.bookingNumber, c.containerNumber);
              const isHighlighted =
                c.reviewStatus === 'Action Required' || c.reviewStatus === 'Pending Review';

              return (
                <tr
                  key={c.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    isHighlighted ? 'bg-orange-50/30' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <PriorityBadge priority={c.priority} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">
                    {c.containerNumber || '–'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">
                    {c.bookingNumber || '–'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {c.carrier || '–'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-32 truncate">
                    {c.customer || '–'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {c.sapStatus || '–'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {fmt(c.sapEta)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {c.carrierEta ? (
                      <span
                        className={
                          c.carrierEta !== c.sapEta ? 'text-orange-600 font-medium' : 'text-slate-600'
                        }
                      >
                        {fmt(c.carrierEta)}
                      </span>
                    ) : (
                      <span className="text-slate-300">–</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs max-w-48">
                    <p className="text-slate-600 truncate">{c.carrierEvents.lastEventDescription ?? '–'}</p>
                    {c.carrierEvents.currentLocation && (
                      <p className="text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />{c.carrierEvents.currentLocation}
                      </p>
                    )}
                    {c.carrierEvents.vesselName && !c.carrierEvents.currentLocation && (
                      <p className="text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                        <Ship className="w-3 h-3 shrink-0" />{c.carrierEvents.vesselName}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={c.reviewStatus} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-44 truncate">
                    {c.suggestedAction}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {c.trackingCheckedAt ? fmt(c.trackingCheckedAt) : '–'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="View details"
                        onClick={() => onSelect(c)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {trackingUrl && (
                        <a
                          href={trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open carrier tracking"
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}

                      {c.reviewStatus === 'Action Required' && (
                        <button
                          title="Approve suggested update"
                          onClick={() => approveUpdate(c.id, currentUser)}
                          className="p-1.5 rounded hover:bg-green-50 text-green-600 hover:text-green-800 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}

                      {c.reviewStatus !== 'Completed' && !c.markedChecked && (
                        <button
                          title="Mark as checked"
                          onClick={() => markChecked(c.id, currentUser)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        title="Mark as pending review"
                        onClick={() => {
                          const reason = prompt('Reason for pending review:');
                          if (reason) {
                            useStore.getState().markPendingReview(c.id, reason);
                          }
                        }}
                        className="p-1.5 rounded hover:bg-yellow-50 text-yellow-500 hover:text-yellow-700 transition-colors"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">
        Showing {filtered.length} of {containers.length} containers
      </div>
    </div>
  );
}
