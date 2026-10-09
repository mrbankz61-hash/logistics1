/** Decorative, original route illustration for the hero. Hidden from assistive tech. */
export function HeroIllustration() {
  return (
    <svg viewBox="0 0 420 360" className="h-auto w-full" aria-hidden focusable="false">
      <defs>
        <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M28 0H0V28" fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth="1" />
        </pattern>
        <linearGradient id="card" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f1f5f9" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="420" height="360" rx="24" fill="url(#grid)" />
      {/* Roads */}
      <path d="M40 300 C 120 300, 110 210, 190 200 S 300 120, 380 60" fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="18" strokeLinecap="round" />
      <path
        id="hero-route"
        d="M40 300 C 120 300, 110 210, 190 200 S 300 120, 380 60"
        fill="none"
        stroke="var(--color-brand-300)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="2 10"
      />
      <path d="M40 300 C 120 300, 110 210, 190 200" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
      {/* Origin */}
      <circle cx="40" cy="300" r="10" fill="#0f172a" stroke="#fff" strokeWidth="4" />
      {/* Destination pin */}
      <g transform="translate(380 60)">
        <circle r="22" fill="var(--color-brand-300)" opacity="0.25" />
        <circle r="11" fill="var(--color-brand-500)" stroke="#fff" strokeWidth="4" />
      </g>
      {/* Vehicle moving along the route */}
      <g>
        <circle r="15" fill="#fff" />
        <circle r="11" fill="var(--color-brand-700)" />
        {/* Plays once (under 5 s) and stops halfway, so there is no looping motion. */}
        <animateMotion dur="4s" fill="freeze" keyPoints="0;0.44" keyTimes="0;1" calcMode="linear">
          <mpath href="#hero-route" />
        </animateMotion>
      </g>
      {/* Status card */}
      <g transform="translate(210 240)">
        <rect width="190" height="92" rx="14" fill="url(#card)" />
        <rect x="16" y="16" width="76" height="20" rx="10" fill="var(--color-brand-100)" />
        <text x="54" y="30" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-brand-800)" fontFamily="var(--font-sans)">
          In transit
        </text>
        <text x="16" y="58" fontSize="11" fill="#475569" fontFamily="var(--font-sans)">
          Estimated arrival
        </text>
        <text x="16" y="77" fontSize="15" fontWeight="800" fill="#0f172a" fontFamily="var(--font-sans)">
          Today, 16:40
        </text>
        <rect x="120" y="66" width="54" height="6" rx="3" fill="#e2e8f0" />
        <rect x="120" y="66" width="34" height="6" rx="3" fill="var(--color-brand-600)" />
      </g>
    </svg>
  );
}
