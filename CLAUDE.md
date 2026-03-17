# CLAUDE.md — Void Survivors

## Project Overview
- Browser-based roguelike survivors game (single-player)
- Next.js 16.1.7 (App Router, static site generation)
- React 19, TypeScript 5, Tailwind CSS v4, HTML5 Canvas 2D
- Deployed on Vercel Hobby plan (free tier)
- Live: https://void-survivors.vercel.app
- Repo: https://github.com/arpadbretz/void-survivors
- Author: Prometheus Digital Kft.

## Commands
- `npm run dev` — Start dev server (port 3000)
- `npm run build` — Production build
- `npm run lint` — Run ESLint
- `vercel --prod` — Deploy to production

## Architecture
### Game Engine (`src/game/`)
- `engine.ts` — Main game loop, physics, collisions, state management
- `renderer.ts` — Canvas 2D rendering, HUD, visual effects (neon aesthetic)
- `enemies.ts` — Enemy spawning, AI, wave configs (7 types: chaser, shooter, swarm, tank, splitter, boss, phantom)
- `abilities.ts` — Player abilities, upgrades, evolutions
- `audio.ts` — Procedural SFX and music via Web Audio API (singleton AudioManager)
- `particles.ts` — Object-pooled particle system
- `types.ts` — All TypeScript interfaces (Entity, Player, Enemy, Projectile, Particle, XPOrb, Ability, GameState, etc.)
- `math.ts` — Vector2 utilities (vec2, sub, normalize, distance, clamp, lerp, angle)
- `achievements.ts` — 40 achievements, 4 tiers (bronze/silver/gold/platinum)
- `stats.ts` — Persistent lifetime stats
- `meta.ts` — Meta-progression currency and upgrades
- `characters.ts` — 3 playable characters with unique stats
- `daily.ts` — Daily challenge system with modifiers
- `settings.ts` — Game settings persistence
- `difficulty.ts` — 4 difficulty modes (Easy/Normal/Hard/Nightmare) with multipliers

### React UI (`src/app/`)
- `page.tsx` — Landing/marketing page (server component, CSS-only floating shapes)
- `play/page.tsx` — Game client component (`"use client"`, canvas + React overlays)
- `layout.tsx` — Root layout, metadata, PWA manifest, JSON-LD structured data
- `globals.css` — Tailwind v4 import, CSS custom properties (neon color palette)
- `opengraph-image.tsx` — Dynamic OG image generation

### Game Screens (managed in play/page.tsx)
`menu | playing | paused | upgrade | gameover | achievements | stats | shop | characters | daily | settings`

## Key Conventions
- **NO `shadowBlur` during gameplay rendering** — use polygon overlays instead (see renderer.ts header comment)
- Delta-time capping: `MAX_DELTA = 0.05` to prevent physics tunneling
- Viewport culling with `CULL_MARGIN = 80` for off-screen entities
- Object pooling for particles (pre-allocated arrays, `active` flag)
- `requestAnimationFrame` game loop
- `localStorage` for all persistence (scores, achievements, stats, settings)
- Emoji icons for abilities (rendered in canvas)
- All game state in a single `GameState` object
- React overlays on top of canvas for menus/HUD
- Engine communicates with React via callbacks (`EngineCallbacks` interface)
- `WORLD_SIZE = 4000`, `WAVE_DURATION = 30` seconds per wave
- Wave-based background/grid colors shift as waves progress
- 3 boss variants: Titan (wave 5+), Harbinger (wave 10+), Nexus (wave 15+)
- Environmental hazards: void rifts, plasma pools, gravity anomalies
- Loot drops from bosses: health, bomb, magnet, shield
- Endless scaling: HP/speed/spawn rate increase per wave, dual bosses at wave 20+

## Performance Rules
- Never use `shadowBlur` in the render loop
- Cull entities outside viewport before drawing
- Use object pools for frequently created/destroyed objects
- Minimize canvas state changes (group similar draws)
- Cap particles at pool size, reuse instead of allocating
- HUD callback throttled to `HUD_UPDATE_INTERVAL = 0.1s`

## TypeScript / Path Aliases
- `@/*` maps to `./src/*` (configured in tsconfig.json)
- Strict mode enabled
- Target: ES2017

## Tailwind v4
- Uses `@import "tailwindcss"` in globals.css
- No tailwind.config.js — CSS custom properties in `:root` for neon palette
- PostCSS via `@tailwindcss/postcss`

## Fonts
- Geist Sans and Geist Mono (via `next/font/google`)

## Deployment
- Vercel Hobby plan ($0/month)
- Static site generation for landing page
- Edge runtime for OG image generation
- Service worker (`/sw.js`) registered for offline PWA support
- PWA manifest at `/manifest.json`

## Global Leaderboard Setup
The leaderboard API (`/api/leaderboard`) requires Upstash Redis (free tier: 10K commands/day).
1. Create a free database at https://console.upstash.com
2. Copy REST URL and REST Token
3. Add env vars in Vercel dashboard or CLI:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Redeploy — leaderboard activates automatically
