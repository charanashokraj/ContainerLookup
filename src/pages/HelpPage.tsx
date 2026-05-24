import {
  Upload, Table2, Eye, ExternalLink, Download, Zap, CheckCircle,
  AlertTriangle, Clock, ArrowLeft, FileSpreadsheet, RefreshCw,
  GitBranch, Package, CheckCircle2, Ship,
} from 'lucide-react';

/* ─── Reusable dark helpers ─────────────────────────────────────────────────── */

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-bold text-white mb-5 pb-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center mt-0.5"
        style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', boxShadow: '0 0 12px rgba(6,182,212,0.3)' }}>
        {n}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-white mb-1">{title}</p>
        <div className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{children}</div>
      </div>
    </div>
  );
}

function DarkBadge({ label, accent, dot }: { label: string; accent: string; dot: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: `${accent}18`, border: `1px solid ${accent}35`, color: accent }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
      {label}
    </span>
  );
}

function InfoBox({ icon: Icon, title, children, accent = '#3b82f6' }: {
  icon: React.ElementType; title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <div className="rounded-xl p-4"
      style={{ background: `${accent}10`, border: `1px solid ${accent}28` }}>
      <p className="font-semibold flex items-center gap-2 mb-2 text-sm" style={{ color: accent }}>
        <Icon size={14} />{title}
      </p>
      <div className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{children}</div>
    </div>
  );
}

function DarkCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl p-5 ${className}`}
      style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {children}
    </div>
  );
}

/* ─── SVG Flow Diagrams (dark-adapted) ──────────────────────────────────────── */

function ManualWorkflowDiagram() {
  const boxes = [
    { x: 20,  label: '1. SAP',    sub: 'Generate list' },
    { x: 180, label: '2. Export', sub: 'Excel / CSV' },
    { x: 340, label: '3. Upload', sub: 'Drag & drop', active: true },
    { x: 500, label: '4. Table',  sub: 'Sorted by priority' },
    { x: 660, label: '5. Track',  sub: 'Open carrier site' },
    { x: 820, label: '6. Log',    sub: 'Enter dates found' },
    { x: 980, label: '7. Export', sub: 'SAP report' },
  ];
  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 1130 80" className="w-full min-w-[700px]" style={{ height: 80 }}>
        {boxes.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={6} width={130} height={52} rx={9}
              fill={b.active ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.05)'}
              stroke={b.active ? '#06b6d4' : 'rgba(255,255,255,0.12)'} strokeWidth={1.5} />
            <text x={b.x + 65} y={29} textAnchor="middle" fontSize={12} fontWeight="700"
              fill={b.active ? '#67e8f9' : 'white'}>{b.label}</text>
            <text x={b.x + 65} y={47} textAnchor="middle" fontSize={10}
              fill={b.active ? 'rgba(103,232,249,0.7)' : 'rgba(255,255,255,0.35)'}>{b.sub}</text>
            {i < boxes.length - 1 && (
              <>
                <line x1={b.x + 130} y1={32} x2={b.x + 148} y2={32} stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} />
                <polygon points={`${b.x + 148},27 ${b.x + 158},32 ${b.x + 148},37`} fill="rgba(255,255,255,0.2)" />
              </>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function AutoWorkflowDiagram() {
  const boxes = [
    { x: 20,  label: 'App',          sub: 'Sync containers',      fill: 'rgba(59,130,246,0.3)',  stroke: '#3b82f6', tc: '#93c5fd', sc: 'rgba(147,197,253,0.6)' },
    { x: 200, label: 'GitHub',        sub: 'containers.json',      fill: 'rgba(255,255,255,0.06)',stroke: 'rgba(255,255,255,0.2)',tc: 'white',   sc: 'rgba(255,255,255,0.4)' },
    { x: 380, label: 'Actions',       sub: 'Every 4 hours',        fill: 'rgba(124,58,237,0.3)',  stroke: '#7c3aed', tc: '#c4b5fd', sc: 'rgba(196,181,253,0.6)' },
    { x: 560, label: 'Carrier APIs',  sub: 'Parallel (10 at once)',fill: 'rgba(8,145,178,0.3)',   stroke: '#0891b2', tc: '#67e8f9', sc: 'rgba(103,232,249,0.6)' },
    { x: 740, label: 'Results',       sub: 'auto-tracking.json',   fill: 'rgba(5,150,105,0.3)',   stroke: '#059669', tc: '#6ee7b7', sc: 'rgba(110,231,183,0.6)' },
  ];
  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 920 195" className="w-full min-w-[600px]" style={{ height: 195 }}>
        {boxes.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={20} width={150} height={52} rx={9} fill={b.fill} stroke={b.stroke} strokeWidth={1.5} />
            <text x={b.x + 75} y={42} textAnchor="middle" fontSize={12} fontWeight="700" fill={b.tc}>{b.label}</text>
            <text x={b.x + 75} y={59} textAnchor="middle" fontSize={10} fill={b.sc}>{b.sub}</text>
            {i < boxes.length - 1 && (
              <>
                <line x1={b.x + 150} y1={46} x2={b.x + 168} y2={46} stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} />
                <polygon points={`${b.x + 168},41 ${b.x + 178},46 ${b.x + 168},51`} fill="rgba(255,255,255,0.2)" />
              </>
            )}
          </g>
        ))}
        {/* Down arrow from Results into app */}
        <line x1={815} y1={72} x2={815} y2={100} stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} />
        <polygon points="810,100 815,110 820,100" fill="rgba(255,255,255,0.2)" />
        <rect x={655} y={110} width={320} height={36} rx={9} fill="rgba(34,197,94,0.1)" stroke="rgba(34,197,94,0.25)" strokeWidth={1.5} />
        <text x={815} y={124} textAnchor="middle" fontSize={11} fontWeight="600" fill="#4ade80">App auto-loads results every 4 hours</text>
        <text x={815} y={139} textAnchor="middle" fontSize={10} fill="rgba(74,222,128,0.6)">Statuses updated silently in background</text>
        {/* Check All Now manual path */}
        <rect x={20} y={110} width={170} height={36} rx={9} fill="rgba(8,145,178,0.25)" stroke="#0891b2" strokeWidth={1.5} />
        <text x={105} y={124} textAnchor="middle" fontSize={11} fontWeight="700" fill="#67e8f9">Check All Now</text>
        <text x={105} y={139} textAnchor="middle" fontSize={10} fill="rgba(103,232,249,0.6)">Button in header</text>
        <line x1={190} y1={128} x2={368} y2={46} stroke="#06b6d4" strokeWidth={1.5} strokeDasharray="5,3" />
        <polygon points="363,41 373,46 363,51" fill="#06b6d4" />
        <text x={268} y={95} textAnchor="middle" fontSize={9} fill="#0891b2" transform="rotate(-18,268,95)">triggers immediately</text>
      </svg>
    </div>
  );
}

function DecisionFlowDiagram() {
  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 780 330" className="w-full min-w-[600px]" style={{ height: 330 }}>
        <rect x={290} y={10} width={200} height={34} rx={8} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
        <text x={390} y={33} textAnchor="middle" fontSize={12} fontWeight="700" fill="white">SAP Status</text>

        {[
          { x: 30,  label: 'In Transit',     stroke: '#3b82f6', fill: 'rgba(59,130,246,0.15)', tc: '#93c5fd' },
          { x: 210, label: 'Discharged',      stroke: '#f59e0b', fill: 'rgba(245,158,11,0.15)', tc: '#fcd34d' },
          { x: 390, label: 'Released',        stroke: '#7c3aed', fill: 'rgba(124,58,237,0.15)', tc: '#c4b5fd' },
          { x: 570, label: 'Empty Returned',  stroke: '#059669', fill: 'rgba(5,150,105,0.15)',  tc: '#6ee7b7' },
        ].map(col => (
          <g key={col.label}>
            <rect x={col.x} y={60} width={160} height={30} rx={6} fill={col.fill} stroke={col.stroke} strokeWidth={1.5} />
            <text x={col.x + 80} y={80} textAnchor="middle" fontSize={11} fontWeight="600" fill={col.tc}>{col.label}</text>
          </g>
        ))}

        {/* In Transit decisions */}
        <line x1={110} y1={90} x2={110} y2={114} stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
        {[
          { y: 114, label: 'Carrier ETA ≠ SAP ETA',   fill: 'rgba(249,115,22,0.12)', stroke: 'rgba(249,115,22,0.35)', tc: '#fb923c', out: 'Update ETA in SAP' },
          { y: 168, label: 'Carrier shows discharge',  fill: 'rgba(249,115,22,0.12)', stroke: 'rgba(249,115,22,0.35)', tc: '#fb923c', out: 'Add Discharged event' },
          { y: 222, label: 'No change',                fill: 'rgba(34,197,94,0.08)',  stroke: 'rgba(34,197,94,0.25)',  tc: '#4ade80', out: 'No update required' },
        ].map((row, i) => (
          <g key={i}>
            <rect x={20} y={row.y} width={180} height={38} rx={6} fill={row.fill} stroke={row.stroke} strokeWidth={1.5} />
            <text x={110} y={row.y + 15} textAnchor="middle" fontSize={9} fill={row.tc} fontWeight="600">{row.label}</text>
            <text x={110} y={row.y + 29} textAnchor="middle" fontSize={9} fill={row.tc}>→ {row.out}</text>
            {i < 2 && <line x1={110} y1={row.y + 38} x2={110} y2={row.y + 52} stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="3,3" />}
          </g>
        ))}

        {/* Discharged decisions */}
        <line x1={290} y1={90} x2={290} y2={114} stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
        {[
          { y: 114, label: 'Carrier shows gate-out',            fill: 'rgba(249,115,22,0.12)', stroke: 'rgba(249,115,22,0.35)', tc: '#fb923c', out: 'Add Released event' },
          { y: 168, label: 'Empty return, no release',          fill: 'rgba(234,179,8,0.1)',   stroke: 'rgba(234,179,8,0.3)',   tc: '#facc15', out: 'Pending Review' },
          { y: 222, label: 'No release yet',                    fill: 'rgba(34,197,94,0.08)',  stroke: 'rgba(34,197,94,0.25)',  tc: '#4ade80', out: 'No update required' },
        ].map((row, i) => (
          <g key={i}>
            <rect x={200} y={row.y} width={180} height={38} rx={6} fill={row.fill} stroke={row.stroke} strokeWidth={1.5} />
            <text x={290} y={row.y + 15} textAnchor="middle" fontSize={9} fill={row.tc} fontWeight="600">{row.label}</text>
            <text x={290} y={row.y + 29} textAnchor="middle" fontSize={9} fill={row.tc}>→ {row.out}</text>
            {i < 2 && <line x1={290} y1={row.y + 38} x2={290} y2={row.y + 52} stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="3,3" />}
          </g>
        ))}

        {/* Released decisions */}
        <line x1={470} y1={90} x2={470} y2={114} stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
        {[
          { y: 114, label: 'Carrier shows empty return',  fill: 'rgba(249,115,22,0.12)', stroke: 'rgba(249,115,22,0.35)', tc: '#fb923c', out: 'Add Empty Returned event' },
          { y: 168, label: 'No empty return yet',         fill: 'rgba(34,197,94,0.08)',  stroke: 'rgba(34,197,94,0.25)',  tc: '#4ade80', out: 'No update required' },
        ].map((row, i) => (
          <g key={i}>
            <rect x={380} y={row.y} width={180} height={38} rx={6} fill={row.fill} stroke={row.stroke} strokeWidth={1.5} />
            <text x={470} y={row.y + 15} textAnchor="middle" fontSize={9} fill={row.tc} fontWeight="600">{row.label}</text>
            <text x={470} y={row.y + 29} textAnchor="middle" fontSize={9} fill={row.tc}>→ {row.out}</text>
            {i < 1 && <line x1={470} y1={row.y + 38} x2={470} y2={row.y + 52} stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="3,3" />}
          </g>
        ))}

        {/* Empty Returned */}
        <line x1={650} y1={90} x2={650} y2={114} stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
        <rect x={570} y={114} width={160} height={38} rx={6} fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.25)" strokeWidth={1.5} />
        <text x={650} y={133} textAnchor="middle" fontSize={10} fill="#4ade80" fontWeight="600">Cycle complete</text>
        <text x={650} y={147} textAnchor="middle" fontSize={9} fill="rgba(74,222,128,0.7)">→ Close / Completed</text>

        {/* Legend */}
        <rect x={20}  y={290} width={12} height={12} rx={3} fill="rgba(249,115,22,0.15)"  stroke="rgba(249,115,22,0.4)" strokeWidth={1} />
        <text x={38}  y={301} fontSize={10} fill="rgba(255,255,255,0.45)">Action Required</text>
        <rect x={165} y={290} width={12} height={12} rx={3} fill="rgba(234,179,8,0.12)"   stroke="rgba(234,179,8,0.35)"  strokeWidth={1} />
        <text x={183} y={301} fontSize={10} fill="rgba(255,255,255,0.45)">Pending Review</text>
        <rect x={320} y={290} width={12} height={12} rx={3} fill="rgba(34,197,94,0.1)"    stroke="rgba(34,197,94,0.3)"   strokeWidth={1} />
        <text x={338} y={301} fontSize={10} fill="rgba(255,255,255,0.45)">No Update Required</text>
      </svg>
    </div>
  );
}

/* ─── Nav items ──────────────────────────────────────────────────────────────── */

const NAV_ITEMS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'upload',    label: '1. Upload SAP Report' },
  { id: 'table',     label: '2. Container Table' },
  { id: 'tracking',  label: '3. Check Tracking' },
  { id: 'decisions', label: '4. Decision Logic' },
  { id: 'statuses',  label: '5. Statuses & Badges' },
  { id: 'autotrack', label: '6. Auto-Tracking (4h)' },
  { id: 'export',    label: '7. Export Reports' },
];

/* ─── Main Help Page ─────────────────────────────────────────────────────────── */

export function HelpPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen" style={{ background: '#070c1a', color: 'white' }}>

      {/* ── Header — matches MainApp ──────────────────────────────────── */}
      <header className="sticky top-0 z-40" style={{
        background: 'linear-gradient(135deg, #060b18 0%, #0d1b2e 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.4)',
      }}>
        <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center gap-4">
          <button onClick={onBack}
            className="flex items-center gap-2 text-sm transition-colors px-3 py-1.5 rounded-lg"
            style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'white')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
            <ArrowLeft size={14} /> Back to App
          </button>
          <div className="h-4 w-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>
              <Ship size={15} className="text-white" />
            </div>
            <span className="font-bold text-sm text-white">ContainerFlow — User Guide</span>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-8 flex gap-8">

        {/* ── Sidebar ───────────────────────────────────────────────── */}
        <aside className="hidden lg:block w-52 shrink-0">
          <nav className="sticky top-24 space-y-0.5">
            {NAV_ITEMS.map(item => (
              <a key={item.id} href={`#${item.id}`}
                className="block text-xs px-3 py-2 rounded-lg transition-all"
                style={{ color: 'rgba(255,255,255,0.45)' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#67e8f9'; e.currentTarget.style.background = 'rgba(6,182,212,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.background = ''; }}>
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* ── Content ───────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 space-y-14">

          {/* ── Overview ── */}
          <Section id="overview" title="Overview">
            <p className="mb-6 leading-relaxed text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
              ContainerFlow replaces the manual weekly process of checking SAP against carrier websites one-by-one.
              Upload your SAP report, the system compares statuses automatically, tells you exactly what action to take, and pulls live tracking data from carrier APIs without you touching a browser.
            </p>

            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Weekly workflow</p>
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <ManualWorkflowDiagram />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {[
                { icon: Upload,    title: 'Upload',        desc: 'Drag & drop your SAP Excel/CSV — parsed and sorted by operational risk automatically.', accent: '#06b6d4' },
                { icon: Table2,    title: 'Review',        desc: 'A colour-coded table shows every container with its priority and the exact action needed.', accent: '#3b82f6' },
                { icon: RefreshCw, title: 'Check All Now', desc: 'One click queries all carrier APIs in parallel and updates every container — no individual checks.', accent: '#7c3aed' },
                { icon: Download,  title: 'Export',        desc: 'Generate a ready-to-use SAP update report in Excel — no more noting down changes manually.', accent: '#22c55e' },
              ].map(card => {
                const Icon = card.icon;
                return (
                  <DarkCard key={card.title}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: `${card.accent}15`, border: `1px solid ${card.accent}30` }}>
                      <Icon size={17} style={{ color: card.accent }} />
                    </div>
                    <p className="font-semibold text-white text-sm mb-1">{card.title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{card.desc}</p>
                  </DarkCard>
                );
              })}
            </div>
          </Section>

          {/* ── Upload ── */}
          <Section id="upload" title="1. Upload Your SAP Report">
            <InfoBox icon={FileSpreadsheet} title="Supported file types" accent="#3b82f6">
              <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd' }}>.xlsx</code>{' '}
              <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd' }}>.xls</code>{' '}
              <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd' }}>.csv</code>
              {' '}— exported directly from SAP. Column names are matched flexibly (case-insensitive, common aliases recognised).
            </InfoBox>

            <div className="mt-5 space-y-4">
              <Step n={1} title="Generate the SAP report">
                Every Wednesday, run your standard SAP report for all shipped containers with a pending logistics event. Include containers in transit, discharged, and released.
              </Step>
              <Step n={2} title="Export as Excel or CSV">
                Export from SAP in <strong style={{ color: 'white' }}>Excel (.xlsx)</strong> or <strong style={{ color: 'white' }}>CSV</strong> format. No special formatting needed.
              </Step>
              <Step n={3} title="Click 'Upload SAP Report'">
                Click the <strong style={{ color: '#67e8f9' }}>Upload SAP</strong> button at the top of the app, then drag your file into the upload zone — or click to browse.
              </Step>
              <Step n={4} title="Review the loaded containers">
                The system parses the file, computes priorities, and sorts automatically. High-risk containers appear first.
              </Step>
            </div>

            <div className="mt-6 rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Required columns (flexible naming)</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  ['Booking Number',           'Required'],
                  ['Container Number',         'Required'],
                  ['Shipping Line / Carrier',  'Required'],
                  ['SAP ETA',                  'Required'],
                  ['Current SAP Status',       'Required'],
                  ['Last Event Date',          'Required'],
                  ['Destination Port',         'Recommended'],
                  ['Customer / Importer',      'Recommended'],
                  ['Vessel / Voyage',          'Recommended'],
                  ['POD',                      'Recommended'],
                  ['Contract / Reference',     'Optional'],
                  ['POL',                      'Optional'],
                ].map(([col, req]) => (
                  <div key={col} className="flex items-start gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    <span className="mt-0.5 w-2 h-2 rounded-full shrink-0" style={{
                      background: req === 'Required' ? '#06b6d4' : req === 'Recommended' ? '#f59e0b' : 'rgba(255,255,255,0.2)'
                    }} />
                    <span>{col} <span style={{ color: 'rgba(255,255,255,0.3)' }}>({req})</span></span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ── Table ── */}
          <Section id="table" title="2. Understanding the Container Table">
            <p className="text-sm mb-5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              The main table shows all active containers sorted by operational priority. Containers that need urgent action appear first.
            </p>

            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>Column</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>What it means</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Priority',             'Red = High risk, Amber = Medium, Green = Low. Containers sorted High → Low automatically.'],
                      ['Container / Booking',  'The container and booking numbers from SAP.'],
                      ['Carrier',              'The shipping line. Used to generate the direct tracking link.'],
                      ['SAP Status',           'The current status recorded in SAP (In Transit, Discharged, Released, etc.).'],
                      ['SAP ETA',              'The estimated arrival date currently in SAP.'],
                      ['Carrier ETA',          'ETA from carrier tracking — highlighted in orange if different from SAP.'],
                      ['Last Carrier Event',   'The most recent event from the carrier API or manual entry.'],
                      ['Review Status',        "The system's assessment: Action Required / Pending Review / No Update Required / Completed."],
                      ['Suggested Action',     'The exact step to take in SAP — e.g. "Add container discharged event".'],
                      ['Last Checked',         'When tracking was last checked for this container.'],
                    ].map(([col, desc], i) => (
                      <tr key={col} style={{ borderBottom: i < 9 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td className="px-4 py-3 font-medium text-xs whitespace-nowrap" style={{ color: '#67e8f9' }}>{col}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <DarkCard>
                <p className="text-sm font-semibold text-white mb-3">Row action buttons</p>
                <div className="space-y-3">
                  {[
                    { icon: Eye,           color: '#67e8f9', label: 'View Details',          desc: 'Opens the full container detail panel with tracking entry, notes, and history.' },
                    { icon: ExternalLink,  color: '#60a5fa', label: 'Open Carrier Tracking',  desc: "Opens the carrier's website directly with the booking number pre-filled in the URL." },
                    { icon: CheckCircle,   color: '#4ade80', label: 'Approve Update',         desc: 'Appears when Action Required. Marks the suggested update as approved.' },
                    { icon: RefreshCw,     color: 'rgba(255,255,255,0.5)', label: 'Mark as Checked', desc: "Records that you've checked this container even if no update is needed." },
                    { icon: AlertTriangle, color: '#facc15', label: 'Mark Pending Review',    desc: 'Manually flag a container for review with a custom reason.' },
                  ].map(b => {
                    const Icon = b.icon;
                    return (
                      <div key={b.label} className="flex items-start gap-3 text-sm">
                        <Icon size={15} className="mt-0.5 shrink-0" style={{ color: b.color }} />
                        <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                          <strong style={{ color: 'white' }}>{b.label}</strong> — {b.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </DarkCard>
            </div>
          </Section>

          {/* ── Tracking ── */}
          <Section id="tracking" title="3. Checking Carrier Tracking (Manual)">
            <p className="text-sm mb-5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Click the <strong style={{ color: '#67e8f9' }}>eye icon</strong> on any container row to open the detail panel. The guided workflow panel takes you through the check in 3 steps.
            </p>

            <div className="rounded-xl p-5 space-y-5"
              style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.18)' }}>
              <Step n={1} title="Open carrier tracking">
                Click <strong style={{ color: 'white' }}>"Open [Carrier] Tracking"</strong>. The carrier's website opens in a new tab with the booking number embedded — no copy-pasting needed.
              </Step>
              <Step n={2} title="Check the carrier's website">
                A carrier-specific hint tells you exactly what to look for (e.g. <em style={{ color: 'rgba(255,255,255,0.6)' }}>"Look for the Milestones tab. Note the discharge date, gate-out date, and ETA."</em>)
              </Step>
              <Step n={3} title="Log what you found">
                Click <strong style={{ color: 'white' }}>"Log Status"</strong> and enter the dates found:
                <ul className="mt-2 space-y-1 list-none pl-2">
                  {['Carrier ETA (if different from SAP)', 'Discharge date', 'Release / Gate-out date', 'Empty return date'].map(item => (
                    <li key={item} className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#06b6d4' }} />{item}
                    </li>
                  ))}
                </ul>
                Hit <strong style={{ color: 'white' }}>Save &amp; Recompute</strong> — the decision engine instantly recalculates the suggested action.
              </Step>
            </div>
          </Section>

          {/* ── Decision Logic ── */}
          <Section id="decisions" title="4. How the Decision Engine Works">
            <p className="text-sm mb-6 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              The system asks: <em style={{ color: 'rgba(255,255,255,0.7)' }}>"What is the next expected event for this container?"</em> It compares the current SAP status against what the carrier shows and suggests the correct SAP update.
            </p>

            <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Container lifecycle &amp; decisions</p>
              <DecisionFlowDiagram />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <InfoBox icon={AlertTriangle} title="When is Priority = High?" accent="#f59e0b">
                <ul className="space-y-1 mt-1">
                  {['Container discharged > 5 days ago, not yet released', 'Container released > 7 days ago, not yet returned empty', 'SAP ETA passed but no discharge event found', 'Status is Pending Review', 'Booking number is missing'].map(item => (
                    <li key={item} className="flex items-start gap-2 text-xs"><span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#f59e0b' }} />{item}</li>
                  ))}
                </ul>
              </InfoBox>
              <InfoBox icon={Clock} title="Pending Review cases" accent="#f59e0b">
                <ul className="space-y-1 mt-1">
                  {['Carrier shows empty return but no release date', 'Booking not found on carrier website', 'Carrier ETA is blank', 'Ambiguous event wording', 'SAP status is more advanced than carrier'].map(item => (
                    <li key={item} className="flex items-start gap-2 text-xs"><span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#f59e0b' }} />{item}</li>
                  ))}
                </ul>
              </InfoBox>
            </div>
          </Section>

          {/* ── Statuses ── */}
          <Section id="statuses" title="5. Statuses & Badge Reference">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DarkCard>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Priority badges</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <DarkBadge label="High"   accent="#f87171" dot="#ef4444" />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Immediate attention — overdue or at-risk containers</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <DarkBadge label="Medium" accent="#fbbf24" dot="#f59e0b" />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>ETA changed or container arriving soon</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <DarkBadge label="Low"    accent="#4ade80" dot="#22c55e" />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Container in transit with future ETA, no change</span>
                  </div>
                </div>
              </DarkCard>

              <DarkCard>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Review status badges</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <DarkBadge label="Action Required"    accent="#fb923c" dot="#f97316" />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>An SAP event or ETA update is needed</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <DarkBadge label="Pending Review"     accent="#facc15" dot="#eab308" />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Cannot determine action automatically</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <DarkBadge label="No Update Required" accent="#60a5fa" dot="#3b82f6" />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>No change needed based on current tracking data</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <DarkBadge label="Completed"          accent="#4ade80" dot="#22c55e" />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Empty returned — logistics cycle complete</span>
                  </div>
                </div>
              </DarkCard>

              <div className="md:col-span-2 rounded-xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="px-4 py-3" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>Suggested actions reference</p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {['Suggested Action', 'When it appears', 'What to do in SAP'].map(h => (
                        <th key={h} className="px-4 py-2 text-left" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Update ETA in SAP',              'Carrier ETA ≠ SAP ETA, no discharge yet',   'Update the ETA field in SAP — do NOT add an event'],
                      ['Add container discharged event', 'SAP = In Transit, carrier shows discharge',  'Add event "Container Discharged" with the carrier discharge date'],
                      ['Add container released event',   'SAP = Discharged, carrier shows gate-out',  'Add event "Container Released" with the gate-out date'],
                      ['Add empty returned event',       'SAP = Released, carrier shows empty return','Add event "Empty Returned" with the return date'],
                      ['Review manually',                'Ambiguous or inconsistent data',            'Open carrier website and investigate manually'],
                      ['No update required',             'No relevant change detected',               'No action needed — container is on track'],
                      ['Close / completed',              'SAP = Empty Returned',                      'No action — cycle is complete'],
                    ].map(([action, when, todo], i, arr) => (
                      <tr key={action} style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td className="px-4 py-2.5 font-medium" style={{ color: '#67e8f9' }}>{action}</td>
                        <td className="px-4 py-2.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{when}</td>
                        <td className="px-4 py-2.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{todo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Section>

          {/* ── Auto-tracking ── */}
          <Section id="autotrack" title="6. Automated Tracking (GitHub Actions)">
            <p className="text-sm mb-5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Once configured, the system queries all carrier APIs <strong style={{ color: 'white' }}>every 4 hours</strong> in parallel — no manual checking required for supported carriers. Results are merged into the app each time the page is open.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <InfoBox icon={RefreshCw} title="Check All Now — manual trigger" accent="#06b6d4">
                The <strong style={{ color: 'white' }}>cyan "Check All Now" button</strong> in the header triggers an immediate GitHub Actions run querying all APIs in parallel (up to 10 at once). Updates appear in 2–4 minutes with a live status banner.
              </InfoBox>
              <InfoBox icon={Zap} title="Background auto-refresh — every 4 hours" accent="#7c3aed">
                While the app tab is open, it silently fetches the latest results from GitHub every 4 hours. If the scheduled workflow has run since your last visit, statuses merge automatically — no button needed.
              </InfoBox>
            </div>

            <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Automated tracking pipeline</p>
              <AutoWorkflowDiagram />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <DarkCard>
                <p className="text-sm font-semibold text-white mb-3">Supported carrier APIs</p>
                <div className="space-y-2">
                  {[
                    { carrier: 'Maersk / ANL',  api: 'Maersk Track v2',     limit: '~25 /day',   accent: '#3b82f6' },
                    { carrier: 'CMA CGM',        api: 'CMA CGM DCSA API',    limit: '~200 /day',  accent: '#06b6d4' },
                    { carrier: 'Hapag-Lloyd',    api: 'HL DCSA API',         limit: '~100 /day',  accent: '#7c3aed' },
                    { carrier: 'MSC',            api: 'MSC DCSA API',        limit: '~200 /day',  accent: '#f97316' },
                    { carrier: '170+ carriers',  api: 'Sinay universal API', limit: '~500 /day',  accent: '#22c55e' },
                  ].map(row => (
                    <div key={row.carrier} className="flex items-center justify-between text-xs gap-2">
                      <span className="font-medium w-28 shrink-0" style={{ color: row.accent }}>{row.carrier}</span>
                      <span className="flex-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{row.api}</span>
                      <span className="font-semibold whitespace-nowrap" style={{ color: '#4ade80' }}>{row.limit}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  At 4-hour intervals, usage stays well within free tier limits. Containers checked in the last 3 hours are skipped to preserve quota.
                </p>
              </DarkCard>

              <DarkCard>
                <p className="text-sm font-semibold text-white mb-3">One-time setup checklist</p>
                <div className="space-y-2.5">
                  {[
                    ['Get a GitHub PAT',         'github.com/settings/tokens → "repo" scope'],
                    ['Register at Sinay',         'app.sinay.ai → free API key (170+ carriers)'],
                    ['Add SINAY_API_KEY secret',  'Repo → Settings → Secrets → Actions'],
                    ['Sync containers',           '⚡ Auto-Track → Step 1 → Sync Now'],
                    ['Test with Check All Now',   'Click the cyan button — wait 2–4 min'],
                    ['Results load automatically','App refreshes silently every 4 h while open'],
                  ].map(([step, detail], i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="mt-0.5 shrink-0" style={{ color: '#7c3aed' }} />
                      <div>
                        <p className="text-xs font-medium text-white">{step}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </DarkCard>
            </div>

            <InfoBox icon={Zap} title="Quickest path to automation" accent="#7c3aed">
              Register at{' '}
              <a href="https://app.sinay.ai" className="underline font-medium" target="_blank" rel="noopener noreferrer"
                style={{ color: '#c4b5fd' }}>app.sinay.ai</a>{' '}
              — free API key in under 2 minutes. Add it as{' '}
              <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }}>SINAY_API_KEY</code>{' '}
              in your GitHub repo secrets. One key covers all 170+ carriers. Then click <strong style={{ color: 'white' }}>Check All Now</strong> to see it work immediately.
            </InfoBox>
          </Section>

          {/* ── Export ── */}
          <Section id="export" title="7. Exporting Reports">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DarkCard>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
                    <Download size={15} style={{ color: '#4ade80' }} />
                  </div>
                  <p className="font-semibold text-white text-sm">Export SAP Updates</p>
                </div>
                <p className="text-xs leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Exports only containers with <strong style={{ color: 'white' }}>Action Required</strong> or <strong style={{ color: 'white' }}>Pending Review</strong> status. Each row contains the container, booking, carrier, current SAP status, suggested action, and the event date to enter in SAP.
                </p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Use this as your weekly SAP update task list.</p>
              </DarkCard>

              <DarkCard>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    <GitBranch size={15} style={{ color: 'rgba(255,255,255,0.6)' }} />
                  </div>
                  <p className="font-semibold text-white text-sm">Full Report</p>
                </div>
                <p className="text-xs leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Exports <strong style={{ color: 'white' }}>all containers</strong> regardless of status — including No Update Required and Completed. Useful for weekly reporting or archiving.
                </p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Both reports are exported as Excel (.xlsx) files.</p>
              </DarkCard>
            </div>

            <div className="mt-4 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>SAP update report fields</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['Container Number', 'Booking Number', 'Carrier', 'Customer', 'Destination', 'SAP Status', 'Suggested Action', 'Event Date', 'SAP ETA', 'Carrier ETA', 'Priority', 'Notes'].map(f => (
                  <span key={f} className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#4ade80' }} />{f}
                  </span>
                ))}
              </div>
            </div>
          </Section>

        </main>
      </div>
    </div>
  );
}
