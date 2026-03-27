# Survive the Dark Forest

A persistent browser survival game. Keep the fire alive. The forest doesn't sleep — even when you do.

## Status

Phase 1 — core game loop with localStorage persistence. Canvas-rendered abstract visuals.

## Stack

- Next.js 16, React 19, TypeScript
- Tailwind 4
- Canvas API (no game engine library)
- localStorage (persistence — Supabase + Resonate planned for Phase 2)

## Key Paths

| Path | Contents |
|------|----------|
| `src/app/page.tsx` | Entry point — renders GameScreen |
| `src/components/game-canvas.tsx` | Canvas renderer — fire, particles, fog, trees, eyes |
| `src/components/game-hud.tsx` | HUD overlay — vitals, resources, actions, event log |
| `src/components/game-screen.tsx` | Game orchestrator — state, tick loop, actions, persistence |
| `src/lib/game-engine.ts` | Core logic — tick, actions, offline catch-up |
| `src/lib/game-state.ts` | State types, initial state, localStorage read/write |
| `src/lib/constants.ts` | Game balance — all tunable numbers |

## Run

```
cd dark-forest && npm run dev
```

## Deploy

| Component | Platform | Auto-deploy | Domain |
|-----------|----------|-------------|--------|
| dark-forest | Vercel (planned) | Not yet configured | survivethedarkforest.com (pending) |

**CLI:** `vercel` — not yet linked. Run `vercel link` when ready to deploy.

**Status:** Not deployed. Pending:
1. Link to Vercel (`vercel link`)
2. Register domain survivethedarkforest.com
3. Set up auto-deploy from `main`
4. First deploy: `vercel --prod`

See `cortex/infra/agent-deploy-protocol.md` for procedures.

## Rules

1. All game balance numbers live in `constants.ts` — never hardcode numbers in engine or components.
2. Canvas renderer must work without any external libraries — vanilla Canvas API only.
3. Game state is the single source of truth — canvas only reads it, never mutates it.
4. Offline time simulation is capped at 10 minutes to prevent long freezes on return.

## Architecture Notes

- **Game loop**: `setInterval` at 1s ticks in `game-screen.tsx`. Each tick produces a new immutable state via `tick()`.
- **Persistence**: Auto-saves to localStorage every 5s + on tab close. On reload, calculates elapsed time and simulates missed ticks.
- **Canvas**: Runs its own `requestAnimationFrame` loop for smooth 60fps visuals, but reads game state (fire level, phase, day) from React state.
- **Deterministic RNG**: `seededRandom(tick, salt)` — same tick always produces same events, enabling future replay/verification.

## Phase 2 (planned)

- Resonate durable game loop (server-side tick while player is away)
- Supabase for persistent game state (cross-device, accounts)
- Monetization: ads or one-time unlock
