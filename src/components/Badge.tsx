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
};

const DOT: Record<ReviewStatus, string> = {
  'Action Required':    '#fb923c',
  'Pending Review':     '#facc15',
  'No Update Required': '#60a5fa',
  'Completed':          '#4ade80',
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={PRIORITY[priority]}>
      {priority}
    </span>
  );
}

export function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap" style={STATUS[status]}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: DOT[status] }} />
      {status}
    </span>
  );
}
