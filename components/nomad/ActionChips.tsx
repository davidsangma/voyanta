type ActionChipsProps = {
  items: string[];
  onAction: (action: string) => void;
};

export function ActionChips({ items, onAction }: ActionChipsProps) {
  if (items.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.slice(0, 4).map((action, idx) => (
        <button
          key={`${action}-${idx}`}
          type="button"
          onClick={() => onAction(action)}
          className="chip"
          aria-label={`Apply quick action: ${action}`}
        >
          {action}
        </button>
      ))}
    </div>
  );
}
