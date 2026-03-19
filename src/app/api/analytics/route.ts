// ============================================================
// Game Analytics API — Void Survivors
// Lightweight event tracking via Upstash Redis
// Shares the same Redis instance as the leaderboard
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// ── Redis Client ────────────────────────────────────────────

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    return null;
  }

  try {
    redis = new Redis({ url, token });
    return redis;
  } catch {
    return null;
  }
}

// ── Helpers ─────────────────────────────────────────────────

function getDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekKey(): string {
  const d = new Date();
  // ISO week number
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - jan1.getTime()) / 86400000);
  const week = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-${String(week).padStart(2, '0')}`;
}

/** Simple one-way hash — no raw IP/UA stored */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  // Mix in a salt to make it harder to reverse
  hash = ((hash << 13) ^ hash) | 0;
  hash = (hash * 0x5bd1e995) | 0;
  return 'u' + Math.abs(hash).toString(36);
}

const TTL_90_DAYS = 90 * 24 * 60 * 60;

// ── POST — Record "game started" event ─────────────────────

export async function POST(request: NextRequest) {
  const r = getRedis();
  if (!r) {
    // Redis not configured — return OK so the game doesn't break
    return NextResponse.json({ ok: true });
  }

  try {
    const dateKey = getDateKey();
    const weekKey = getWeekKey();

    // Build a one-way hash from IP + User-Agent
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const ua = request.headers.get('user-agent') || 'unknown';
    const playerHash = simpleHash(ip + '|' + ua);

    // Use pipeline to batch all Redis commands
    const pipe = r.pipeline();

    // Daily game count
    pipe.incr(`analytics:games:${dateKey}`);
    pipe.expire(`analytics:games:${dateKey}`, TTL_90_DAYS);

    // Daily unique players (SET — SADD auto-deduplicates)
    pipe.sadd(`analytics:dau:${dateKey}`, playerHash);
    pipe.expire(`analytics:dau:${dateKey}`, TTL_90_DAYS);

    // Weekly unique players
    pipe.sadd(`analytics:wau:${weekKey}`, playerHash);
    pipe.expire(`analytics:wau:${weekKey}`, TTL_90_DAYS);

    // All-time counter
    pipe.incr('analytics:total_games');

    await pipe.exec();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Analytics POST error:', err);
    // Always return OK — analytics should never break the game
    return NextResponse.json({ ok: true });
  }
}

// ── GET — Return current stats (internal use) ──────────────

export async function GET() {
  const r = getRedis();
  if (!r) {
    return NextResponse.json({ error: 'Analytics not configured' }, { status: 503 });
  }

  try {
    const dateKey = getDateKey();
    const weekKey = getWeekKey();

    const [todayGames, todayDAU, weekWAU, totalGames] = await Promise.all([
      r.get<number>(`analytics:games:${dateKey}`),
      r.scard(`analytics:dau:${dateKey}`),
      r.scard(`analytics:wau:${weekKey}`),
      r.get<number>('analytics:total_games'),
    ]);

    return NextResponse.json({
      date: dateKey,
      week: weekKey,
      today_games: todayGames || 0,
      today_dau: todayDAU || 0,
      week_wau: weekWAU || 0,
      total_games: totalGames || 0,
    });
  } catch (err) {
    console.error('Analytics GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
