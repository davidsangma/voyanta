type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSuggestion: (suggestion: string) => void;
  suggestions: string[];
  disabled?: boolean;
};

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
              className="chip shrink-0"
              aria-label={`Apply quick action: ${item}`}
            >
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
