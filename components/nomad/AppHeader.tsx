import Image from "next/image";

type AppHeaderProps = {
  onNewChat: () => void;
  showShadow: boolean;
};

export function AppHeader({ onNewChat, showShadow }: AppHeaderProps) {
  return (
    <header
      className={`sticky top-0 z-40 border-b border-[var(--border-soft)] bg-[#f5f6fa]/95 transition-shadow duration-200 ${
        showShadow ? "shadow-soft" : ""
      }`}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
        <div className="flex items-center gap-3">
          <Image src="/voyanta_logo.png" alt="Nomad logo" width={42} height={42} className="object-contain" priority />
          <div className="leading-tight">
            <h1 className="font-display text-[38px] leading-[0.95] tracking-tight text-[#2a2e3b]">Nomad</h1>
            <p className="text-[12px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Worth Exploring</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNewChat}
          className="rounded-full bg-[#171d32] px-6 py-2 text-sm font-semibold text-white hover:opacity-90"
          aria-label="Start a new chat"
        >
          New Chat
        </button>
      </div>
    </header>
  );
}
