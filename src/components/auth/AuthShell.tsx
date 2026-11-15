import { BarChart3, BookOpen, Boxes, ClipboardList, Layers } from "lucide-react";

const features = [
  { icon: Boxes, label: "Inventory Management" },
  { icon: Layers, label: "Stock Tracking" },
  { icon: ClipboardList, label: "Order Management" },
  { icon: BarChart3, label: "Reports & Insights" },
];

// A drawn bookshelf background, so the page needs no downloaded photo and loads instantly.
function Shelf() {
  const spines = ["#c2410c", "#1d4ed8", "#a16207", "#be185d", "#0f766e", "#7c3aed", "#b91c1c", "#0369a1", "#65a30d", "#c2410c", "#9333ea", "#0e7490"];
  return (
    <svg aria-hidden className="absolute inset-0 h-full w-full opacity-25 blur-[3px]" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
      {[40, 190, 340].map((y) => (
        <g key={y}>
          {spines.map((c, i) => (
            <rect key={i} x={i * 34 + ((y / 10) % 7)} y={y + (i % 3) * 8} width={26} height={120 - (i % 3) * 8} rx={2} fill={c} />
          ))}
          <rect x={0} y={y + 120} width={400} height={8} fill="#78350f" />
        </g>
      ))}
    </svg>
  );
}

function BookStack() {
  return (
    <svg aria-hidden viewBox="0 0 260 120" className="w-64 drop-shadow-2xl">
      <rect x="20" y="78" width="220" height="30" rx="4" fill="#5e0b13" />
      <rect x="20" y="90" width="220" height="4" fill="#450a0a" />
      <rect x="10" y="46" width="230" height="30" rx="4" fill="#b45309" />
      <rect x="10" y="58" width="230" height="4" fill="#92400e" />
      <rect x="24" y="14" width="210" height="30" rx="4" fill="#dc2626" />
      <rect x="24" y="26" width="210" height="4" fill="#b91c1c" />
    </svg>
  );
}

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#fbf3f2]">
      {/* Left: brand panel (hidden on phones) */}
      <aside className="relative hidden w-[46%] max-w-[760px] overflow-hidden bg-gradient-to-br from-[#7f1018] via-[#9b111e] to-[#5e0b13] text-white lg:flex lg:flex-col lg:items-center lg:justify-center">
        <Shelf />
        <div className="relative z-10 flex flex-col items-center px-10 text-center">
          <BookOpen className="h-16 w-16 text-red-100" strokeWidth={1.4} />
          <h2 className="mt-3 font-brand text-5xl font-bold">Devanagari</h2>
          <div className="mt-2 flex items-center gap-3 font-brand text-2xl text-red-50">
            <span className="h-px w-12 bg-red-300/70" />
            Prakashan
            <span className="h-px w-12 bg-red-300/70" />
          </div>
          <div className="mt-6 rounded-full border border-red-200/60 px-6 py-2 text-base font-medium">Book House Inventory System</div>
          <ul className="mt-10 space-y-4 text-left">
            {features.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-4 text-base">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-950/70 ring-1 ring-red-300/30">
                  <Icon className="h-5 w-5 text-red-100" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="absolute bottom-0 left-8 z-10">
          <BookStack />
        </div>
        {/* curved edge between the two halves */}
        <div className="absolute -right-24 top-0 h-full w-48 rounded-[50%] bg-[#fbf3f2]" />
        <div className="absolute -right-[104px] top-0 h-full w-48 rounded-[50%] border-r-[6px] border-red-500" />
      </aside>

      {/* Right: form card */}
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10">
        <div className="relative z-10 w-full max-w-[480px] rounded-3xl bg-white p-8 shadow-xl shadow-red-900/10 sm:p-10">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#9b111e] text-white">
              <BookOpen className="h-8 w-8" />
            </div>
            <div className="mt-3 font-brand text-4xl font-bold text-[#5e0b13]">Devanagari</div>
            <div className="flex items-center gap-3 font-brand text-xl text-[#5e0b13]">
              <span className="h-px w-10 bg-red-600" />
              Prakashan
              <span className="h-px w-10 bg-red-600" />
            </div>
            <p className="mt-2 text-base text-slate-500">Book House Inventory System</p>
          </div>
          <h1 className="mt-8 text-3xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-base text-slate-600">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <BookOpen aria-hidden className="absolute -bottom-10 -right-10 h-72 w-72 text-red-900/5" strokeWidth={1} />
      </main>
    </div>
  );
}
