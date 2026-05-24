import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../store/useStore';
import { makeContainer } from './fixtures';
import type { ContainerRecord } from '../types';

// Reset store state between tests
beforeEach(() => {
  useStore.setState({
    containers: [],
    sessions: [],
    currentUser: 'TestUser',
    lastAutoTrackAt: null,
    autoTrackedCount: 0,
    loaded: false,
  });
});

// ── setCurrentUser ────────────────────────────────────────────────────────────
describe('setCurrentUser', () => {
  it('updates the current user name', () => {
    useStore.getState().setCurrentUser('Alice');
    expect(useStore.getState().currentUser).toBe('Alice');
  });
});

// ── setManualPriority ─────────────────────────────────────────────────────────
describe('setManualPriority', () => {
  it('sets a manual priority override', () => {
    const c = makeContainer({ id: 'c1', priority: 'Low', normalizedSapStatus: 'IN_TRANSIT' });
    useStore.setState({ containers: [c] });

    useStore.getState().setManualPriority('c1', 'High');
    const updated = useStore.getState().containers.find(x => x.id === 'c1');
    expect(updated?.manualPriority).toBe('High');
    expect(updated?.priority).toBe('High');
  });

  it('clears manual priority when null is passed', () => {
    const c = makeContainer({ id: 'c2', manualPriority: 'High', priority: 'High' });
    useStore.setState({ containers: [c] });

    useStore.getState().setManualPriority('c2', null);
    const updated = useStore.getState().containers.find(x => x.id === 'c2');
    expect(updated?.manualPriority).toBeNull();
  });

  it('ignores unknown ids silently', () => {
    useStore.setState({ containers: [makeContainer({ id: 'existing' })] });
    expect(() => useStore.getState().setManualPriority('nonexistent', 'High')).not.toThrow();
    expect(useStore.getState().containers).toHaveLength(1);
  });
});

// ── setReviewStatus ───────────────────────────────────────────────────────────
describe('setReviewStatus', () => {
  it('sets review status and marks as user-set', () => {
    const c = makeContainer({ id: 'r1', reviewStatus: 'No Update Required', reviewStatusUserSet: false });
    useStore.setState({ containers: [c] });

    useStore.getState().setReviewStatus('r1', 'Action Required');
    const updated = useStore.getState().containers.find(x => x.id === 'r1');
    expect(updated?.reviewStatus).toBe('Action Required');
    expect(updated?.reviewStatusUserSet).toBe(true);
  });

  it('allows setting to Auto-Reviewed', () => {
    const c = makeContainer({ id: 'r2' });
    useStore.setState({ containers: [c] });
    useStore.getState().setReviewStatus('r2', 'Auto-Reviewed');
    expect(useStore.getState().containers[0].reviewStatus).toBe('Auto-Reviewed');
  });
});

// ── updateNotes ───────────────────────────────────────────────────────────────
describe('updateNotes', () => {
  it('updates internal notes', () => {
    const c = makeContainer({ id: 'n1', internalNotes: '' });
    useStore.setState({ containers: [c] });
    useStore.getState().updateNotes('n1', 'Awaiting customs clearance');
    expect(useStore.getState().containers[0].internalNotes).toBe('Awaiting customs clearance');
  });
});

// ── updateAssignedTo ──────────────────────────────────────────────────────────
describe('updateAssignedTo', () => {
  it('assigns container to a user', () => {
    const c = makeContainer({ id: 'a1', assignedTo: '' });
    useStore.setState({ containers: [c] });
    useStore.getState().updateAssignedTo('a1', 'Bob');
    expect(useStore.getState().containers[0].assignedTo).toBe('Bob');
  });
});

