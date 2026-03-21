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

// ── GET — Return stats (internal use) ───────────────────────
// ?days=7 returns last 7 days of history (default: today only)

export async function GET(request: NextRequest) {
  const r = getRedis();
  if (!r) {
    return NextResponse.json({ error: 'Analytics not configured' }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get('days') || '1'), 90);

    const dateKey = getDateKey();
    const weekKey = getWeekKey();

    // Always include today's summary
    const [todayGames, todayDAU, weekWAU, totalGames] = await Promise.all([
      r.get<number>(`analytics:games:${dateKey}`),
      r.scard(`analytics:dau:${dateKey}`),
      r.scard(`analytics:wau:${weekKey}`),
      r.get<number>('analytics:total_games'),
    ]);

    const result: Record<string, unknown> = {
      date: dateKey,
      week: weekKey,
      today_games: todayGames || 0,
      today_dau: todayDAU || 0,
      week_wau: weekWAU || 0,
      total_games: totalGames || 0,
    };

    // If requesting history, fetch daily stats for past N days
    if (days > 1) {
      const history: Array<{ date: string; games: number; dau: number }> = [];
      const now = new Date();

      const fetches: Promise<[number | null, number]>[] = [];
      const dates: string[] = [];

      for (let i = 0; i < days; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        dates.push(dk);
        fetches.push(
          Promise.all([
            r.get<number>(`analytics:games:${dk}`),
            r.scard(`analytics:dau:${dk}`),
          ])
        );
      }

      const results = await Promise.all(fetches);
      for (let i = 0; i < dates.length; i++) {
        history.push({
          date: dates[i],
          games: results[i][0] || 0,
          dau: results[i][1] || 0,
        });
      }

      result.history = history;
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Analytics GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
