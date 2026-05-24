import { useState } from 'react';
import { Ship, Eye, EyeOff, ArrowLeft, Copy, Check, AlertCircle, Loader, UserCog } from 'lucide-react';
import { attemptLogin, registerUser, createAdminUser, generatePassword } from '../lib/auth';
import { useAuthStore } from '../store/useAuthStore';

type Mode = 'login' | 'register' | 'setup';

interface Props {
  initialMode?: Mode;
  isFirstRun:   boolean;
  onBack:       () => void;
  onSuccess:    () => void;
}

export default function AuthPage({ initialMode = 'login', isFirstRun, onBack, onSuccess }: Props) {
  const mode = isFirstRun ? 'setup' : initialMode;
  const [view, setView] = useState<Mode>(mode);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: '#04071a' }}>

      {/* ── Ocean / port night background ───────────────────────────── */}
      <PortBackground />

      {/* ── Card ────────────────────────────────────────────────────── */}
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
          {view === 'setup'    && <SetupForm onSuccess={onSuccess} />}
          {view === 'login'    && <LoginForm onSuccess={onSuccess} onRegister={() => setView('register')} />}
          {view === 'register' && <RegisterForm onSuccess={() => setView('login')} onBack={() => setView('login')} />}
        </div>

        {/* Back to landing */}
        {!isFirstRun && (
          <button onClick={onBack}
            className="flex items-center gap-2 mx-auto mt-6 text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
            <ArrowLeft size={14} /> Back to home
          </button>
        )}
      </div>
    </div>
  );
}

// ── Setup (first run) ─────────────────────────────────────────────────────────

