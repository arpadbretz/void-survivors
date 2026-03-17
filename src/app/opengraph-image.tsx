import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Void Survivors - A browser-based roguelike survivors game';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0a0a12',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(0,240,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.06) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />

        {/* Decorative shapes */}
        <div
          style={{
            position: 'absolute',
            top: 140,
            left: 180,
            width: 40,
            height: 40,
            background: '#ff3344',
            transform: 'rotate(45deg)',
            opacity: 0.5,
            borderRadius: 4,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 160,
            right: 200,
            width: 30,
            height: 30,
            background: '#ff44aa',
            opacity: 0.4,
            borderRadius: 2,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 200,
            left: 150,
            width: 35,
            height: 35,
            background: '#aa44ff',
            opacity: 0.35,
            borderRadius: 4,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 180,
            right: 160,
            width: 25,
            height: 25,
            background: '#ff8800',
            opacity: 0.4,
            transform: 'rotate(45deg)',
            borderRadius: 2,
          }}
        />

        {/* XP orbs */}
        <div
          style={{
            position: 'absolute',
            top: 280,
            left: 300,
            width: 12,
            height: 12,
            background: '#00ff88',
            opacity: 0.6,
            transform: 'rotate(45deg)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 350,
            right: 280,
            width: 10,
            height: 10,
            background: '#00ff88',
            opacity: 0.5,
            transform: 'rotate(45deg)',
          }}
        />

        {/* Center player glow */}
        <div
          style={{
            position: 'absolute',
            top: 180,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 120,
            height: 120,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(0,238,255,0.3) 0%, transparent 70%)',
          }}
        />

        {/* Player hexagon (approximated as rounded square) */}
        <div
          style={{
            position: 'absolute',
            top: 210,
            left: '50%',
            transform: 'translateX(-50%) rotate(30deg)',
            width: 50,
            height: 50,
            background: '#00eeff',
            borderRadius: 8,
            opacity: 0.9,
            border: '2px solid #ffffff',
          }}
        />

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 100,
          }}
        >
          <div
            style={{
              fontSize: 88,
              fontWeight: 900,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #00f0ff, #ff00aa)',
              backgroundClip: 'text',
              color: 'transparent',
              lineHeight: 1,
            }}
          >
            VOID SURVIVORS
          </div>

          <div
            style={{
              fontSize: 22,
              color: 'rgba(224, 224, 240, 0.5)',
              letterSpacing: '0.3em',
              marginTop: 16,
              fontWeight: 400,
            }}
          >
            SURVIVE THE VOID. BECOME THE WEAPON.
          </div>

          <div
            style={{
              display: 'flex',
              gap: 32,
              marginTop: 40,
              color: 'rgba(224, 224, 240, 0.4)',
              fontSize: 16,
              letterSpacing: '0.1em',
            }}
          >
            <span>ROGUELIKE</span>
            <span style={{ color: '#00f0ff' }}>|</span>
            <span>BROWSER-BASED</span>
            <span style={{ color: '#00f0ff' }}>|</span>
            <span>FREE TO PLAY</span>
          </div>
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 14,
            color: 'rgba(0, 240, 255, 0.4)',
            letterSpacing: '0.1em',
            fontFamily: 'monospace',
          }}
        >
          void-survivors.vercel.app
        </div>

        {/* Border */}
        <div
          style={{
            position: 'absolute',
            inset: 4,
            border: '1px solid rgba(0, 240, 255, 0.15)',
            borderRadius: 6,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
