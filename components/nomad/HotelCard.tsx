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
    if (!hint || imageUrl) {
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
  }, [destination, location, name, imageUrl]);

  return (
    <div className="group overflow-hidden rounded-3xl bg-card shadow-soft ring-1 ring-border/60 transition-all hover:shadow-card animate-float-up sm:flex">
      <div className="relative h-48 sm:h-auto sm:w-56 sm:shrink-0">
        {effectiveImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={effectiveImageUrl}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/hotel-seaview.jpg"
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}

        {rating != null && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-foreground shadow-soft backdrop-blur-md">
            <span className="text-warning">★</span>
            {Number.isFinite(rating) ? rating.toFixed(1) : rating}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {step ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] text-background">
                {step}
              </span>
            ) : null}
            {title || "Hotel Stay"}
          </div>
          <h4 className="font-display text-xl font-medium leading-tight text-foreground">{name}</h4>
          {location && (
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 17s5-4.3 5-8.2A5 5 0 005 8.8C5 12.7 10 17 10 17z" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="10" cy="9" r="1.7" fill="currentColor" />
              </svg>
              {location}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">
              {nights ? (
                <>
                  {price} <span>/ night × {nights}</span>
                </>
              ) : (
                price
              )}
            </div>
            <div className="font-display text-2xl font-semibold text-foreground">{price}</div>
          </div>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/35"
            aria-label={`View hotel details for ${name} in a new tab`}
          >
            View ↗
          </a>
        </div>
      </div>
    </div>
  );
}