// ── mergeAutoTracking ─────────────────────────────────────────────────────────
describe('mergeAutoTracking', () => {
  it('merges carrier ETA into matching container', () => {
    const c = makeContainer({ id: 'c-merge', carrierEta: null });
    useStore.setState({ containers: [c], lastAutoTrackAt: null });

    useStore.getState().mergeAutoTracking(
      {
        'c-merge': {
          autoTracked: true,
          checkedAt: '2025-06-01T00:00:00Z',
          source: 'Sinay',
          eta: '2025-06-15',
          currentStatus: 'In Transit',
          lastEventDescription: 'Vessel departed',
          lastEventDate: '2025-05-30',
        },
      },
      '2025-06-01T00:00:00Z',
      1
    );

    const updated = useStore.getState().containers.find(x => x.id === 'c-merge');
    expect(updated?.carrierEta).toBe('2025-06-15');
    expect(updated?.carrierEvents.currentStatus).toBe('In Transit');
    expect(useStore.getState().lastAutoTrackAt).toBe('2025-06-01T00:00:00Z');
  });

  it('skips containers not in results', () => {
    const c = makeContainer({ id: 'c-skip', carrierEta: null });
    useStore.setState({ containers: [c] });

    useStore.getState().mergeAutoTracking({}, '2025-06-01T00:00:00Z', 0);
    expect(useStore.getState().containers[0].carrierEta).toBeNull();
  });

  it('sets Auto-Reviewed when no update needed and reviewStatusUserSet is false', () => {
    // Use a far-future ETA so the isEtaOverdue branch never fires
    const futureEta = '2099-12-31';
    const c = makeContainer({
      id: 'c-auto',
      normalizedSapStatus: 'IN_TRANSIT',
      reviewStatusUserSet: false,
      sapEta: futureEta,
    });
    useStore.setState({ containers: [c] });

    useStore.getState().mergeAutoTracking(
      {
        'c-auto': {
          autoTracked: true,
          checkedAt: new Date().toISOString(),
          // eta matches sapEta → computeDecision → No Update Required → Auto-Reviewed
          eta: futureEta,
          currentStatus: 'In Transit',
        },
      },
      new Date().toISOString(),
      1
    );

    const updated = useStore.getState().containers[0];
    expect(updated.reviewStatus).toBe('Auto-Reviewed');
  });

  it('preserves user-set review status when reviewStatusUserSet is true', () => {
    const c = makeContainer({
      id: 'c-user-set',
      normalizedSapStatus: 'IN_TRANSIT',
      reviewStatus: 'Pending Review',
      reviewStatusUserSet: true,
      sapEta: '2025-06-15',
    });
    useStore.setState({ containers: [c] });

    useStore.getState().mergeAutoTracking(
      {
        'c-user-set': {
          autoTracked: true,
          checkedAt: new Date().toISOString(),
          eta: '2025-06-15',
        },
      },
      new Date().toISOString(),
      1
    );

    // Should NOT change the user-set review status
    expect(useStore.getState().containers[0].reviewStatus).toBe('Pending Review');
  });

  it('preserves manualPriority across merge', () => {
    const c = makeContainer({ id: 'c-prio', manualPriority: 'High', priority: 'High' });
    useStore.setState({ containers: [c] });

    useStore.getState().mergeAutoTracking(
      { 'c-prio': { autoTracked: true, checkedAt: new Date().toISOString() } },
      new Date().toISOString(), 1
    );

    expect(useStore.getState().containers[0].priority).toBe('High');
    expect(useStore.getState().containers[0].manualPriority).toBe('High');
  });
});

// ── markChecked ───────────────────────────────────────────────────────────────
describe('markChecked', () => {
  it('sets markedChecked and appends to history', () => {
    const c = makeContainer({ id: 'm1', markedChecked: false });
    useStore.setState({ containers: [c], currentUser: 'Alice' });

    useStore.getState().markChecked('m1', 'Alice');
    const updated = useStore.getState().containers[0];
    expect(updated.markedChecked).toBe(true);
    expect(updated.history).toHaveLength(1);
    expect(updated.history[0].checkedBy).toBe('Alice');
  });
});

// ── clearAllContainers ────────────────────────────────────────────────────────
describe('clearAllContainers', () => {
  it('removes all containers and sessions', async () => {
    useStore.setState({
      containers: [makeContainer({ id: 'x' })],
      sessions: [{ id: 's1', uploadedAt: '', filename: 'test.csv', containerCount: 1, uploadedBy: 'Admin' }],
    });

    await useStore.getState().clearAllContainers();
    expect(useStore.getState().containers).toHaveLength(0);
    expect(useStore.getState().sessions).toHaveLength(0);
  });
});

// ── recomputeAll ──────────────────────────────────────────────────────────────
describe('recomputeAll', () => {
  it('recomputes decisions for all containers', () => {
    const c: ContainerRecord = makeContainer({
      id: 'rc1',
      normalizedSapStatus: 'EMPTY_RETURNED',
      reviewStatus: 'Pending Review', // wrong — should be Completed
      reviewStatusUserSet: false,
    });
    useStore.setState({ containers: [c] });

    useStore.getState().recomputeAll();
    expect(useStore.getState().containers[0].reviewStatus).toBe('Completed');
  });

  it('preserves user-set review status', () => {
    const c = makeContainer({
      id: 'rc2',
      normalizedSapStatus: 'IN_TRANSIT',
      reviewStatus: 'Pending Review',
      reviewStatusUserSet: true,
    });
    useStore.setState({ containers: [c] });

    useStore.getState().recomputeAll();
    expect(useStore.getState().containers[0].reviewStatus).toBe('Pending Review');
  });
});
