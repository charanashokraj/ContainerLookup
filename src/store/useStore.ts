import { create } from 'zustand';
import type {
  ContainerRecord,
  AppState,
  UploadSession,
  CarrierEvents,
  CheckHistoryEntry,
  Priority,
  ReviewStatus,
} from '../types';
import { loadState, saveState } from '../lib/storage';
import { v4 as uuid } from '../lib/uuid';
import { computeDecision, computePriority, sortContainers } from '../lib/decisionEngine';
import type { AutoTrackingResult } from '../lib/githubSync';

interface Store extends AppState {
  lastAutoTrackAt: string | null;
  autoTrackedCount: number;
  // Actions
  setCurrentUser: (name: string) => void;
  mergeAutoTracking: (results: Record<string, AutoTrackingResult>, updatedAt: string | null, trackedCount: number) => void;
  importContainers: (records: ContainerRecord[], filename: string) => void;
  clearAllContainers: () => void;
  updateCarrierTracking: (
    id: string,
    events: Partial<CarrierEvents>,
    carrierEta: string | null,
    checkedBy: string,
    source: string
  ) => void;
  approveUpdate: (id: string, approvedBy: string) => void;
  markChecked: (id: string, checkedBy: string) => void;
  markPendingReview: (id: string, reason: string) => void;
  updateNotes: (id: string, notes: string) => void;
  updateAssignedTo: (id: string, assignedTo: string) => void;
  recomputeAll: () => void;
  // Manual override actions
  setManualPriority: (id: string, priority: Priority | null) => void;
  setReviewStatus: (id: string, status: ReviewStatus) => void;
}

const initial = loadState();

function persist(state: AppState) {
  saveState({
    containers: state.containers,
    sessions: state.sessions,
    currentUser: state.currentUser,
  });
}

