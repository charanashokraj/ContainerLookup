import { useState } from 'react';
import {
  Users, Check, X, ShieldCheck, Ban, Trash2, Crown, Clock,
  UserCheck, UserX, Search, RefreshCw, UserPlus, Eye, EyeOff, Copy,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { buildNewUser, generatePassword } from '../lib/auth';
import type { User } from '../lib/auth';

interface Props { onClose: () => void; }

const STATUS_BADGE: Record<User['status'], { label: string; style: React.CSSProperties }> = {
  active:   { label: 'Active',   style: { background: 'rgba(34,197,94,0.12)',  border: '1px solid rgba(34,197,94,0.25)',  color: '#4ade80' } },
  pending:  { label: 'Pending',  style: { background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.25)', color: '#facc15' } },
  disabled: { label: 'Disabled', style: { background: 'rgba(239,68,68,0.12)',  border: '1px solid rgba(239,68,68,0.25)',  color: '#f87171' } },
};

// ── Add User inline form ──────────────────────────────────────────────────────

function AddUserForm({ onDone }: { onDone: () => void }) {
  const { users, setUsers } = useAuthStore();
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [pw,      setPw]      = useState(generatePassword());
  const [showPw,  setShowPw]  = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [created, setCreated] = useState<{ name: string; email: string; pw: string } | null>(null);

  const copy = () => {
    navigator.clipboard.writeText(pw).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return setError('Name and email are required.');
    setLoading(true);
    setError('');
    try {
      const { users: updated, error: err } = await buildNewUser(users, email, name, pw, 'user', 'active');
      if (err || !updated) throw new Error(err ?? 'Failed to create user.');
      await setUsers(updated, true);   // writes to GitHub using admin's stored PAT
      setCreated({ name: name.trim(), email: email.trim(), pw });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create user. Check GitHub settings.');
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div className="p-5 rounded-xl space-y-4" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <Check size={14} style={{ color: '#4ade80' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#4ade80' }}>User created and activated</p>
        </div>
        <div className="rounded-lg p-3 space-y-1" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Share these credentials with <strong style={{ color: 'white' }}>{created.name}</strong>:</p>
          <p className="text-xs font-mono mt-2" style={{ color: 'rgba(255,255,255,0.7)' }}>Email: <span style={{ color: '#67e8f9' }}>{created.email}</span></p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Password: <span style={{ color: '#67e8f9' }}>{showPw ? created.pw : '••••••••••••••'}</span>
            </p>
            <button type="button" onClick={() => setShowPw(v => !v)} style={{ color: 'rgba(255,255,255,0.4)' }}>
              {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(`Email: ${created.email}\nPassword: ${created.pw}`).then(() => setCopied(true))}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: copied ? '#4ade80' : 'rgba(255,255,255,0.6)' }}>
            <Copy size={12} /> {copied ? 'Copied!' : 'Copy credentials'}
          </button>
          <button onClick={onDone}
            className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', color: '#67e8f9' }}>
            Add another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="p-4 rounded-xl space-y-3"
      style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)' }}>
      <p className="text-xs font-semibold" style={{ color: '#a78bfa' }}>New user — will be immediately active</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Full Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith"
            className="dark-input w-full px-3 py-2 rounded-lg text-sm text-white" required autoFocus />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Work Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@company.com"
            className="dark-input w-full px-3 py-2 rounded-lg text-sm text-white" required />
        </div>
      </div>

      <div>
        <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Generated Password <span style={{ color: 'rgba(255,255,255,0.3)' }}>— copy and share with the user</span>
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input type={showPw ? 'text' : 'password'} value={pw} readOnly
              className="dark-input w-full px-3 py-2 rounded-lg text-sm text-white font-mono pr-9" />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button type="button" onClick={copy}
            className="px-3 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
            style={{ background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: copied ? '#4ade80' : 'rgba(255,255,255,0.5)' }}>
            <Copy size={12} /> {copied ? 'Copied' : 'Copy'}
          </button>
          <button type="button" onClick={() => setPw(generatePassword())}
            className="px-3 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
            New
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={onDone}
          className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}>
          Cancel
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
          style={{ background: loading ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', color: '#a78bfa' }}>
          {loading ? 'Creating…' : <><UserPlus size={13} /> Create &amp; Activate User</>}
        </button>
      </div>
    </form>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function AdminUsersPanel({ onClose }: Props) {
  const { users, currentUser, activateUser, deactivateUser, deleteUser, promoteToAdmin, initialize: refreshUsers } = useAuthStore();
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState<'all' | User['status']>('all');
  const [confirm,   setConfirm]   = useState<{ id: string; action: string } | null>(null);
  const [addingUser,setAddingUser] = useState(false);
  const [refreshing,setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await refreshUsers();
    setRefreshing(false);
  };

  const pending = users.filter(u => u.status === 'pending').length;

  const visible = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                        u.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || u.status === filter;
    return matchSearch && matchFilter;
  });

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

  const act = async (id: string, action: string) => {
    switch (action) {
      case 'activate':  await activateUser(id);  break;
      case 'disable':   await deactivateUser(id); break;
      case 'delete':    await deleteUser(id);     break;
      case 'promote':   await promoteToAdmin(id); break;
    }
    setConfirm(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(4,7,26,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="glass-card rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-up"
        style={{ background: '#07101f', border: '1px solid rgba(255,255,255,0.10)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
              <Users size={18} style={{ color: '#a78bfa' }} />
            </div>
            <div>
              <h2 className="font-bold text-white">User Management</h2>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {users.length} user{users.length !== 1 ? 's' : ''}
                {pending > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: 'rgba(250,204,21,0.15)', color: '#facc15' }}>
                    {pending} pending
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setAddingUser(v => !v); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                color: addingUser ? '#a78bfa' : '#c4b5fd',
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.3)',
              }}>
              <UserPlus size={13} /> {addingUser ? 'Cancel' : 'Add User'}
            </button>
            <button
              onClick={refresh} disabled={refreshing}
              title="Reload users from GitHub"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ color: refreshing ? 'rgba(255,255,255,0.3)' : '#67e8f9', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Add User form (inline, collapsible) */}
        {addingUser && (
          <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <AddUserForm onDone={() => setAddingUser(false)} />
          </div>
        )}

        {/* Filters */}
        <div className="px-6 py-3 flex items-center gap-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search users…"
              className="dark-input w-full pl-8 pr-3 py-2 rounded-lg text-sm text-white" />
          </div>
          <div className="flex gap-2">
            {(['all', 'pending', 'active', 'disabled'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                style={{
                  background: filter === f ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.05)',
                  border: filter === f ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: filter === f ? '#67e8f9' : 'rgba(255,255,255,0.5)',
                }}>
                {f}
                {f === 'pending' && pending > 0 && (
                  <span className="ml-1.5 px-1.5 rounded-full font-bold"
                    style={{ background: '#facc15', color: '#000', fontSize: 10 }}>{pending}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3"
              style={{ color: 'rgba(255,255,255,0.3)' }}>
              <Users size={32} />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['User', 'Role', 'Status', 'Registered', 'Activated', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium"
                      style={{ color: 'rgba(255,255,255,0.35)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(u => {
                  const isSelf = u.id === currentUser?.id;
                  const badge  = STATUS_BADGE[u.status];
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase"
                            style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: 'white' }}>
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-white flex items-center gap-1.5">
                              {u.name}
                              {isSelf && <span className="text-xs px-1.5 py-0.5 rounded-full"
                                style={{ background: 'rgba(6,182,212,0.15)', color: '#67e8f9' }}>you</span>}
                            </p>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="flex items-center gap-1.5 text-xs font-medium"
                          style={{ color: u.role === 'admin' ? '#a78bfa' : 'rgba(255,255,255,0.5)' }}>
                          {u.role === 'admin' ? <Crown size={12} /> : <UserCheck size={12} />}
                          {u.role}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={badge.style}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                          <Clock size={11} /> {fmt(u.createdAt)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {fmt(u.activatedAt)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {isSelf ? (
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {u.status === 'pending' && (
                              <ActionBtn icon={<Check size={13} />} label="Approve"
                                color="rgba(34,197,94,0.15)" border="rgba(34,197,94,0.3)" text="#4ade80"
                                onClick={() => act(u.id, 'activate')} />
                            )}
                            {u.status === 'active' && (
                              <ActionBtn icon={<Ban size={13} />} label="Disable"
                                color="rgba(250,204,21,0.1)" border="rgba(250,204,21,0.3)" text="#facc15"
                                onClick={() => setConfirm({ id: u.id, action: 'disable' })} />
                            )}
                            {u.status === 'disabled' && (
                              <ActionBtn icon={<ShieldCheck size={13} />} label="Restore"
                                color="rgba(34,197,94,0.12)" border="rgba(34,197,94,0.3)" text="#4ade80"
                                onClick={() => act(u.id, 'activate')} />
                            )}
                            {u.status !== 'pending' && u.role !== 'admin' && (
                              <ActionBtn icon={<Crown size={13} />} label="Make Admin"
                                color="rgba(139,92,246,0.12)" border="rgba(139,92,246,0.3)" text="#a78bfa"
                                onClick={() => setConfirm({ id: u.id, action: 'promote' })} />
                            )}
                            <ActionBtn icon={<Trash2 size={13} />} label="Delete"
                              color="rgba(239,68,68,0.1)" border="rgba(239,68,68,0.3)" text="#f87171"
                              onClick={() => setConfirm({ id: u.id, action: 'delete' })} />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          action={confirm.action}
          userName={users.find(u => u.id === confirm.id)?.name ?? ''}
          onConfirm={() => act(confirm.id, confirm.action)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function ActionBtn({ icon, label, color, border, text, onClick }:
  { icon: React.ReactNode; label: string; color: string; border: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={label}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all"
      style={{ background: color, border: `1px solid ${border}`, color: text }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
      {icon} {label}
    </button>
  );
}

function ConfirmDialog({ action, userName, onConfirm, onCancel }:
  { action: string; userName: string; onConfirm: () => void; onCancel: () => void }) {
  const msgs: Record<string, { title: string; desc: string; btnLabel: string; danger: boolean }> = {
    disable:  { title: 'Disable Account',  desc: `${userName} will no longer be able to sign in.`, btnLabel: 'Disable',     danger: true  },
    delete:   { title: 'Delete User',       desc: `This will permanently remove ${userName}.`,      btnLabel: 'Delete User', danger: true  },
    promote:  { title: 'Promote to Admin',  desc: `${userName} will have full admin access.`,       btnLabel: 'Promote',     danger: false },
  };
  const m = msgs[action] ?? { title: 'Confirm', desc: 'Are you sure?', btnLabel: 'Confirm', danger: false };
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10"
      style={{ background: 'rgba(4,7,26,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="glass-card rounded-2xl p-6 w-80 animate-fade-up"
        style={{ background: '#0a1426', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: m.danger ? 'rgba(239,68,68,0.12)' : 'rgba(139,92,246,0.12)', border: m.danger ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(139,92,246,0.3)' }}>
            {m.danger ? <UserX size={18} style={{ color: '#f87171' }} /> : <Crown size={18} style={{ color: '#a78bfa' }} />}
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">{m.title}</h3>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{m.desc}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-xs font-medium"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2 rounded-lg text-xs font-semibold"
            style={{ background: m.danger ? 'rgba(239,68,68,0.2)' : 'rgba(139,92,246,0.2)', border: m.danger ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(139,92,246,0.4)', color: m.danger ? '#f87171' : '#a78bfa' }}>
            {m.btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
