type PackageRecapCardProps = {
  total: string;
  nights?: number;
  summary?: string;
  savingHint?: string;
};

export function PackageRecapCard({ total, nights, summary, savingHint }: PackageRecapCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#111a3b] bg-[linear-gradient(135deg,#111733_0%,#0e1a44_52%,#111733_100%)] p-6 text-white shadow-[0_20px_46px_-18px_rgba(17,23,51,0.68)]">
      <div className="pointer-events-none absolute -bottom-16 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,149,116,0.28)_0%,rgba(255,149,116,0)_72%)]" />
      <div className="relative z-10">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">Complete Package</p>
            <p className="mt-1 font-display text-5xl leading-none">Your trip is ready</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">Total</p>
            <p className="mt-1 text-5xl font-semibold leading-none text-[#ff5e86]">{total}</p>
          </div>
        </div>

        <p className="max-w-2xl text-[15px] leading-relaxed text-white/78">
          {summary ||
            "Three smooth steps, one beautiful trip. Flights and stay are aligned for the best balance of comfort and value."}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {nights ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-3 py-1 text-sm font-medium text-white/90">
              <span className="h-2 w-2 rounded-full bg-[#23d4bd]" />
              Stay duration: {nights} {nights === 1 ? "night" : "nights"}
            </span>
          ) : null}
          {savingHint ? (
            <span className="inline-flex items-center rounded-full border border-white/18 bg-white/10 px-3 py-1 text-sm text-white/85">
              {savingHint}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
