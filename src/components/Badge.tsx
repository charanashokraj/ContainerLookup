import { Zap } from 'lucide-react';
import type { Priority, ReviewStatus } from '../types';

const PRIORITY: Record<Priority, React.CSSProperties> = {
  High:   { background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' },
  Medium: { background: '#fffbeb', border: '1px solid #fcd34d', color: '#d97706' },
  Low:    { background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a' },
};

const STATUS: Record<ReviewStatus, React.CSSProperties> = {
  'Action Required':    { background: '#fff7ed', border: '1px solid #fdba74', color: '#ea580c' },
  'Pending Review':     { background: '#fefce8', border: '1px solid #fde047', color: '#ca8a04' },
  'No Update Required': { background: '#eff6ff', border: '1px solid #93c5fd', color: '#2563eb' },
  'Completed':          { background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a' },
  'Auto-Reviewed':      { background: '#ecfeff', border: '1px solid #67e8f9', color: '#0891b2' },
};

const DOT: Record<ReviewStatus, string> = {
  'Action Required':    '#ea580c',
  'Pending Review':     '#ca8a04',
  'No Update Required': '#2563eb',
  'Completed':          '#16a34a',
  'Auto-Reviewed':      '#0891b2',
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
