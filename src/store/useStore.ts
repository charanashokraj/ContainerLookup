import { create } from 'zustand';
import type { ContainerRecord, UploadSession, CarrierEvents, Priority, ReviewStatus } from '../types';
import { v4 as uuid } from '../lib/uuid';
import { computeDecision, computePriority, sortContainers } from '../lib/decisionEngine';
import type { AutoTrackingResult } from '../lib/githubSync';
import { supabase } from '../lib/supabase';

// ── Supabase helpers ──────────────────────────────────────────────────────────

async function upsertContainers(containers: ContainerRecord[]) {
  if (containers.length === 0) return;
  const rows = containers.map(c => ({
    id:          c.id,
    data:        c,
    session_id:  c.sessionId,
    uploaded_by: c.uploadedBy,
    updated_at:  new Date().toISOString(),
  }));
  const { error } = await supabase.from('containers').upsert(rows);
  if (error) console.error('[Supabase] upsert containers:', error.message);
}

async function upsertContainer(c: ContainerRecord) {
  const { error } = await supabase.from('containers').upsert({
    id:          c.id,
    data:        c,
    session_id:  c.sessionId,
    uploaded_by: c.uploadedBy,
    updated_at:  new Date().toISOString(),
  });
  if (error) console.error('[Supabase] upsert container:', error.message);
}

// ── Store interface ───────────────────────────────────────────────────────────

interface Store {
  containers:      ContainerRecord[];
  sessions:        UploadSession[];
  currentUser:     string;
  lastAutoTrackAt: string | null;
  autoTrackedCount: number;
  loaded:          boolean;   // true once loadFromSupabase() has run

  // Init
  loadFromSupabase:    () => Promise<void>;
  setCurrentUser:      (name: string) => void;

  // Container lifecycle
  importContainers:    (records: ContainerRecord[], filename: string, uploadedBy: string) => Promise<void>;
  clearAllContainers:  () => Promise<void>;
  deleteSession:       (sessionId: string) => Promise<void>;

  // Tracking
  updateCarrierTracking: (
    id: string, events: Partial<CarrierEvents>,
    carrierEta: string | null, checkedBy: string, source: string
  ) => void;
  approveUpdate:    (id: string, approvedBy: string) => void;
  markChecked:      (id: string, checkedBy: string) => void;
  markPendingReview:(id: string, reason: string) => void;
  mergeAutoTracking:(results: Record<string, AutoTrackingResult>, updatedAt: string | null, trackedCount: number) => void;
  recomputeAll:     () => void;

  // Manual overrides
  setManualPriority: (id: string, priority: Priority | null) => void;
  setReviewStatus:   (id: string, status: ReviewStatus) => void;

  // Notes
  updateNotes:      (id: string, notes: string) => void;
  updateAssignedTo: (id: string, assignedTo: string) => void;
}

// ── History entry ─────────────────────────────────────────────────────────────

