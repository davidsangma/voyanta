type NomadPlaneMarkProps = {
  className?: string;
};

export function NomadPlaneMark({ className = "h-5 w-5" }: NomadPlaneMarkProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M10.2 14.2l-3.8 3-.9-.8 2.3-4.4-3.8-2.8.9-.9 4.7 1.5 4.8-4.3c1-1 2.6-1 3.6 0l.1.1c1 1 1 2.6 0 3.6l-4.3 4.8 1.5 4.7-.9.9-2.8-3.8-4.4 2.3-.8-.9 3-3.8z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
