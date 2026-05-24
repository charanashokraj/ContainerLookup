import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar } from '../components/FilterBar';
import type { FilterState } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { useStore } from '../store/useStore';
import { makeContainer } from './fixtures';

const DEFAULTS: FilterState = {
  carrier: '', customer: '', destination: '', status: '',
  priority: '', suggestedAction: '', search: '',
  etaFrom: '', etaTo: '', autoTrackedOnly: false, uploadedBy: '',
};

beforeEach(() => {
  useStore.setState({ containers: [], sessions: [], loaded: true });
  useAuthStore.setState({ profile: { id: 'u1', email: 'u@test.com', name: 'User', role: 'user', status: 'active', created_at: '', activated_at: null } });
  vi.clearAllMocks();
});

describe('FilterBar — basic render', () => {
  it('renders the search input', () => {
    render(<FilterBar filters={DEFAULTS} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('calls onChange when search input changes', () => {
    const onChange = vi.fn();
    render(<FilterBar filters={DEFAULTS} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'MSCU' } });
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULTS, search: 'MSCU' });
  });

  it('shows "active" badge when a filter is set', () => {
    render(<FilterBar filters={{ ...DEFAULTS, search: 'MSC' }} onChange={vi.fn()} />);
    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });

  it('does not show active badge when no filters set', () => {
    render(<FilterBar filters={DEFAULTS} onChange={vi.fn()} />);
    expect(screen.queryByText(/\d+ active/i)).not.toBeInTheDocument();
  });

  it('shows carriers from the store as select options', () => {
    useStore.setState({ containers: [makeContainer({ carrier: 'MSC' })], sessions: [], loaded: true });
    render(<FilterBar filters={DEFAULTS} onChange={vi.fn()} />);
    expect(screen.getByText('All Carriers')).toBeInTheDocument();
    expect(screen.getByText('MSC')).toBeInTheDocument();
  });

  it('clears all filters when Clear button is clicked', () => {
    const onChange = vi.fn();
    render(<FilterBar filters={{ ...DEFAULTS, search: 'test' }} onChange={onChange} />);
    fireEvent.click(screen.getByText(/clear/i));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ search: '' }));
  });
});

describe('FilterBar — admin "All Users" filter', () => {
  it('does not show "All Users" dropdown for regular users', () => {
    useStore.setState({
      containers: [makeContainer({ uploadedBy: 'Alice' }), makeContainer({ uploadedBy: 'Bob' })],
      sessions: [], loaded: true,
    });
    render(<FilterBar filters={DEFAULTS} onChange={vi.fn()} />);
    expect(screen.queryByText('All Users')).not.toBeInTheDocument();
  });

  it('shows "All Users" dropdown for admins when uploaders exist', () => {
    useAuthStore.setState({ profile: { id: 'a1', email: 'a@test.com', name: 'Admin', role: 'admin', status: 'active', created_at: '', activated_at: null } });
    useStore.setState({
      containers: [makeContainer({ uploadedBy: 'Alice' }), makeContainer({ uploadedBy: 'Bob' })],
      sessions: [], loaded: true,
    });
    render(<FilterBar filters={DEFAULTS} onChange={vi.fn()} />);
    expect(screen.getByText('All Users')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('does not show "All Users" for admin when no uploaders', () => {
    useAuthStore.setState({ profile: { id: 'a1', email: 'a@test.com', name: 'Admin', role: 'admin', status: 'active', created_at: '', activated_at: null } });
    useStore.setState({ containers: [], sessions: [], loaded: true });
    render(<FilterBar filters={DEFAULTS} onChange={vi.fn()} />);
    expect(screen.queryByText('All Users')).not.toBeInTheDocument();
  });

  it('calls onChange with uploadedBy when admin selects a user', () => {
    useAuthStore.setState({ profile: { id: 'a1', email: 'a@test.com', name: 'Admin', role: 'admin', status: 'active', created_at: '', activated_at: null } });
    useStore.setState({
      containers: [makeContainer({ uploadedBy: 'Alice' })],
      sessions: [], loaded: true,
    });
    const onChange = vi.fn();
    render(<FilterBar filters={DEFAULTS} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('All Users'), { target: { value: 'Alice' } });
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULTS, uploadedBy: 'Alice' });
  });
});
