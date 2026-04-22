"use client";

import { useEffect, useState } from "react";

type HotelCardProps = {
  step?: number;
  title?: string;
  name: string;
  rating: number | null;
  price: string;
  link: string;
  location?: string | null;
  nights?: number;
  destination?: string | null;
  imageUrl?: string | null;
};

export function HotelCard({
  step,
  title,
  name,
  rating,
  price,
  link,
  location,
  nights,
  destination,
  imageUrl,
}: HotelCardProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const effectiveImageUrl = imageUrl || photoUrl;

  useEffect(() => {
    let ignore = false;

    const hint = destination || location || name;
    if (!hint) {
      return;
    }

    const params = new URLSearchParams({
      destination: hint,
      kind: "hotel",
    });

    fetch(`/api/destination-hero?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        if (data?.image_url) setPhotoUrl(data.image_url);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [destination, location, name]);

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#d4d8e4] bg-[#f2f4f8]">
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-44 w-full overflow-hidden sm:h-auto sm:w-56">
          {effectiveImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={effectiveImageUrl} alt={name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(135deg,#d6dcea,#c8cfdf_45%,#bfc7da)]" />
          )}
          {rating != null && (
            <div className="absolute left-3 top-3 rounded-full bg-white/92 px-2 py-1 text-xs font-semibold text-[#2d3345]">
              {Number.isFinite(rating) ? rating.toFixed(1) : rating}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between p-4">
          <div>
            {title && (
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#6b7290]">
                {step ? `${step} ` : ""}
                {title}
              </p>
            )}
            <p className="font-display text-3xl leading-tight text-[#2d3345]">{name}</p>
            {location && <p className="mt-1 text-sm text-[var(--text-secondary)]">{location}</p>}
          </div>

          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">
                {nights ? `${price} x ${nights}` : price}
              </p>
              <p className="text-4xl font-semibold leading-none text-[#1f263c]">{price}</p>
            </div>
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#c5cada] bg-white px-4 py-2 text-sm font-semibold text-[#2b3248] hover:bg-[#f8f9fd]"
              aria-label={`View hotel details for ${name} in a new tab`}
            >
              View
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
