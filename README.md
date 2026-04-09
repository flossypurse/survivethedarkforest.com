# Survive the Dark Forest

A tense browser-based survival game. You crash-land in a forest gone dark after an alien invasion. You have 48 hours until rescue. Keep the fire alive, manage your flashlight battery, and don't make too much noise.

### [Play Now → survivethedarkforest.com](https://survivethedarkforest.com)

## What makes it different

- **Zero external assets** — all visuals are Canvas API, all audio is Web Audio API. No image files, no sound files, no game engine. Everything is procedurally generated at runtime.
- **Noise matters** — every action generates noise. Move quietly or attract predators.
- **Persistent** — close the tab, come back later, the forest kept going without you (capped at 10 min of catch-up so you don't die in your sleep).
- **Mobile-ready** — touch joystick and tap controls work on phones.

## How to play

1. Pick **Solo** mode
2. Choose a faction (Pilot, Scientist, etc.) — each has a different intro narrative
3. Survive 48 in-game hours (each real second = one game tick)
   - **WASD** to move, **E** to interact (forage, stoke fire, eat)
   - **F** to toggle flashlight (limited battery — use sparingly)
   - Keep your fire fueled with wood or you lose your safe zone
   - Craft weapons (spear, axe) from foraged materials
   - Watch the noise meter — loud actions draw creatures toward you

## Run locally

```bash
git clone https://github.com/flossypurse/survivethedarkforest.com.git
cd survivethedarkforest.com
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16, React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Graphics | Canvas 2D API |
| Audio | Web Audio API (oscillators, noise buffers, procedural generation) |
| Persistence | localStorage (server-side sync planned) |

## Project structure

```
src/
├── app/                    # Next.js routes
│   ├── page.tsx            # Landing page
│   └── play/page.tsx       # Game entry point
├── components/
│   ├── exploration-screen  # Game orchestrator (tick loop, state, input)
│   ├── exploration-hud     # HUD overlay (vitals, resources, actions)
│   ├── top-down-canvas     # Canvas renderer (world, player, creatures, fire)
│   ├── intro-screen        # Cinematic intro sequence
│   ├── mode-select         # Solo / Multiplayer selection
│   ├── faction-select      # Faction picker
│   └── virtual-joystick    # Mobile touch controls
└── lib/
    ├── exploration-engine   # Core game logic (movement, combat, AI, fire)
    ├── exploration-state    # State types and initialization
    ├── audio-engine         # Procedural audio (footsteps, fire, combat, ambient)
    ├── world-gen            # Procedural world generation
    ├── game-state           # Shared types (Creature, LogEntry, GameStatus)
    └── constants            # All tunable game balance numbers
```

## Contributing

Bug reports and ideas welcome — [open an issue](https://github.com/flossypurse/survivethedarkforest.com/issues).

Pull requests are welcome too. A few ground rules:

- **Game balance numbers go in `src/lib/constants.ts`** — don't hardcode values in components or the engine.
- **No external asset files** — graphics are Canvas API, audio is Web Audio API. That's the whole point.
- **State is immutable** — the canvas reads state, never mutates it. All mutations go through the engine.
- **Keep it vanilla** — no game engine libraries, no audio libraries.

## Roadmap

- [ ] Multiplayer mode (real players, not just AI creatures)
- [ ] Server-side persistence (cross-device saves, accounts)
- [ ] More creature types and biomes
- [ ] Leaderboards

## License

[MIT](LICENSE)
