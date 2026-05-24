import { useState } from 'react';
import { Ship, Eye, EyeOff, ArrowLeft, AlertCircle, Loader, Check } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

type View = 'login' | 'register' | 'setup';

interface Props {
  initialMode?: View;
  onBack:       () => void;
  onSuccess:    () => void;
}

export default function AuthPage({ initialMode = 'login', onBack, onSuccess }: Props) {
  const [view, setView] = useState<View>(initialMode);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: '#04071a' }}>
      <PortBackground />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center glow-cyan"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>
            <Ship size={20} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">ContainerFlow</span>
        </div>

        <div className="glass-card rounded-2xl p-8 animate-fade-up">
          {view === 'setup'    && <SetupForm onSuccess={onSuccess} onBack={() => setView('login')} />}
          {view === 'login'    && <LoginForm onSuccess={onSuccess} onRegister={() => setView('register')} onSetup={() => setView('setup')} />}
          {view === 'register' && <RegisterForm onBack={() => setView('login')} />}
        </div>

        {view !== 'register' && (
          <button onClick={onBack}
            className="flex items-center gap-2 mx-auto mt-6 text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.35)', display: 'flex' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
            <ArrowLeft size={14} /> Back to home
          </button>
        )}
      </div>
    </div>
  );
}

// ── First-Run Admin Setup ─────────────────────────────────────────────────────

function SetupForm({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const { setupAdmin } = useAuthStore();
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [pw,      setPw]      = useState('');
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setError('Password must be at least 8 characters.');
    setLoading(true);
    setError('');
    const err = await setupAdmin(name, email, pw);
    if (err) { setError(err); setLoading(false); return; }
    onSuccess();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-bold text-xl text-white mb-1">Admin Setup</h2>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Create the first admin account.
          </p>
        </div>
        <button type="button" onClick={onBack}
          className="flex items-center gap-1 text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <ArrowLeft size={12} /> Sign in
        </button>
      </div>

      <Field label="Full Name"     value={name}  onChange={setName}  placeholder="Your name" autoFocus />
      <Field label="Email Address" value={email} onChange={setEmail} placeholder="admin@company.com" type="email" />
      <PasswordField label="Password (min 8 chars)" value={pw} onChange={setPw} show={show} onToggle={() => setShow(v => !v)} />

      {error && <ErrorBanner message={error} />}
      <SubmitButton loading={loading} label="Create Admin Account" />
    </form>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────

function LoginForm({ onSuccess, onRegister, onSetup }: { onSuccess: () => void; onRegister: () => void; onSetup: () => void }) {
  const { login } = useAuthStore();
  const [email,   setEmail]   = useState('');
  const [pw,      setPw]      = useState('');
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const err = await login(email, pw);
    if (err) { setError(err); setLoading(false); return; }
    onSuccess();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h2 className="font-bold text-xl text-white mb-1">Welcome back</h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Sign in to your ContainerFlow account</p>
      </div>

      <Field label="Email Address" value={email} onChange={setEmail} placeholder="you@company.com" type="email" autoFocus />
      <PasswordField label="Password" value={pw} onChange={setPw} show={show} onToggle={() => setShow(v => !v)} />

      {error && <ErrorBanner message={error} />}
      <SubmitButton loading={loading} label="Sign In" />

      <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
        Don't have an account?{' '}
        <button type="button" onClick={onRegister}
          className="font-medium" style={{ color: '#67e8f9' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#a5f3fc')}
          onMouseLeave={e => (e.currentTarget.style.color = '#67e8f9')}>
          Request access
        </button>
      </p>

      <p className="text-center text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
        First-time setup?{' '}
        <button type="button" onClick={onSetup}
          className="underline" style={{ color: 'rgba(255,255,255,0.3)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
          Create admin account
        </button>
      </p>
    </form>
  );
}

// ── Register ──────────────────────────────────────────────────────────────────

function RegisterForm({ onBack }: { onBack: () => void }) {
  const { register } = useAuthStore();
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [pw,      setPw]      = useState('');
  const [confirm, setConfirm] = useState('');
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [done,    setDone]    = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== confirm) return setError('Passwords do not match.');
    if (pw.length < 8)  return setError('Password must be at least 8 characters.');
    setLoading(true);
    setError('');
    const err = await register(name, email, pw);
    if (err) { setError(err); setLoading(false); return; }
    setDone(true);
    setLoading(false);
  };

  if (done) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
          <Check size={26} style={{ color: '#4ade80' }} />
        </div>
        <h2 className="font-bold text-xl text-white">Request submitted!</h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
          Your account is pending admin approval. Sign in once an admin activates you.
        </p>
        <button onClick={onBack}
          className="w-full py-3 rounded-xl font-semibold text-sm"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h2 className="font-bold text-xl text-white mb-1">Request access</h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          An admin will activate your account before you can sign in.
        </p>
      </div>

      <Field label="Full Name"     value={name}    onChange={setName}    placeholder="Your name" autoFocus />
      <Field label="Work Email"    value={email}   onChange={setEmail}   placeholder="you@company.com" type="email" />
      <PasswordField label="Password" value={pw} onChange={setPw} show={show} onToggle={() => setShow(v => !v)} />
      <Field label="Confirm Password" value={confirm} onChange={setConfirm}
        placeholder="Repeat password" type={show ? 'text' : 'password'} />

      {error && <ErrorBanner message={error} />}
      <SubmitButton loading={loading} label="Request Access" />

      <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
        Already have an account?{' '}
        <button type="button" onClick={onBack} className="font-medium" style={{ color: '#67e8f9' }}>Sign in</button>
      </p>
    </form>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = 'text', autoFocus = false }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} autoFocus={autoFocus} required
        className="dark-input w-full px-3 py-2.5 rounded-lg text-sm text-white" />
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle }: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
          placeholder="••••••••" required
          className="dark-input w-full px-3 py-2.5 pr-10 rounded-lg text-sm text-white" />
        <button type="button" onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg text-sm"
      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
      <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
      style={{ background: loading ? 'rgba(6,182,212,0.4)' : 'linear-gradient(135deg, #06b6d4, #3b82f6)', boxShadow: loading ? 'none' : '0 6px 20px rgba(6,182,212,0.3)' }}>
      {loading ? <><Loader size={15} className="animate-spin" /> Processing…</> : label}
    </button>
  );
}

// ── Port Night Background ─────────────────────────────────────────────────────

function PortBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #04071a 0%, #06122e 50%, #040c1e 100%)' }} />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 animate-orb-pulse"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.3) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15 animate-orb-pulse"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)', filter: 'blur(50px)', animationDelay: '2s' }} />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="absolute animate-float"
          style={{
            left: `${10 + i * 16}%`, top: `${40 + (i % 3) * 15}%`,
            opacity: 0.04 + i * 0.01,
            animationDelay: `${i * 1.2}s`,
            animationDuration: `${6 + i}s`,
          }}>
          <svg width="80" height="30" viewBox="0 0 80 30" fill="white">
            <rect x="5" y="10" width="70" height="14" rx="2" />
            <rect x="0" y="18" width="80" height="6" rx="1" />
            <rect x="10" y="6" width="18" height="8" rx="1" />
            <rect x="32" y="6" width="18" height="8" rx="1" />
            <rect x="54" y="6" width="18" height="8" rx="1" />
          </svg>
        </div>
      ))}
    </div>
  );
}
