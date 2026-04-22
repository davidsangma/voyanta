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
  const cardTone =
    variant === "success"
      ? "bg-[linear-gradient(160deg,#f4fbf3,#edf7ea)] border-[#cfe2c8]"
      : "bg-[linear-gradient(160deg,#fbf6ef,#f7eee5)] border-[#dfc9bc]";

  return (
    <div className={`relative rounded-lg border p-3 ${cardTone}`}>
      {label && (
        <p className="mb-1 font-semibold">
          {step ? `${step}. ` : ""}
          {label}
        </p>
      )}
      {showRoundTripBadge && (
        <div className="absolute top-2 right-2 inline-flex items-center justify-center rounded-full border border-[#dfc9bc] bg-white/80 p-1">
          <Image src="/round-trip-icon.svg" alt="Round trip" width={14} height={14} className="object-contain" />
        </div>
      )}

      <div className="flex items-center gap-2">
        {airlineLogoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={airlineLogoUrl}
            alt={`${airline} logo`}
            width={18}
            height={18}
            className="rounded-sm object-contain"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        )}
        <p className="font-semibold">
          {airline}
          {airlineCode ? ` (${airlineCode})` : ""}
        </p>
      </div>

      <p className="text-sm text-[var(--text-secondary)]">
        {from} -&gt; {to}
        {duration ? ` | ${duration}` : ""}
      </p>
      {cabin && <p className="text-sm text-[var(--text-secondary)]">Cabin: {cabin}</p>}
      {(stopsText || depart || arrive) && (
        <p className="text-sm text-[var(--text-secondary)]">
          {stopsText || ""}
          {stopsText && depart ? " | " : ""}
          {depart ? `Departs: ${depart}` : ""}
          {arrive ? ` | Arrives: ${arrive}` : ""}
        </p>
      )}
      {flightsText && <p className="text-sm text-[var(--text-secondary)]">Flights: {flightsText}</p>}
      {returnText && <p className="text-sm text-[var(--text-secondary)]">Return: {returnText}</p>}
      {returnFlightsText && <p className="text-sm text-[var(--text-secondary)]">Return flights: {returnFlightsText}</p>}
      <p className="font-semibold">{price}</p>
    </div>
  );
}
