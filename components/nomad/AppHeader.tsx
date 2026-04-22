import Image from "next/image";

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
            <Image src="/voyanta_logo.png" alt="Nomad logo" width={20} height={20} className="object-contain brightness-0 invert" priority />
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
          className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:bg-foreground/90"
          aria-label="Start a new chat"
        >
          ✦ New Chat
        </button>
      </div>
    </header>
  );
}
