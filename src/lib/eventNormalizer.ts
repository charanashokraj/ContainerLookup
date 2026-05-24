import type { CarrierEvents, SapStatus } from '../types';

// Maps raw carrier event text → standardized event bucket
const EVENT_MAPPINGS: { keywords: string[]; bucket: keyof CarrierEvents }[] = [
  {
    keywords: [
      'discharged',
      'import discharged',
      'discharged at pod',
      'unloaded',
      'vessel discharged',
    ],
    bucket: 'dischargeDate',
  },
  {
    keywords: [
      'gate out',
      'full container gate out',
      'picked up',
      'import release',
      'container released',
      'delivery order',
      'full out',
    ],
    bucket: 'releaseDate',
  },
  {
    keywords: [
      'empty return',
      'empty returned',
      'empty container returned',
      'gate in empty',
      'empty in',
      'return empty',
    ],
    bucket: 'emptyReturnDate',
  },
];

// These are ambiguous — do NOT auto-classify as released
const AMBIGUOUS_RELEASE_TERMS = ['available for delivery', 'available', 'customs cleared'];

export interface RawCarrierEvent {
  description: string;
  date: string;
}

export function normalizeCarrierEvents(events: RawCarrierEvent[]): CarrierEvents {
  const result: CarrierEvents = {
    dischargeDate: null,
    releaseDate: null,
    emptyReturnDate: null,
    currentStatus: null,
    eta: null,
    lastEventDescription: null,
    lastEventDate: null,
    currentLocation: null,
    vesselName: null,
    portOfLoading: null,
    portOfDischarge: null,
  };

  for (const event of events) {
    const text = event.description.toLowerCase();

    // Check ambiguous terms — skip auto-classification
    if (AMBIGUOUS_RELEASE_TERMS.some((t) => text.includes(t))) {
      continue;
    }

    for (const mapping of EVENT_MAPPINGS) {
      if (mapping.keywords.some((kw) => text.includes(kw))) {
        const field = mapping.bucket;
        // Keep earliest discharge, earliest release, earliest empty return
        if (!result[field] || event.date < (result[field] as string)) {
          (result[field] as string | null) = event.date;
        }
      }
    }
  }

  if (events.length > 0) {
    const last = events[events.length - 1];
    result.lastEventDescription = last.description;
    result.lastEventDate = last.date;
    result.currentStatus = last.description;
  }

  return result;
}

export function normalizeSapStatus(raw: string): SapStatus {
  const text = raw.toLowerCase().trim();
  if (
    text.includes('in transit') ||
    text.includes('intransit') ||
    text.includes('shipped') ||
    text.includes('on board') ||
    text.includes('loaded')
  ) {
    return 'IN_TRANSIT';
  }
  if (
    text.includes('discharged') ||
    text.includes('arrived') ||
    text.includes('port arrival')
  ) {
    return 'DISCHARGED';
  }
  if (
    text.includes('released') ||
    text.includes('picked up') ||
    text.includes('gate out') ||
    text.includes('delivered')
  ) {
    return 'RELEASED';
  }
  if (
    text.includes('empty') ||
    text.includes('returned') ||
    text.includes('gate in')
  ) {
    return 'EMPTY_RETURNED';
  }
  return 'UNKNOWN';
}
