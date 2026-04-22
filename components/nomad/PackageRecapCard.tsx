type PackageRecapCardProps = {
  total: string;
  nights?: number;
  summary?: string;
  savingHint?: string;
};

export function PackageRecapCard({ total, nights, summary, savingHint }: PackageRecapCardProps) {
  return (
    <div className="overflow-hidden rounded-3xl bg-foreground p-6 text-background shadow-pop animate-scale-in sm:p-7">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-background/60">Complete package</p>
          <h3 className="mt-1 font-display text-3xl font-medium">Your trip is ready</h3>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-background/60">Total</p>
          <div className="font-display text-3xl font-semibold text-gradient-sunset">{total}</div>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-background/75">
        {summary ||
          "Three smooth steps, one beautiful trip - your flights and stay are aligned to give you the best value across price, comfort and location."}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {nights ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-background/10 px-3 py-1.5 text-xs font-medium text-background ring-1 ring-background/15">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Stay duration: {nights} night{nights !== 1 ? "s" : ""}
          </span>
        ) : null}
        {savingHint ? (
          <span className="inline-flex items-center rounded-full bg-background/10 px-3 py-1.5 text-xs font-medium text-background/85 ring-1 ring-background/15">
            {savingHint}
          </span>
        ) : null}
      </div>
    </div>
  );
}
