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
    <div className="sticky top-[69px] z-30 border-b border-[var(--border-soft)] bg-[#f5f6fa]/95 backdrop-blur-xl">
      <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
        <div className="flex items-start justify-between gap-2.5 sm:gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip !bg-[#e3e6ef] !font-semibold !text-[13px]">
              {origin} <span className="mx-1">-&gt;</span> {destination}
            </span>
            <span className="chip !bg-white !text-[13px]">
              {departDate}
              {returnDate ? ` - ${returnDate}` : ""}
            </span>
            <span className="chip !bg-white !text-[13px]">{cabin}</span>
            {packageOn && <span className="chip !bg-[#ddf3e8] !text-[#198754]">Package</span>}
            {hotelsOn && <span className="chip !bg-[#dff2f4] !text-[#0f8a99]">Hotels</span>}
          </div>
          <button
            type="button"
            onClick={onToggleEditor}
            className="chip shrink-0 !bg-white !px-3 !py-1"
            aria-label={showEditor ? "Hide trip detail editor" : "Show trip detail editor"}
          >
            {showEditor ? "Hide Edit" : "Edit"}
          </button>
        </div>

        {showEditor && <div className="mt-2 flex flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  );
}
