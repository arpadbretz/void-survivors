import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name = searchParams.get('name') || 'Survivor';
  const score = searchParams.get('score') || '0';
  const wave = searchParams.get('wave') || '0';
  const kills = searchParams.get('kills') || '0';
  const character = searchParams.get('character') || 'Void Walker';
  const timeRaw = parseInt(searchParams.get('time') || '0', 10);

  const minutes = Math.floor(timeRaw / 60);
  const seconds = timeRaw % 60;
  const timeFormatted = `${minutes}m ${seconds}s`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(180deg, #0a0a14 0%, #0d0820 50%, #0a0a14 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '40px 60px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Border */}
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            right: 6,
            bottom: 6,
            border: '1px solid rgba(0, 240, 255, 0.15)',
            borderRadius: 8,
            display: 'flex',
          }}
        />

        {/* Top: Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <div
            style={{
              fontSize: 42,
              fontWeight: 900,
              letterSpacing: '-0.01em',
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
              fontSize: 14,
              color: 'rgba(224, 224, 240, 0.35)',
              letterSpacing: '0.25em',
              fontWeight: 400,
            }}
          >
            RUN RESULTS
          </div>
        </div>

        {/* Middle: Player name + character */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '0.02em',
              textShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
              lineHeight: 1.1,
            }}
          >
            {name}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 20px',
              borderRadius: 20,
              border: '1px solid rgba(170, 68, 255, 0.4)',
              background: 'rgba(170, 68, 255, 0.1)',
            }}
          >
            <span style={{ fontSize: 16, color: '#aa44ff', fontWeight: 700, letterSpacing: '0.08em' }}>
              {character}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            gap: 40,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Wave */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(224, 224, 240, 0.4)', letterSpacing: '0.2em' }}>
              WAVE
            </div>
            <div style={{ fontSize: 44, fontWeight: 900, color: '#00f0ff', lineHeight: 1, textShadow: '0 0 20px rgba(0, 240, 255, 0.5)' }}>
              {wave}
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 50, background: 'rgba(0, 240, 255, 0.15)', display: 'flex' }} />

          {/* Score */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(224, 224, 240, 0.4)', letterSpacing: '0.2em' }}>
              SCORE
            </div>
            <div style={{ fontSize: 44, fontWeight: 900, color: '#ff00aa', lineHeight: 1, textShadow: '0 0 20px rgba(255, 0, 170, 0.5)' }}>
              {parseInt(score, 10).toLocaleString()}
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 50, background: 'rgba(0, 240, 255, 0.15)', display: 'flex' }} />

          {/* Kills */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(224, 224, 240, 0.4)', letterSpacing: '0.2em' }}>
              KILLS
            </div>
            <div style={{ fontSize: 44, fontWeight: 900, color: '#aa44ff', lineHeight: 1, textShadow: '0 0 20px rgba(170, 68, 255, 0.5)' }}>
              {parseInt(kills, 10).toLocaleString()}
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 50, background: 'rgba(0, 240, 255, 0.15)', display: 'flex' }} />

          {/* Time */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(224, 224, 240, 0.4)', letterSpacing: '0.2em' }}>
              TIME
            </div>
            <div style={{ fontSize: 44, fontWeight: 900, color: '#00f0ff', lineHeight: 1, textShadow: '0 0 20px rgba(0, 240, 255, 0.5)' }}>
              {timeFormatted}
            </div>
          </div>
        </div>

        {/* Bottom: URL */}
        <div
          style={{
            fontSize: 14,
            color: 'rgba(0, 240, 255, 0.4)',
            letterSpacing: '0.1em',
          }}
        >
          voidsurvivors.eu
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
