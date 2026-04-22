import Image from "next/image";
import { ReactNode } from "react";

type AssistantBubbleProps = {
  children: ReactNode;
  variant?: "text" | "card";
};

export function AssistantBubble({ children, variant = "text" }: AssistantBubbleProps) {
  return (
    <div className="flex items-start gap-3 animate-float-up">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-aurora shadow-soft">
        <Image
          src="/voyanta_logo.png"
          alt="Assistant"
          width={15}
          height={15}
          className="object-contain brightness-0 invert"
        />
      </div>
      <div className="flex-1">
        {variant === "text" ? (
          <div className="max-w-[85%] rounded-3xl rounded-tl-md bg-card px-5 py-3 text-sm text-card-foreground shadow-soft ring-1 ring-border/60 sm:text-base">
            {children}
          </div>
        ) : (
          <div className="w-full">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
