type ActionChipsProps = {
  items: string[];
  onAction: (action: string) => void;
};

export function ActionChips({ items, onAction }: ActionChipsProps) {
  if (items.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.slice(0, 6).map((action, idx) => (
        <button
          key={`${action}-${idx}`}
          type="button"
          onClick={() => onAction(action)}
          className="chip"
          aria-label={`Apply quick action: ${action}`}
        >
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-primary">
            <path d="M10 3l1.8 3.7L16 8l-3 2.9.7 4.1-3.7-1.9-3.7 1.9.7-4.1L4 8l4.2-1.3L10 3z" fill="currentColor" />
          </svg>
          {action}
        </button>
      ))}
    </div>
  );
}
