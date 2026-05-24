import type {
  ContainerRecord,
  ReviewStatus,
  SuggestedAction,
  Priority,
  SapStatus,
} from '../types';
import { differenceInDays, parseISO, isValid } from 'date-fns';

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return null;
    return differenceInDays(new Date(), d);
  } catch {
    return null;
  }
}

function isEtaOverdue(etaStr: string | null): boolean {
  if (!etaStr) return false;
  try {
    const d = parseISO(etaStr);
    if (!isValid(d)) return false;
    return differenceInDays(new Date(), d) > 0;
  } catch {
    return false;
  }
}

export interface DecisionResult {
  reviewStatus: ReviewStatus;
  suggestedAction: SuggestedAction;
  suggestedEventDate: string | null;
  reason: string;
}

export function computeDecision(record: ContainerRecord): DecisionResult {
  const sapStatus: SapStatus = record.normalizedSapStatus;
  const ce = record.carrierEvents;

  // Empty returned → completed, remove from active list
  if (sapStatus === 'EMPTY_RETURNED') {
    return {
      reviewStatus: 'Completed',
      suggestedAction: 'Close / completed',
      suggestedEventDate: null,
      reason: 'Container cycle is completed. Empty has been returned.',
    };
  }

  // No tracking data at all
  if (!record.trackingCheckedAt && !ce.dischargeDate && !ce.releaseDate && !ce.emptyReturnDate && !ce.currentStatus) {
    return {
      reviewStatus: 'Pending Review',
      suggestedAction: 'Review manually',
      suggestedEventDate: null,
      reason: 'No carrier tracking data available. Open carrier website to check.',
    };
  }

  if (sapStatus === 'IN_TRANSIT') {
    if (ce.dischargeDate) {
      return {
        reviewStatus: 'Action Required',
        suggestedAction: 'Add container discharged event',
        suggestedEventDate: ce.dischargeDate,
        reason: 'Carrier confirms container was discharged at destination port.',
      };
    }
    if (ce.eta && record.sapEta && ce.eta !== record.sapEta) {
      return {
        reviewStatus: 'Action Required',
        suggestedAction: 'Update ETA in SAP',
        suggestedEventDate: null,
        reason: `Carrier ETA (${ce.eta}) differs from SAP ETA (${record.sapEta}). Update ETA in SAP; do not add an event.`,
      };
    }
    if (isEtaOverdue(record.sapEta) && !ce.dischargeDate) {
      return {
        reviewStatus: 'Pending Review',
        suggestedAction: 'Review manually',
        suggestedEventDate: null,
        reason: 'SAP ETA has passed but no discharge event found. Check carrier website.',
      };
    }
    return {
      reviewStatus: 'No Update Required',
      suggestedAction: 'No update required',
      suggestedEventDate: null,
      reason: 'Container remains in transit and ETA has not changed.',
    };
  }

  if (sapStatus === 'DISCHARGED') {
    // Empty returned but no release date — intermediate event missing
    if (ce.emptyReturnDate && !ce.releaseDate) {
      return {
        reviewStatus: 'Pending Review',
        suggestedAction: 'Review manually',
        suggestedEventDate: null,
        reason:
          'Carrier shows empty return but release date was not found. Review manually — one or more intermediate events may be missing.',
      };
    }
    if (ce.emptyReturnDate && ce.releaseDate) {
      return {
        reviewStatus: 'Action Required',
        suggestedAction: 'Add container released event',
        suggestedEventDate: ce.releaseDate,
        reason:
          'Carrier shows both release and empty return. SAP is behind by multiple events. First add container released, then add empty returned.',
      };
    }
    if (ce.releaseDate) {
      return {
        reviewStatus: 'Action Required',
        suggestedAction: 'Add container released event',
        suggestedEventDate: ce.releaseDate,
        reason: 'Carrier confirms container was released/picked up by the customer.',
      };
    }
    return {
      reviewStatus: 'No Update Required',
      suggestedAction: 'No update required',
      suggestedEventDate: null,
      reason: 'Container is discharged but has not been released/picked up yet.',
    };
  }

  if (sapStatus === 'RELEASED') {
    if (ce.emptyReturnDate) {
      return {
        reviewStatus: 'Action Required',
        suggestedAction: 'Add empty returned event',
        suggestedEventDate: ce.emptyReturnDate,
        reason: 'Carrier confirms empty container was returned.',
      };
    }
    return {
      reviewStatus: 'No Update Required',
      suggestedAction: 'No update required',
      suggestedEventDate: null,
      reason: 'Container was released but empty return has not been confirmed yet.',
    };
  }

  return {
    reviewStatus: 'Pending Review',
    suggestedAction: 'Review manually',
    suggestedEventDate: null,
    reason: 'SAP status not recognized or cannot be matched.',
  };
}

export function computePriority(record: ContainerRecord): Priority {
  const { reviewStatus, suggestedAction, normalizedSapStatus } = record;
  const ce = record.carrierEvents;

  if (reviewStatus === 'Pending Review') return 'High';
  if (!record.bookingNumber) return 'High';

  if (normalizedSapStatus === 'DISCHARGED') {
    const days = daysSince(ce.dischargeDate ?? record.lastSapEventDate);
    if (days !== null && days > 5) return 'High';
  }

  if (normalizedSapStatus === 'RELEASED') {
    const days = daysSince(ce.releaseDate ?? record.lastSapEventDate);
    if (days !== null && days > 7) return 'High';
  }

  if (isEtaOverdue(record.sapEta) && normalizedSapStatus === 'IN_TRANSIT') return 'High';

  if (suggestedAction === 'Update ETA in SAP') return 'Medium';

  if (normalizedSapStatus === 'DISCHARGED') return 'Medium';

  const etaDays = daysSince(record.sapEta) ?? 0;
  if (etaDays > -4 && etaDays <= 0) return 'Medium'; // arriving in next 4 days

  if (reviewStatus === 'Completed') return 'Low';

  return 'Low';
}

const PRIORITY_ORDER: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
const STATUS_ORDER: Record<string, number> = {
  DISCHARGED: 0,
  RELEASED: 1,
  IN_TRANSIT: 2,
  EMPTY_RETURNED: 3,
  UNKNOWN: 4,
};

export function sortContainers(containers: ContainerRecord[]): ContainerRecord[] {
  return [...containers].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority];
    const pb = PRIORITY_ORDER[b.priority];
    if (pa !== pb) return pa - pb;

    const sa = STATUS_ORDER[a.normalizedSapStatus] ?? 9;
    const sb = STATUS_ORDER[b.normalizedSapStatus] ?? 9;
    if (sa !== sb) return sa - sb;

    // Older last event date first
    if (a.lastSapEventDate && b.lastSapEventDate) {
      return a.lastSapEventDate.localeCompare(b.lastSapEventDate);
    }
    return 0;
  });
}
