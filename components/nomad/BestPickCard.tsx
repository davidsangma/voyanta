import { useEffect, useState } from "react";

type TradeoffAxes = {
  price: number;
  location: number;
  comfort: number;
  vibe: number;
};

type BestPickCardProps = {
  title: string;
  flight: string;
  hotel: string;
  total: string;
  decisionReasoning?: string;
  confidence?: {
    score: number;
    label: string;
  } | null;
  whyForYou: string[];
  tradeoffAxes?: TradeoffAxes | null;
  fallback?: {
    title: string;
    flight: string;
    hotel: string;
    total: string;
  } | null;
  destination?: string | null;
};

function scoreBarTone(score: number): string {
  if (score >= 75) return "bg-gradient-to-r from-success to-accent";
  if (score >= 50) return "bg-gradient-to-r from-warning to-secondary";
  return "bg-gradient-to-r from-secondary to-destructive";
}

export function BestPickCard({
  title,
  flight,
  hotel,
  total,
  decisionReasoning,
  confidence,
  whyForYou,
  tradeoffAxes,
  fallback,
  destination,
}: BestPickCardProps) {
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    if (!destination) {
      return;
    }

    const params = new URLSearchParams({
      destination,
    });

    fetch(`/api/destination-hero?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        if (data?.image_url) setHeroImageUrl(data.image_url);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [destination]);

  return (
    <div className="mb-4 group overflow-hidden rounded-3xl bg-card shadow-card ring-1 ring-border/60 animate-scale-in">
      <div className="relative h-48 overflow-hidden bg-[linear-gradient(120deg,#384554_0%,#7f6f61_48%,#2a313d_100%)] sm:h-56">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={destination && heroImageUrl ? heroImageUrl : "/destination-goa.jpg"}
          alt={destination ? `${destination} destination` : "Destination"}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 group-active:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5">
          <div>
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md ring-1 ring-white/20">
              <span>✦</span>
              Decision-first pick
            </div>
            <h3 className="font-display text-3xl font-medium text-white">Your Best Pick</h3>
          </div>
          {confidence ? (
            <div className="text-right text-white">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Confidence</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{confidence.score}</span>
                <span className="text-sm text-white/70">/100</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 p-4 ring-1 ring-primary/10">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="font-display text-xl font-medium text-foreground">{title}</h4>
            <div className="rounded-full bg-foreground px-3 py-1 text-sm font-bold text-background">{total}</div>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Flight:</span> {flight}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Hotel:</span> {hotel}
          </p>
          {decisionReasoning ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{decisionReasoning}</p> : null}
        </div>

        {whyForYou.length > 0 ? (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="text-accent">↗</span>
              Why this is right for you
            </div>
            <ul className="space-y-1.5">
              {whyForYou.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {tradeoffAxes ? (
          <div>
            <div className="mb-3 text-sm font-semibold text-foreground">Trade-off view</div>
            <div className="space-y-2.5">
              {(
                [
                  ["Price", tradeoffAxes.price],
                  ["Location", tradeoffAxes.location],
                  ["Comfort", tradeoffAxes.comfort],
                  ["Vibe", tradeoffAxes.vibe],
                ] as Array<[string, number]>
              ).map(([label, value]) => (
                <div key={label}>
                  <div className="mb-1 flex items-center justify-between text-xs font-medium">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground">{value}/100</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${scoreBarTone(value)} transition-all duration-1000`} style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {fallback ? (
        <div className="mx-5 mb-5 mt-1 rounded-lg border border-[#dccbb5] bg-[linear-gradient(160deg,#f8f4ed,#f3ece1)] p-3">
          <p className="mb-1 font-semibold text-foreground">Fallback option</p>
          <p className="text-sm text-muted-foreground">{fallback.title}</p>
          <p className="text-sm text-muted-foreground">
            Flight: {fallback.flight} | Hotel: {fallback.hotel}
          </p>
          <p className="mt-1 font-semibold text-foreground">{fallback.total}</p>
        </div>
      ) : null}
    </div>
  );
}
