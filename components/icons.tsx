interface P { size?: number; color?: string; className?: string; }

function Svg({ size = 24, color = "currentColor", className = "", children }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {children}
    </svg>
  );
}

export function IconZap(p: P) {
  return <Svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Svg>;
}

export function IconBrain(p: P) {
  return (
    <Svg {...p}>
      <path d="M9.5 2A3.5 3.5 0 0 0 6 5.5C4.3 5.9 3 7.3 3 9a3 3 0 0 0 3 3v2a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-2a3 3 0 0 0 3-3c0-1.7-1.3-3.1-3-3.5A3.5 3.5 0 0 0 14.5 2a3.5 3.5 0 0 0-2.5 1.05A3.5 3.5 0 0 0 9.5 2z"/>
      <line x1="12" y1="3.05" x2="12" y2="14"/>
      <path d="M9 8c0 1 .5 2 1.5 2.5M15 8c0 1-.5 2-1.5 2.5"/>
    </Svg>
  );
}

export function IconLayers(p: P) {
  return (
    <Svg {...p}>
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </Svg>
  );
}

export function IconGift(p: P) {
  return (
    <Svg {...p}>
      <polyline points="20 12 20 22 4 22 4 12"/>
      <rect x="2" y="7" width="20" height="5"/>
      <path d="M12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </Svg>
  );
}

export function IconFlask(p: P) {
  return (
    <Svg {...p}>
      <path d="M9 3v7L3 20h18L15 10V3"/>
      <line x1="9" y1="3" x2="15" y2="3"/>
      <path d="M6 16h12" strokeWidth="1.5"/>
    </Svg>
  );
}

export function IconLandmark(p: P) {
  return (
    <Svg {...p}>
      <line x1="3" y1="22" x2="21" y2="22"/>
      <line x1="6" y1="18" x2="6" y2="11"/>
      <line x1="10" y1="18" x2="10" y2="11"/>
      <line x1="14" y1="18" x2="14" y2="11"/>
      <line x1="18" y1="18" x2="18" y2="11"/>
      <polygon points="12 2 20 7 4 7 12 2"/>
      <line x1="3" y1="11" x2="21" y2="11"/>
    </Svg>
  );
}

export function IconSigma(p: P) {
  return (
    <Svg {...p}>
      <path d="M18 4H6l7 8-7 8h12"/>
    </Svg>
  );
}

export function IconCode(p: P) {
  return (
    <Svg {...p}>
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
      <line x1="14" y1="4" x2="10" y2="20"/>
    </Svg>
  );
}

export function IconHeartPulse(p: P) {
  return (
    <Svg {...p}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/>
      <polyline points="2 13 6 13 8 9 10 17 12 13 14 13"/>
    </Svg>
  );
}

export function IconLeaf(p: P) {
  return (
    <Svg {...p}>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
    </Svg>
  );
}

export function IconGlobe(p: P) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </Svg>
  );
}

export function IconTrendingUp(p: P) {
  return (
    <Svg {...p}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
      <polyline points="16 7 22 7 22 13"/>
    </Svg>
  );
}

export function IconType(p: P) {
  return (
    <Svg {...p}>
      <polyline points="4 7 4 4 20 4 20 7"/>
      <line x1="9" y1="20" x2="15" y2="20"/>
      <line x1="12" y1="4" x2="12" y2="20"/>
    </Svg>
  );
}

export function IconTrophy(p: P) {
  return (
    <Svg {...p}>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
      <path d="M7 4h10v7a5 5 0 0 1-10 0V4z"/>
      <path d="M7 4H3v3a4 4 0 0 0 4 4"/>
      <path d="M17 4h4v3a4 4 0 0 1-4 4"/>
    </Svg>
  );
}

export function IconLightbulb(p: P) {
  return (
    <Svg {...p}>
      <path d="M9 21h6M12 3a6 6 0 0 1 6 6c0 3-2 5-3 6H9c-1-1-3-3-3-6a6 6 0 0 1 6-6z"/>
      <path d="M9 17v1a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1"/>
    </Svg>
  );
}

export function IconPlay(p: P) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10"/>
      <polygon points="10 8 16 12 10 16 10 8"/>
    </Svg>
  );
}

export function IconUsers(p: P) {
  return (
    <Svg {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </Svg>
  );
}

export function IconStar(p: P) {
  return (
    <Svg {...p}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </Svg>
  );
}

export function IconTarget(p: P) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </Svg>
  );
}

export function IconBarChart(p: P) {
  return (
    <Svg {...p}>
      <line x1="12" y1="20" x2="12" y2="10"/>
      <line x1="18" y1="20" x2="18" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="16"/>
      <line x1="2" y1="20" x2="22" y2="20"/>
    </Svg>
  );
}

export function IconCheckCircle(p: P) {
  return (
    <Svg {...p}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </Svg>
  );
}

export function IconClock(p: P) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </Svg>
  );
}

export function IconArrowRight(p: P) {
  return (
    <Svg {...p}>
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </Svg>
  );
}

export function IconHome(p: P) {
  return (
    <Svg {...p}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </Svg>
  );
}

export function IconAward(p: P) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8" r="6"/>
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
    </Svg>
  );
}

/* ── SiKuis brand mark (custom, not a generic icon) ─────────────────────────── */
export function SiKuisLogoMark({ size = 36, id }: { size?: number; id?: string }) {
  const gradId = id ?? `sk${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1D4ED8"/>
          <stop offset="100%" stopColor="#2563EB"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="24" fill={`url(#${gradId})`}/>
      <rect width="100" height="42" rx="24" fill="rgba(255,255,255,0.08)"/>
      <path d="M34,32 C34,19 66,19 66,32 C66,45 53,49 53,62"
        stroke="white" strokeWidth="11" strokeLinecap="round" fill="none"/>
      <circle cx="53" cy="76" r="6.5" fill="white"/>
    </svg>
  );
}
