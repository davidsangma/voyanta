import Image from "next/image";

type FlightSegmentCardProps = {
  step?: number;
  label?: string;
  airline: string;
  airlineCode?: string | null;
  airlineLogoUrl?: string | null;
  from: string;
  to: string;
  duration?: string;
  cabin?: string;
  stopsText?: string;
  depart?: string;
  arrive?: string;
  flightsText?: string;
  price: string;
  variant?: "success" | "neutral";
  showRoundTripBadge?: boolean;
  returnText?: string;
  returnFlightsText?: string;
};

function detail(label: string, value?: string) {
  if (!value) return null;
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

export function FlightSegmentCard({
  step,
  label,
  airline,
  airlineCode,
  airlineLogoUrl,
  from,
  to,
  duration,
  cabin,
  stopsText,
  depart,
  arrive,
  flightsText,
  price,
  variant = "neutral",
  showRoundTripBadge = false,
  returnText,
  returnFlightsText,
}: FlightSegmentCardProps) {
  const iconTone = variant === "success" ? "bg-secondary" : "bg-primary";

  return (
    <div className="group relative rounded-3xl bg-card p-5 shadow-soft ring-1 ring-border/60 transition-all hover:shadow-card animate-float-up">
      {label && (
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {step ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] text-background">
              {step}
            </span>
          ) : null}
          {label}
        </div>
      )}

      {showRoundTripBadge && (
        <div className="absolute right-4 top-4 inline-flex items-center justify-center rounded-full border border-border/60 bg-card p-1">
          <Image src="/round-trip-icon.svg" alt="Round trip" width={14} height={14} className="object-contain" />
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconTone} shadow-soft`}>
            {airlineLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={airlineLogoUrl}
                alt={`${airline} logo`}
                width={20}
                height={20}
                className="rounded-sm object-contain"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-white">
                <path d="M3 10h14M11.5 5.5L16 10l-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <div>
            <div className="font-display text-xl font-medium leading-tight">
              {airline} <span className="text-muted-foreground">({airlineCode || "--"})</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <span className="text-foreground">{from}</span>
              <span>→</span>
              <span className="text-foreground">{to}</span>
              {duration ? <span>• {duration}</span> : null}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl font-semibold text-foreground">{price}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {detail("Cabin", cabin)}
        {detail("Stops", stopsText)}
        {detail("Departs", depart)}
        {detail("Arrives", arrive)}
      </div>

      {flightsText ? (
        <div className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Flights:</span> {flightsText}
        </div>
      ) : null}
      {returnText ? (
        <div className="mt-2 rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Return:</span> {returnText}
        </div>
      ) : null}
      {returnFlightsText ? (
        <div className="mt-2 rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Return flights:</span> {returnFlightsText}
        </div>
      ) : null}
    </div>
  );
}
