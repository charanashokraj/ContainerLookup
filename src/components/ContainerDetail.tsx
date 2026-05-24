import { useState } from 'react';
import {
  X,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Save,
  History,
  Package,
  Info,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import type { ContainerRecord } from '../types';
import { PriorityBadge, StatusBadge } from './Badge';
import { useStore } from '../store/useStore';
import { getTrackingUrl } from '../lib/carriers';
import { normalizeCarrierEvents } from '../lib/eventNormalizer';

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

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm text-slate-800 font-medium">{value || '–'}</p>
    </div>
  );
}

interface Props {
  container: ContainerRecord;
  onClose: () => void;
}

export function ContainerDetail({ container: c, onClose }: Props) {
  const updateCarrierTracking = useStore((s) => s.updateCarrierTracking);
  const approveUpdate = useStore((s) => s.approveUpdate);
  const markChecked = useStore((s) => s.markChecked);
  const updateNotes = useStore((s) => s.updateNotes);
  const updateAssignedTo = useStore((s) => s.updateAssignedTo);
  const currentUser = useStore((s) => s.currentUser);

  // Live container from store
  const liveContainer = useStore((s) => s.containers.find((x) => x.id === c.id)) ?? c;

  const [notes, setNotes] = useState(liveContainer.internalNotes);
  const [assignedTo, setAssignedTo] = useState(liveContainer.assignedTo);
  const [tab, setTab] = useState<'details' | 'tracking' | 'history'>('details');

  // Tracking form state
  const [trackForm, setTrackForm] = useState({
    carrierEta: liveContainer.carrierEta ?? '',
    dischargeDate: liveContainer.carrierEvents.dischargeDate ?? '',
    releaseDate: liveContainer.carrierEvents.releaseDate ?? '',
    emptyReturnDate: liveContainer.carrierEvents.emptyReturnDate ?? '',
    currentStatus: liveContainer.carrierEvents.currentStatus ?? '',
    rawEvents: '',
  });

  const trackingUrl = getTrackingUrl(liveContainer.carrier, liveContainer.bookingNumber);

  function handleSaveTracking() {
    const events = normalizeCarrierEvents(
      trackForm.rawEvents
        ? trackForm.rawEvents
            .split('\n')
            .filter(Boolean)
            .map((line) => {
              const parts = line.split('|');
              return {
                date: parts[0]?.trim() ?? '',
                description: parts[1]?.trim() ?? line.trim(),
              };
            })
        : []
    );

    updateCarrierTracking(
      liveContainer.id,
      {
        ...events,
        dischargeDate: trackForm.dischargeDate || events.dischargeDate,
        releaseDate: trackForm.releaseDate || events.releaseDate,
        emptyReturnDate: trackForm.emptyReturnDate || events.emptyReturnDate,
        currentStatus: trackForm.currentStatus || events.currentStatus,
        eta: trackForm.carrierEta || events.eta,
      },
      trackForm.carrierEta || null,
      currentUser,
      liveContainer.carrier
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {liveContainer.containerNumber || liveContainer.bookingNumber}
              </h2>
              <p className="text-sm text-slate-500">
                {liveContainer.carrier} · {liveContainer.customer}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PriorityBadge priority={liveContainer.priority} />
            <StatusBadge status={liveContainer.reviewStatus} />
            <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 ml-2">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Decision banner */}
        <div
          className={`px-6 py-3 border-b text-sm flex items-start gap-2 ${
            liveContainer.reviewStatus === 'Action Required'
              ? 'bg-orange-50 text-orange-800 border-orange-100'
              : liveContainer.reviewStatus === 'Pending Review'
              ? 'bg-yellow-50 text-yellow-800 border-yellow-100'
              : liveContainer.reviewStatus === 'Completed'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
              : 'bg-blue-50 text-blue-800 border-blue-100'
          }`}
        >
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">{liveContainer.suggestedAction}</span>
            {liveContainer.suggestedEventDate && (
              <span className="ml-1">— Event date: {fmt(liveContainer.suggestedEventDate)}</span>
            )}
            <p className="text-xs mt-0.5 opacity-80">{liveContainer.reason}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6">
          {(['details', 'tracking', 'history'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'history' ? (
                <span className="flex items-center gap-1">
                  <History className="w-4 h-4" /> History
                </span>
              ) : t}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6">
          {tab === 'details' && (
            <>
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">SAP Data</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Booking Number" value={liveContainer.bookingNumber} />
                  <Field label="Container Number" value={liveContainer.containerNumber} />
                  <Field label="Carrier" value={liveContainer.carrier} />
                  <Field label="Customer" value={liveContainer.customer} />
                  <Field label="Destination Port" value={liveContainer.destinationPort} />
                  <Field label="SAP ETA" value={fmt(liveContainer.sapEta)} />
                  <Field label="SAP Status" value={liveContainer.sapStatus} />
                  <Field label="Last SAP Event Date" value={fmt(liveContainer.lastSapEventDate)} />
                  <Field label="Vessel / Voyage" value={liveContainer.vessel} />
                  <Field label="Reference" value={liveContainer.reference} />
                  <Field label="POL" value={liveContainer.pol} />
                  <Field label="POD" value={liveContainer.pod} />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Carrier Tracking</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Carrier ETA" value={fmt(liveContainer.carrierEta)} />
                  <Field label="Discharge Date" value={fmt(liveContainer.carrierEvents.dischargeDate)} />
                  <Field label="Release / Pick-up Date" value={fmt(liveContainer.carrierEvents.releaseDate)} />
                  <Field label="Empty Return Date" value={fmt(liveContainer.carrierEvents.emptyReturnDate)} />
                  <Field label="Current Carrier Status" value={liveContainer.carrierEvents.currentStatus} />
                  <Field label="Last Carrier Event" value={liveContainer.carrierEvents.lastEventDescription} />
                  <Field label="Last Carrier Event Date" value={fmt(liveContainer.carrierEvents.lastEventDate)} />
                  <Field label="Last Checked" value={liveContainer.trackingCheckedAt ? `${fmt(liveContainer.trackingCheckedAt)} by ${liveContainer.trackingCheckedBy}` : undefined} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                    Assigned To
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Name"
                    />
                    <button
                      onClick={() => updateAssignedTo(liveContainer.id, assignedTo)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Save className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                    Internal Notes
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Add notes…"
                    />
                    <button
                      onClick={() => updateNotes(liveContainer.id, notes)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg self-start transition-colors"
                    >
                      <Save className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                {trackingUrl && (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" /> Open Carrier Tracking
                  </a>
                )}

                {liveContainer.reviewStatus === 'Action Required' && (
                  <button
                    onClick={() => approveUpdate(liveContainer.id, currentUser)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve Suggested Update
                  </button>
                )}

                <button
                  onClick={() => markChecked(liveContainer.id, currentUser)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" /> Mark as Checked
                </button>

                <button
                  onClick={() => {
                    const reason = prompt('Reason for pending review:');
                    if (reason) useStore.getState().markPendingReview(liveContainer.id, reason);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-sm hover:bg-yellow-100 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" /> Mark as Pending Review
                </button>
              </div>
            </>
          )}

          {tab === 'tracking' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                After checking the carrier's website, enter the tracking data below. The system will re-evaluate the suggested action.
              </p>

              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors mb-2"
                >
                  <ExternalLink className="w-4 h-4" /> Open {liveContainer.carrier} Tracking
                </a>
              )}

              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'carrierEta', label: 'Carrier ETA', type: 'date' },
                  { key: 'dischargeDate', label: 'Discharge Date', type: 'date' },
                  { key: 'releaseDate', label: 'Release / Pick-up Date', type: 'date' },
                  { key: 'emptyReturnDate', label: 'Empty Return Date', type: 'date' },
                ].map(({ key, label, type }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                      {label}
                    </label>
                    <input
                      type={type}
                      value={trackForm[key as keyof typeof trackForm]}
                      onChange={(e) =>
                        setTrackForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}

                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                    Current Carrier Status (text)
                  </label>
                  <input
                    type="text"
                    value={trackForm.currentStatus}
                    onChange={(e) => setTrackForm((f) => ({ ...f, currentStatus: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Discharged at POD"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                    Raw Event Log (optional — one event per line: YYYY-MM-DD | Event description)
                  </label>
                  <textarea
                    rows={5}
                    value={trackForm.rawEvents}
                    onChange={(e) => setTrackForm((f) => ({ ...f, rawEvents: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder={'2026-04-30 | Discharged at POD\n2026-05-02 | Gate out full container'}
                  />
                </div>
              </div>

              <button
                onClick={handleSaveTracking}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" /> Save Tracking Data & Recompute
              </button>
            </div>
          )}

          {tab === 'history' && (
            <div>
              {liveContainer.history.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No history recorded yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
                      <th className="pb-2 pr-4">Date</th>
                      <th className="pb-2 pr-4">By</th>
                      <th className="pb-2 pr-4">SAP Status</th>
                      <th className="pb-2 pr-4">Carrier Status</th>
                      <th className="pb-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {liveContainer.history.map((h) => (
                      <tr key={h.id} className="text-slate-600">
                        <td className="py-2 pr-4 whitespace-nowrap">{fmt(h.checkedAt)}</td>
                        <td className="py-2 pr-4">{h.checkedBy}</td>
                        <td className="py-2 pr-4">{h.sapStatus}</td>
                        <td className="py-2 pr-4">{h.carrierStatus || '–'}</td>
                        <td className="py-2 text-xs">{h.suggestedAction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
