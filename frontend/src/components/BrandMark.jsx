/**
 * SwarmAI Official Brand Mark
 * Three thin overlapping arcs in brass suggesting agent consensus / distributed orchestration.
 * Use this component everywhere the brand needs to appear — navbar, login, loading states, reports.
 */
export default function BrandMark({ size = 28, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-label="SwarmAI"
      className={className}
      style={{ display: 'inline-block', flexShrink: 0 }}
    >
      {/* Arc 1 — left agent */}
      <path
        d="M6 16 A10 10 0 0 1 16 6"
        stroke="#C9A227"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Arc 2 — right agent */}
      <path
        d="M26 16 A10 10 0 0 0 16 6"
        stroke="#C9A227"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Arc 3 — consensus / synthesizer, slightly faded */}
      <path
        d="M7 21 A11 11 0 0 0 25 21"
        stroke="#C9A227"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
      {/* Center node — the convergence point */}
      <circle
        cx="16"
        cy="6"
        r="1.5"
        fill="#C9A227"
        opacity="0.8"
      />
    </svg>
  );
}
