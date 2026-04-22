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
  if (score >= 75) return "bg-[linear-gradient(90deg,#6cab8f,#4f8f73)]";
  if (score >= 55) return "bg-[linear-gradient(90deg,#c9b45e,#b5953e)]";
  return "bg-[linear-gradient(90deg,#d4907f,#bc6c57)]";
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
    <div className="mb-4 overflow-hidden rounded-[22px] border border-[#d4d8e4] bg-[#f2f4f8]">
      <div
        className="relative h-40 bg-[linear-gradient(120deg,#384554_0%,#7f6f61_48%,#2a313d_100%)] bg-cover bg-center"
        style={destination && heroImageUrl ? { backgroundImage: `url(${heroImageUrl})` } : undefined}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.42))]" />
        <div className="absolute left-5 top-5 rounded-full bg-white/28 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
          Decision-First Pick
        </div>
        <p className="absolute bottom-5 left-5 font-display text-5xl leading-none text-white">Your Best Pick</p>
        {confidence && (
          <div className="absolute bottom-5 right-5 text-right text-white">
            <p className="text-[11px] uppercase tracking-wide text-white/85">Confidence</p>
            <p className="text-4xl font-semibold leading-none">
              {confidence.score}
              <span className="ml-1 text-xl font-medium text-white/80">/100</span>
            </p>
          </div>
        )}
      </div>

      <div className="p-5">
      <div className="mb-4 rounded-[28px] border border-[#d4d8e4] bg-[#e9edf2] p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <p className="font-display text-3xl leading-none text-[#2d3345]">{title}</p>
          <span className="rounded-full bg-[#171d32] px-3 py-1 text-xl font-semibold text-white">{total}</span>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Flight: {flight} | Hotel: {hotel}
        </p>
        {decisionReasoning && <p className="mt-2 text-sm text-[var(--text-secondary)]">{decisionReasoning}</p>}
      </div>

      {whyForYou.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 font-semibold">Why This Is Right For You</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-[var(--text-secondary)]">
            {whyForYou.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {tradeoffAxes && (
        <div className="space-y-2">
          <p className="font-semibold">Trade-off View</p>
          {(
            [
              ["price", tradeoffAxes.price],
              ["location", tradeoffAxes.location],
              ["comfort", tradeoffAxes.comfort],
              ["vibe", tradeoffAxes.vibe],
            ] as Array<[string, number]>
          ).map(([label, score]) => (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="capitalize">{label}</span>
                <span>{score}/100</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full border border-[#d6e6dc] bg-white/80">
                <div
                  className={`h-full ${scoreBarTone(score)}`}
                  style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {fallback && (
        <div className="mx-5 mb-5 mt-1 rounded-lg border border-[#dccbb5] bg-[linear-gradient(160deg,#f8f4ed,#f3ece1)] p-3">
          <p className="mb-1 font-semibold">Fallback Option</p>
          <p className="text-sm text-[var(--text-secondary)]">{fallback.title}</p>
          <p className="text-sm text-[var(--text-secondary)]">
            Flight: {fallback.flight} | Hotel: {fallback.hotel}
          </p>
          <p className="font-semibold">{fallback.total}</p>
        </div>
      )}
    </div>
  );
}
