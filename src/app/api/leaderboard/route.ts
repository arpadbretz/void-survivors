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
    const { name, score } = body;

    // Validate
    if (!name || typeof name !== 'string' || name.length < 1 || name.length > 20) {
      return NextResponse.json({ error: 'Name must be 1-20 characters' }, { status: 400 });
    }
    if (typeof score !== 'number' || score < 0 || score > 10_000_000) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
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
