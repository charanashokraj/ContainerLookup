import { useEffect, useState } from 'react';
import {
  X, Users, UserPlus, Check, Ban, Trash2,
  Shield, User, Eye, EyeOff, Copy, RefreshCw, Crown,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import type { Profile } from '../lib/supabase';

interface Props { onClose: () => void; }

export default function AdminUsersPanel({ onClose }: Props) {
  const { profile: me, profiles, loadAllProfiles, activateUser, deactivateUser, deleteUser, promoteToAdmin, createUser } =
    useAuthStore();

  const [showAddUser, setShowAddUser] = useState(false);
  const [busyId,      setBusyId]      = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      await loadAllProfiles();
      setLoading(false);
    })();
  }, []);

  const doAction = async (id: string, fn: (id: string) => Promise<void>) => {
    setBusyId(id);
    await fn(id);
    setBusyId(null);
  };

  const pending  = profiles.filter(p => p.status === 'pending');
  const active   = profiles.filter(p => p.status === 'active');
  const disabled = profiles.filter(p => p.status === 'disabled');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: 'linear-gradient(135deg, #0a111f, #0d1b2e)', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 sticky top-0 z-10"
          style={{ background: 'linear-gradient(135deg, #0a111f, #0d1b2e)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
              <Users size={16} style={{ color: '#a78bfa' }} />
            </div>
            <div>
              <h2 className="font-bold text-white">User Management</h2>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{profiles.length} total accounts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setLoading(true); loadAllProfiles().then(() => setLoading(false)); }}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setShowAddUser(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', color: '#67e8f9' }}>
              <UserPlus size={13} /> Add User
            </button>
            <button onClick={onClose}
              className="p-2 rounded-lg" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Add User Form */}
          {showAddUser && (
            <AddUserForm
              onDone={() => { setShowAddUser(false); loadAllProfiles(); }}
              createUser={createUser}
            />
          )}

          {/* Pending */}
          {pending.length > 0 && (
            <Section title="Pending Approval" count={pending.length} color="#f59e0b">
              {pending.map(u => (
                <UserRow key={u.id} user={u} isSelf={u.id === me?.id} busy={busyId === u.id}>
                  <ActionBtn icon={<Check size={12} />} color="#22c55e" label="Approve"
                    onClick={() => doAction(u.id, activateUser)} />
                  <ActionBtn icon={<Trash2 size={12} />} color="#ef4444" label="Remove"
                    onClick={() => { if (confirm(`Delete ${u.email}?`)) doAction(u.id, deleteUser); }} />
                </UserRow>
              ))}
            </Section>
          )}

          {/* Active */}
          <Section title="Active Users" count={active.length} color="#22c55e">
            {active.length === 0 && (
              <p className="text-sm py-4 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>No active users yet.</p>
            )}
            {active.map(u => (
              <UserRow key={u.id} user={u} isSelf={u.id === me?.id} busy={busyId === u.id}>
                {u.role !== 'admin' && u.id !== me?.id && (
                  <>
                    <ActionBtn icon={<Crown size={12} />} color="#a78bfa" label="Make Admin"
                      onClick={() => { if (confirm(`Promote ${u.email} to admin?`)) doAction(u.id, promoteToAdmin); }} />
                    <ActionBtn icon={<Ban size={12} />} color="#f59e0b" label="Disable"
                      onClick={() => doAction(u.id, deactivateUser)} />
                    <ActionBtn icon={<Trash2 size={12} />} color="#ef4444" label="Delete"
                      onClick={() => { if (confirm(`Delete ${u.email}?`)) doAction(u.id, deleteUser); }} />
                  </>
                )}
              </UserRow>
            ))}
          </Section>

          {/* Disabled */}
          {disabled.length > 0 && (
            <Section title="Disabled" count={disabled.length} color="#6b7280">
              {disabled.map(u => (
                <UserRow key={u.id} user={u} isSelf={false} busy={busyId === u.id}>
                  <ActionBtn icon={<Check size={12} />} color="#22c55e" label="Re-enable"
                    onClick={() => doAction(u.id, activateUser)} />
                  <ActionBtn icon={<Trash2 size={12} />} color="#ef4444" label="Delete"
                    onClick={() => { if (confirm(`Delete ${u.email}?`)) doAction(u.id, deleteUser); }} />
                </UserRow>
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ title, count, color, children }: {
  title: string; count: number; color: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>{title}</span>
        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
          style={{ background: `${color}22`, color, border: `1px solid ${color}33` }}>{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ── User Row ──────────────────────────────────────────────────────────────────

function UserRow({ user, isSelf, busy, children }: {
  user: Profile; isSelf: boolean; busy: boolean; children?: React.ReactNode;
}) {
  const initials = user.name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';
  const roleColor = user.role === 'admin' ? '#a78bfa' : '#67e8f9';

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: 'white' }}>
          {initials}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white truncate">{user.name}</span>
            {isSelf && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(6,182,212,0.1)', color: '#67e8f9' }}>You</span>}
            <span className="text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1"
              style={{ background: `${roleColor}11`, color: roleColor, border: `1px solid ${roleColor}22` }}>
              {user.role === 'admin' ? <><Shield size={9} /> Admin</> : <><User size={9} /> User</>}
            </span>
          </div>
          <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{user.email}</p>
        </div>
      </div>

      {!isSelf && (
        <div className="flex items-center gap-1.5 shrink-0">
          {busy ? <RefreshCw size={14} className="animate-spin" style={{ color: 'rgba(255,255,255,0.4)' }} /> : children}
        </div>
      )}
    </div>
  );
}

// ── Action Button ─────────────────────────────────────────────────────────────

function ActionBtn({ icon, color, label, onClick }: {
  icon: React.ReactNode; color: string; label: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} title={label}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all"
      style={{ background: `${color}14`, border: `1px solid ${color}30`, color }}
      onMouseEnter={e => (e.currentTarget.style.background = `${color}28`)}
      onMouseLeave={e => (e.currentTarget.style.background = `${color}14`)}>
      {icon} <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ── Add User Form ─────────────────────────────────────────────────────────────

function AddUserForm({
  onDone, createUser,
}: {
  onDone: () => void;
  createUser: (name: string, email: string, password: string) => Promise<string | null>;
}) {
  const generated = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase() + '!1';
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [pw,      setPw]      = useState(generated());
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [done,    setDone]    = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const err = await createUser(name, email, pw);
    if (err) { setError(err); setLoading(false); return; }
    setDone(true);
    setLoading(false);
  };

  if (done) {
    return (
      <div className="rounded-xl p-5 space-y-3" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
        <p className="text-sm font-semibold" style={{ color: '#4ade80' }}>User created successfully!</p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Share these credentials with <strong className="text-white">{name}</strong>:</p>
        <div className="space-y-1 text-xs font-mono" style={{ color: '#67e8f9' }}>
          <div>Email: <span className="text-white">{email}</span></div>
          <div className="flex items-center gap-2">
            Password: <span className="text-white">{pw}</span>
            <button onClick={() => navigator.clipboard.writeText(pw)} title="Copy" className="hover:text-white">
              <Copy size={12} />
            </button>
          </div>
        </div>
        <button onClick={onDone}
          className="mt-1 text-xs font-medium" style={{ color: '#67e8f9' }}>
          Close ↑
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl p-5 space-y-4"
      style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)' }}>
      <p className="text-sm font-semibold text-white">Create a new user</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Full Name</label>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="Name"
            className="dark-input w-full px-3 py-2 rounded-lg text-sm text-white" />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="user@co.com"
            className="dark-input w-full px-3 py-2 rounded-lg text-sm text-white" />
        </div>
      </div>

      <div>
        <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Generated Password</label>
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)}
            className="dark-input w-full px-3 py-2 pr-16 rounded-lg text-sm text-white" />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="p-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
            <button type="button" onClick={() => navigator.clipboard.writeText(pw)}
              className="p-1" style={{ color: 'rgba(255,255,255,0.4)' }} title="Copy">
              <Copy size={13} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={loading}
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ background: loading ? 'rgba(6,182,212,0.3)' : 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>
          {loading ? 'Creating…' : 'Create User'}
        </button>
        <button type="button" onClick={onDone}
          className="px-4 py-2 rounded-lg text-sm" style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
