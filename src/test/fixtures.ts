import type { ContainerRecord, CarrierEvents, SapStatus } from '../types';

export const EMPTY_CARRIER_EVENTS: CarrierEvents = {
  dischargeDate: null, releaseDate: null, emptyReturnDate: null,
  currentStatus: null, eta: null, lastEventDescription: null,
  lastEventDate: null, currentLocation: null, vesselName: null,
  portOfLoading: null, portOfDischarge: null,
};

export function makeContainer(overrides: Partial<ContainerRecord> = {}): ContainerRecord {
  return {
    id: 'test-id-001',
    shipmentNumber: 'SHP001',
    bookingNumber: 'BKG001',
    containerNumber: 'MSCU1234567',
    carrier: 'MSC',
    sapEta: '2025-06-01',
    sapStatus: 'IN_TRANSIT',
    lastSapEventDate: '2025-05-15',
    destinationPort: 'SYDNEY',
    customer: 'Acme Corp',
    reference: 'REF001',
    vessel: 'MSC VESSEL',
    pol: 'SHANGHAI',
    pod: 'SYDNEY',
    carrierEta: null,
    carrierEvents: { ...EMPTY_CARRIER_EVENTS },
    trackingSource: null,
    trackingCheckedAt: null,
    trackingCheckedBy: null,
    normalizedSapStatus: 'IN_TRANSIT',
    reviewStatus: 'No Update Required',
    priority: 'Low',
    suggestedAction: 'No update required',
    suggestedEventDate: null,
    reason: '',
    assignedTo: '',
    internalNotes: '',
    markedChecked: false,
    markedCheckedAt: null,
    manualPriority: null,
    reviewStatusUserSet: false,
    uploadedBy: 'Admin',
    sessionId: 'session-001',
    history: [],
    ...overrides,
  };
}

export function makeContainerWithStatus(status: SapStatus, carrierOverrides: Partial<CarrierEvents> = {}): ContainerRecord {
  return makeContainer({
    normalizedSapStatus: status,
    sapStatus: status,
    carrierEvents: { ...EMPTY_CARRIER_EVENTS, ...carrierOverrides },
    trackingCheckedAt: new Date().toISOString(),
  });
}
