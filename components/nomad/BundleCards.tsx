type BundleCardItem = {
  id?: string;
  title: string;
  total_price: string;
  saving_hint?: string;
  flight: {
    airline: string;
  };
  hotel: {
    name: string;
  };
};

type BundleCardsProps = {
  items: BundleCardItem[];
};

export function BundleCards({ items }: BundleCardsProps) {
  if (items.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="mb-2 font-semibold">Bundles</p>
      <div className="space-y-2">
        {items.slice(0, 3).map((pkg, i) => (
          <div
            key={pkg.id || i}
            className="rounded-lg border border-[#cfd8f1] bg-[linear-gradient(160deg,#f5f8ff,#eef3ff)] p-3"
          >
            <p className="font-semibold">{pkg.title}</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Flight: {pkg.flight.airline} | Hotel: {pkg.hotel.name}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">{pkg.saving_hint || ""}</p>
            <p className="font-semibold">Total: {pkg.total_price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