interface CheckHistoryEntry {
  id: string; checkedAt: string; checkedBy: string;
  sapStatus: string; carrierStatus: string;
  suggestedAction: string; notes: string;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useStore = create<Store>((set, get) => ({
  containers:       [],
  sessions:         [],
  currentUser:      '',
  lastAutoTrackAt:  null,
  autoTrackedCount: 0,
  loaded:           false,

  setCurrentUser(name) { set({ currentUser: name }); },

  // ── Load from Supabase ────────────────────────────────────────────────────
  async loadFromSupabase() {
    const [{ data: cRows }, { data: sRows }] = await Promise.all([
      supabase.from('containers').select('data, session_id, uploaded_by').order('created_at'),
      supabase.from('upload_sessions').select('*').order('uploaded_at', { ascending: false }),
    ]);

    const containers: ContainerRecord[] = (cRows ?? []).map(row => ({
      ...(row.data as ContainerRecord),
      uploadedBy: row.uploaded_by ?? '',
      sessionId:  row.session_id  ?? '',
    }));

    const sessions: UploadSession[] = (sRows ?? []).map(row => ({
      id:             row.id,
      uploadedAt:     row.uploaded_at,
      filename:       row.filename ?? '',
      containerCount: row.container_count ?? 0,
      uploadedBy:     row.uploaded_by ?? '',
    }));

    set({ containers: sortContainers(containers), sessions, loaded: true });
  },

  // ── Import ────────────────────────────────────────────────────────────────
  async importContainers(records, filename, uploadedBy) {
    const sessionId = uuid();
    const session: UploadSession = {
      id: sessionId,
      uploadedAt:     new Date().toISOString(),
      filename,
      containerCount: records.length,
      uploadedBy,
    };

    // Stamp every record with session info
    const stamped = sortContainers(
      records.map(r => ({ ...r, uploadedBy, sessionId }))
    );

    // Optimistic local update first
    set(s => ({
      containers: stamped,
      sessions:   [session, ...s.sessions].slice(0, 50),
    }));

    // Persist to Supabase
    const { error: sessErr } = await supabase.from('upload_sessions').insert({
      id:              sessionId,
      uploaded_at:     session.uploadedAt,
      filename,
      container_count: records.length,
      uploaded_by:     uploadedBy,
    });
    if (sessErr) console.error('[Supabase] insert session:', sessErr.message);

    // Delete old containers, insert new ones (fresh snapshot workflow)
    await supabase.from('containers').delete().neq('id', '__none__');
    await upsertContainers(stamped);
  },

  // ── Clear all ─────────────────────────────────────────────────────────────
  async clearAllContainers() {
    set({ containers: [], sessions: [] });
    await supabase.from('containers').delete().neq('id', '__none__');
    await supabase.from('upload_sessions').delete().neq('id', '__none__');
  },

  // ── Delete one session's containers ───────────────────────────────────────
  async deleteSession(sessionId) {
    set(s => ({
      containers: s.containers.filter(c => c.sessionId !== sessionId),
      sessions:   s.sessions.filter(s2 => s2.id !== sessionId),
    }));
    await supabase.from('containers').delete().eq('session_id', sessionId);
    await supabase.from('upload_sessions').delete().eq('id', sessionId);
  },

  // ── Carrier tracking (manual) ─────────────────────────────────────────────
  updateCarrierTracking(id, events, carrierEta, checkedBy, source) {
    set(s => {
      const containers = sortContainers(s.containers.map(c => {
        if (c.id !== id) return c;
        const merged: CarrierEvents = { ...c.carrierEvents, ...events };
        const updated: ContainerRecord = {
          ...c,
          carrierEta: carrierEta ?? c.carrierEta,
          carrierEvents: merged,
          trackingCheckedAt: new Date().toISOString(),
          trackingCheckedBy: checkedBy,
          trackingSource: source,
          reviewStatusUserSet: false,
        };
        const decision = computeDecision(updated);
        const result = {
          ...updated,
          reviewStatus: decision.reviewStatus,
          suggestedAction: decision.suggestedAction,
          suggestedEventDate: decision.suggestedEventDate,
          reason: decision.reason,
          priority: (c.manualPriority ?? null) ?? computePriority({ ...updated, ...decision }),
        };
        upsertContainer(result);
        return result;
      }));
      return { containers };
    });
  },

  approveUpdate(id, approvedBy) {
    set(s => {
      const containers = sortContainers(s.containers.map(c => {
        if (c.id !== id) return c;
        const entry: CheckHistoryEntry = {
          id: uuid(), checkedAt: new Date().toISOString(), checkedBy: approvedBy,
          sapStatus: c.sapStatus, carrierStatus: c.carrierEvents.currentStatus ?? '',
          suggestedAction: c.suggestedAction, notes: `Approved: ${c.suggestedAction}`,
        };
        const result = {
          ...c,
          reviewStatus: 'No Update Required' as const,
          reviewStatusUserSet: true,
          markedChecked: true,
          markedCheckedAt: new Date().toISOString(),
          history: [...c.history, entry],
        };
        upsertContainer(result);
        return result;
      }));
      return { containers };
    });
  },

  markChecked(id, checkedBy) {
    set(s => {
      const containers = s.containers.map(c => {
        if (c.id !== id) return c;
        const entry: CheckHistoryEntry = {
          id: uuid(), checkedAt: new Date().toISOString(), checkedBy,
          sapStatus: c.sapStatus, carrierStatus: c.carrierEvents.currentStatus ?? '',
          suggestedAction: c.suggestedAction, notes: 'Marked as checked',
        };
        const result = { ...c, markedChecked: true, markedCheckedAt: new Date().toISOString(), history: [...c.history, entry] };
        upsertContainer(result);
        return result;
      });
      return { containers };
    });
  },

  markPendingReview(id, reason) {
    set(s => {
      const containers = s.containers.map(c => {
        if (c.id !== id) return c;
        const result = { ...c, reviewStatus: 'Pending Review' as const, reviewStatusUserSet: true, priority: 'High' as const, reason };
        upsertContainer(result);
        return result;
      });
      return { containers };
    });
  },

  // ── Auto-tracking merge ───────────────────────────────────────────────────
  mergeAutoTracking(results, updatedAt, trackedCount) {
    set(s => {
      // Build secondary index: containerNumber → result (fallback when UUIDs changed after re-upload)
      const byContainerNum: Record<string, AutoTrackingResult> = {};
      for (const r of Object.values(results)) {
        if (r.containerNumber && r.autoTracked) byContainerNum[r.containerNumber.toUpperCase()] = r;
      }

      const updated: ContainerRecord[] = [];
      const containers = sortContainers(s.containers.map(c => {
        // Primary: match by UUID; Secondary: match by container number (survives re-uploads)
        const result = results[c.id]
          ?? byContainerNum[c.containerNumber?.toUpperCase() ?? ''];
        if (!result?.autoTracked) return c;

        const mergedEvents: CarrierEvents = {
          ...c.carrierEvents,
          dischargeDate:        result.dischargeDate        ?? c.carrierEvents.dischargeDate,
          releaseDate:          result.releaseDate           ?? c.carrierEvents.releaseDate,
          emptyReturnDate:      result.emptyReturnDate       ?? c.carrierEvents.emptyReturnDate,
          currentStatus:        result.currentStatus         ?? c.carrierEvents.currentStatus,
          lastEventDescription: result.lastEventDescription  ?? c.carrierEvents.lastEventDescription,
          lastEventDate:        result.lastEventDate         ?? c.carrierEvents.lastEventDate,
          eta:                  result.eta                   ?? c.carrierEvents.eta,
          currentLocation:      result.currentLocation       ?? c.carrierEvents.currentLocation,
          vesselName:           result.vesselName            ?? c.carrierEvents.vesselName,
          portOfLoading:        result.portOfLoading         ?? c.carrierEvents.portOfLoading,
          portOfDischarge:      result.portOfDischarge       ?? c.carrierEvents.portOfDischarge,
        };

        const base: ContainerRecord = {
          ...c,
          carrierEta:        result.eta ?? c.carrierEta,
          carrierEvents:     mergedEvents,
          trackingCheckedAt: result.checkedAt,
          trackingCheckedBy: 'Auto-Tracker',
          trackingSource:    result.source ?? 'GitHub Actions',
        };

        const decision = computeDecision(base);
        const reviewStatus: ReviewStatus = (c.reviewStatusUserSet ?? false)
          ? c.reviewStatus
          : (decision.reviewStatus === 'No Update Required' ? 'Auto-Reviewed' : decision.reviewStatus);

        const final = {
          ...base,
          reviewStatus,
          reviewStatusUserSet: c.reviewStatusUserSet ?? false,
          suggestedAction: decision.suggestedAction,
          suggestedEventDate: decision.suggestedEventDate,
          reason: decision.reason,
          priority: (c.manualPriority ?? null) ?? computePriority({ ...base, ...decision }),
          manualPriority: c.manualPriority ?? null,
        };

        updated.push(final);
        return final;
      }));

      // Batch upsert to Supabase
      if (updated.length > 0) upsertContainers(updated);

      return { containers, lastAutoTrackAt: updatedAt, autoTrackedCount: trackedCount };
    });
  },

  recomputeAll() {
    set(s => {
      const containers = sortContainers(s.containers.map(c => {
        const decision = computeDecision(c);
        return {
          ...c,
          reviewStatus: (c.reviewStatusUserSet ?? false) ? c.reviewStatus : decision.reviewStatus,
          suggestedAction: decision.suggestedAction,
          suggestedEventDate: decision.suggestedEventDate,
          reason: decision.reason,
          priority: (c.manualPriority ?? null) ?? computePriority({ ...c, ...decision }),
        };
      }));
      upsertContainers(containers);
      return { containers };
    });
  },

  setManualPriority(id, priority) {
    set(s => {
      const containers = sortContainers(s.containers.map(c => {
        if (c.id !== id) return c;
        const computed = computePriority({ ...c, ...computeDecision(c) });
        const result = { ...c, manualPriority: priority, priority: priority ?? computed };
        upsertContainer(result);
        return result;
      }));
      return { containers };
    });
  },

  setReviewStatus(id, status) {
    set(s => {
      const containers = s.containers.map(c => {
        if (c.id !== id) return c;
        const result = { ...c, reviewStatus: status, reviewStatusUserSet: true };
        upsertContainer(result);
        return result;
      });
      return { containers };
    });
  },

  updateNotes(id, notes) {
    set(s => {
      const containers = s.containers.map(c => {
        if (c.id !== id) return c;
        const result = { ...c, internalNotes: notes };
        upsertContainer(result);
        return result;
      });
      return { containers };
    });
  },

  updateAssignedTo(id, assignedTo) {
    set(s => {
      const containers = s.containers.map(c => {
        if (c.id !== id) return c;
        const result = { ...c, assignedTo };
        upsertContainer(result);
        return result;
      });
      return { containers };
    });
  },
}));
