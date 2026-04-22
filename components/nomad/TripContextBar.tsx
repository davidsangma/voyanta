import type { ReactNode } from "react";

type TripContextBarProps = {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string | null;
  cabin: string;
  packageOn: boolean;
  hotelsOn: boolean;
  showEditor: boolean;
  onToggleEditor: () => void;
  children?: ReactNode;
};

export function TripContextBar({
  origin,
  destination,
  departDate,
  returnDate,
  cabin,
  packageOn,
  hotelsOn,
  showEditor,
  onToggleEditor,
  children,
}: TripContextBarProps) {
  return (
    <div className="sticky top-[68px] z-30 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 px-3 py-1.5 ring-1 ring-primary/15">
              <span className="text-sm font-semibold text-foreground">{origin}</span>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-primary">
                <path d="M3 10h14M11.5 5.5L16 10l-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-sm font-semibold text-foreground">{destination}</span>
            </div>

            <span className="chip">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <rect x="3" y="5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M7 3v4M13 3v4M3 9h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              {departDate}
              {returnDate ? <span className="text-muted-foreground">→ {returnDate}</span> : null}
            </span>

            <span className="chip">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 10h14M10 3v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              {cabin}
            </span>

            {packageOn && (
              <span className="chip border-success/30 bg-success/10 text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Package
              </span>
            )}
            {hotelsOn && (
              <span className="chip border-accent/30 bg-accent/10 text-accent">
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M7 8h6M7 11h6M7 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Hotels
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleEditor}
            className="chip rounded-full border border-border/70 bg-card px-3 py-1.5 hover:border-primary/35"
            aria-label={showEditor ? "Hide trip detail editor" : "Show trip detail editor"}
          >
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M4 13.5V16h2.5l7.4-7.4-2.5-2.5L4 13.5zm11.7-6.8a.7.7 0 000-1l-1.4-1.4a.7.7 0 00-1 0l-1 1 2.5 2.5 1-1z"
                fill="currentColor"
              />
            </svg>
            {showEditor ? "Hide Edit" : "Edit"}
          </button>
        </div>

        {showEditor && <div className="mt-2 flex flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  );
}
