import { Ship, Container, ArrowRight, Zap, Globe, BarChart3, RefreshCw, LogIn, UserPlus } from 'lucide-react';

interface Props {
  onSignIn:   () => void;
  onRegister: () => void;
}

const FEATURES = [
  { icon: Ship,       label: 'Multi-Carrier Tracking', desc: '170+ carriers via Sinay, Maersk, CMA CGM, Hapag-Lloyd & MSC APIs.' },
  { icon: Zap,        label: 'Auto-Polling Every 4h',  desc: 'GitHub Actions silently refreshes all container statuses around the clock.' },
  { icon: BarChart3,  label: 'SAP Status Comparison',  desc: 'Paste your SAP export and instantly see what needs updating.' },
  { icon: Globe,      label: 'Live Location & ETA',    desc: 'Vessel name, port, and ETA pulled directly from carrier APIs.' },
  { icon: RefreshCw,  label: 'One-Click Check Now',    desc: 'Trigger an on-demand parallel poll across all configured APIs.' },
  { icon: Container,  label: 'Export-Ready Reports',   desc: 'Download formatted Excel/CSV ready to paste back into SAP.' },
];

const STATS = [
  { value: '170+',  label: 'Carriers Supported' },
  { value: '4h',    label: 'Auto-Refresh Cycle' },
  { value: '100%',  label: 'Open-Source & Free' },
  { value: '∞',     label: 'Containers Tracked' },
];

