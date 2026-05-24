import { create } from 'zustand';
import type {
  ContainerRecord,
  AppState,
  UploadSession,
  CarrierEvents,
  CheckHistoryEntry,
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
          };
          const decision = computeDecision(updated);
          return {
            ...updated,
            reviewStatus: decision.reviewStatus,
            suggestedAction: decision.suggestedAction,
            suggestedEventDate: decision.suggestedEventDate,
            reason: decision.reason,
            priority: computePriority({ ...updated, ...decision }),
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
          return {
            ...updated,
            reviewStatus: decision.reviewStatus,
            suggestedAction: decision.suggestedAction,
            suggestedEventDate: decision.suggestedEventDate,
            reason: decision.reason,
            priority: computePriority({ ...updated, ...decision }),
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
          return {
            ...c,
            reviewStatus: decision.reviewStatus,
            suggestedAction: decision.suggestedAction,
            suggestedEventDate: decision.suggestedEventDate,
            reason: decision.reason,
            priority: computePriority({ ...c, ...decision }),
          };
        })
      ),
    }));
    persist(get());
  },
}));
