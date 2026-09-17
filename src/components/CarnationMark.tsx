const PETAL_D = "M16,17 C13,17 11,13 12,9 C12.4,7.6 14,7.2 16,10 C18,7.2 19.6,7.6 20,9 C21,13 19,17 16,17 Z";
const ANGLES = [0, 60, 120, 180, 240, 300];

/** A small stylized carnation flower mark, in `currentColor`. */
export function CarnationMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      {ANGLES.map((angle, i) => (
        <path key={angle} d={PETAL_D} transform={`rotate(${angle} 16 16)`} opacity={i % 2 === 0 ? 1 : 0.72} />
      ))}
      <circle cx="16" cy="16" r="2.6" opacity={0.9} />
    </svg>
  );
}
