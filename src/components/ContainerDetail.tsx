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
  ClipboardList,
  ArrowRight,
  Copy,
  Check,
  MapPin,
  Ship,
  Navigation,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import type { ContainerRecord } from '../types';
import { PriorityBadge, StatusBadge } from './Badge';
import { useStore } from '../store/useStore';
import { getTrackingUrl, getCarrierHint } from '../lib/carriers';
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

function fmtDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '–';
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return dateStr;
    return format(d, 'dd/MM/yyyy HH:mm');
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      title="Copy to clipboard"
      className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

interface Props {
  container: ContainerRecord;
  onClose: () => void;
}

type TrackingStep = 'idle' | 'guide' | 'enter' | 'done';

export function ContainerDetail({ container: c, onClose }: Props) {
  const updateCarrierTracking = useStore((s) => s.updateCarrierTracking);
  const approveUpdate = useStore((s) => s.approveUpdate);
  const markChecked = useStore((s) => s.markChecked);
  const updateNotes = useStore((s) => s.updateNotes);
  const updateAssignedTo = useStore((s) => s.updateAssignedTo);
  const currentUser = useStore((s) => s.currentUser);

  const liveContainer = useStore((s) => s.containers.find((x) => x.id === c.id)) ?? c;

  const [notes, setNotes] = useState(liveContainer.internalNotes);
  const [assignedTo, setAssignedTo] = useState(liveContainer.assignedTo);
  const [tab, setTab] = useState<'details' | 'history'>('details');
  const [trackingStep, setTrackingStep] = useState<TrackingStep>('idle');

  const [trackForm, setTrackForm] = useState({
    carrierEta: liveContainer.carrierEta ?? '',
    dischargeDate: liveContainer.carrierEvents.dischargeDate ?? '',
    releaseDate: liveContainer.carrierEvents.releaseDate ?? '',
    emptyReturnDate: liveContainer.carrierEvents.emptyReturnDate ?? '',
    currentStatus: liveContainer.carrierEvents.currentStatus ?? '',
    rawEvents: '',
  });

  const trackingUrl = getTrackingUrl(
    liveContainer.carrier,
    liveContainer.bookingNumber,
    liveContainer.containerNumber
  );
  const carrierHint = getCarrierHint(liveContainer.carrier);

  function handleOpenTracking() {
    if (trackingUrl) {
      window.open(trackingUrl, '_blank', 'noopener,noreferrer');
    }
    setTrackingStep('guide');
  }

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
    setTrackingStep('done');
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

        {/* ── Tracking workflow panel ── */}
        <div className="mx-6 mt-5 rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">

          {/* Step 0 — idle */}
          {trackingStep === 'idle' && (
            <div className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-blue-800">Check carrier tracking</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Opens {liveContainer.carrier || 'the carrier'}'s website with this booking pre-filled.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Quick copy buttons */}
                {liveContainer.bookingNumber && (
                  <div className="flex items-center gap-1 bg-white border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-700">
                    <span className="text-slate-400 mr-1 font-sans">BKG</span>
                    {liveContainer.bookingNumber}
                    <CopyButton text={liveContainer.bookingNumber} />
                  </div>
                )}
                {liveContainer.containerNumber && (
                  <div className="flex items-center gap-1 bg-white border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-700">
                    <span className="text-slate-400 mr-1 font-sans">CTR</span>
                    {liveContainer.containerNumber}
                    <CopyButton text={liveContainer.containerNumber} />
                  </div>
                )}
                <button
                  onClick={handleOpenTracking}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open {liveContainer.carrier || 'Carrier'} Tracking
                </button>
                {!trackingUrl && (
                  <button
                    onClick={() => setTrackingStep('enter')}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 transition-colors"
                  >
                    <ClipboardList className="w-4 h-4" /> Log Status Manually
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 1 — guide (opened carrier site, waiting for user to check) */}
          {trackingStep === 'guide' && (
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">1</div>
                <div>
                  <p className="text-sm font-semibold text-blue-800">Carrier website opened in a new tab</p>
                  <p className="text-xs text-blue-700 mt-1">{carrierHint}</p>
                </div>
              </div>

              {/* Fallback — copy numbers if URL didn't pre-fill */}
              <div className="bg-white rounded-lg border border-blue-200 p-3">
                <p className="text-xs font-semibold text-slate-500 mb-2">If the booking wasn't pre-filled, use these:</p>
                <div className="flex flex-wrap gap-2">
                  {liveContainer.bookingNumber && (
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-700">
                      <span className="text-slate-400 mr-1">Booking:</span>
                      {liveContainer.bookingNumber}
                      <CopyButton text={liveContainer.bookingNumber} />
                    </div>
                  )}
                  {liveContainer.containerNumber && (
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-700">
                      <span className="text-slate-400 mr-1">Container:</span>
                      {liveContainer.containerNumber}
                      <CopyButton text={liveContainer.containerNumber} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">2</div>
                <p className="text-sm font-semibold text-blue-800 flex-1">
                  Once you've checked the carrier site, log what you found:
                </p>
                <button
                  onClick={() => setTrackingStep('enter')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Log Status <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — enter tracking data */}
          {trackingStep === 'enter' && (
            <div className="p-4 space-y-4">
              <p className="text-sm font-semibold text-blue-800">Enter what you found on the carrier's website:</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                    Carrier ETA
                  </label>
                  <input
                    type="date"
                    value={trackForm.carrierEta}
                    onChange={(e) => setTrackForm((f) => ({ ...f, carrierEta: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                    Discharge Date <span className="text-slate-400 normal-case font-normal">(at destination port)</span>
                  </label>
                  <input
                    type="date"
                    value={trackForm.dischargeDate}
                    onChange={(e) => setTrackForm((f) => ({ ...f, dischargeDate: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                    Release / Gate-Out Date <span className="text-slate-400 normal-case font-normal">(picked up by customer)</span>
                  </label>
                  <input
                    type="date"
                    value={trackForm.releaseDate}
                    onChange={(e) => setTrackForm((f) => ({ ...f, releaseDate: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                    Empty Return Date
                  </label>
                  <input
                    type="date"
                    value={trackForm.emptyReturnDate}
                    onChange={(e) => setTrackForm((f) => ({ ...f, emptyReturnDate: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                    Current Status Text <span className="text-slate-400 normal-case font-normal">(copy from carrier site)</span>
                  </label>
                  <input
                    type="text"
                    value={trackForm.currentStatus}
                    onChange={(e) => setTrackForm((f) => ({ ...f, currentStatus: e.target.value }))}
                    placeholder="e.g. Discharged at POD"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSaveTracking}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" /> Save & Recompute Decision
                </button>
                <button
                  onClick={() => setTrackingStep('guide')}
                  className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — done */}
          {trackingStep === 'done' && (
            <div className="p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-800">Tracking data saved — decision updated</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  New status: <span className="font-bold">{liveContainer.reviewStatus}</span> ·{' '}
                  {liveContainer.suggestedAction}
                </p>
              </div>
              <button
                onClick={() => setTrackingStep('enter')}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6 mt-5">
          {(['details', 'history'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize flex items-center gap-1 ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'history' && <History className="w-4 h-4" />}
              {t}
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

              {/* Live location card — only shown when auto-tracking has data */}
              {(liveContainer.carrierEvents.currentLocation ||
                liveContainer.carrierEvents.vesselName) && (
                <div className="rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 p-4">
                  <h3 className="text-xs font-semibold text-cyan-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5" /> Live Location (Auto-Tracked)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {liveContainer.carrierEvents.currentLocation && (
                      <div className="bg-white rounded-lg p-3 border border-cyan-100 flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-cyan-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase mb-0.5">Last Known Location</p>
                          <p className="text-sm font-semibold text-slate-800">{liveContainer.carrierEvents.currentLocation}</p>
                          {liveContainer.carrierEvents.lastEventDate && (
                            <p className="text-xs text-slate-400 mt-0.5">{fmt(liveContainer.carrierEvents.lastEventDate)}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {liveContainer.carrierEvents.vesselName && (
                      <div className="bg-white rounded-lg p-3 border border-cyan-100 flex items-start gap-2">
                        <Ship className="w-4 h-4 text-cyan-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase mb-0.5">Vessel</p>
                          <p className="text-sm font-semibold text-slate-800">{liveContainer.carrierEvents.vesselName}</p>
                          {liveContainer.carrierEvents.currentStatus && (
                            <p className="text-xs text-slate-400 mt-0.5">{liveContainer.carrierEvents.currentStatus}</p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="bg-white rounded-lg p-3 border border-cyan-100 flex items-start gap-2">
                      <Navigation className="w-4 h-4 text-cyan-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase mb-0.5">Route</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {liveContainer.carrierEvents.portOfLoading || liveContainer.pol || '?'}
                          {' → '}
                          {liveContainer.carrierEvents.portOfDischarge || liveContainer.pod || liveContainer.destinationPort || '?'}
                        </p>
                        {liveContainer.carrierEta && (
                          <p className="text-xs text-slate-400 mt-0.5">ETA {fmt(liveContainer.carrierEta)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Carrier Tracking (recorded)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Carrier ETA" value={fmt(liveContainer.carrierEta)} />
                  <Field label="Discharge Date" value={fmt(liveContainer.carrierEvents.dischargeDate)} />
                  <Field label="Release / Pick-up Date" value={fmt(liveContainer.carrierEvents.releaseDate)} />
                  <Field label="Empty Return Date" value={fmt(liveContainer.carrierEvents.emptyReturnDate)} />
                  <Field label="Current Carrier Status" value={liveContainer.carrierEvents.currentStatus} />
                  <Field label="Last Checked" value={
                    liveContainer.trackingCheckedAt
                      ? `${fmtDateTime(liveContainer.trackingCheckedAt)} by ${liveContainer.trackingCheckedBy}`
                      : undefined
                  } />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Assigned To</label>
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
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Internal Notes</label>
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
