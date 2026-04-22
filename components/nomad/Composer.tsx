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
    <div className="sticky bottom-0 z-30 border-t border-border/40 bg-gradient-to-t from-background via-background/95 to-background/70 backdrop-blur-xl">
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
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-primary">
                <path d="M10 3l1.8 3.7L16 8l-3 2.9.7 4.1-3.7-1.9-3.7 1.9.7-4.1L4 8l4.2-1.3L10 3z" fill="currentColor" />
              </svg>
              {item}
            </button>
          ))}
        </div>

        <form
          aria-label="Composer"
          className="group relative flex items-center gap-2 rounded-full bg-card p-1.5 shadow-card ring-1 ring-border/60 transition-all focus-within:ring-2 focus-within:ring-primary/40"
          onSubmit={(event) => {
            event.preventDefault();
            if (!submitDisabled) onSend();
          }}
        >
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Ask naturally - try 'only direct' or 'cheaper options'..."
            className="flex-1 bg-transparent px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none sm:text-base"
            aria-label="Ask Nomad about your travel plan"
          />
          <button
            type="submit"
            disabled={submitDisabled}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-aurora text-base font-semibold text-white shadow-glow transition-all hover:scale-105 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
            aria-label="Send message"
          >
            {value.trim() ? (
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 10h12M11.5 5.5L16 10l-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3.6 10.2L16 4l-3.5 12-2.6-4.1-4.3-1.7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </form>

        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Nomad can search flights, hotels and bundle complete packages.
        </p>
      </div>
    </div>
  );
}
