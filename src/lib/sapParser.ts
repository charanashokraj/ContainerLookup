import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { v4 as uuid } from '../lib/uuid';
import type { ContainerRecord } from '../types';
import { normalizeSapStatus } from './eventNormalizer';
import { computeDecision, computePriority } from './decisionEngine';

// Flexible column header aliases — maps our internal field → possible column names in the SAP export
const COLUMN_ALIASES: Record<string, string[]> = {
  bookingNumber: ['booking number', 'booking no', 'booking', 'bl number', 'bl no', 'b/l'],
  containerNumber: ['container number', 'container no', 'container', 'cntr', 'cntr no'],
  carrier: ['shipping line', 'carrier', 'line', 'shipping line / carrier'],
  sapEta: ['sap eta', 'eta', 'estimated arrival', 'arrival date'],
  sapStatus: ['current sap status', 'sap status', 'status', 'last status', 'event'],
  lastSapEventDate: ['last event date', 'last event', 'event date', 'last sap event date'],
  destinationPort: ['destination port', 'destination', 'pod', 'discharge port', 'port of discharge'],
  customer: ['customer', 'importer', 'customer / importer', 'consignee'],
  reference: ['contract', 'reference', 'contract / reference', 'shipment ref'],
  vessel: ['vessel', 'vessel / voyage', 'ship'],
  pol: ['pol', 'port of loading', 'loading port'],
  pod: ['pod', 'port of discharge'],
};

function findColumn(headers: string[], field: string): string | null {
  const aliases = COLUMN_ALIASES[field] ?? [];
  for (const alias of aliases) {
    const found = headers.find((h) => h.toLowerCase().trim() === alias);
    if (found) return found;
  }
  return null;
}

function mapRow(row: Record<string, string>, headers: string[]): ContainerRecord | null {
  const get = (field: string): string => {
    const col = findColumn(headers, field);
    return col ? (row[col] ?? '').trim() : '';
  };

  const bookingNumber = get('bookingNumber');
  const containerNumber = get('containerNumber');

  if (!bookingNumber && !containerNumber) return null;

  const sapStatus = get('sapStatus');
  const normalizedSapStatus = normalizeSapStatus(sapStatus);

  const base: ContainerRecord = {
    id: uuid(),
    bookingNumber,
    containerNumber,
    carrier: get('carrier'),
    sapEta: get('sapEta'),
    sapStatus,
    lastSapEventDate: get('lastSapEventDate'),
    destinationPort: get('destinationPort'),
    customer: get('customer'),
    reference: get('reference'),
    vessel: get('vessel'),
    pol: get('pol'),
    pod: get('pod'),

    carrierEta: null,
    carrierEvents: {
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
    },
    trackingSource: null,
    trackingCheckedAt: null,
    trackingCheckedBy: null,

    normalizedSapStatus,
    reviewStatus: 'Pending Review',
    priority: 'Low',
    suggestedAction: 'Review manually',
    suggestedEventDate: null,
    reason: '',

    assignedTo: '',
    internalNotes: '',
    markedChecked: false,
    markedCheckedAt: null,
    manualPriority: null,
    reviewStatusUserSet: false,
    history: [],
  };

  const decision = computeDecision(base);
  base.reviewStatus = decision.reviewStatus;
  base.suggestedAction = decision.suggestedAction;
  base.suggestedEventDate = decision.suggestedEventDate;
  base.reason = decision.reason;
  base.priority = computePriority(base);

  return base;
}

export async function parseCsv(file: File): Promise<ContainerRecord[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields ?? [];
        const records = results.data
          .map((row) => mapRow(row, headers))
          .filter((r): r is ContainerRecord => r !== null);
        resolve(records);
      },
      error(err) {
        reject(err);
      },
    });
  });
}

export async function parseExcel(file: File): Promise<ContainerRecord[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    raw: false,
    dateNF: 'yyyy-mm-dd',
  });
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  return rows
    .map((row) => mapRow(row, headers))
    .filter((r): r is ContainerRecord => r !== null);
}

export async function parseFile(file: File): Promise<ContainerRecord[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return parseCsv(file);
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseExcel(file);
  throw new Error('Unsupported file type. Please upload a CSV or Excel (.xlsx/.xls) file.');
}
