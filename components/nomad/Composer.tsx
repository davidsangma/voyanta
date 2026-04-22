type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSuggestion: (suggestion: string) => void;
  suggestions: string[];
  disabled?: boolean;
};

const SUGGESTION_ACCENT: Record<string, string> = {
  "Only direct flights": "!border-[#b3c2ea] !bg-[linear-gradient(135deg,#edf2ff_0%,#e4ebff_100%)] !text-[#3a4d84]",
  "Add hotels": "!border-[#acd8e1] !bg-[linear-gradient(135deg,#ebf8fb_0%,#dff3f7_100%)] !text-[#286477]",
  "Switch to business": "!border-[#d9caaf] !bg-[linear-gradient(135deg,#fbf5e9_0%,#f3e9d6_100%)] !text-[#6b5737]",
  "Cheaper options": "!border-[#bfd7bf] !bg-[linear-gradient(135deg,#edf8ed_0%,#dff1df_100%)] !text-[#3f6f3f]",
  "Compare top 3 flights": "!border-[#d7c9ea] !bg-[linear-gradient(135deg,#f5efff_0%,#ece4fd_100%)] !text-[#5a447f]",
  "Remove hotel star filter": "!border-[#e6c5ca] !bg-[linear-gradient(135deg,#fff1f3_0%,#fbe6ea_100%)] !text-[#7e4351]",
};

function SuggestionIcon({ label }: { label: string }) {
  if (label === "Only direct flights") {
    return (
      <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 10h14M11.5 5.5L16 10l-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (label === "Add hotels" || label === "Remove hotel star filter") {
    return (
      <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 8h6M7 11h6M7 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (label === "Switch to business") {
    return (
      <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 3l2.1 4.2L17 8l-3.5 3.4.8 4.8-4.3-2.2-4.3 2.2.8-4.8L3 8l4.9-.8L10 3z" fill="currentColor" />
      </svg>
    );
  }
  if (label === "Cheaper options") {
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

export function Composer({
  value,
  onChange,
  onSend,
  onSuggestion,
  suggestions,
  disabled = false,
}: ComposerProps) {
  const submitDisabled = disabled || !value.trim();

  return (
    <div className="sticky bottom-0 z-30 border-t border-[var(--border-soft)] bg-[#f5f6fa]/98 shadow-[0_-8px_24px_rgba(26,33,66,0.06)] backdrop-blur-xl">
      <div className="mx-auto max-w-5xl px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.4rem)] pt-3 sm:px-6 sm:pt-4">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onSuggestion(item)}
              className={`chip shrink-0 !border-[#d4d8e5] !bg-white/86 !px-3 !py-[0.4rem] !text-[13px] !font-semibold !text-[#4e5873] ${SUGGESTION_ACCENT[item] || ""}`}
              aria-label={`Apply quick action: ${item}`}
            >
              <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/84 text-current shadow-[inset_0_0_0_1px_rgba(91,103,136,0.24)]">
                <SuggestionIcon label={item} />
              </span>
              {item}
            </button>
          ))}
        </div>

        <form
          aria-label="Composer"
          className="relative flex items-center gap-2 rounded-full bg-white p-1.5 shadow-soft ring-1 ring-[var(--border-soft)]"
          onSubmit={(event) => {
            event.preventDefault();
            if (!submitDisabled) onSend();
          }}
        >
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Ask naturally - try 'only direct' or 'cheaper options'..."
            className="flex-1 bg-transparent px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none sm:px-4 sm:text-base"
            aria-label="Ask Nomad about your travel plan"
          />
          <button
            type="submit"
            disabled={submitDisabled}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-aurora text-base font-semibold text-white shadow-glow transition-all hover:scale-[1.02] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
            aria-label="Send message"
          >
            &gt;
          </button>
        </form>

        <p className="mt-2 text-center text-[11px] text-[var(--text-muted)]">
          Nomad can search flights, hotels and complete travel packages.
        </p>
      </div>
    </div>
  );
}
