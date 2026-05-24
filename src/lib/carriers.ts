export interface CarrierConfig {
  name: string;
  aliases: string[];
  trackingUrl: (bookingOrContainer: string) => string;
  searchKey: 'booking' | 'container' | 'both';
}

export const CARRIER_CONFIGS: CarrierConfig[] = [
  {
    name: 'CMA CGM',
    aliases: ['cma cgm', 'cmacgm', 'cma'],
    trackingUrl: (b) =>
      `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=BL&Reference=${encodeURIComponent(b)}`,
    searchKey: 'both',
  },
  {
    name: 'ANL',
    aliases: ['anl'],
    trackingUrl: (b) =>
      `https://www.anl.com.au/ebusiness/tracking/search?SearchBy=BL&Reference=${encodeURIComponent(b)}`,
    searchKey: 'both',
  },
  {
    name: 'MSC',
    aliases: ['msc'],
    trackingUrl: (b) =>
      `https://www.msc.com/en/track-a-shipment?agencyPath=mwi&trackingNumber=${encodeURIComponent(b)}`,
    searchKey: 'both',
  },
  {
    name: 'ONE',
    aliases: ['one', 'ocean network express'],
    trackingUrl: (b) =>
      `https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?tno=${encodeURIComponent(b)}`,
    searchKey: 'both',
  },
  {
    name: 'Maersk',
    aliases: ['maersk', 'maerskline'],
    trackingUrl: (b) =>
      `https://www.maersk.com/tracking/${encodeURIComponent(b)}`,
    searchKey: 'both',
  },
  {
    name: 'Hapag-Lloyd',
    aliases: ['hapag', 'hapag-lloyd', 'hapag lloyd', 'hlag'],
    trackingUrl: (b) =>
      `https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html?container=${encodeURIComponent(b)}`,
    searchKey: 'both',
  },
  {
    name: 'Evergreen',
    aliases: ['evergreen', 'emc'],
    trackingUrl: (b) =>
      `https://www.evergreen-line.com/egl/tracking?blno=${encodeURIComponent(b)}`,
    searchKey: 'both',
  },
  {
    name: 'Yang Ming',
    aliases: ['yang ming', 'yangming', 'yml'],
    trackingUrl: (b) =>
      `https://www.yangming.com/e-service/Track_Trace/track_trace_cargo_tracking.aspx?number=${encodeURIComponent(b)}`,
    searchKey: 'both',
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
  bookingNumber: string
): string | null {
  const config = getCarrierConfig(carrierName);
  if (!config) return null;
  return config.trackingUrl(bookingNumber);
}