export const useStore = create<Store>((set, get) => ({
  ...initial,
  lastAutoTrackAt: null,
  autoTrackedCount: 0,

  setCurrentUser(name) {
    set({ currentUser: name });
    persist(get());
  },

  importContainers(records, filename) {
    const sorted = sortContainers(records);
    const session: UploadSession = {
      id: uuid(),
      uploadedAt: new Date().toISOString(),
      filename,
      containerCount: records.length,
    };
    set((s) => ({
      containers: sorted,
      sessions: [session, ...s.sessions].slice(0, 20),
    }));
    persist(get());
  },

  clearAllContainers() {
    set({ containers: [] });
    persist(get());
  },

  updateCarrierTracking(id, events, carrierEta, checkedBy, source) {
    set((s) => ({
      containers: sortContainers(
        s.containers.map((c) => {
          if (c.id !== id) return c;
          const merged: CarrierEvents = { ...c.carrierEvents, ...events };
          const updated: ContainerRecord = {
            ...c,
            carrierEta: carrierEta ?? c.carrierEta,
            carrierEvents: merged,
            trackingCheckedAt: new Date().toISOString(),
            trackingCheckedBy: checkedBy,
            trackingSource: source,
            // Manual tracking clears the reviewStatusUserSet so decision engine takes over
            reviewStatusUserSet: false,
          };
          const decision = computeDecision(updated);
          const computedPriority = computePriority({ ...updated, ...decision });
          return {
            ...updated,
            reviewStatus: decision.reviewStatus,
            suggestedAction: decision.suggestedAction,
            suggestedEventDate: decision.suggestedEventDate,
            reason: decision.reason,
            // Respect manual priority override
            priority: (c.manualPriority ?? null) ?? computedPriority,
          };
        })
      ),
    }));
    persist(get());
  },

  approveUpdate(id, approvedBy) {
    set((s) => ({
      containers: sortContainers(
        s.containers.map((c) => {
          if (c.id !== id) return c;
          const historyEntry: CheckHistoryEntry = {
            id: uuid(),
            checkedAt: new Date().toISOString(),
            checkedBy: approvedBy,
            sapStatus: c.sapStatus,
            carrierStatus: c.carrierEvents.currentStatus ?? '',
            suggestedAction: c.suggestedAction,
            notes: `Approved: ${c.suggestedAction}`,
          };
          return {
            ...c,
            reviewStatus: 'No Update Required' as const,
            markedChecked: true,
            markedCheckedAt: new Date().toISOString(),
            history: [...c.history, historyEntry],
          };
        })
      ),
    }));
    persist(get());
  },

  markChecked(id, checkedBy) {
    set((s) => ({
      containers: s.containers.map((c) => {
        if (c.id !== id) return c;
        const historyEntry: CheckHistoryEntry = {
          id: uuid(),
          checkedAt: new Date().toISOString(),
          checkedBy,
          sapStatus: c.sapStatus,
          carrierStatus: c.carrierEvents.currentStatus ?? '',
          suggestedAction: c.suggestedAction,
          notes: 'Marked as checked',
        };
        return {
          ...c,
          markedChecked: true,
          markedCheckedAt: new Date().toISOString(),
          history: [...c.history, historyEntry],
        };
      }),
    }));
    persist(get());
  },

  markPendingReview(id, reason) {
    set((s) => ({
      containers: s.containers.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          reviewStatus: 'Pending Review' as const,
          priority: 'High' as const,
          reason,
        };
      }),
    }));
    persist(get());
  },

  updateNotes(id, notes) {
    set((s) => ({
      containers: s.containers.map((c) =>
        c.id === id ? { ...c, internalNotes: notes } : c
      ),
    }));
    persist(get());
  },

  updateAssignedTo(id, assignedTo) {
    set((s) => ({
      containers: s.containers.map((c) =>
        c.id === id ? { ...c, assignedTo } : c
      ),
    }));
    persist(get());
  },

  mergeAutoTracking(results, updatedAt, trackedCount) {
    set((s) => ({
      lastAutoTrackAt: updatedAt,
      autoTrackedCount: trackedCount,
      containers: sortContainers(
        s.containers.map((c) => {
          const result = results[c.id];
          if (!result || !result.autoTracked) return c;

          const mergedEvents: CarrierEvents = {
            ...c.carrierEvents,
            dischargeDate: result.dischargeDate ?? c.carrierEvents.dischargeDate,
            releaseDate: result.releaseDate ?? c.carrierEvents.releaseDate,
            emptyReturnDate: result.emptyReturnDate ?? c.carrierEvents.emptyReturnDate,
            currentStatus: result.currentStatus ?? c.carrierEvents.currentStatus,
            lastEventDescription: result.lastEventDescription ?? c.carrierEvents.lastEventDescription,
            lastEventDate: result.lastEventDate ?? c.carrierEvents.lastEventDate,
            eta: result.eta ?? c.carrierEvents.eta,
            currentLocation: result.currentLocation ?? c.carrierEvents.currentLocation,
            vesselName: result.vesselName ?? c.carrierEvents.vesselName,
            portOfLoading: result.portOfLoading ?? c.carrierEvents.portOfLoading,
            portOfDischarge: result.portOfDischarge ?? c.carrierEvents.portOfDischarge,
          };

          const updated: ContainerRecord = {
            ...c,
            carrierEta: result.eta ?? c.carrierEta,
            carrierEvents: mergedEvents,
            trackingCheckedAt: result.checkedAt,
            trackingCheckedBy: 'Auto-Tracker',
            trackingSource: result.source ?? 'GitHub Actions',
          };

          const decision = computeDecision(updated);
          const computedPriority = computePriority({ ...updated, ...decision });

          // If the user has manually set the review status, keep it; otherwise apply decision.
          // 'No Update Required' from auto-tracking becomes 'Auto-Reviewed' to signal it was API-verified.
          let reviewStatus: ReviewStatus;
          if (c.reviewStatusUserSet ?? false) {
            reviewStatus = c.reviewStatus; // preserve user's choice
          } else {
            reviewStatus = decision.reviewStatus === 'No Update Required'
              ? 'Auto-Reviewed'
              : decision.reviewStatus;
          }

          return {
            ...updated,
            reviewStatus,
            reviewStatusUserSet: c.reviewStatusUserSet ?? false,
            suggestedAction: decision.suggestedAction,
            suggestedEventDate: decision.suggestedEventDate,
            reason: decision.reason,
            // Respect manual priority; fall back to computed
            priority: (c.manualPriority ?? null) ?? computedPriority,
            manualPriority: c.manualPriority ?? null,
          };
        })
      ),
    }));
    persist(get());
  },

  recomputeAll() {
    set((s) => ({
      containers: sortContainers(
        s.containers.map((c) => {
          const decision = computeDecision(c);
          const computedPriority = computePriority({ ...c, ...decision });
          return {
            ...c,
            // Keep user-set review status and manual priority across recomputes
            reviewStatus: (c.reviewStatusUserSet ?? false) ? c.reviewStatus : decision.reviewStatus,
            suggestedAction: decision.suggestedAction,
            suggestedEventDate: decision.suggestedEventDate,
            reason: decision.reason,
            priority: (c.manualPriority ?? null) ?? computedPriority,
          };
        })
      ),
    }));
    persist(get());
  },

  setManualPriority(id, priority) {
    set((s) => ({
      containers: sortContainers(
        s.containers.map((c) => {
          if (c.id !== id) return c;
          const computed = computePriority({ ...c, ...computeDecision(c) });
          return {
            ...c,
            manualPriority: priority,
            priority: priority ?? computed,
          };
        })
      ),
    }));
    persist(get());
  },

  setReviewStatus(id, status) {
    set((s) => ({
      containers: s.containers.map((c) =>
        c.id === id
          ? { ...c, reviewStatus: status, reviewStatusUserSet: true }
          : c
      ),
    }));
    persist(get());
  },
}));
