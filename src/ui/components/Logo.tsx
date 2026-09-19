/** Klynto shield mark, inline so it works in every surface without assets. */
export function Logo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="klynto-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <path
        d="M64 6 L114 25 V62 C114 92 94 112 64 122 C34 112 14 92 14 62 V25 Z"
        fill="url(#klynto-g)"
      />
      {/* K glyph */}
      <rect x="42" y="38" width="13" height="52" rx="2.5" fill="#062b26" />
      <path d="M60 64 L84 38 H99 L72 68 L99 90 H84 L60 66 Z" fill="#062b26" />
    </svg>
  );
}
