import type { ServiceVisual } from "@/lib/content";

/**
 * Original illustrations for the service showcase (decorative; the text next
 * to them carries the meaning). Replace with photos via `image` in lib/content.ts.
 */
export function ServiceIllustration({ visual }: { visual: ServiceVisual }) {
  return (
    <svg viewBox="0 0 640 440" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      <defs>
        <linearGradient id={`bg-${visual}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0d1130" />
          <stop offset="1" stopColor="#05060f" />
        </linearGradient>
        <radialGradient id={`glow-${visual}`} cx="0.7" cy="0.2" r="0.8">
          <stop offset="0" stopColor="#2f2dff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#2f2dff" stopOpacity="0" />
        </radialGradient>
        <filter id={`soft-${visual}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <rect width="640" height="440" fill={`url(#bg-${visual})`} />
      <rect width="640" height="440" fill={`url(#glow-${visual})`} />
      {visual === "same-day" && <SameDay id={visual} />}
      {visual === "next-day" && <NextDay id={visual} />}
      {visual === "scheduled" && <Scheduled />}
      {visual === "fragile" && <Fragile id={visual} />}
    </svg>
  );
}

/** City street grid with a glowing route to a destination pin. */
function SameDay({ id }: { id: string }) {
  const streets = [
    "M0 92 H640", "M0 188 H640", "M0 300 H640", "M0 384 H640",
    "M70 0 V440", "M188 0 V440", "M318 0 V440", "M452 0 V440", "M566 0 V440",
    "M0 250 L640 130",
  ];
  const route = "M96 384 H188 V300 H318 V188 L452 162 V92 H540";
  return (
    <g>
      {streets.map((d) => (
        <path key={d} d={d} stroke="rgba(178,190,255,0.12)" strokeWidth="10" fill="none" />
      ))}
      {[[80, 100, 96, 76], [200, 104, 104, 72], [330, 200, 110, 88], [470, 200, 84, 90], [84, 310, 92, 62], [330, 312, 112, 60]].map(
        ([x, y, w, h]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} fill="rgba(178,190,255,0.05)" stroke="rgba(178,190,255,0.08)" />
        ),
      )}
      <path d={route} stroke="#ff5a36" strokeWidth="10" fill="none" opacity="0.5" filter={`url(#soft-${id})`} />
      <path d={route} stroke="#ff7a5c" strokeWidth="4" fill="none" strokeLinejoin="round" />
      <circle cx="96" cy="384" r="9" fill="#fff" />
      <circle cx="318" cy="250" r="12" fill="#2f2dff" stroke="#fff" strokeWidth="3" />
      <path d="M540 52c-14 0-24 10-24 24 0 18 24 40 24 40s24-22 24-40c0-14-10-24-24-24z" fill="#ff5a36" />
      <circle cx="540" cy="76" r="8" fill="#fff" />
      <g transform="translate(40 36)">
        <rect width="132" height="40" fill="rgba(7,9,20,0.85)" stroke="rgba(255,255,255,0.2)" />
        <circle cx="20" cy="20" r="5" fill="#ff5a36" />
        <text x="34" y="25" fill="#e2e8ff" fontSize="14" fontFamily="var(--font-jetbrains), monospace" letterSpacing="1">ETA 16:40</text>
      </g>
    </g>
  );
}

/** Night highway in perspective with light trails. */
function NextDay({ id }: { id: string }) {
  return (
    <g>
      {Array.from({ length: 40 }, (_, i) => (
        <circle key={i} cx={(i * 157) % 640} cy={(i * 71) % 170} r={i % 5 === 0 ? 1.6 : 1} fill="#fff" opacity={0.25 + (i % 4) * 0.12} />
      ))}
      <circle cx="520" cy="70" r="26" fill="#e2e8ff" opacity="0.85" />
      <circle cx="532" cy="62" r="24" fill="#0b0f2e" />
      {[[20, 40], [70, 64], [120, 30], [160, 52], [400, 48], [440, 70], [490, 36], [560, 58], [600, 40]].map(([x, h]) => (
        <rect key={x} x={x} y={200 - h} width="34" height={h} fill="#10153a" />
      ))}
      <path d="M0 200 H640" stroke="rgba(178,190,255,0.25)" />
      <path d="M300 200 L40 440 H600 L340 200 Z" fill="#0a0d24" />
      <path d="M320 205 V440" stroke="rgba(255,255,255,0.5)" strokeWidth="4" strokeDasharray="16 22" />
      <path d="M305 205 L120 440" stroke="#ff5a36" strokeWidth="6" opacity="0.5" filter={`url(#soft-${id})`} />
      <path d="M305 205 L120 440" stroke="#ff7a5c" strokeWidth="2.5" />
      <path d="M335 205 L520 440" stroke="#4d50ff" strokeWidth="6" opacity="0.6" filter={`url(#soft-${id})`} />
      <path d="M335 205 L520 440" stroke="#9da2ff" strokeWidth="2.5" />
      <g transform="translate(250 330)">
        <rect x="0" y="0" width="140" height="70" fill="#161b33" stroke="rgba(255,255,255,0.25)" />
        <rect x="10" y="12" width="120" height="30" fill="#0d1020" />
        <circle cx="22" cy="58" r="7" fill="#ff7a5c" />
        <circle cx="118" cy="58" r="7" fill="#ff7a5c" />
      </g>
    </g>
  );
}

