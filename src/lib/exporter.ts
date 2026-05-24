import * as XLSX from 'xlsx';
import type { ContainerRecord } from '../types';

export function exportSapUpdateReport(containers: ContainerRecord[]): void {
  const actionable = containers.filter(
    (c) => c.reviewStatus === 'Action Required' || c.reviewStatus === 'Pending Review'
  );

  const rows = actionable.map((c) => ({
    'Container Number': c.containerNumber,
    'Booking Number': c.bookingNumber,
    Carrier: c.carrier,
    Customer: c.customer,
    Destination: c.destinationPort,
    'SAP Status': c.sapStatus,
    'Carrier Status': c.carrierEvents.currentStatus ?? '',
    'Suggested Action': c.suggestedAction,
    'Event Date': c.suggestedEventDate ?? '',
    'SAP ETA': c.sapEta,
    'Carrier ETA': c.carrierEta ?? '',
    Priority: c.priority,
    'Review Status': c.reviewStatus,
    Reason: c.reason,
    'Assigned To': c.assignedTo,
    'Last Checked': c.trackingCheckedAt ?? '',
    Notes: c.internalNotes,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'SAP Updates');

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `SAP_Update_Report_${date}.xlsx`);
}

export function exportFullReport(containers: ContainerRecord[]): void {
  const rows = containers.map((c) => ({
    Priority: c.priority,
    'Container Number': c.containerNumber,
    'Booking Number': c.bookingNumber,
    Carrier: c.carrier,
    Customer: c.customer,
    Destination: c.destinationPort,
    'SAP Status': c.sapStatus,
    'SAP ETA': c.sapEta,
    'Carrier ETA': c.carrierEta ?? '',
    'Last SAP Event Date': c.lastSapEventDate,
    'Carrier Last Event': c.carrierEvents.lastEventDescription ?? '',
    'Carrier Last Event Date': c.carrierEvents.lastEventDate ?? '',
    'Suggested Action': c.suggestedAction,
    'Review Status': c.reviewStatus,
    Reason: c.reason,
    'Last Checked': c.trackingCheckedAt ?? '',
    'Assigned To': c.assignedTo,
    Notes: c.internalNotes,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'All Containers');

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Container_Tracking_Report_${date}.xlsx`);
}
