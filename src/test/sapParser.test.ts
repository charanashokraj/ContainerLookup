import { describe, it, expect } from 'vitest';
import { parseFile } from '../lib/sapParser';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFile(content: string, filename: string): File {
  return new File([content], filename, { type: 'text/csv' });
}

const CSV_HEADERS = 'Booking Number,Container Number,Shipping Line,SAP ETA,Current SAP Status,Last Event Date,Destination Port,Customer,Contract';

// ── parseCsv via parseFile ─────────────────────────────────────────────────────

describe('parseFile — CSV parsing', () => {
  it('parses a valid CSV row into a ContainerRecord', async () => {
    const csv = [
      CSV_HEADERS,
      'BKG001,MSCU1234567,MSC,2027-06-01,IN TRANSIT,2026-05-01,SYDNEY,Acme Corp,REF001',
    ].join('\n');

    const records = await parseFile(makeFile(csv, 'containers.csv'));
    expect(records).toHaveLength(1);

    const r = records[0];
    expect(r.bookingNumber).toBe('BKG001');
    expect(r.containerNumber).toBe('MSCU1234567');
    expect(r.carrier).toBe('MSC');
    expect(r.sapEta).toBe('2027-06-01');
    expect(r.customer).toBe('Acme Corp');
    expect(r.reference).toBe('REF001');
    expect(r.id).toBeTruthy();
  });

  it('normalises SAP status to IN_TRANSIT', async () => {
    const csv = [CSV_HEADERS, 'BKG002,MSCU2222222,MSC,2027-07-01,IN TRANSIT,,SYDNEY,,'].join('\n');
    const records = await parseFile(makeFile(csv, 'test.csv'));
    expect(records[0].normalizedSapStatus).toBe('IN_TRANSIT');
  });

  it('normalises SAP status to DISCHARGED', async () => {
    const csv = [CSV_HEADERS, 'BKG003,MSCU3333333,MSC,2026-01-01,DISCHARGED,,SYDNEY,,'].join('\n');
    const records = await parseFile(makeFile(csv, 'test.csv'));
    expect(records[0].normalizedSapStatus).toBe('DISCHARGED');
  });

  it('normalises SAP status to RELEASED', async () => {
    const csv = [CSV_HEADERS, 'BKG004,MSCU4444444,MSC,2026-01-01,RELEASED,,SYDNEY,,'].join('\n');
    const records = await parseFile(makeFile(csv, 'test.csv'));
    expect(records[0].normalizedSapStatus).toBe('RELEASED');
  });

  it('normalises SAP status to EMPTY_RETURNED', async () => {
    const csv = [CSV_HEADERS, 'BKG005,MSCU5555555,MSC,2026-01-01,EMPTY RETURNED,,SYDNEY,,'].join('\n');
    const records = await parseFile(makeFile(csv, 'test.csv'));
    expect(records[0].normalizedSapStatus).toBe('EMPTY_RETURNED');
  });

  it('skips rows with no booking number and no container number', async () => {
    const csv = [CSV_HEADERS, ',,,,,,,Acme Corp,'].join('\n');
    const records = await parseFile(makeFile(csv, 'test.csv'));
    expect(records).toHaveLength(0);
  });

  it('parses multiple rows', async () => {
    const csv = [
      CSV_HEADERS,
      'BKG001,MSCU1111111,MSC,2027-06-01,IN TRANSIT,,SYDNEY,A,',
      'BKG002,MSCU2222222,CMA CGM,2027-07-01,DISCHARGED,,MELBOURNE,B,',
      'BKG003,MSCU3333333,Maersk,2027-08-01,RELEASED,,BRISBANE,C,',
    ].join('\n');
    const records = await parseFile(makeFile(csv, 'multi.csv'));
    expect(records).toHaveLength(3);
    expect(records[0].bookingNumber).toBe('BKG001');
    expect(records[1].carrier).toBe('CMA CGM');
    expect(records[2].normalizedSapStatus).toBe('RELEASED');
  });

  it('applies column aliases — "Booking No" works as booking number', async () => {
    const csv = [
      'Booking No,Container Number,Shipping Line,SAP ETA,SAP Status,Last Event Date,Destination Port,Customer,Contract',
      'ALIAS001,MSCU9999999,MSC,2027-01-01,IN TRANSIT,,SYDNEY,,',
    ].join('\n');
    const records = await parseFile(makeFile(csv, 'alias.csv'));
    expect(records[0].bookingNumber).toBe('ALIAS001');
  });

  it('applies column aliases — "BL Number" maps to bookingNumber', async () => {
    const csv = [
      'BL Number,Container No,Carrier,ETA,Status,Event Date,Pod,Customer,Reference',
      'BL12345,MSCU8888888,Hapag-Lloyd,2027-02-01,IN TRANSIT,,SYDNEY,,',
    ].join('\n');
    const records = await parseFile(makeFile(csv, 'bl.csv'));
    expect(records[0].bookingNumber).toBe('BL12345');
  });

  it('initialises carrier tracking fields as null', async () => {
    const csv = [CSV_HEADERS, 'BKG-INIT,MSCU0000001,MSC,2027-06-01,IN TRANSIT,,SYDNEY,,'].join('\n');
    const [r] = await parseFile(makeFile(csv, 'init.csv'));
    expect(r.carrierEta).toBeNull();
    expect(r.trackingCheckedAt).toBeNull();
    expect(r.trackingSource).toBeNull();
    expect(r.carrierEvents.dischargeDate).toBeNull();
    expect(r.manualPriority).toBeNull();
    expect(r.uploadedBy).toBe('');
    expect(r.sessionId).toBe('');
  });

  it('computes initial reviewStatus and priority', async () => {
    const csv = [CSV_HEADERS, 'BKG-PRIO,MSCU0000002,MSC,2027-06-01,IN TRANSIT,,SYDNEY,,'].join('\n');
    const [r] = await parseFile(makeFile(csv, 'prio.csv'));
    // No carrier data and no trackingCheckedAt → Pending Review / High
    expect(r.reviewStatus).toBe('Pending Review');
    expect(r.priority).toBe('High');
  });
});

describe('parseFile — unsupported type', () => {
  it('throws for unsupported file extensions', async () => {
    const file = new File(['data'], 'report.pdf', { type: 'application/pdf' });
    await expect(parseFile(file)).rejects.toThrow('Unsupported file type');
  });
});
