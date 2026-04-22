type ActionChipsProps = {
  items: string[];
  onAction: (action: string) => void;
};

const ACTION_ACCENT: Record<string, string> = {
  "Only direct flights": "!border-[#b3c2ea] !bg-[linear-gradient(135deg,#edf2ff_0%,#e4ebff_100%)] !text-[#3a4d84]",
  "Add hotels": "!border-[#acd8e1] !bg-[linear-gradient(135deg,#ebf8fb_0%,#dff3f7_100%)] !text-[#286477]",
  "Switch to business": "!border-[#d9caaf] !bg-[linear-gradient(135deg,#fbf5e9_0%,#f3e9d6_100%)] !text-[#6b5737]",
  "Cheaper options": "!border-[#bfd7bf] !bg-[linear-gradient(135deg,#edf8ed_0%,#dff1df_100%)] !text-[#3f6f3f]",
};

function ActionIcon({ action }: { action: string }) {
  if (action === "Only direct flights") {
    return (
      <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 10h14M11.5 5.5L16 10l-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (action === "Add hotels") {
    return (
      <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 8h6M7 11h6M7 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (action === "Switch to business") {
    return (
      <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 3l2.1 4.2L17 8l-3.5 3.4.8 4.8-4.3-2.2-4.3 2.2.8-4.8L3 8l4.9-.8L10 3z" fill="currentColor" />
      </svg>
    );
  }

  if (action === "Cheaper options") {
    return (
      <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 3v14M13.6 6.2a4 4 0 00-3.6-1.3c-1.7 0-3 .9-3 2.2 0 3.6 7 1.4 7 5 0 1.4-1.5 2.4-3.5 2.4-1.6 0-3.1-.6-4-1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="3.2" fill="currentColor" />
    </svg>
  );
}

export function ActionChips({ items, onAction }: ActionChipsProps) {
  if (items.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.slice(0, 6).map((action, idx) => (
        <button
          key={`${action}-${idx}`}
          type="button"
          onClick={() => onAction(action)}
          className={`chip !border-[#d4d8e5] !bg-white/85 !px-3 !py-[0.4rem] !text-[13px] !font-semibold !text-[#4e5873] ${ACTION_ACCENT[action] || ""}`}
          aria-label={`Apply quick action: ${action}`}
        >
          <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/85 text-current shadow-[inset_0_0_0_1px_rgba(91,103,136,0.24)]">
            <ActionIcon action={action} />
          </span>
          {action}
        </button>
      ))}
    </div>
  );
}
