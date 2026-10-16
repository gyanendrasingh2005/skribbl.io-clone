/** Decorative skribble-style backdrop (SVG, no external assets). */
export function AppBackground() {
  return (
    <div className="app-bg" aria-hidden="true">
      <svg className="app-bg__svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2d1b69" />
            <stop offset="45%" stopColor="#1e3a5f" />
            <stop offset="100%" stopColor="#0f4c5c" />
          </linearGradient>
          <radialGradient id="glow1" cx="20%" cy="20%" r="50%">
            <stop offset="0%" stopColor="#ff6b9d" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff6b9d" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glow2" cx="85%" cy="75%" r="45%">
            <stop offset="0%" stopColor="#ffe66d" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ffe66d" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glow3" cx="70%" cy="15%" r="40%">
            <stop offset="0%" stopColor="#4ecdc4" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#4ecdc4" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#sky)" />
        <rect width="100%" height="100%" fill="url(#glow1)" />
        <rect width="100%" height="100%" fill="url(#glow2)" />
        <rect width="100%" height="100%" fill="url(#glow3)" />

        {/* Doodles */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
          <path d="M120 180 Q200 120 280 200 T440 160" stroke="#ffe66d" strokeWidth="14" />
          <path d="M1000 120 Q1080 60 1180 140 T1320 100" stroke="#4ecdc4" strokeWidth="12" />
          <path d="M80 620 Q160 560 240 640 T400 600" stroke="#f472b6" strokeWidth="10" />
          <path d="M1100 680 Q1180 620 1280 700" stroke="#a78bfa" strokeWidth="11" />
          <circle cx="200" cy="320" r="48" stroke="#ff6b6b" strokeWidth="8" />
          <circle cx="1240" cy="380" r="36" stroke="#95e1d3" strokeWidth="7" />
          <polygon points="320,720 360,640 400,720" fill="#ffe66d" opacity="0.5" />
          <polygon points="1180,520 1220,440 1260,520" fill="#4ecdc4" opacity="0.45" />
        </g>

        <g fontFamily="Nunito, sans-serif" fontWeight="800" opacity="0.12">
          <text x="180" y="140" fill="#fff" fontSize="72" transform="rotate(-12 180 140)">DRAW</text>
          <text x="1050" y="780" fill="#fff" fontSize="64" transform="rotate(8 1050 780)">GUESS</text>
          <text x="1280" y="200" fill="#ffe66d" fontSize="48" transform="rotate(15 1280 200)">!</text>
          <text x="100" y="480" fill="#4ecdc4" fontSize="56" transform="rotate(-6 100 480)">?</text>
        </g>

        {/* Crayon / pencil accents */}
        <g opacity="0.9">
          <rect x="1320" y="560" width="18" height="100" rx="4" fill="#ff6b6b" transform="rotate(25 1329 610)" />
          <polygon points="1329,660 1338,690 1320,690" fill="#f5d0c5" transform="rotate(25 1329 675)" />
          <rect x="140" y="80" width="14" height="90" rx="3" fill="#4ecdc4" transform="rotate(-20 147 125)" />
          <rect x="600" y="780" width="16" height="85" rx="4" fill="#ffe66d" transform="rotate(12 608 822)" />
          <circle cx="620" cy="200" r="22" fill="#a78bfa" opacity="0.7" />
          <circle cx="900" cy="650" r="18" fill="#f472b6" opacity="0.75" />
          <circle cx="450" cy="420" r="14" fill="#95e1d3" opacity="0.8" />
        </g>

        <g stroke="#fff" strokeWidth="3" opacity="0.15" fill="none">
          <path d="M500 100 L520 140 L480 140 Z" />
          <path d="M950 400 L970 440 L930 440 Z" />
          <path d="M750 850 L770 890 L730 890 Z" />
        </g>
      </svg>
      <div className="app-bg__grain" />
    </div>
  );
}
