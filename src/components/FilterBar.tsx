import { Search, X, SlidersHorizontal } from 'lucide-react';
import type { FilterState, Priority, ReviewStatus } from '../types';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}

const DARK_SELECT: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  color: '#0f172a',
  borderRadius: 8,
  padding: '7px 10px',
  fontSize: 13,
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
  paddingRight: 28,
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
};

export function FilterBar({ filters, onChange }: Props) {
  const containers   = useStore(s => s.containers);
  const isAdmin      = useAuthStore(s => s.profile?.role === 'admin');
  const carriers     = [...new Set(containers.map(c => c.carrier).filter(Boolean))].sort();
  const customers    = [...new Set(containers.map(c => c.customer).filter(Boolean))].sort();
  const destinations = [...new Set(containers.map(c => c.destinationPort).filter(Boolean))].sort();
  const uploaders    = [...new Set(containers.map(c => c.uploadedBy).filter(Boolean))].sort();

  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    onChange({ ...filters, [key]: value });
  }

  function clearAll() {
    onChange({ carrier: '', customer: '', destination: '', status: '', priority: '', suggestedAction: '', search: '', etaFrom: '', etaTo: '', autoTrackedOnly: false, uploadedBy: '' });
  }

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="rounded-2xl mb-4 p-4"
      style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center gap-2.5 flex-wrap">

        {/* Search */}
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search container, booking, customer…"
            value={filters.search}
            onChange={e => set('search', e.target.value)}
            className="dark-input w-full pl-8 pr-4 py-2 rounded-lg text-sm"
          />
        </div>

        {/* Status */}
        <select
          value={filters.status}
          onChange={e => set('status', e.target.value as ReviewStatus | '')}
          style={DARK_SELECT}>
          <option value="">All Statuses</option>
          <option>Action Required</option>
          <option>Pending Review</option>
          <option>Auto-Reviewed</option>
          <option>No Update Required</option>
          <option>Completed</option>
        </select>

        {/* Priority */}
        <select
          value={filters.priority}
          onChange={e => set('priority', e.target.value as Priority | '')}
          style={DARK_SELECT}>
          <option value="">All Priorities</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>

        {carriers.length > 0 && (
          <select value={filters.carrier} onChange={e => set('carrier', e.target.value)} style={DARK_SELECT}>
            <option value="">All Carriers</option>
            {carriers.map(c => <option key={c}>{c}</option>)}
          </select>
        )}

        {customers.length > 0 && (
          <select value={filters.customer} onChange={e => set('customer', e.target.value)} style={DARK_SELECT}>
            <option value="">All Customers</option>
            {customers.map(c => <option key={c}>{c}</option>)}
          </select>
        )}

        {destinations.length > 0 && (
          <select value={filters.destination} onChange={e => set('destination', e.target.value)} style={DARK_SELECT}>
            <option value="">All Destinations</option>
            {destinations.map(d => <option key={d}>{d}</option>)}
          </select>
        )}

        {isAdmin && uploaders.length > 0 && (
          <select value={filters.uploadedBy} onChange={e => set('uploadedBy', e.target.value)} style={DARK_SELECT}>
            <option value="">All Users</option>
            {uploaders.map(u => <option key={u}>{u}</option>)}
          </select>
        )}

        {/* Filter indicator + clear */}
        <div className="flex items-center gap-2 ml-auto">
          {activeCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: '#ecfeff', color: '#0891b2', border: '1px solid #67e8f9' }}>
              {activeCount} active
            </span>
          )}
          <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#94a3b8' }}>
            <SlidersHorizontal size={12} /> Filters
          </div>
          {activeCount > 0 && (
            <button onClick={clearAll}
              className="flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded-lg"
              style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5' }}>
              <X size={11} /> Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
