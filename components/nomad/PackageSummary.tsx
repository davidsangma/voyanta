import { ReactNode } from "react";

type PackageSummaryProps = {
  savingHint?: string;
  nights?: number;
  total: string;
  children: ReactNode;
};

export function PackageSummary({ savingHint, nights, total, children }: PackageSummaryProps) {
  return (
    <div className="mb-4">
      <p className="mb-2 font-semibold">Your Package</p>
      {savingHint && <p className="mb-2 text-sm text-[var(--text-secondary)]">{savingHint}</p>}
      <p className="text-sm text-[var(--text-secondary)]">
        This package is selected by combining a high-ranked onward flight, a strong hotel value, and a feasible return
        option.
      </p>
      <p className="mb-2 text-sm text-[var(--text-secondary)]">
        It balances total trip cost and travel convenience for your chosen dates.
      </p>
      {nights ? <p className="mb-2 text-sm text-[var(--text-secondary)]">Stay duration: {nights} night(s)</p> : null}
      <div className="space-y-2">{children}</div>
      <p className="mt-2 font-semibold">Package Total: {total}</p>
    </div>
  );
}
