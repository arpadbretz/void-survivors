# CLAUDE.md — Void Survivors

## Project Overview
- Browser-based roguelike survivors game (single-player)
- Next.js 16.1.7 (App Router, static site generation)
- React 19, TypeScript 5, Tailwind CSS v4, HTML5 Canvas 2D
- Deployed on Vercel Hobby plan (free tier)
- Live: https://voidsurvivors.eu
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
- `enemies.ts` — Enemy spawning, AI, wave configs (9 types: chaser, shooter, swarm, tank, splitter, boss, phantom, shielder, miniboss)
- `abilities.ts` — 12 player abilities, 7 evolutions, 8 synergies
- `audio.ts` — Procedural SFX and music via Web Audio API (singleton AudioManager)
- `particles.ts` — Object-pooled particle system
- `types.ts` — All TypeScript interfaces (Entity, Player, Enemy, Projectile, Particle, XPOrb, Ability, GameState, etc.)
- `math.ts` — Vector2 utilities (vec2, sub, normalize, distance, clamp, lerp, angle)
- `achievements.ts` — 40 achievements, 4 tiers (bronze/silver/gold/platinum), 6 with trail color rewards
- `stats.ts` — Persistent lifetime stats
- `meta.ts` — Meta-progression currency and upgrades
- `characters.ts` — 5 playable characters with unique stats (Void Walker, Phantom, Sentinel, Arcanist, Chronomancer)
- `daily.ts` — Daily challenge system with modifiers
- `settings.ts` — Game settings persistence
- `difficulty.ts` — 4 difficulty modes (Easy/Normal/Hard/Nightmare) with multipliers

### React UI (`src/app/`)
- `page.tsx` — Landing/marketing page (server component, CSS-only floating shapes)
- `play/page.tsx` — Game client component (`"use client"`, canvas + React overlays)
- `layout.tsx` — Root layout, metadata, PWA manifest, JSON-LD structured data, CookieBanner
- `globals.css` — Tailwind v4 import, CSS custom properties (neon color palette)
- `opengraph-image.tsx` — Dynamic OG image generation
- `components/CookieBanner.tsx` — GDPR cookie consent banner
- `legal/` — Privacy policy, Terms of service, Impressum (with shared layout)

### API Routes (`src/app/api/`)
- `leaderboard/` — Global leaderboard (Upstash Redis)
- `analytics/` — Custom analytics endpoint
- `og/` — Dynamic Open Graph image
- `share/` — Share card generation

### Game Screens (managed in play/page.tsx)
`menu | playing | paused | upgrade | gameover | achievements | stats | shop | characters | daily | settings | leaderboard`

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
- 8 ability synergies: Elemental Storm, Bullet Hell, Artillery Command, Cosmic Barrier, Rapid Fire, Death Zone, Nova Cascade, Temporal Surge
- Synergy bonuses: damage_mult, cooldown_mult, range_mult, health_regen, speed_mult, xp_mult
- Orbit shield renders visible glowing orbs with sparkle trails (renderer.ts `drawOrbitShield`)
- Global leaderboard: all-time + daily rankings via Upstash Redis
- Kill streak announcements: Killing Spree (10), Rampage (25), Unstoppable (50), Godlike (100)
- Critical damage numbers (>50 dmg) with pop animation
- Player name prompt on first game over for leaderboard
- 12 abilities: radial_shot, auto_cannon, orbit_shield, chain_lightning, frost_aura, missile_swarm, life_drain, xp_magnet, speed_boost, gravity_well, plasma_wave, void_beam
- 7 evolutions: Nova Burst, Railgun, Thunder Storm, Void Artillery, Singularity, Supernova, Annihilation Ray
- Shielder enemy: protective aura reduces nearby enemy damage by 50%
- Achievement rewards: 6 unlockable trail colors (Crimson, Golden, Violet, Inferno, Prismatic, Void)
- Passive XP trickle scales with wave, wave completion bonus XP
- Game over tips: 21 random gameplay tips shown after each run
- Wave announcement shows enemy type preview
- Boss enrage timer: bosses enrage after 45s alive (+50% speed, +30% damage, red pulsing overlay)
- Arcanist `cooldownReduction: 0.85` — 15% faster ability cooldowns, applied multiplicatively with synergies
- Chronomancer: time dilation aura slows enemies within 200px by 25%, starts with frost_aura
- Mini-map: 120x120 corner HUD showing enemies (red), bosses (yellow), loot (green), hazards (purple)
- Elite enemy modifiers: swift (+80% speed), regenerating (3 HP/s), splitting (spawns 2 copies), vampiric (heals on hit), armored (40% damage reduction)
- Regular enemy loot drops: 2% for normal enemies, 10% for elites, 100% for bosses
- Void Beam: channeled piercing laser, evolves into Annihilation Ray (3x damage, 2x range)
- Mini-boss system: powerful elite+ enemies at milestone waves (3, 6, 8, 11, etc.)
- Upgrade reroll: reroll ability choices up to 2 times per level-up
- DPS tracker: real-time damage per second counter on HUD
- Damage flash: red screen edge vignette on hit, pulsing low health warning at <25% HP
- Auto-Collect XP: toggle in settings, infinite magnet range for casual play
- Share card: canvas-generated neon stats image shared via Web Share API
- First-run onboarding: progressive tutorial hints for new players (localStorage flag)
- Smart PWA install prompt: shown after 2nd game over when installable
- Fade transitions between all game screens
- Evolution guide: pause screen shows ability evolution paths (ability → evolved form)
- Kill feed: bottom-left overlay showing boss/elite kills, wave completions, evolutions
- Accessibility: screen shake intensity slider (0-100%), colorblind mode (shape indicators), reduced motion mode
- Wave events: Swarm Rush (triple spawn, swarm-only), Tank Parade (3 tanks), Speed Frenzy (speed multiplier)
- Run streak: tracked in GameState, persists across runs
- Analytics: custom `/api/analytics` endpoint (Upstash Redis — DAU/WAU/game counts)
- Legal pages: `/legal/privacy`, `/legal/terms`, `/legal/impressum` with shared layout
- Cookie banner: GDPR consent component in root layout

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
