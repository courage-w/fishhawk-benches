// Small inline icons. Decorative unless a title is given.

type IconProps = { className?: string; title?: string };

function a11y(title?: string) {
  return title ? { role: "img", "aria-label": title } : { "aria-hidden": true as const };
}

/** A park bench seen from the side. Also used as the map pin glyph. */
export function BenchIcon({ className, title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className={className} {...a11y(title)}>
      <path d="M4 9.5h16M4 6.5h16M3 13h18M6 13v5M18 13v5M6 6.5v6.5M18 6.5v6.5" />
    </svg>
  );
}

export function TrashIcon({ className, title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} {...a11y(title)}>
      <path d="M5 7h14M9.5 7V5h5v2M6.5 7l1 12h9l1-12" />
    </svg>
  );
}

export function LeafIcon({ className, title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} {...a11y(title)}>
      <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z M5 19l7-7" />
    </svg>
  );
}

export function DashIcon({ className, title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={className} {...a11y(title)}>
      <path d="M7 12h10" />
    </svg>
  );
}

/** Arrow rotated to a compass heading (0 = north/up). */
export function CompassArrow({ degrees, className }: { degrees: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeOpacity={0.35} />
      <g transform={`rotate(${degrees} 12 12)`}>
        <path d="M12 4.5 15.5 14 12 12.3 8.5 14Z" fill="currentColor" />
      </g>
    </svg>
  );
}
