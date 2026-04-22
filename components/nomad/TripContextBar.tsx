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

function ChipIcon({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/80 text-[#5e6782] shadow-[inset_0_0_0_1px_rgba(94,103,130,0.18)]">
      {children}
    </span>
  );
}

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
    <div className="sticky top-[69px] z-30 border-b border-[var(--border-soft)] bg-[#f5f6fa]/95 backdrop-blur-xl">
      <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
        <div className="flex items-start justify-between gap-2.5 sm:gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip !border-[#cfd4e2] !bg-[linear-gradient(135deg,#d9deed_0%,#d2edf0_100%)] !px-3 !py-[0.38rem] !font-semibold !text-[13px] !text-[#2f3a56]">
              <ChipIcon>
                <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M3 10h14M11.5 5.5L16 10l-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </ChipIcon>
              {origin} <span className="mx-1">-&gt;</span> {destination}
            </span>
            <span className="chip !border-[#d6dae7] !bg-white !px-3 !py-[0.38rem] !text-[13px] !text-[#505a75]">
              <ChipIcon>
                <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <rect x="3" y="5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M7 3v4M13 3v4M3 9h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </ChipIcon>
              {departDate}
              {returnDate ? ` - ${returnDate}` : ""}
            </span>
            <span className="chip !border-[#d6dae7] !bg-white !px-3 !py-[0.38rem] !text-[13px] !text-[#505a75]">
              <ChipIcon>
                <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M10 4.5l6.2 3.1L10 10.7 3.8 7.6 10 4.5z" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M3.8 11.2L10 14.3l6.2-3.1M3.8 14.7L10 17.8l6.2-3.1" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </ChipIcon>
              {cabin}
            </span>
            {packageOn && (
              <span className="chip !border-[#8fd2b3] !bg-[linear-gradient(135deg,#d9f3e8_0%,#c5eddc_100%)] !px-3 !py-[0.38rem] !font-semibold !text-[#16744f]">
                <ChipIcon>
                  <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle cx="10" cy="10" r="3.2" fill="currentColor" />
                  </svg>
                </ChipIcon>
                Package
              </span>
            )}
            {hotelsOn && (
              <span className="chip !border-[#97d4df] !bg-[linear-gradient(135deg,#dff3f6_0%,#caedf3_100%)] !px-3 !py-[0.38rem] !font-semibold !text-[#0e7d92]">
                <ChipIcon>
                  <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M7 8h6M7 11h6M7 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </ChipIcon>
                Hotels
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleEditor}
            className="chip shrink-0 !border-[#d4d8e5] !bg-white !px-3 !py-1 !text-[#39435f]"
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
