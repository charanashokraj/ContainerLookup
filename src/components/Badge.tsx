import { Zap } from 'lucide-react';
import type { Priority, ReviewStatus } from '../types';

const PRIORITY: Record<Priority, React.CSSProperties> = {
  High:   { background: 'rgba(239,68,68,0.12)',  border: '1px solid rgba(239,68,68,0.3)',  color: '#f87171' },
  Medium: { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' },
  Low:    { background: 'rgba(34,197,94,0.10)',  border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' },
};

const STATUS: Record<ReviewStatus, React.CSSProperties> = {
  'Action Required':    { background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', color: '#fb923c' },
  'Pending Review':     { background: 'rgba(234,179,8,0.12)',  border: '1px solid rgba(234,179,8,0.3)',  color: '#facc15' },
  'No Update Required': { background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' },
  'Completed':          { background: 'rgba(34,197,94,0.12)',  border: '1px solid rgba(34,197,94,0.3)',  color: '#4ade80' },
  'Auto-Reviewed':      { background: 'rgba(6,182,212,0.12)',  border: '1px solid rgba(6,182,212,0.3)',  color: '#22d3ee' },
};

const DOT: Record<ReviewStatus, string> = {
  'Action Required':    '#fb923c',
  'Pending Review':     '#facc15',
  'No Update Required': '#60a5fa',
  'Completed':          '#4ade80',
  'Auto-Reviewed':      '#22d3ee',
};

interface PriorityBadgeProps {
  priority: Priority;
  isManual?: boolean;
  onClick?: () => void;
}

export function PriorityBadge({ priority, isManual, onClick }: PriorityBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{
        ...PRIORITY[priority],
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
      onClick={onClick}
      title={isManual ? 'Priority manually set — click to change' : 'Click to override priority'}
    >
      {isManual && <span style={{ fontSize: 8, opacity: 0.8 }}>●</span>}
      {priority}
      {onClick && <span style={{ opacity: 0.5, fontSize: 9 }}>▾</span>}
    </span>
  );
}

interface StatusBadgeProps {
  status: ReviewStatus;
  isUserSet?: boolean;
  onClick?: () => void;
}

export function StatusBadge({ status, isUserSet, onClick }: StatusBadgeProps) {
  const isAuto = status === 'Auto-Reviewed';
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
      style={{
        ...STATUS[status],
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
      onClick={onClick}
      title={
        isAuto
          ? 'Status auto-verified by API — click to override'
          : isUserSet
          ? 'Manually set — click to change'
          : 'Click to set review status'
      }
    >
      {isAuto
        ? <Zap size={10} className="flex-shrink-0" />
        : <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: DOT[status] }} />
      }
      {status}
      {onClick && <span style={{ opacity: 0.5, fontSize: 9 }}>▾</span>}
    </span>
  );
}
