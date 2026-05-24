import {
  Package, Ship, Anchor, PackageCheck,
  AlertTriangle, Clock, RefreshCw, CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { ContainerRecord } from '../types';

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}
function cnt(containers: ContainerRecord[], pred: (c: ContainerRecord) => boolean) {
  return containers.filter(pred).length;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface CardDef {
  icon:   React.ElementType;
  label:  string;
  value:  number;
  total?: number;
  accent: string;   // CSS colour for glow / icon bg
  glow?:  boolean;  // larger outer glow for critical cards
  textAccent?: string;
}

function StatCard({ icon: Icon, label, value, total, accent, glow, textAccent }: CardDef) {
  const frac = total ? pct(value, total) : null;
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 transition-all duration-300 group"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: `1px solid ${glow ? accent + '55' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: glow ? `0 0 30px ${accent}25, inset 0 1px 0 rgba(255,255,255,0.05)` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = accent + '66'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = glow ? accent + '55' : 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = ''; }}
    >
      {/* Subtle corner glow */}
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none transition-opacity duration-300"
        style={{ background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)` }} />

      <div className="flex items-start justify-between">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}18`, border: `1px solid ${accent}35` }}>
          <Icon size={18} style={{ color: accent }} strokeWidth={2} />
        </div>

        {/* Percentage pill */}
        {frac !== null && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}>
            {frac}%
          </span>
        )}
      </div>

      {/* Value */}
      <div>
        <p className="text-3xl font-extrabold tracking-tight"
          style={{ color: textAccent ?? 'white' }}>
          {value}
        </p>
        <p className="text-xs mt-0.5 leading-snug" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {label}
        </p>
      </div>

      {/* Progress bar */}
      {frac !== null && (
        <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${frac}%`, background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />
        </div>
      )}
    </div>
  );
}

// ── Status distribution mini-bar ───────────────────────────────────────────────

function StatusBar({ containers }: { containers: ContainerRecord[] }) {
  const total = containers.length;
  if (total === 0) return null;

  const segments = [
    { label: 'Action Required',    color: '#f97316', n: cnt(containers, c => c.reviewStatus === 'Action Required') },
    { label: 'Pending Review',     color: '#eab308', n: cnt(containers, c => c.reviewStatus === 'Pending Review') },
    { label: 'No Update Required', color: '#3b82f6', n: cnt(containers, c => c.reviewStatus === 'No Update Required') },
    { label: 'Completed',          color: '#22c55e', n: cnt(containers, c => c.reviewStatus === 'Completed') },
  ];

  return (
    <div className="rounded-2xl p-5 col-span-full"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
          <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Status Distribution</span>
        </div>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{total} containers total</span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-3">
        {segments.map(s => s.n > 0 && (
          <div key={s.label}
            style={{ width: `${pct(s.n, total)}%`, background: s.color, minWidth: 4, borderRadius: 2 }} />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {s.label} <span className="font-semibold" style={{ color: 'white' }}>{s.n}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export function Dashboard() {
  const containers = useStore(s => s.containers);
  const total      = containers.length;

  if (total === 0) return null;

  const stats: CardDef[] = [
    {
      icon:   AlertTriangle,
      label:  'Action Required',
      value:  cnt(containers, c => c.reviewStatus === 'Action Required'),
      total,
      accent: '#f97316',
      glow:   cnt(containers, c => c.reviewStatus === 'Action Required') > 0,
      textAccent: cnt(containers, c => c.reviewStatus === 'Action Required') > 0 ? '#fb923c' : 'white',
    },
    {
      icon:   Clock,
      label:  'Pending Review',
      value:  cnt(containers, c => c.reviewStatus === 'Pending Review'),
      total,
      accent: '#eab308',
      glow:   cnt(containers, c => c.reviewStatus === 'Pending Review') > 0,
    },
    {
      icon:   Ship,
      label:  'In Transit',
      value:  cnt(containers, c => c.normalizedSapStatus === 'IN_TRANSIT'),
      total,
      accent: '#3b82f6',
    },
    {
      icon:   Anchor,
      label:  'Discharged',
      value:  cnt(containers, c => c.normalizedSapStatus === 'DISCHARGED'),
      total,
      accent: '#a855f7',
    },
    {
      icon:   PackageCheck,
      label:  'Released',
      value:  cnt(containers, c => c.normalizedSapStatus === 'RELEASED'),
      total,
      accent: '#06b6d4',
    },
    {
      icon:   RefreshCw,
      label:  'ETA Changed',
      value:  cnt(containers, c => c.suggestedAction === 'Update ETA in SAP'),
      total,
      accent: '#f43f5e',
    },
    {
      icon:   CheckCircle2,
      label:  'Completed',
      value:  cnt(containers, c => c.reviewStatus === 'Completed'),
      total,
      accent: '#22c55e',
    },
    {
      icon:   Package,
      label:  'Total Active',
      value:  cnt(containers, c => c.reviewStatus !== 'Completed'),
      accent: '#8b5cf6',
    },
  ];

  return (
    <div className="mb-6 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <StatusBar containers={containers} />
    </div>
  );
}
