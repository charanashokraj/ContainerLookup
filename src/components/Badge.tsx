import { cn } from '../lib/cn';
import type { Priority, ReviewStatus } from '../types';

const priorityStyles: Record<Priority, string> = {
  High: 'bg-red-100 text-red-800 border border-red-200',
  Medium: 'bg-amber-100 text-amber-800 border border-amber-200',
  Low: 'bg-green-100 text-green-800 border border-green-200',
};

const statusStyles: Record<ReviewStatus, string> = {
  'Action Required': 'bg-orange-100 text-orange-800 border border-orange-200',
  'Pending Review': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  'No Update Required': 'bg-blue-100 text-blue-800 border border-blue-200',
  Completed: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold',
        priorityStyles[priority]
      )}
    >
      {priority}
    </span>
  );
}

export function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        statusStyles[status]
      )}
    >
      {status}
    </span>
  );
}
