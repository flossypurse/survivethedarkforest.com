# Survive the Dark Forest

A persistent browser survival game. Keep the fire alive. The forest doesn't sleep — even when you do.

**Live:** [survivethedarkforest.com](https://survivethedarkforest.com)

## Status

Public beta — solo mode is live and playable. Multiplayer and server-side persistence are in development.

## Stack

- Next.js 16, React 19, TypeScript
- Tailwind 4
- Canvas API (no game engine library)
- Web Audio API (procedural audio — zero audio files)
- localStorage for persistence

## Key Paths

| Path | Contents |
|------|----------|
| `src/app/page.tsx` | Landing page |
| `src/app/play/page.tsx` | /play route — mounts ExplorationScreen |
| `src/components/exploration-screen.tsx` | Game orchestrator — state, tick loop, input, persistence |
| `src/components/exploration-hud.tsx` | HUD overlay — vitals, resources, action buttons |
| `src/components/top-down-canvas.tsx` | Canvas renderer — world, player, creatures, fire, resources |
| `src/components/intro-screen.tsx` | Cinematic intro sequence |
| `src/components/mode-select.tsx` | Solo vs Multiplayer selection |
| `src/components/faction-select.tsx` | Faction selection (Pilot, Scientist, etc.) |
| `src/components/virtual-joystick.tsx` | Mobile touch joystick |
| `src/lib/exploration-engine.ts` | Core game logic — movement, combat, foraging, fire, creature AI |
| `src/lib/exploration-state.ts` | State interface and initialization |
| `src/lib/audio-engine.ts` | Procedural audio — footsteps, fire, combat, ambient |
| `src/lib/game-state.ts` | Shared types — Creature, LogEntry, GameStatus |
| `src/lib/world-gen.ts` | Procedural world generation and tile/resource placement |
| `src/lib/constants.ts` | Game balance — all tunable numbers live here |

## Run

```
npm install
npm run dev
```

## Deploy

Hosted on Vercel. Auto-deploys from `main`.

## Rules

1. All game balance numbers live in `constants.ts` — never hardcode numbers in engine or components.
2. Canvas renderer must work without any external libraries — vanilla Canvas API only.
3. Game state is the single source of truth — canvas only reads it, never mutates it.
4. Offline time simulation is capped at 10 minutes to prevent long freezes on return.
5. Audio is 100% procedural via Web Audio API — no audio files in the repo.

## Architecture Notes

- **Game loop**: `setInterval` at 1s ticks in `exploration-screen.tsx`. Each tick produces a new immutable state via the exploration engine.
- **Persistence**: Auto-saves to localStorage every 5 ticks + on tab close. On reload, calculates elapsed time and simulates missed ticks.
- **Canvas**: Runs its own `requestAnimationFrame` loop for smooth 60fps visuals, reads game state from React state.
- **Deterministic RNG**: `seededRandom(tick, salt)` — same tick always produces same events, enabling future replay/verification.
- **Audio**: Web Audio API oscillators and noise buffers — footsteps, fire crackle, combat hits, ambient wind, heartbeat. All generated at runtime.
