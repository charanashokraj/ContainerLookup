import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { v4 as uuid } from '../lib/uuid';
import type { ContainerRecord } from '../types';
import { normalizeSapStatus } from './eventNormalizer';
import { computeDecision, computePriority } from './decisionEngine';

// Flexible column header aliases — maps our internal field → possible column names in the SAP export
const COLUMN_ALIASES: Record<string, string[]> = {
  shipmentNumber: ['shipment number', 'shipment no', 'shipment no.', 'ship. no', 'ship no', 'shipment', 'shpmt no', 'shpmt number', 'shp no'],
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

/** Normalise any date string to YYYY-MM-DD (ISO).
 *  Handles: ISO, DD/MM/YYYY, MM/DD/YYYY, DD/MM/YY, MM/DD/YY */
function normaliseDate(raw: string): string {
  if (!raw) return '';
  const s = raw.trim();
  // Already ISO — leave alone
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // 4-digit year: M/D/YYYY or DD/MM/YYYY or DD-MM-YYYY
  const m4 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m4) {
    const [, a, b, y] = m4;
    // If a > 12 it must be the day (DD/MM/YYYY); otherwise assume DD/MM
    // If b > 12 it must be the day (MM/DD/YYYY)
    if (Number(b) > 12) {
      return `${y}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`; // MM/DD/YYYY
    }
    return `${y}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;   // DD/MM/YYYY
  }

  // 2-digit year: M/D/YY — treat as 20YY
  const m2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (m2) {
    const [, a, b, yy] = m2;
    const y = `20${yy}`;
    if (Number(b) > 12) {
      return `${y}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`; // MM/DD/YY
    }
    return `${y}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;   // DD/MM/YY
  }

  return s;
}

function mapRow(row: Record<string, string>, headers: string[]): ContainerRecord | null {
  const get = (field: string): string => {
    const col = findColumn(headers, field);
    return col ? (row[col] ?? '').trim() : '';
  };
  const getDate = (field: string) => normaliseDate(get(field));

  const shipmentNumber = get('shipmentNumber');
  const bookingNumber = get('bookingNumber');
  const containerNumber = get('containerNumber');

  if (!bookingNumber && !containerNumber) return null;

  const sapStatus = get('sapStatus');
  const normalizedSapStatus = normalizeSapStatus(sapStatus);

  const base: ContainerRecord = {
    id: uuid(),
    shipmentNumber,
    bookingNumber,
    containerNumber,
    carrier: get('carrier'),
    sapEta: getDate('sapEta'),
    sapStatus,
    lastSapEventDate: getDate('lastSapEventDate'),
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
    uploadedBy: '',
    sessionId: '',
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
