import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { computeDecision, computePriority, sortContainers } from '../lib/decisionEngine';
import { makeContainer, makeContainerWithStatus } from './fixtures';

// Pin date so ETA-overdue logic is deterministic
const FIXED_DATE = new Date('2025-07-01T00:00:00Z');
beforeAll(() => { vi.setSystemTime(FIXED_DATE); });
afterAll(() => { vi.useRealTimers(); });

// ── computeDecision ───────────────────────────────────────────────────────────

describe('computeDecision — EMPTY_RETURNED', () => {
  it('returns Completed for EMPTY_RETURNED', () => {
    const c = makeContainerWithStatus('EMPTY_RETURNED');
    const r = computeDecision(c);
    expect(r.reviewStatus).toBe('Completed');
    expect(r.suggestedAction).toBe('Close / completed');
  });
});

describe('computeDecision — no tracking data', () => {
  it('returns Pending Review when no tracking data at all', () => {
    const c = makeContainer({ normalizedSapStatus: 'IN_TRANSIT', trackingCheckedAt: null });
    const r = computeDecision(c);
    expect(r.reviewStatus).toBe('Pending Review');
    expect(r.suggestedAction).toBe('Review manually');
  });
});

describe('computeDecision — IN_TRANSIT', () => {
  it('Action Required when discharge date present', () => {
    const c = makeContainerWithStatus('IN_TRANSIT', { dischargeDate: '2025-06-15' });
    const r = computeDecision(c);
    expect(r.reviewStatus).toBe('Action Required');
    expect(r.suggestedAction).toBe('Add container discharged event');
    expect(r.suggestedEventDate).toBe('2025-06-15');
  });

  it('Action Required when carrier ETA differs from SAP ETA', () => {
    const c = makeContainerWithStatus('IN_TRANSIT', { eta: '2025-06-15' });
    c.sapEta = '2025-06-01';
    const r = computeDecision(c);
    expect(r.reviewStatus).toBe('Action Required');
    expect(r.suggestedAction).toBe('Update ETA in SAP');
  });

  it('Pending Review when SAP ETA is overdue and no discharge', () => {
    const c = makeContainerWithStatus('IN_TRANSIT');
    c.sapEta = '2025-05-01'; // past the fixed date
    const r = computeDecision(c);
    expect(r.reviewStatus).toBe('Pending Review');
  });

  it('No Update Required when in transit with matching ETA', () => {
    // Use a future ETA so isEtaOverdue() returns false
    const c = makeContainerWithStatus('IN_TRANSIT', { eta: '2025-08-01' });
    c.sapEta = '2025-08-01';
    const r = computeDecision(c);
    expect(r.reviewStatus).toBe('No Update Required');
  });
});

describe('computeDecision — DISCHARGED', () => {
  it('Pending Review when carrier shows in-transit despite SAP Discharged', () => {
    // e.g. MELG02964500: SAP says Discharged, carrier returns "Loaded On Vessel At Port Of Loading"
    // → should NOT suggest "Add container released event"
    const c = makeContainerWithStatus('DISCHARGED', {
      releaseDate: '2025-06-20',
      currentStatus: 'Loaded On Vessel At Port Of Loading',
    });
    const r = computeDecision(c);
    expect(r.reviewStatus).toBe('Pending Review');
    expect(r.suggestedAction).toBe('Review manually');
  });

  it('Action Required when release date present', () => {
    const c = makeContainerWithStatus('DISCHARGED', { releaseDate: '2025-06-20' });
    const r = computeDecision(c);
    expect(r.reviewStatus).toBe('Action Required');
    expect(r.suggestedAction).toBe('Add container released event');
    expect(r.suggestedEventDate).toBe('2025-06-20');
  });

  it('Action Required with both release and empty return dates', () => {
    const c = makeContainerWithStatus('DISCHARGED', {
      releaseDate: '2025-06-20', emptyReturnDate: '2025-06-25',
    });
    const r = computeDecision(c);
    expect(r.reviewStatus).toBe('Action Required');
    expect(r.suggestedAction).toBe('Add container released event');
  });

  it('Pending Review when empty return present but no release date', () => {
    const c = makeContainerWithStatus('DISCHARGED', { emptyReturnDate: '2025-06-25' });
    const r = computeDecision(c);
    expect(r.reviewStatus).toBe('Pending Review');
  });

  it('No Update Required when only discharged, no release yet', () => {
    const c = makeContainerWithStatus('DISCHARGED');
    const r = computeDecision(c);
    expect(r.reviewStatus).toBe('No Update Required');
  });
});

