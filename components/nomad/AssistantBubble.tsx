import Image from "next/image";
import { ReactNode } from "react";

type AssistantBubbleProps = {
  children: ReactNode;
  variant?: "text" | "card";
};

export function AssistantBubble({ children, variant = "text" }: AssistantBubbleProps) {
  return (
    <div className="flex items-start gap-2.5 animate-float-up sm:gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-gradient-aurora shadow-soft sm:h-9 sm:w-9">
        <Image
          src="/voyanta_logo.png"
          alt="Assistant"
          width={16}
          height={16}
          className="object-contain brightness-0 invert"
        />
      </div>
      <div className="flex-1">
        {variant === "text" ? (
          <div className="max-w-[92%] rounded-3xl rounded-tl-md bg-white px-4 py-3 text-sm shadow-soft ring-1 ring-[var(--border-soft)] sm:max-w-[85%] sm:px-5 sm:text-base">
            {children}
          </div>
        ) : (
          <div className="w-full rounded-3xl rounded-tl-md bg-[var(--gradient-card)] p-3.5 shadow-card ring-1 ring-[var(--border-soft)] sm:p-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
