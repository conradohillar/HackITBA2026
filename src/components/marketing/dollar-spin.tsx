'use client';

const LAYERS = 40;
const DEPTH = 1.5;

export function DollarSpin() {
  return (
    <div className="flex items-center justify-center" style={{ perspective: '800px' }}>
      <div
        className="select-none"
        style={{
          width: 192,
          height: 192,
          position: 'relative',
          animation: 'dollar-rotate 8s linear infinite',
          transformStyle: 'preserve-3d',
          filter: 'drop-shadow(0 0 24px rgba(255,255,255,0.15)) drop-shadow(0 0 60px rgba(255,255,255,0.06))',
        }}
      >
        {Array.from({ length: LAYERS }).map((_, i) => (
          <svg
            key={i}
            aria-hidden={i > 0}
            width={192}
            height={192}
            viewBox="200 127 196 193"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: `translateZ(${-i * DEPTH}px)`,
            }}
          >
            <g
              transform="translate(0,450) scale(0.1,-0.1)"
              fill="#d1fae5"
              stroke="none"
            >
              <path d="M3200 3169 c0 -61 -27 -155 -66 -229 -88 -168 -238 -273 -434 -304 l-75 -12 -3 -361 -2 -362 37 -6 c182 -26 265 -65 373 -173 58 -58 86 -96 113 -152 36 -77 57 -155 57 -215 l0 -35 368 0 368 0 -4 68 c-15 288 -133 574 -330 800 l-64 73 49 55 c209 239 333 532 345 819 l3 70 -367 3 -368 2 0 -41z" />
              <path d="M2047 1893 c-4 -3 -7 -134 -7 -290 l0 -283 290 0 290 0 0 290 0 290 -283 0 c-156 0 -287 -3 -290 -7z" />
            </g>
          </svg>
        ))}
      </div>
    </div>
  );
}
