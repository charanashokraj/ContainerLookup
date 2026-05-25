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
      className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 transition-all duration-300"
      style={{
        background: '#ffffff',
        border: `1px solid ${glow ? accent + '55' : '#e2e8f0'}`,
        boxShadow: glow
          ? `0 4px 20px ${accent}20, 0 1px 3px rgba(0,0,0,0.08)`
          : '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = glow ? `0 8px 30px ${accent}25` : '0 4px 12px rgba(0,0,0,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = glow ? `0 4px 20px ${accent}20` : '0 1px 3px rgba(0,0,0,0.06)'; }}
    >
      {/* Subtle corner tint */}
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accent}15 0%, transparent 70%)` }} />

      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}12`, border: `1px solid ${accent}30` }}>
          <Icon size={18} style={{ color: accent }} strokeWidth={2} />
        </div>
        {frac !== null && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${accent}12`, color: accent, border: `1px solid ${accent}25` }}>
            {frac}%
          </span>
        )}
      </div>

      <div>
        <p className="text-3xl font-extrabold tracking-tight"
          style={{ color: textAccent ?? '#0f172a' }}>
          {value}
        </p>
        <p className="text-xs mt-0.5 leading-snug font-medium" style={{ color: '#64748b' }}>
          {label}
        </p>
      </div>

      {frac !== null && (
        <div className="h-1.5 rounded-full" style={{ background: '#f1f5f9' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${frac}%`, background: `linear-gradient(90deg, ${accent}, ${accent}99)` }} />
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
      style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} style={{ color: '#64748b' }} />
          <span className="text-xs font-semibold" style={{ color: '#475569' }}>Status Distribution</span>
        </div>
        <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>{total} containers total</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-3">
        {segments.map(s => s.n > 0 && (
          <div key={s.label}
            style={{ width: `${pct(s.n, total)}%`, background: s.color, minWidth: 4, borderRadius: 2 }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-xs" style={{ color: '#64748b' }}>
              {s.label} <span className="font-semibold" style={{ color: '#0f172a' }}>{s.n}</span>
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
      textAccent: cnt(containers, c => c.reviewStatus === 'Action Required') > 0 ? '#ea580c' : '#0f172a',
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
