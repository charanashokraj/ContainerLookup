import {
  Upload,
  Table2,
  Eye,
  ExternalLink,
  Download,
  Zap,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  FileSpreadsheet,
  RefreshCw,
  GitBranch,
  Package,
  CheckCircle2,
} from 'lucide-react';

/* ─── Reusable helpers ─────────────────────────────────────────────────────── */

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-2xl font-bold text-slate-800 mb-5 pb-3 border-b border-slate-200">{title}</h2>
      {children}
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center mt-0.5">{n}</div>
      <div className="flex-1">
        <p className="font-semibold text-slate-800 mb-1">{title}</p>
        <div className="text-sm text-slate-600">{children}</div>
      </div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
      {label}
    </span>
  );
}

function InfoBox({ icon: Icon, title, children, color = 'blue' }: {
  icon: React.ElementType; title: string; children: React.ReactNode; color?: string;
}) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-50   border-blue-200   text-blue-800',
    green:  'bg-green-50  border-green-200  text-green-800',
    amber:  'bg-amber-50  border-amber-200  text-amber-800',
    violet: 'bg-violet-50 border-violet-200 text-violet-800',
  };
  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <p className="font-semibold flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />{title}
      </p>
      <div className="text-sm opacity-90">{children}</div>
    </div>
  );
}

/* ─── SVG Flow Diagrams ────────────────────────────────────────────────────── */

function ManualWorkflowDiagram() {
  const boxes = [
    { x: 20,  label: '1. SAP', sub: 'Generate container list' },
    { x: 180, label: '2. Export', sub: 'Excel / CSV' },
    { x: 340, label: '3. Upload', sub: 'Drag & drop into app' },
    { x: 500, label: '4. Table', sub: 'Sorted by priority' },
    { x: 660, label: '5. Track', sub: 'Open carrier website' },
    { x: 820, label: '6. Log', sub: 'Enter dates found' },
    { x: 980, label: '7. Export', sub: 'SAP update report' },
  ];
  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 1130 90" className="w-full min-w-[700px]" style={{ height: 90 }}>
        {boxes.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={8} width={130} height={56} rx={10}
              fill={i === 2 ? '#2563eb' : '#f1f5f9'} stroke={i === 2 ? '#1d4ed8' : '#cbd5e1'} strokeWidth={1.5} />
            <text x={b.x + 65} y={31} textAnchor="middle" fontSize={12}
              fontWeight="600" fill={i === 2 ? '#fff' : '#1e293b'}>{b.label}</text>
            <text x={b.x + 65} y={50} textAnchor="middle" fontSize={10}
              fill={i === 2 ? '#bfdbfe' : '#64748b'}>{b.sub}</text>
            {i < boxes.length - 1 && (
              <>
                <line x1={b.x + 130} y1={36} x2={b.x + 148} y2={36} stroke="#94a3b8" strokeWidth={1.5} />
                <polygon points={`${b.x + 148},31 ${b.x + 158},36 ${b.x + 148},41`} fill="#94a3b8" />
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
    { x: 20,  label: 'App',         sub: 'Sync containers',     color: '#2563eb', tc: '#fff', sc: '#93c5fd' },
    { x: 200, label: 'GitHub',      sub: 'data/containers.json', color: '#1e293b', tc: '#fff', sc: '#94a3b8' },
    { x: 380, label: 'Actions',     sub: 'Every 4 hours',        color: '#7c3aed', tc: '#fff', sc: '#c4b5fd' },
    { x: 560, label: 'Carrier APIs',sub: 'Parallel (10 at once)',color: '#0891b2', tc: '#fff', sc: '#a5f3fc' },
    { x: 740, label: 'Results',     sub: 'auto-tracking.json',   color: '#059669', tc: '#fff', sc: '#6ee7b7' },
  ];
  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 920 200" className="w-full min-w-[600px]" style={{ height: 200 }}>
        {/* Scheduled flow */}
        {boxes.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={20} width={150} height={56} rx={10} fill={b.color} stroke="transparent" />
            <text x={b.x + 75} y={44} textAnchor="middle" fontSize={12} fontWeight="700" fill={b.tc}>{b.label}</text>
            <text x={b.x + 75} y={62} textAnchor="middle" fontSize={10} fill={b.sc}>{b.sub}</text>
            {i < boxes.length - 1 && (
              <>
                <line x1={b.x + 150} y1={48} x2={b.x + 168} y2={48} stroke="#94a3b8" strokeWidth={1.5} />
                <polygon points={`${b.x + 168},43 ${b.x + 178},48 ${b.x + 168},53`} fill="#94a3b8" />
              </>
            )}
          </g>
        ))}

        {/* Down arrow from Results into app */}
        <line x1={815} y1={76} x2={815} y2={106} stroke="#94a3b8" strokeWidth={1.5} />
        <polygon points="810,106 815,116 820,106" fill="#94a3b8" />
        <rect x={660} y={116} width={310} height={36} rx={10} fill="#f0fdf4" stroke="#bbf7d0" strokeWidth={1.5} />
        <text x={815} y={130} textAnchor="middle" fontSize={11} fontWeight="600" fill="#166534">App auto-loads results every 4 hours</text>
        <text x={815} y={145} textAnchor="middle" fontSize={10} fill="#16a34a">Statuses &amp; priorities updated silently in background</text>

        {/* Check All Now manual path */}
        <rect x={20} y={116} width={170} height={36} rx={10} fill="#0e7490" stroke="transparent" />
        <text x={105} y={130} textAnchor="middle" fontSize={11} fontWeight="700" fill="#fff">Check All Now</text>
        <text x={105} y={145} textAnchor="middle" fontSize={10} fill="#a5f3fc">Button in header</text>
        <line x1={190} y1={134} x2={368} y2={48} stroke="#06b6d4" strokeWidth={1.5} strokeDasharray="5,3" />
        <polygon points="364,43 374,48 364,53" fill="#06b6d4" />
        <text x={270} y={100} textAnchor="middle" fontSize={9} fill="#0891b2" transform="rotate(-18,270,100)">triggers immediately</text>
      </svg>
    </div>
  );
}

