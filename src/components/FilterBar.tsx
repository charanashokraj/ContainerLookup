import { Search, X } from 'lucide-react';
import type { FilterState, Priority, ReviewStatus } from '../types';
import { useStore } from '../store/useStore';

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}

export function FilterBar({ filters, onChange }: Props) {
  const containers = useStore((s) => s.containers);

  const carriers = [...new Set(containers.map((c) => c.carrier).filter(Boolean))].sort();
  const customers = [...new Set(containers.map((c) => c.customer).filter(Boolean))].sort();
  const destinations = [...new Set(containers.map((c) => c.destinationPort).filter(Boolean))].sort();

  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    onChange({ ...filters, [key]: value });
  }

  function clearAll() {
    onChange({
      carrier: '',
      customer: '',
      destination: '',
      status: '',
      priority: '',
      suggestedAction: '',
      search: '',
      etaFrom: '',
      etaTo: '',
    });
  }

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search container, booking, customer…"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => set('status', e.target.value as ReviewStatus | '')}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option>Action Required</option>
          <option>Pending Review</option>
          <option>No Update Required</option>
          <option>Completed</option>
        </select>

        <select
          value={filters.priority}
          onChange={(e) => set('priority', e.target.value as Priority | '')}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Priorities</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>

        {carriers.length > 0 && (
          <select
            value={filters.carrier}
            onChange={(e) => set('carrier', e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Carriers</option>
            {carriers.map((c) => <option key={c}>{c}</option>)}
          </select>
        )}

        {customers.length > 0 && (
          <select
            value={filters.customer}
            onChange={(e) => set('customer', e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Customers</option>
            {customers.map((c) => <option key={c}>{c}</option>)}
          </select>
        )}

        {destinations.length > 0 && (
          <select
            value={filters.destination}
            onChange={(e) => set('destination', e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Destinations</option>
            {destinations.map((d) => <option key={d}>{d}</option>)}
          </select>
        )}

        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