function SetupForm({ onSuccess }: { onSuccess: () => void }) {
  const login           = useAuthStore(s => s.login);
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');
  const [pw,    setPw]    = useState(generatePassword());
  const [show,  setShow]  = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const copy = () => {
    navigator.clipboard.writeText(pw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return setError('Name and email are required.');
    setLoading(true);
    setError('');
    try {
      const admin = await createAdminUser(email, name, pw);
      login(admin);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
          <UserCog size={18} style={{ color: '#a78bfa' }} />
        </div>
        <div>
          <h2 className="font-bold text-lg text-white">Admin Setup</h2>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>First launch — create your admin account</p>
        </div>
      </div>

      <Field label="Full Name" value={name} onChange={setName} placeholder="Your name" autoFocus />
      <Field label="Email Address" value={email} onChange={setEmail} placeholder="admin@company.com" type="email" />

      {/* Generated password */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Generated Password <span className="ml-1" style={{ color: '#facc15' }}>— copy before continuing</span>
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={show ? 'text' : 'password'}
              value={pw}
              readOnly
              className="dark-input w-full px-3 py-2.5 rounded-lg text-sm font-mono pr-10"
            />
            <button type="button" onClick={() => setShow(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <button type="button" onClick={copy}
            className="px-3 rounded-lg transition-all text-xs flex items-center gap-1.5 font-medium"
            style={{ background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: copied ? '#4ade80' : 'rgba(255,255,255,0.6)' }}>
            {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
          </button>
        </div>
        <p className="text-xs mt-1.5" style={{ color: 'rgba(250,204,21,0.6)' }}>
          Save this password — it cannot be recovered after setup.
        </p>
      </div>

      {error && <ErrorBanner message={error} />}

      <SubmitButton loading={loading} label="Create Admin Account" />
    </form>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────

function LoginForm({ onSuccess, onRegister }: { onSuccess: () => void; onRegister: () => void }) {
  const login     = useAuthStore(s => s.login);
  const [email,   setEmail]   = useState('');
  const [pw,      setPw]      = useState('');
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { user, error: err } = await attemptLogin(email, pw);
    if (err || !user) { setError(err ?? 'Login failed.'); setLoading(false); return; }
    login(user);
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
          className="font-medium transition-colors"
          style={{ color: '#67e8f9' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#a5f3fc')}
          onMouseLeave={e => (e.currentTarget.style.color = '#67e8f9')}>
          Request access
        </button>
      </p>
    </form>
  );
}

// ── Register ──────────────────────────────────────────────────────────────────

function RegisterForm({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [pw,      setPw]      = useState('');
  const [confirm, setConfirm] = useState('');
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== confirm) return setError('Passwords do not match.');
    if (pw.length < 8)  return setError('Password must be at least 8 characters.');
    setLoading(true);
    setError('');
    const { error: err } = await registerUser(email, name, pw);
    if (err) { setError(err); setLoading(false); return; }
    onSuccess();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h2 className="font-bold text-xl text-white mb-1">Request access</h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          An admin will activate your account before you can sign in.
        </p>
      </div>

      <Field label="Full Name" value={name} onChange={setName} placeholder="Your name" autoFocus />
      <Field label="Work Email" value={email} onChange={setEmail} placeholder="you@company.com" type="email" />
      <PasswordField label="Password" value={pw} onChange={setPw} show={show} onToggle={() => setShow(v => !v)} />
      <Field label="Confirm Password" value={confirm} onChange={setConfirm} placeholder="Repeat password" type={show ? 'text' : 'password'} />

      {error && <ErrorBanner message={error} />}

      <SubmitButton loading={loading} label="Request Access" />

      <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
        Already have an account?{' '}
        <button type="button" onClick={onBack}
          className="font-medium" style={{ color: '#67e8f9' }}>
          Sign in
        </button>
      </p>
    </form>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = 'text', autoFocus = false }:
  { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; autoFocus?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        required
        className="dark-input w-full px-3 py-2.5 rounded-lg text-sm text-white"
      />
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle }:
  { label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="••••••••"
          required
          className="dark-input w-full px-3 py-2.5 pr-10 rounded-lg text-sm text-white"
        />
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
      {message}
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2"
      style={{ background: loading ? 'rgba(6,182,212,0.4)' : 'linear-gradient(135deg, #06b6d4, #3b82f6)', boxShadow: loading ? 'none' : '0 6px 20px rgba(6,182,212,0.3)' }}>
      {loading ? <><Loader size={15} className="animate-spin" /> Processing…</> : label}
    </button>
  );
}

// ── Port Night Background ─────────────────────────────────────────────────────

function PortBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Sky gradient */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, #030712 0%, #050e1f 40%, #071526 65%, #0d1f35 80%, #0a2a3d 100%)' }} />

      {/* Stars */}
      {STARS.map((s, i) => (
        <div key={i} className="absolute rounded-full"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.r, height: s.r, background: 'white', opacity: s.o,
            animation: `orb-pulse ${s.d}s ease-in-out infinite`, animationDelay: `${s.delay}s` }} />
      ))}

      {/* Horizon glow */}
      <div className="absolute w-full h-32"
        style={{ bottom: '30%', background: 'radial-gradient(ellipse 80% 100% at 50% 100%, rgba(6,182,212,0.12) 0%, transparent 70%)' }} />

      {/* Water reflection */}
      <div className="absolute bottom-0 w-full" style={{ height: '32%', background: 'linear-gradient(180deg, #071526 0%, #050e1f 100%)' }}>
        {/* Animated water lines */}
        <div className="absolute w-full overflow-hidden" style={{ top: 0, height: '100%' }}>
          {WATER_LINES.map((w, i) => (
            <div key={i} className="absolute" style={{
              top: `${w.t}%`, width: '200%', height: 1,
              background: `rgba(6,182,212,${w.o})`,
              animation: `wave ${w.speed}s linear infinite`,
              animationDelay: `${w.delay}s`,
            }} />
          ))}
        </div>
      </div>

      {/* Ship silhouette on horizon */}
      <div className="absolute" style={{ bottom: '29%', left: '5%', opacity: 0.35 }}>
        <ShipSilhouette />
      </div>

      {/* Port crane silhouette */}
      <div className="absolute" style={{ bottom: '29%', right: '8%', opacity: 0.25 }}>
        <CraneSilhouette />
      </div>

      {/* Port lights (glowing dots on horizon) */}
      {PORT_LIGHTS.map((l, i) => (
        <div key={i} className="absolute rounded-full"
          style={{
            left: `${l.x}%`, bottom: '29.5%', width: l.r, height: l.r,
            background: l.color, boxShadow: `0 0 ${l.r * 3}px ${l.color}`,
            animation: `orb-pulse ${l.d}s ease-in-out infinite`, animationDelay: `${l.delay}s`,
          }} />
      ))}

      {/* Radial glow around card area */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ width: 600, height: 600, background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)' }} />
    </div>
  );
}

const STARS = Array.from({ length: 80 }, () => ({
  x: Math.random() * 100, y: Math.random() * 55,
  r: Math.random() < 0.8 ? 1 : 2,
  o: 0.2 + Math.random() * 0.6,
  d: 2 + Math.random() * 4,
  delay: Math.random() * 3,
}));

const WATER_LINES = Array.from({ length: 12 }, (_, i) => ({
  t: i * 8 + 3,
  o: 0.03 + Math.random() * 0.05,
  speed: 15 + Math.random() * 15,
  delay: Math.random() * -10,
}));

const PORT_LIGHTS = [
  { x: 10, r: 3, color: '#fbbf24', d: 3.5, delay: 0 },
  { x: 14, r: 2, color: '#fbbf24', d: 4,   delay: 0.5 },
  { x: 18, r: 3, color: '#f97316', d: 3,   delay: 1 },
  { x: 75, r: 2, color: '#fbbf24', d: 4,   delay: 0.3 },
  { x: 80, r: 3, color: '#fbbf24', d: 3.5, delay: 0.8 },
  { x: 85, r: 2, color: '#f97316', d: 3.2, delay: 1.2 },
  { x: 88, r: 3, color: '#fbbf24', d: 4.2, delay: 0.6 },
];

function ShipSilhouette() {
  return (
    <svg width="320" height="80" viewBox="0 0 320 80" fill="#06b6d4">
      {/* Hull */}
      <path d="M10 58 Q160 50 310 58 L316 68 Q160 76 4 68 Z" />
      {/* Deck containers */}
      <rect x="20"  y="38" width="50" height="20" rx="2" />
      <rect x="75"  y="42" width="50" height="16" rx="2" fillOpacity="0.8" />
      <rect x="130" y="36" width="50" height="22" rx="2" />
      <rect x="185" y="40" width="50" height="18" rx="2" fillOpacity="0.9" />
      {/* Bridge / superstructure */}
      <rect x="248" y="24" width="46" height="34" rx="3" />
      <rect x="256" y="14" width="30" height="14" rx="3" fillOpacity="0.85" />
      {/* Funnel */}
      <rect x="268" y="6" width="10" height="12" rx="2" fillOpacity="0.7" />
      {/* Anchor light */}
      <circle cx="166" cy="6" r="3" fill="#fbbf24" fillOpacity="0.9" />
      {/* Mast */}
      <line x1="166" y1="6" x2="166" y2="36" stroke="#06b6d4" strokeWidth="2" />
    </svg>
  );
}

function CraneSilhouette() {
  return (
    <svg width="80" height="140" viewBox="0 0 80 140" fill="#0e7490">
      {/* Mast */}
      <rect x="34" y="0" width="6" height="110" />
      {/* Jib */}
      <rect x="10" y="10" width="60" height="5" />
      {/* Trolley */}
      <rect x="20" y="14" width="12" height="8" rx="2" />
      {/* Rope */}
      <line x1="26" y1="22" x2="26" y2="80" stroke="#0e7490" strokeWidth="2" />
      {/* Hook */}
      <rect x="20" y="80" width="12" height="8" rx="2" />
      {/* Base */}
      <rect x="20" y="108" width="34" height="20" rx="2" />
      {/* Legs */}
      <rect x="16" y="126" width="8" height="14" />
      <rect x="50" y="126" width="8" height="14" />
    </svg>
  );
}