function DecisionFlowDiagram() {
  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 780 340" className="w-full min-w-[600px]" style={{ height: 340 }}>
        {/* Header */}
        <rect x={290} y={10} width={200} height={36} rx={8} fill="#1e293b" />
        <text x={390} y={34} textAnchor="middle" fontSize={13} fontWeight="700" fill="#fff">SAP Status</text>

        {/* Columns */}
        {[
          { x: 30,  label: 'In Transit',          color: '#2563eb' },
          { x: 210, label: 'Discharged',           color: '#d97706' },
          { x: 390, label: 'Released',             color: '#7c3aed' },
          { x: 570, label: 'Empty Returned',       color: '#059669' },
        ].map((col) => (
          <g key={col.label}>
            <rect x={col.x} y={62} width={160} height={32} rx={6} fill={col.color} opacity={0.15} stroke={col.color} strokeWidth={1.5} />
            <text x={col.x + 80} y={83} textAnchor="middle" fontSize={11} fontWeight="600" fill={col.color}>{col.label}</text>
          </g>
        ))}

        {/* Decision arrows + outcomes */}
        {/* In Transit */}
        <line x1={110} y1={94} x2={110} y2={118} stroke="#64748b" strokeWidth={1.5} />
        {[
          { y: 118, label: 'Carrier ETA ≠ SAP ETA', bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', out: 'Update ETA in SAP' },
          { y: 174, label: 'Carrier shows discharge',  bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', out: 'Add Discharged event' },
          { y: 230, label: 'No change',                bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', out: 'No update required' },
        ].map((row, i) => (
          <g key={i}>
            <rect x={20} y={row.y} width={180} height={40} rx={6} fill={row.bg} stroke={row.border} strokeWidth={1.5} />
            <text x={110} y={row.y + 16} textAnchor="middle" fontSize={9} fill={row.text} fontWeight="600">{row.label}</text>
            <text x={110} y={row.y + 30} textAnchor="middle" fontSize={9} fill={row.text}>→ {row.out}</text>
            {i < 2 && <line x1={110} y1={row.y + 40} x2={110} y2={row.y + 54} stroke="#64748b" strokeWidth={1} strokeDasharray="3,3" />}
          </g>
        ))}

        {/* Discharged */}
        <line x1={290} y1={94} x2={290} y2={118} stroke="#64748b" strokeWidth={1.5} />
        {[
          { y: 118, label: 'Carrier shows gate-out',   bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', out: 'Add Released event' },
          { y: 174, label: 'Carrier shows empty return (no release)', bg: '#fefce8', border: '#fef08a', text: '#854d0e', out: 'Pending Review' },
          { y: 230, label: 'No release yet',           bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', out: 'No update required' },
        ].map((row, i) => (
          <g key={i}>
            <rect x={200} y={row.y} width={180} height={40} rx={6} fill={row.bg} stroke={row.border} strokeWidth={1.5} />
            <text x={290} y={row.y + 16} textAnchor="middle" fontSize={9} fill={row.text} fontWeight="600">{row.label}</text>
            <text x={290} y={row.y + 30} textAnchor="middle" fontSize={9} fill={row.text}>→ {row.out}</text>
            {i < 2 && <line x1={290} y1={row.y + 40} x2={290} y2={row.y + 54} stroke="#64748b" strokeWidth={1} strokeDasharray="3,3" />}
          </g>
        ))}

        {/* Released */}
        <line x1={470} y1={94} x2={470} y2={118} stroke="#64748b" strokeWidth={1.5} />
        {[
          { y: 118, label: 'Carrier shows empty return', bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', out: 'Add Empty Returned event' },
          { y: 174, label: 'No empty return yet',        bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', out: 'No update required' },
        ].map((row, i) => (
          <g key={i}>
            <rect x={380} y={row.y} width={180} height={40} rx={6} fill={row.bg} stroke={row.border} strokeWidth={1.5} />
            <text x={470} y={row.y + 16} textAnchor="middle" fontSize={9} fill={row.text} fontWeight="600">{row.label}</text>
            <text x={470} y={row.y + 30} textAnchor="middle" fontSize={9} fill={row.text}>→ {row.out}</text>
            {i < 1 && <line x1={470} y1={row.y + 40} x2={470} y2={row.y + 54} stroke="#64748b" strokeWidth={1} strokeDasharray="3,3" />}
          </g>
        ))}

        {/* Empty Returned */}
        <line x1={650} y1={94} x2={650} y2={118} stroke="#64748b" strokeWidth={1.5} />
        <rect x={570} y={118} width={160} height={40} rx={6} fill="#f0fdf4" stroke="#bbf7d0" strokeWidth={1.5} />
        <text x={650} y={138} textAnchor="middle" fontSize={10} fill="#166534" fontWeight="600">Cycle complete</text>
        <text x={650} y={152} textAnchor="middle" fontSize={9} fill="#166534">→ Close / Completed</text>

        {/* Legend */}
        <rect x={20} y={300} width={14} height={14} rx={3} fill="#fff7ed" stroke="#fed7aa" />
        <text x={40} y={312} fontSize={10} fill="#64748b">Action Required</text>
        <rect x={170} y={300} width={14} height={14} rx={3} fill="#fefce8" stroke="#fef08a" />
        <text x={190} y={312} fontSize={10} fill="#64748b">Pending Review</text>
        <rect x={330} y={300} width={14} height={14} rx={3} fill="#f0fdf4" stroke="#bbf7d0" />
        <text x={350} y={312} fontSize={10} fill="#64748b">No Update Required</text>
      </svg>
    </div>
  );
}

/* ─── Main Help Page ───────────────────────────────────────────────────────── */

const NAV_ITEMS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'upload',     label: '1. Upload SAP Report' },
  { id: 'table',      label: '2. Container Table' },
  { id: 'tracking',   label: '3. Check Tracking' },
  { id: 'decisions',  label: '4. Decision Logic' },
  { id: 'statuses',   label: '5. Statuses & Badges' },
  { id: 'autotrack',  label: '6. Auto-Tracking (every 4h)' },
  { id: 'export',     label: '7. Export Reports' },
];

export function HelpPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowRight className="w-4 h-4 rotate-180" /> Back to App
            </button>
            <span className="text-slate-300">|</span>
            <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" /> Container Tracking — User Guide
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar navigation */}
        <aside className="hidden lg:block w-56 shrink-0">
          <nav className="sticky top-24 space-y-1">
            {NAV_ITEMS.map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block text-sm px-3 py-2 rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 space-y-14">

          {/* ── Overview ── */}
          <Section id="overview" title="Overview">
            <p className="text-slate-600 mb-6 leading-relaxed">
              The Container Tracking System replaces the manual weekly process of checking SAP against carrier websites one-by-one.
              Instead, you upload your SAP report, the system compares statuses automatically, tells you exactly what action to take in SAP, and can even pull live tracking data from carrier APIs without you touching a browser.
            </p>

            <div className="mb-6">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Weekly workflow</p>
              <ManualWorkflowDiagram />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { icon: Upload,     title: 'Upload',        desc: 'Drag & drop your SAP Excel/CSV export — the system parses it and sorts containers by operational risk automatically.' },
                { icon: Table2,     title: 'Review',        desc: 'A colour-coded table shows every container with its priority, current SAP status, and the exact action needed.' },
                { icon: RefreshCw,  title: 'Check All Now', desc: 'One click queries all carrier APIs in parallel and updates every container automatically — no individual checks needed.' },
                { icon: Download,   title: 'Export',        desc: 'Generate a ready-to-use SAP update report in Excel — no more manually noting down what needs to change.' },
              ].map(card => (
                <div key={card.title} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <div className="p-2 bg-blue-50 rounded-lg w-fit mb-3">
                    <card.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="font-semibold text-slate-800 mb-1">{card.title}</p>
                  <p className="text-sm text-slate-500">{card.desc}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Upload ── */}
          <Section id="upload" title="1. Upload Your SAP Report">
            <InfoBox icon={FileSpreadsheet} title="Supported file types" color="blue">
              <code className="bg-blue-100 px-1 rounded">.xlsx</code> &nbsp;
              <code className="bg-blue-100 px-1 rounded">.xls</code> &nbsp;
              <code className="bg-blue-100 px-1 rounded">.csv</code> — exported directly from SAP. Column names are matched flexibly (case-insensitive, common aliases recognised).
            </InfoBox>

            <div className="mt-5 space-y-4">
              <Step n={1} title="Generate the SAP report">
                Every Wednesday, run your standard SAP report for all shipped containers with a pending logistics event. Include containers in transit, discharged, and released (but not empty-returned yet).
              </Step>
              <Step n={2} title="Export as Excel or CSV">
                Export the report from SAP in <strong>Excel (.xlsx)</strong> or <strong>CSV</strong> format. No special formatting is needed.
              </Step>
              <Step n={3} title="Click 'Upload SAP Report'">
                Click the blue <strong>Upload SAP Report</strong> button at the top of the app, then drag your file into the upload zone — or click to browse.
              </Step>
              <Step n={4} title="Review the loaded containers">
                The system parses the file, computes priorities, and sorts the table automatically. High-risk containers appear at the top.
              </Step>
            </div>

            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-slate-700 mb-3">Required columns (flexible naming)</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  ['Booking Number', 'Required'],
                  ['Container Number', 'Required'],
                  ['Shipping Line / Carrier', 'Required'],
                  ['SAP ETA', 'Required'],
                  ['Current SAP Status', 'Required'],
                  ['Last Event Date', 'Required'],
                  ['Destination Port', 'Recommended'],
                  ['Customer / Importer', 'Recommended'],
                  ['Vessel / Voyage', 'Recommended'],
                  ['POD', 'Recommended'],
                  ['Contract / Reference', 'Optional'],
                  ['POL', 'Optional'],
                ].map(([col, req]) => (
                  <div key={col} className="flex items-start gap-1.5 text-xs text-slate-600">
                    <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${req === 'Required' ? 'bg-blue-500' : req === 'Recommended' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                    <span>{col} <span className="text-slate-400">({req})</span></span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ── Table ── */}
          <Section id="table" title="2. Understanding the Container Table">
            <p className="text-slate-600 mb-5">
              The main table shows all active containers sorted by operational priority. Containers that need urgent action appear first.
            </p>

            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Column</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">What it means</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      ['Priority',           'Red = High risk, Amber = Medium, Green = Low. Containers are sorted High → Low automatically.'],
                      ['Container / Booking','The container and booking numbers from SAP.'],
                      ['Carrier',            'The shipping line. Used to generate the direct tracking link.'],
                      ['SAP Status',         'The current status recorded in SAP (In Transit, Discharged, Released, etc.).'],
                      ['SAP ETA',            'The estimated arrival date currently in SAP.'],
                      ['Carrier ETA',        'ETA found through carrier tracking. Highlighted in orange if different from SAP.'],
                      ['Last Carrier Event', 'The most recent event from the carrier (after you log tracking data).'],
                      ['Review Status',      "The system's assessment: Action Required / Pending Review / No Update Required / Completed."],
                      ['Suggested Action',   'The exact step to take in SAP — e.g. "Add container discharged event".'],
                      ['Last Checked',       'When tracking was last checked for this container.'],
                    ].map(([col, desc]) => (
                      <tr key={col} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{col}</td>
                        <td className="px-4 py-3 text-slate-500">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-700 mb-3">Row action buttons</p>
                <div className="space-y-2 text-sm text-slate-600">
                  {[
                    { icon: Eye,           color: 'text-slate-500', label: 'View Details',          desc: 'Opens the full container detail panel with tracking entry, notes, and history.' },
                    { icon: ExternalLink,  color: 'text-blue-500',  label: 'Open Carrier Tracking', desc: 'Opens the carrier\'s website directly with the booking number pre-filled in the URL.' },
                    { icon: CheckCircle,   color: 'text-green-600', label: 'Approve Update',        desc: 'Appears when Action Required. Marks the suggested update as approved.' },
                    { icon: RefreshCw,     color: 'text-slate-400', label: 'Mark as Checked',       desc: 'Records that you\'ve checked this container even if no update is needed.' },
                    { icon: AlertTriangle, color: 'text-yellow-500',label: 'Mark Pending Review',   desc: 'Manually flag a container for review with a custom reason.' },
                  ].map(b => (
                    <div key={b.label} className="flex items-start gap-3">
                      <b.icon className={`w-4 h-4 mt-0.5 shrink-0 ${b.color}`} />
                      <span><strong>{b.label}</strong> — {b.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-700 mb-3">Filters</p>
                <p className="text-sm text-slate-500">
                  Use the filter bar above the table to narrow down by <strong>Status</strong>, <strong>Priority</strong>, <strong>Carrier</strong>, <strong>Customer</strong>, or <strong>Destination</strong>. The search box matches on container number, booking, customer name, or carrier.
                </p>
              </div>
            </div>
          </Section>

          {/* ── Tracking ── */}
          <Section id="tracking" title="3. Checking Carrier Tracking (Manual)">
            <p className="text-slate-600 mb-5">
              Click the <strong>eye icon</strong> on any container row to open the detail panel. The blue tracking workflow panel guides you through the check in 3 steps.
            </p>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <div className="space-y-5">
                  <Step n={1} title="Open carrier tracking">
                    Click <strong>"Open [Carrier] Tracking"</strong>. The carrier's website opens in a new tab with the booking number embedded in the URL — no copy-pasting needed.
                    <br /><br />
                    If the booking number wasn't pre-filled, use the copy buttons (📋) next to the booking and container numbers shown in the panel.
                  </Step>
                  <Step n={2} title="Check the carrier's website">
                    A carrier-specific hint tells you exactly what to look for (e.g. <em>"Look for the Milestones tab. Note the discharge date, gate-out date, and ETA."</em>)
                  </Step>
                  <Step n={3} title="Log what you found">
                    Click <strong>"Log Status"</strong>. Enter just the dates you found:
                    <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600">
                      <li>Carrier ETA (if different from SAP)</li>
                      <li>Discharge date (container unloaded at port)</li>
                      <li>Release / Gate-out date (customer picked up)</li>
                      <li>Empty return date</li>
                    </ul>
                    Hit <strong>Save &amp; Recompute</strong> — the decision engine instantly recalculates the suggested action.
                  </Step>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Decision Logic ── */}
          <Section id="decisions" title="4. How the Decision Engine Works">
            <p className="text-slate-600 mb-6">
              The system always asks: <em>"What is the next expected event for this container?"</em> It compares the current SAP status against what the carrier is showing and suggests the correct SAP update.
            </p>

            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Container lifecycle &amp; decisions</p>
              <DecisionFlowDiagram />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <InfoBox icon={AlertTriangle} title="When is Priority = High?" color="amber">
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>Container discharged &gt; 5 days ago, not yet released</li>
                  <li>Container released &gt; 7 days ago, not yet returned empty</li>
                  <li>SAP ETA has passed but no discharge event found</li>
                  <li>Status is Pending Review</li>
                  <li>Booking number is missing</li>
                </ul>
              </InfoBox>
              <InfoBox icon={Clock} title="Pending Review cases" color="amber">
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>Carrier shows empty return but no release date</li>
                  <li>Booking not found on carrier website</li>
                  <li>Carrier ETA is blank</li>
                  <li>Ambiguous event wording (e.g. "Available for delivery")</li>
                  <li>SAP status is more advanced than carrier</li>
                </ul>
              </InfoBox>
            </div>
          </Section>

          {/* ── Statuses ── */}
          <Section id="statuses" title="5. Statuses & Badge Reference">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Priority badges</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Badge label="High" color="bg-red-100 text-red-800 border-red-200" />
                    <span className="text-sm text-slate-600">Immediate attention required — overdue or at-risk containers</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge label="Medium" color="bg-amber-100 text-amber-800 border-amber-200" />
                    <span className="text-sm text-slate-600">ETA changed or container arriving soon</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge label="Low" color="bg-green-100 text-green-800 border-green-200" />
                    <span className="text-sm text-slate-600">Container in transit with future ETA, no change</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Review status badges</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Badge label="Action Required" color="bg-orange-100 text-orange-800 border-orange-200" />
                    <span className="text-sm text-slate-600">An SAP event or ETA update is needed</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge label="Pending Review" color="bg-yellow-100 text-yellow-800 border-yellow-200" />
                    <span className="text-sm text-slate-600">Cannot determine action automatically — manual review needed</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge label="No Update Required" color="bg-blue-100 text-blue-800 border-blue-200" />
                    <span className="text-sm text-slate-600">No change needed based on current tracking data</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge label="Completed" color="bg-emerald-100 text-emerald-800 border-emerald-200" />
                    <span className="text-sm text-slate-600">Empty returned — logistics cycle complete</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Suggested actions</p>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="px-4 py-2 text-left text-xs text-slate-500">Suggested Action</th>
                        <th className="px-4 py-2 text-left text-xs text-slate-500">When it appears</th>
                        <th className="px-4 py-2 text-left text-xs text-slate-500">What to do in SAP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        ['Update ETA in SAP',              'Carrier ETA ≠ SAP ETA, no discharge yet',   'Update the ETA field in SAP — do NOT add an event'],
                        ['Add container discharged event', 'SAP = In Transit, carrier shows discharge',  'Add event "Container Discharged" with the carrier discharge date'],
                        ['Add container released event',   'SAP = Discharged, carrier shows gate-out',  'Add event "Container Released" with the gate-out date'],
                        ['Add empty returned event',       'SAP = Released, carrier shows empty return','Add event "Empty Returned" with the return date'],
                        ['Review manually',                'Ambiguous or inconsistent data',            'Open carrier website and investigate manually'],
                        ['No update required',             'No relevant change detected',               'No action needed — container is on track'],
                        ['Close / completed',              'SAP = Empty Returned',                      'No action — cycle is complete'],
                      ].map(([action, when, todo]) => (
                        <tr key={action} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-medium text-slate-700 text-xs">{action}</td>
                          <td className="px-4 py-2.5 text-slate-500 text-xs">{when}</td>
                          <td className="px-4 py-2.5 text-slate-500 text-xs">{todo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Auto-tracking ── */}
          <Section id="autotrack" title="6. Automated Tracking (GitHub Actions)">
            <p className="text-slate-600 mb-4 leading-relaxed">
              Once configured, the system queries all carrier APIs <strong>every 4 hours</strong> in parallel using GitHub Actions — with no manual checking required for supported carriers. Results are silently merged into the app each time the page is open.
            </p>

            {/* New feature callouts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
                <p className="font-semibold text-cyan-800 text-sm flex items-center gap-2 mb-1">
                  <RefreshCw className="w-4 h-4" /> Check All Now — manual trigger
                </p>
                <p className="text-xs text-cyan-700">
                  The <strong>cyan "Check All Now" button</strong> in the header triggers an immediate GitHub Actions run that queries all APIs in parallel (up to 10 at once) and updates every container in 2–4 minutes. A spinner and status banner keep you informed while it runs.
                </p>
              </div>
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                <p className="font-semibold text-violet-800 text-sm flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4" /> Background auto-refresh — every 4 hours
                </p>
                <p className="text-xs text-violet-700">
                  While the app tab is open, it silently fetches the latest results from GitHub every 4 hours. If the scheduled workflow has run since your last visit, statuses are merged automatically — no button needed.
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Automated tracking pipeline</p>
              <AutoWorkflowDiagram />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <p className="font-semibold text-slate-700 text-sm mb-3">Supported carrier APIs</p>
                <div className="space-y-1.5">
                  {[
                    { carrier: 'Maersk / ANL',  api: 'Maersk Track v2',     limit: '~25 calls/day' },
                    { carrier: 'CMA CGM',        api: 'CMA CGM DCSA API',    limit: '~200 calls/day' },
                    { carrier: 'Hapag-Lloyd',    api: 'HL DCSA API',         limit: '~100 calls/day' },
                    { carrier: 'MSC',            api: 'MSC DCSA API',        limit: '~200 calls/day' },
                    { carrier: '170+ carriers',  api: 'Sinay universal API', limit: '~500 calls/day' },
                  ].map(row => (
                    <div key={row.carrier} className="flex items-center justify-between text-xs gap-2">
                      <span className="text-slate-700 font-medium w-28 shrink-0">{row.carrier}</span>
                      <span className="text-slate-400 flex-1">{row.api}</span>
                      <span className="text-green-600 font-semibold whitespace-nowrap">{row.limit}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-3">
                  At 4-hour intervals (6 runs/day × ~20 containers), usage stays well within free tier limits.
                  Containers checked in the last 3 hours are automatically skipped to preserve quota.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <p className="font-semibold text-slate-700 text-sm mb-3">One-time setup checklist</p>
                <div className="space-y-2 text-xs text-slate-600">
                  {[
                    ['Get a GitHub PAT',        'github.com/settings/tokens → "repo" scope'],
                    ['Register at Sinay',        'app.sinay.ai → free API key (170+ carriers)'],
                    ['Add SINAY_API_KEY secret', 'Repo → Settings → Secrets → Actions'],
                    ['Sync containers',          '⚡ Auto-Track → Step 1 → Sync Now'],
                    ['Test with Check All Now',  'Click the cyan button in the header — wait 2–4 min'],
                    ['Results load automatically','App refreshes silently every 4 h while open'],
                  ].map(([step, detail], i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-violet-500" />
                      <div>
                        <p className="font-medium text-slate-700">{step}</p>
                        <p className="text-slate-400">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <InfoBox icon={Zap} title="Quickest path to automation" color="violet">
              Register at <a href="https://app.sinay.ai" className="underline font-medium" target="_blank" rel="noopener noreferrer">app.sinay.ai</a> — you'll get a free API key in under 2 minutes. Add it as <code className="bg-violet-100 px-1 rounded">SINAY_API_KEY</code> in your GitHub repo secrets. One key covers all 170+ carriers including ONE, Evergreen, Yang Ming, COSCO, PIL, and more. Then click <strong>Check All Now</strong> to see it work immediately.
            </InfoBox>
          </Section>

          {/* ── Export ── */}
          <Section id="export" title="7. Exporting Reports">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Download className="w-5 h-5 text-emerald-600" />
                  <p className="font-semibold text-slate-800">Export SAP Updates</p>
                </div>
                <p className="text-sm text-slate-500 mb-3">
                  Exports only containers with <strong>Action Required</strong> or <strong>Pending Review</strong> status. Each row contains the container, booking, carrier, current SAP status, suggested action, and the event date to enter in SAP.
                </p>
                <p className="text-xs text-slate-400">Use this as your weekly SAP update task list.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch className="w-5 h-5 text-slate-600" />
                  <p className="font-semibold text-slate-800">Full Report</p>
                </div>
                <p className="text-sm text-slate-500 mb-3">
                  Exports <strong>all containers</strong> regardless of status — including No Update Required and Completed. Useful for weekly reporting to management or archiving.
                </p>
                <p className="text-xs text-slate-400">Both reports are exported as Excel (.xlsx) files.</p>
              </div>
            </div>

            <div className="mt-5 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">What the SAP update report includes</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-500">
                {['Container Number', 'Booking Number', 'Carrier', 'Customer', 'Destination', 'SAP Status', 'Suggested Action', 'Event Date', 'SAP ETA', 'Carrier ETA', 'Priority', 'Notes'].map(f => (
                  <span key={f} className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{f}
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
