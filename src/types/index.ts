export type SapStatus =
  | 'IN_TRANSIT'
  | 'DISCHARGED'
  | 'RELEASED'
  | 'EMPTY_RETURNED'
  | 'UNKNOWN';

export type ReviewStatus =
  | 'No Update Required'
  | 'Action Required'
  | 'Pending Review'
  | 'Completed'
  | 'Auto-Reviewed';

export type Priority = 'High' | 'Medium' | 'Low';

export type SuggestedAction =
  | 'No update required'
  | 'Update ETA in SAP'
  | 'Add container discharged event'
  | 'Add container released event'
  | 'Add empty returned event'
  | 'Review manually'
  | 'Close / completed';

export interface CarrierEvents {
  dischargeDate: string | null;
  releaseDate: string | null;
  emptyReturnDate: string | null;
  currentStatus: string | null;
  eta: string | null;
  lastEventDescription: string | null;
  lastEventDate: string | null;
  // Location data from auto-tracking
  currentLocation: string | null;
  vesselName: string | null;
  portOfLoading: string | null;
  portOfDischarge: string | null;
}

export interface CheckHistoryEntry {
  id: string;
  checkedAt: string;
  checkedBy: string;
  sapStatus: string;
  carrierStatus: string;
  suggestedAction: SuggestedAction;
  notes: string;
}

export interface ContainerRecord {
  id: string;

  // SAP fields
  bookingNumber: string;
  containerNumber: string;
  carrier: string;
  sapEta: string;
  sapStatus: string;
  lastSapEventDate: string;
  destinationPort: string;
  customer: string;
  reference: string;
  vessel: string;
  pol: string;
  pod: string;

  // Carrier tracking fields (filled in manually or via tracking)
  carrierEta: string | null;
  carrierEvents: CarrierEvents;
  trackingSource: string | null;
  trackingCheckedAt: string | null;
  trackingCheckedBy: string | null;

  // System-computed fields
  normalizedSapStatus: SapStatus;
  reviewStatus: ReviewStatus;
  priority: Priority;
  suggestedAction: SuggestedAction;
  suggestedEventDate: string | null;
  reason: string;

  // User fields
  assignedTo: string;
  internalNotes: string;
  markedChecked: boolean;
  markedCheckedAt: string | null;

  // Manual overrides (user-set values that survive auto-recompute)
  manualPriority: Priority | null;         // non-null = user override; null = computed
  reviewStatusUserSet: boolean;            // true = user changed it; auto-tracking won't overwrite

  // Upload provenance
  uploadedBy: string;
  sessionId:  string;

  // History
  history: CheckHistoryEntry[];
}

export interface UploadSession {
  id: string;
  uploadedAt: string;
  filename: string;
  containerCount: number;
  uploadedBy: string;   // display name of the user who imported
}

export interface AppState {
  containers: ContainerRecord[];
  sessions: UploadSession[];
  currentUser: string;
}

export type FilterState = {
  carrier: string;
  customer: string;
  destination: string;
  status: ReviewStatus | '';
  priority: Priority | '';
  suggestedAction: SuggestedAction | '';
  search: string;
  etaFrom: string;
  etaTo: string;
  autoTrackedOnly: boolean;
  uploadedBy: string;
};
