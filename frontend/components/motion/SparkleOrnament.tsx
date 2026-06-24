/**
 * <SparkleOrnament /> — 4-pointed sparkle SVG used as a branded marker
 * before eyebrow / category labels. One reusable component so every
 * page renders the same shape with the same stroke weight and the same
 * accent colour, keeping the visual system disciplined.
 *
 * Pure SVG, no client JS, no animations — safe inside server components.
 */

interface SparkleOrnamentProps {
  className?: string
  size?: number
}

export function SparkleOrnament({
  className = 'w-3 h-3 text-teal-600',
  size = 12,
}: SparkleOrnamentProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
    >
      <path d="M12 0L13.5 9.5L24 12L13.5 14.5L12 24L10.5 14.5L0 12L10.5 9.5L12 0Z" />
    </svg>
  )
}
