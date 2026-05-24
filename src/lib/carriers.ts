export interface CarrierConfig {
  name: string;
  aliases: string[];
  trackingUrl: (booking: string, container: string) => string;
  searchKey: 'booking' | 'container' | 'both';
  hint: string; // what to look for on their site
}

export const CARRIER_CONFIGS: CarrierConfig[] = [
  {
    name: 'Maersk',
    aliases: ['maersk', 'maerskline', 'maersk line'],
    trackingUrl: (booking) =>
      `https://www.maersk.com/tracking/${encodeURIComponent(booking)}`,
    searchKey: 'both',
    hint: 'Look for "Milestones" or "Events" tab. Note the latest event, ETA, and any discharge/gate-out dates.',
  },
  {
    name: 'CMA CGM',
    aliases: ['cma cgm', 'cmacgm', 'cma-cgm', 'cma'],
    trackingUrl: (booking) =>
      `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=BL&Reference=${encodeURIComponent(booking)}&search=true`,
    searchKey: 'both',
    hint: 'Click "Track" then check the event history for discharge, release, and empty return dates.',
  },
  {
    name: 'ANL',
    aliases: ['anl'],
    trackingUrl: (booking) =>
      `https://www.anl.com.au/ebusiness/tracking/search?SearchBy=BL&Reference=${encodeURIComponent(booking)}&search=true`,
    searchKey: 'both',
    hint: 'ANL shares the CMA CGM platform. Check event history for discharge and release dates.',
  },
  {
    name: 'MSC',
    aliases: ['msc', 'mediterranean shipping'],
    trackingUrl: (booking) =>
      `https://www.msc.com/track-a-shipment?agencyPath=mwi&trackingNumber=${encodeURIComponent(booking)}`,
    searchKey: 'both',
    hint: 'Note the "Last Event" and "ETA" shown at the top. Scroll down for the full event timeline.',
  },
  {
    name: 'ONE',
    aliases: ['one', 'ocean network express'],
    trackingUrl: (booking) =>
      `https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?tno=${encodeURIComponent(booking)}&type=BOOKING`,
    searchKey: 'both',
    hint: 'Check "Container Status" section for discharge at POD, gate-out, and empty return events.',
  },
  {
    name: 'Hapag-Lloyd',
    aliases: ['hapag', 'hapag-lloyd', 'hapag lloyd', 'hlag', 'hlcl'],
    trackingUrl: (_booking, container) =>
      `https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html?container=${encodeURIComponent(container)}`,
    searchKey: 'container',
    hint: 'Hapag-Lloyd tracks by container number. Check the event list for discharge, gate-out, and empty return.',
  },
  {
    name: 'Evergreen',
    aliases: ['evergreen', 'emc', 'evergreen line'],
    trackingUrl: (booking) =>
      `https://www.evergreen-line.com/egl/tracking?blno=${encodeURIComponent(booking)}`,
    searchKey: 'both',
    hint: 'Look for "Container Status" and the event timeline showing discharge and gate-out dates.',
  },
  {
    name: 'Yang Ming',
    aliases: ['yang ming', 'yangming', 'yml'],
    trackingUrl: (booking) =>
      `https://www.yangming.com/e-service/Track_Trace/track_trace_cargo_tracking.aspx?number=${encodeURIComponent(booking)}`,
    searchKey: 'both',
    hint: 'Check the cargo tracking events list for discharge, release, and empty return milestones.',
  },
  {
    name: 'COSCO',
    aliases: ['cosco', 'cosco shipping'],
    trackingUrl: (booking) =>
      `https://elines.coscoshipping.com/ebusiness/cargoTracking?trackingType=BOOKING&number=${encodeURIComponent(booking)}`,
    searchKey: 'both',
    hint: 'Check container status milestones for discharge, delivery, and empty return events.',
  },
  {
    name: 'PIL',
    aliases: ['pil', 'pacific international lines'],
    trackingUrl: (booking) =>
      `https://www.pilship.com/en/track-trace/booking/${encodeURIComponent(booking)}`,
    searchKey: 'both',
    hint: 'Note the latest milestone and any port event dates shown in the tracking timeline.',
  },
];

export function getCarrierConfig(carrierName: string): CarrierConfig | null {
  const normalized = carrierName.toLowerCase().trim();
  return (
    CARRIER_CONFIGS.find((c) =>
      c.aliases.some((alias) => normalized.includes(alias))
    ) ?? null
  );
}

export function getTrackingUrl(
  carrierName: string,
  bookingNumber: string,
  containerNumber: string = ''
): string | null {
  const config = getCarrierConfig(carrierName);
  if (!config) return null;
  // Prefer booking number; fall back to container number
  const key = bookingNumber || containerNumber;
  if (!key) return null;
  return config.trackingUrl(bookingNumber, containerNumber);
}

export function getCarrierHint(carrierName: string): string {
  return (
    getCarrierConfig(carrierName)?.hint ??
    'Open the carrier website and search for this booking/container number. Note any discharge, release, or ETA changes.'
  );
}
