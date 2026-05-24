import {
  Package,
  Ship,
  Anchor,
  PackageCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { ContainerRecord } from '../types';

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function count(containers: ContainerRecord[], pred: (c: ContainerRecord) => boolean) {
  return containers.filter(pred).length;
}

export function Dashboard() {
  const containers = useStore((s) => s.containers);

  const stats = [
    {
      icon: Package,
      label: 'Total Active',
      value: count(containers, (c) => c.reviewStatus !== 'Completed'),
      color: 'bg-slate-600',
    },
    {
      icon: Ship,
      label: 'In Transit',
      value: count(containers, (c) => c.normalizedSapStatus === 'IN_TRANSIT'),
      color: 'bg-blue-500',
    },
    {
      icon: Anchor,
      label: 'Discharged – Pending Release',
      value: count(
        containers,
        (c) => c.normalizedSapStatus === 'DISCHARGED'
      ),
      color: 'bg-amber-500',
    },
    {
      icon: PackageCheck,
      label: 'Released – Pending Empty Return',
      value: count(containers, (c) => c.normalizedSapStatus === 'RELEASED'),
      color: 'bg-purple-500',
    },
    {
      icon: AlertTriangle,
      label: 'Action Required',
      value: count(containers, (c) => c.reviewStatus === 'Action Required'),
      color: 'bg-orange-500',
    },
    {
      icon: Clock,
      label: 'Pending Review',
      value: count(containers, (c) => c.reviewStatus === 'Pending Review'),
      color: 'bg-red-500',
    },
    {
      icon: RefreshCw,
      label: 'ETA Changed',
      value: count(
        containers,
        (c) => c.suggestedAction === 'Update ETA in SAP'
      ),
      color: 'bg-cyan-500',
    },
    {
      icon: CheckCircle2,
      label: 'Completed This Session',
      value: count(containers, (c) => c.reviewStatus === 'Completed'),
      color: 'bg-emerald-500',
    },
  ];

  if (containers.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {stats.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </div>
  );
}