describe('computeDecision — RELEASED', () => {
  it('Action Required when empty return date present', () => {
    const c = makeContainerWithStatus('RELEASED', { emptyReturnDate: '2025-06-28' });
    const r = computeDecision(c);
    expect(r.reviewStatus).toBe('Action Required');
    expect(r.suggestedAction).toBe('Add empty returned event');
  });

  it('No Update Required when released but no empty return', () => {
    const c = makeContainerWithStatus('RELEASED');
    const r = computeDecision(c);
    expect(r.reviewStatus).toBe('No Update Required');
  });
});

// ── computePriority ───────────────────────────────────────────────────────────

describe('computePriority', () => {
  it('High when Pending Review', () => {
    const c = makeContainer({ reviewStatus: 'Pending Review' });
    expect(computePriority(c)).toBe('High');
  });

  it('High when booking number is missing', () => {
    const c = makeContainer({ bookingNumber: '' });
    expect(computePriority(c)).toBe('High');
  });

  it('High when IN_TRANSIT and ETA overdue', () => {
    const c = makeContainer({
      normalizedSapStatus: 'IN_TRANSIT',
      sapEta: '2025-05-01', // before fixed date 2025-07-01
      reviewStatus: 'No Update Required',
    });
    expect(computePriority(c)).toBe('High');
  });

  it('Medium when DISCHARGED (< 5 days ago)', () => {
    const c = makeContainer({
      normalizedSapStatus: 'DISCHARGED',
      reviewStatus: 'No Update Required',
      suggestedAction: 'No update required',
      carrierEvents: { ...makeContainer().carrierEvents, dischargeDate: '2025-06-29' },
    });
    expect(computePriority(c)).toBe('Medium');
  });

  it('High when DISCHARGED > 5 days ago', () => {
    const c = makeContainer({
      normalizedSapStatus: 'DISCHARGED',
      reviewStatus: 'Action Required',
      carrierEvents: { ...makeContainer().carrierEvents, dischargeDate: '2025-06-10' },
    });
    expect(computePriority(c)).toBe('High');
  });

  it('Low when Completed', () => {
    const c = makeContainer({ reviewStatus: 'Completed', normalizedSapStatus: 'EMPTY_RETURNED' });
    expect(computePriority(c)).toBe('Low');
  });

  it('Medium when Update ETA in SAP', () => {
    // sapEta must be in the future so the overdue-ETA High branch does not trigger first
    const c = makeContainer({
      suggestedAction: 'Update ETA in SAP',
      reviewStatus: 'Action Required',
      normalizedSapStatus: 'IN_TRANSIT',
      sapEta: '2025-08-01',
    });
    expect(computePriority(c)).toBe('Medium');
  });
});

// ── sortContainers ────────────────────────────────────────────────────────────

describe('sortContainers', () => {
  it('sorts High before Medium before Low', () => {
    const containers = [
      makeContainer({ id: '1', priority: 'Low' }),
      makeContainer({ id: '2', priority: 'High' }),
      makeContainer({ id: '3', priority: 'Medium' }),
    ];
    const sorted = sortContainers(containers);
    expect(sorted.map(c => c.id)).toEqual(['2', '3', '1']);
  });

  it('sorts by SAP status within same priority', () => {
    const containers = [
      makeContainer({ id: '1', priority: 'High', normalizedSapStatus: 'IN_TRANSIT' }),
      makeContainer({ id: '2', priority: 'High', normalizedSapStatus: 'DISCHARGED' }),
    ];
    const sorted = sortContainers(containers);
    expect(sorted[0].id).toBe('2'); // DISCHARGED = 0, IN_TRANSIT = 2
  });

  it('does not mutate original array', () => {
    const orig = [makeContainer({ id: 'a', priority: 'Low' }), makeContainer({ id: 'b', priority: 'High' })];
    const sorted = sortContainers(orig);
    expect(orig[0].id).toBe('a');
    expect(sorted[0].id).toBe('b');
  });
});
