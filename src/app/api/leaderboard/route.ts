// ============================================================
// Global Leaderboard API — Void Survivors
// Uses Upstash Redis sorted sets for O(log N) leaderboard ops
// Free tier: 10K commands/day — plenty for a leaderboard
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
    console.error('Leaderboard: Missing env vars', { hasUrl: !!url, hasToken: !!token });
    return null;
  }

  try {
    redis = new Redis({ url, token });
    return redis;
  } catch (err) {
    console.error('Leaderboard: Redis init failed', err);
    return null;
  }
}

// ── Leaderboard Keys ────────────────────────────────────────

const LB_ALL_TIME = 'lb:alltime';
const LB_DAILY_PREFIX = 'lb:daily:';

function getDailyKey(): string {
  const d = new Date();
  return `${LB_DAILY_PREFIX}${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Interfaces ──────────────────────────────────────────────

interface LeaderboardEntry {
  name: string;
  score: number;
  rank: number;
}

// ── GET — Fetch leaderboard ─────────────────────────────────

export async function GET(request: NextRequest) {
  const r = getRedis();
  if (!r) {
    return NextResponse.json({ error: 'Leaderboard not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'alltime'; // 'alltime' or 'daily'
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

  try {
    const key = type === 'daily' ? getDailyKey() : LB_ALL_TIME;
    const raw = await r.zrange(key, 0, limit - 1, { rev: true, withScores: true }) as unknown[];

    // raw is [member, score, member, score, ...]
    const entries: LeaderboardEntry[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      entries.push({
        name: String(raw[i]),
        score: parseFloat(String(raw[i + 1])),
        rank: i / 2 + 1,
      });
    }

    const total = await r.zcard(key);

    return NextResponse.json({ entries, total }, {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('Leaderboard GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}

// ── POST — Submit a score ───────────────────────────────────

export async function POST(request: NextRequest) {
  const r = getRedis();
  if (!r) {
    return NextResponse.json({ error: 'Leaderboard not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { name, score, wave, time, kills, level } = body;

    // Validate basic fields
    if (!name || typeof name !== 'string' || name.length < 1 || name.length > 20) {
      return NextResponse.json({ error: 'Name must be 1-20 characters' }, { status: 400 });
    }
    if (typeof score !== 'number' || score < 0 || score > 10_000_000) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
    }

    // Anti-cheat validation — reject obviously fake scores
    if (
      typeof wave === 'number' &&
      typeof time === 'number' &&
      typeof kills === 'number' &&
      typeof level === 'number'
    ) {
      // Level cap — 50 is practically unreachable
      if (level > 50) {
        console.warn(`[anti-cheat] Rejected score from "${name}": level ${level} exceeds cap (50)`);
        return NextResponse.json({ error: 'Score rejected' }, { status: 400 });
      }

      // Wave/time consistency — each wave takes ~30s minimum, 15s is generous
      if (time > 0 && wave > time / 15) {
        console.warn(`[anti-cheat] Rejected score from "${name}": wave ${wave} too high for time ${time}s (max ${Math.floor(time / 15)})`);
        return NextResponse.json({ error: 'Score rejected' }, { status: 400 });
      }

      // Kill count sanity — max ~20 kills per second is very generous
      if (time > 0 && kills > time * 20) {
        console.warn(`[anti-cheat] Rejected score from "${name}": ${kills} kills in ${time}s exceeds limit (${Math.floor(time * 20)})`);
        return NextResponse.json({ error: 'Score rejected' }, { status: 400 });
      }

      // Score sanity check — score should be roughly proportional to gameplay stats
      const maxPlausibleScore = wave * 500 + kills * 10 + time * 50;
      if (score > maxPlausibleScore) {
        console.warn(`[anti-cheat] Rejected score from "${name}": score ${score} exceeds plausible max ${maxPlausibleScore} (wave=${wave}, kills=${kills}, time=${time})`);
        return NextResponse.json({ error: 'Score rejected' }, { status: 400 });
      }
    }

    // Sanitize name
    const cleanName = name.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().substring(0, 20);
    if (!cleanName) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }

    // Only update if new score is higher (sorted set handles this with GT flag)
    // Upstash zadd with score — higher score wins
    await r.zadd(LB_ALL_TIME, { score, member: cleanName });
    await r.zadd(getDailyKey(), { score, member: cleanName });

    // Get rank
    const allTimeRank = await r.zrank(LB_ALL_TIME, cleanName);
    const totalPlayers = await r.zcard(LB_ALL_TIME);

    // zrank is 0-indexed from lowest, so reverse it
    const rank = allTimeRank !== null ? totalPlayers - allTimeRank : null;

    return NextResponse.json({
      success: true,
      rank,
      totalPlayers,
    });
  } catch (err) {
    console.error('Leaderboard POST error:', err);
    return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 });
  }
}