export default function LandingPage({ onSignIn, onRegister }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#060b18', color: 'white' }}>

      {/* ── Background layers ───────────────────────────────────────── */}
      <div className="grid-bg absolute inset-0 pointer-events-none" />

      {/* Orbs */}
      <div className="animate-orb-slow absolute rounded-full pointer-events-none"
        style={{ width: 700, height: 700, left: '-15%', top: '-20%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)' }} />
      <div className="animate-orb-slow absolute rounded-full pointer-events-none"
        style={{ width: 600, height: 600, right: '-10%', bottom: '5%', animationDelay: '9s',
          background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)' }} />
      <div className="animate-orb absolute rounded-full pointer-events-none"
        style={{ width: 350, height: 350, right: '20%', top: '15%', animationDelay: '2s',
          background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)' }} />

      {/* Drifting container silhouettes */}
      {[
        { top: '20%', delay: '0s',   size: 52, color: '#0e7490', dur: '26s' },
        { top: '45%', delay: '8s',   size: 38, color: '#1e40af', dur: '32s' },
        { top: '68%', delay: '14s',  size: 60, color: '#065f46', dur: '24s' },
        { top: '32%', delay: '20s',  size: 44, color: '#0e7490', dur: '30s' },
      ].map((c, i) => (
        <div key={i} className="absolute pointer-events-none"
          style={{ top: c.top, left: 0, animation: `drift ${c.dur} linear infinite`, animationDelay: c.delay }}>
          <ContainerSVG size={c.size} color={c.color} />
        </div>
      ))}

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center glow-cyan"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>
            <Ship size={18} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg tracking-tight">ContainerFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onSignIn}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            style={{ color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(6,182,212,0.5)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}>
            Sign In
          </button>
          <button onClick={onRegister}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', boxShadow: '0 4px 15px rgba(6,182,212,0.3)' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(6,182,212,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 15px rgba(6,182,212,0.3)'; }}>
            Register
          </button>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-28 text-center">
        {/* Badge */}
        <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8 glass"
          style={{ color: '#67e8f9', border: '1px solid rgba(6,182,212,0.25)' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#06b6d4' }} />
          Fully automated · Open source · GitHub-hosted
        </div>

        <h1 className="animate-fade-up delay-100 font-extrabold leading-none tracking-tighter mb-6"
          style={{ fontSize: 'clamp(2.8rem, 7vw, 6rem)' }}>
          <span style={{ color: 'white' }}>Container Tracking</span>
          <br />
          <span className="shimmer-text">Fully Automated.</span>
        </h1>

        <p className="animate-fade-up delay-200 text-lg max-w-2xl mx-auto mb-10"
          style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.75 }}>
          Upload your SAP export, connect carrier APIs, and let ContainerFlow
          do the rest — polling 170+ carriers every 4 hours and surfacing exactly
          what needs updating.
        </p>

        <div className="animate-fade-up delay-300 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={onSignIn}
            className="group flex items-center gap-3 px-8 py-3.5 rounded-xl font-semibold text-base transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', boxShadow: '0 8px 30px rgba(6,182,212,0.35)' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(6,182,212,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 30px rgba(6,182,212,0.35)'; }}>
            <LogIn size={18} />
            Sign In
            <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
          </button>
          <button onClick={onRegister}
            className="group flex items-center gap-3 px-8 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 glass"
            style={{ color: 'rgba(255,255,255,0.8)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
            <UserPlus size={18} />
            Request Access
          </button>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-5xl mx-auto px-8 mb-28">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
          {STATS.map((s, i) => (
            <div key={i} className="px-6 py-6 text-center" style={{ background: 'rgba(6,11,24,0.6)' }}>
              <div className="font-extrabold text-3xl tracking-tight mb-1"
                style={{ background: 'linear-gradient(135deg, #67e8f9, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {s.value}
              </div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 mb-32">
        <h2 className="text-center font-bold text-3xl mb-3 tracking-tight">Everything in one place</h2>
        <p className="text-center text-sm mb-12" style={{ color: 'rgba(255,255,255,0.4)' }}>
          From SAP upload to export-ready report — zero manual tracking.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="glass-card rounded-2xl p-6 group transition-all duration-300"
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.transform = ''; }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300"
                  style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
                  <Icon size={20} style={{ color: '#06b6d4' }} />
                </div>
                <h3 className="font-semibold text-base mb-2">{f.label}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 mb-24">
        <div className="rounded-3xl p-10 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(59,130,246,0.12) 100%)', border: '1px solid rgba(6,182,212,0.2)' }}>
          <div className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(6,182,212,0.15), transparent 70%)' }} />
          <h2 className="font-extrabold text-3xl mb-3 tracking-tight relative z-10">
            Ready to eliminate manual tracking?
          </h2>
          <p className="text-sm mb-8 relative z-10" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Set up takes under 5 minutes. No servers, no subscriptions — just GitHub.
          </p>
          <button onClick={onRegister}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm relative z-10 transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', boxShadow: '0 8px 30px rgba(6,182,212,0.35)' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(6,182,212,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 30px rgba(6,182,212,0.35)'; }}>
            Request Access <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t py-8 text-center" style={{ borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
        <p className="text-xs">ContainerFlow · Open source on GitHub · Built with React, Python & GitHub Actions</p>
      </footer>
    </div>
  );
}

function ContainerSVG({ size, color }: { size: number; color: string }) {
  const h = Math.round(size * 0.45);
  return (
    <svg width={size * 2.5} height={h + 12} viewBox={`0 0 ${size * 2.5} ${h + 12}`} fill="none"
      style={{ opacity: 0.25 }}>
      {/* Hull */}
      <path d={`M0 ${h} Q${size * 1.25} ${h - 4} ${size * 2.5} ${h} L${size * 2.5} ${h + 10} Q${size * 1.25} ${h + 14} 0 ${h + 10} Z`}
        fill={color} />
      {/* Containers */}
      {[0, 1, 2].map(i => (
        <rect key={i} x={i * (size * 0.75) + 6} y={h - size * 0.38} width={size * 0.65} height={size * 0.38}
          rx={2} fill={color} fillOpacity={0.8 + i * 0.05} />
      ))}
      {/* Bridge */}
      <rect x={size * 1.9} y={h - size * 0.55} width={size * 0.4} height={size * 0.55} rx={3} fill={color} fillOpacity={0.9} />
    </svg>
  );
}