/** Weekly rounds board: stops connected across the week. */
function Scheduled() {
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const cellW = 92;
  const x0 = 44;
  const y0 = 92;
  const stops: Array<[number, number]> = [[0, 0], [1, 2], [2, 1], [3, 3], [4, 1], [5, 2]];
  const center = ([c, r]: [number, number]) => [x0 + c * cellW + cellW / 2, y0 + r * 76 + 38];
  const path = stops.map((s, i) => `${i ? "L" : "M"}${center(s).join(" ")}`).join(" ");
  return (
    <g fontFamily="var(--font-jetbrains), monospace">
      {days.map((d, c) => (
        <text key={d} x={x0 + c * cellW + cellW / 2} y="70" textAnchor="middle" fill="rgba(226,232,255,0.6)" fontSize="13" letterSpacing="2">
          {d}
        </text>
      ))}
      {days.map((_, c) =>
        [0, 1, 2, 3].map((r) => (
          <rect
            key={`${c}-${r}`}
            x={x0 + c * cellW + 4}
            y={y0 + r * 76 + 4}
            width={cellW - 8}
            height="68"
            fill={stops.some(([sc, sr]) => sc === c && sr === r) ? "rgba(47,45,255,0.35)" : "rgba(178,190,255,0.05)"}
            stroke="rgba(178,190,255,0.12)"
          />
        )),
      )}
      <path d={path} stroke="#ff7a5c" strokeWidth="3" fill="none" strokeDasharray="2 8" strokeLinecap="round" />
      {stops.map((s, i) => {
        const [x, y] = center(s);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="11" fill="#ff5a36" />
            <text x={x} y={y + 4} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">
              {i + 1}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** Protected parcel with a shield and a signature line. */
function Fragile({ id }: { id: string }) {
  return (
    <g>
      <ellipse cx="300" cy="372" rx="190" ry="26" fill="#2f2dff" opacity="0.35" filter={`url(#soft-${id})`} />
      {/* Box: top, left and right faces */}
      <path d="M300 96 L470 170 L300 244 L130 170 Z" fill="#2a2f6b" stroke="rgba(255,255,255,0.25)" />
      <path d="M130 170 L300 244 V384 L130 310 Z" fill="#1a1f4d" stroke="rgba(255,255,255,0.2)" />
      <path d="M470 170 L300 244 V384 L470 310 Z" fill="#141838" stroke="rgba(255,255,255,0.2)" />
      <path d="M215 133 L385 207" stroke="#ff7a5c" strokeWidth="14" opacity="0.9" />
      <path d="M385 207 V346" stroke="#ff7a5c" strokeWidth="14" opacity="0.75" />
      {/* Fragile glass */}
      <g transform="translate(176 236)" stroke="#e2e8ff" strokeWidth="3" fill="none" opacity="0.8">
        <path d="M0 0 H40 L34 30 Q20 42 6 30 Z" />
        <path d="M20 40 V62 M8 62 H32" />
      </g>
      {/* Shield */}
      <g transform="translate(456 64)">
        <path d="M60 0 L112 18 V58 C112 96 86 118 60 128 C34 118 8 96 8 58 V18 Z" fill="#ff5a36" />
        <path d="M34 64 L52 82 L88 44" stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* Signature */}
      <path
        d="M420 360 c10 -24 22 -24 18 0 c-3 18 14 -26 24 -8 c6 10 10 -6 18 -2 c8 4 6 14 26 6"
        stroke="#e2e8ff"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M410 380 H560" stroke="rgba(226,232,255,0.35)" strokeWidth="2" />
    </g>
  );
}
