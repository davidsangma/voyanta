import { NomadPlaneMark } from "@/components/nomad/NomadPlaneMark";

type AppHeaderProps = {
  onNewChat: () => void;
  showShadow: boolean;
};

export function AppHeader({ onNewChat, showShadow }: AppHeaderProps) {
  return (
    <header
      className={`sticky top-0 z-40 glass border-b border-border/40 transition-shadow duration-200 ${
        showShadow ? "shadow-soft" : ""
      }`}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-aurora shadow-glow">
            <NomadPlaneMark className="h-5 w-5 text-white" />
            <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-secondary ring-2 ring-background" />
          </div>
          <div className="leading-tight">
            <h1 className="font-display text-2xl font-medium text-foreground">Nomad</h1>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Worth Exploring</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNewChat}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:bg-foreground/90"
          aria-label="Start a new chat"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 3l1.8 3.7L16 8l-3 2.9.7 4.1-3.7-1.9-3.7 1.9.7-4.1L4 8l4.2-1.3L10 3z" fill="currentColor" />
          </svg>
          New Chat
        </button>
      </div>
    </header>
  );
}
