// ── Exploration engine — spatial layer on top of base game engine ──

import { type GameConfig, DEFAULT_CONFIG, TILE_SIZE } from "./constants";
import type { ExplorationState } from "./exploration-state";
import type { CreatureType } from "./game-state";
import { addLog } from "./game-state";
import { type WorldMap, getTile, isPassable, TILE_SIZE as TS } from "./world-gen";

// ── Constants for exploration ──

export const PLAYER_SPEED = 2.5; // pixels per frame (walk)
export const PLAYER_RUN_SPEED = 4.5;
export const PLAYER_RADIUS = 8; // collision radius
export const FLASHLIGHT_RANGE = 180; // pixels
export const FLASHLIGHT_ANGLE = Math.PI * 0.35; // ~63 degrees total cone
export const INTERACT_RANGE = 60; // pixels — how close to interact with objects
export const MOVEMENT_NOISE_PER_FRAME = 0.15; // noise generated per movement frame
export const RUN_NOISE_MULTIPLIER = 3;
export const RESOURCE_RESPAWN_TICKS = 60; // 1 minute to respawn

// ── Seeded random (same as game-engine) ──

function seededRandom(tick: number, salt: number = 0): number {
  let h = (tick + salt * 374761393) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 0x100000000;
}

// ── Creature params (duplicated from game-engine for independence) ──

interface CreatureParams {
  baseSpeed: number;
  noiseFactor: number;
  damageMin: number;
  damageMax: number;
  fireFleeThreshold: number;
  fleeSpeed: number;
  fireAttract: boolean;
  fireAttractThreshold: number;
  fireAttractSpeed: number;
  spawnWeight: number;
}

const CREATURE_PARAMS: Record<CreatureType, CreatureParams> = {
  timid: { baseSpeed: 0.4, noiseFactor: 0.8, damageMin: 3, damageMax: 8, fireFleeThreshold: 50, fleeSpeed: 2.0, fireAttract: false, fireAttractThreshold: -1, fireAttractSpeed: 0, spawnWeight: 30 },
  predator: { baseSpeed: 0.9, noiseFactor: 1.2, damageMin: 8, damageMax: 18, fireFleeThreshold: -1, fleeSpeed: 0, fireAttract: true, fireAttractThreshold: 20, fireAttractSpeed: 0.6, spawnWeight: 40 },
  stalker: { baseSpeed: 0.6, noiseFactor: 0.3, damageMin: 5, damageMax: 12, fireFleeThreshold: -1, fleeSpeed: 0, fireAttract: false, fireAttractThreshold: -1, fireAttractSpeed: 0, spawnWeight: 30 },
};

const TOTAL_WEIGHT = Object.values(CREATURE_PARAMS).reduce((s, p) => s + p.spawnWeight, 0);

function pickCreatureType(tick: number): CreatureType {
  const roll = seededRandom(tick, 55) * TOTAL_WEIGHT;
  let cum = 0;
  for (const [type, p] of Object.entries(CREATURE_PARAMS)) {
    cum += p.spawnWeight;
    if (roll < cum) return type as CreatureType;
  }
  return "timid";
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

function getDirection8(fromX: number, fromY: number, toX: number, toY: number): string {
  const angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
  if (angle > 157.5 || angle <= -157.5) return "west";
  if (angle > 112.5) return "southwest";
  if (angle > 67.5) return "south";
  if (angle > 22.5) return "southeast";
  if (angle > -22.5) return "east";
  if (angle > -67.5) return "northeast";
  if (angle > -112.5) return "north";
  return "northwest";
}

// ── Player movement (called per frame, ~60fps) ──

export function movePlayer(
  state: ExplorationState,
  dx: number, // -1 to 1
  dy: number, // -1 to 1
  running: boolean,
  world: WorldMap,
): ExplorationState {
  if (state.status !== "playing") return state;
  if (dx === 0 && dy === 0) return state;

  // Normalize diagonal
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / len;
  const ny = dy / len;

  const speed = running ? PLAYER_RUN_SPEED : PLAYER_SPEED;
  const newX = state.playerX + nx * speed;
  const newY = state.playerY + ny * speed;

  // Tile collision
  const tileX = Math.floor(newX / TILE_SIZE);
  const tileY = Math.floor(newY / TILE_SIZE);
  const tile = getTile(world, tileX, tileY);

  if (!isPassable(tile)) {
    // Try sliding along axes
    const slideX = state.playerX + nx * speed;
    const slideTileX = Math.floor(slideX / TILE_SIZE);
    const canSlideX = isPassable(getTile(world, slideTileX, Math.floor(state.playerY / TILE_SIZE)));

    const slideY = state.playerY + ny * speed;
    const slideTileY = Math.floor(slideY / TILE_SIZE);
    const canSlideY = isPassable(getTile(world, Math.floor(state.playerX / TILE_SIZE), slideTileY));

    if (canSlideX && Math.abs(nx) > 0.1) {
      return {
        ...state,
        playerX: slideX,
        playerAngle: Math.atan2(0, nx),
        noise: Math.min(100, state.noise + MOVEMENT_NOISE_PER_FRAME * (running ? RUN_NOISE_MULTIPLIER : 1)),
      };
    }
    if (canSlideY && Math.abs(ny) > 0.1) {
      return {
        ...state,
        playerY: slideY,
        playerAngle: Math.atan2(ny, 0),
        noise: Math.min(100, state.noise + MOVEMENT_NOISE_PER_FRAME * (running ? RUN_NOISE_MULTIPLIER : 1)),
      };
    }
    return state; // blocked
  }

  return {
    ...state,
    playerX: newX,
    playerY: newY,
    playerAngle: Math.atan2(ny, nx),
    noise: Math.min(100, state.noise + MOVEMENT_NOISE_PER_FRAME * (running ? RUN_NOISE_MULTIPLIER : 1)),
  };
}

// ── Spatial game tick (replaces base tick for exploration mode) ──

export function explorationTick(
  state: ExplorationState,
  cfg: GameConfig = DEFAULT_CONFIG,
): ExplorationState {
  if (state.status !== "playing") return state;

  const s: ExplorationState = {
    ...state,
    creatures: [...state.creatures],
    resourceNodes: [...state.resourceNodes],
  };
  s.tick += 1;
  s.ticksPlayed += 1;

  // ── Hour tracking ──
  const newHour = Math.floor(s.ticksPlayed / cfg.TICKS_PER_HOUR);
  if (newHour > s.hour) {
    s.hour = newHour;
    const remaining = cfg.HOURS_TO_SURVIVE - s.hour;
    if (remaining <= 0) {
      s.status = "won";
      addLog(s, "You hear rotors. A helicopter breaks through the canopy. You're rescued.", "success");
      return s;
    }
    if (remaining <= 6) {
      addLog(s, `${remaining} hour${remaining !== 1 ? "s" : ""} until rescue. Hold on.`, "success");
    } else if (s.hour % 6 === 0) {
      addLog(s, `${remaining} hours until rescue.`, "info");
    }
  }

  // ── Noise decay ──
  s.noise = Math.max(0, s.noise - cfg.NOISE_DECAY);

  // ── Fire decay ──
  s.fire = Math.max(0, s.fire - cfg.FIRE_BURN_RATE);
  if (s.fire <= 0 && dist(s.playerX, s.playerY, s.fireX, s.fireY) < 100) {
    s.health = Math.max(0, s.health - cfg.DARKNESS_HEALTH_DAMAGE);
    if (s.health <= 0) {
      s.status = "dead";
      addLog(s, "The darkness took you.", "danger");
      return s;
    }
    if (s.tick % 15 === 0) {
      addLog(s, "The fire is out. Relight it.", "danger");
    }
  } else if (s.fire > 0 && s.fire < 20 && s.tick % 30 === 0) {
    addLog(s, "The fire is dying. Add wood.", "danger");
  }

  // ── Hunger ──
  s.hunger = Math.min(cfg.MAX_HUNGER, s.hunger + cfg.HUNGER_RATE);
  if (s.hunger >= cfg.MAX_HUNGER) {
    s.health = Math.max(0, s.health - cfg.HUNGER_DAMAGE);
    if (s.health <= 0) {
      s.status = "dead";
      addLog(s, "You collapse from starvation.", "danger");
      return s;
    }
    if (s.tick % 20 === 0) {
      addLog(s, "You're starving.", "danger");
    }
  }

  // ── Creature spawning — around the player ──
  if (s.creatures.length < cfg.CREATURE_MAX) {
    const fireBeacon = s.fire > 0 ? 1 + (s.fire / cfg.FIRE_MAX) * 0.8 : 0.5;
    const spawnChance = (cfg.CREATURE_SPAWN_RATE + cfg.CREATURE_SPAWN_ESCALATION * s.hour) * fireBeacon;
    if (seededRandom(s.tick, 50) < spawnChance) {
      const angle = seededRandom(s.tick, 51) * Math.PI * 2;
      const spawnDist = cfg.CREATURE_SPAWN_DISTANCE * TILE_SIZE / 3;
      const type = pickCreatureType(s.tick);
      s.creatures.push({
        id: s.nextCreatureId,
        type,
        x: s.playerX + Math.cos(angle) * spawnDist,
        y: s.playerY + Math.sin(angle) * spawnDist,
        spawnTick: s.tick,
      });
      s.nextCreatureId += 1;
    }
  }

  // ── Creature movement — toward player (noise-attracted) ──
  const noiseRatio = s.noise / cfg.NOISE_MAX;
  s.creatures = s.creatures.map((c) => {
    const d = dist(c.x, c.y, s.playerX, s.playerY);
    if (d < 1) return c;

    const params = CREATURE_PARAMS[c.type];
    const dx = (s.playerX - c.x) / d;
    const dy = (s.playerY - c.y) / d;

    // Fire flee (timid)
    const fireDist = dist(c.x, c.y, s.fireX, s.fireY);
    if (params.fireFleeThreshold > 0 && s.fire > params.fireFleeThreshold && fireDist < 150) {
      const fdx = (c.x - s.fireX) / fireDist;
      const fdy = (c.y - s.fireY) / fireDist;
      return { ...c, x: c.x + fdx * params.fleeSpeed, y: c.y + fdy * params.fleeSpeed };
    }

    let speed = params.baseSpeed + params.noiseFactor * noiseRatio;
    const darknessFactor = 1 + (1 - s.fire / cfg.FIRE_MAX) * 1.0;
    speed *= darknessFactor;

    if (params.fireAttract && s.fire > params.fireAttractThreshold) {
      speed += params.fireAttractSpeed * (s.fire / cfg.FIRE_MAX);
    }

    const jAngle = seededRandom(s.tick, 70 + c.id) * Math.PI * 2;
    return {
      ...c,
      x: c.x + dx * speed + Math.cos(jAngle) * 0.3,
      y: c.y + dy * speed + Math.sin(jAngle) * 0.3,
    };
  });

  // ── Creature attacks ──
  const attackers = s.creatures.filter(c =>
    dist(c.x, c.y, s.playerX, s.playerY) <= cfg.CREATURE_ATTACK_RANGE * 3
  );
  if (attackers.length > 0) {
    const ids = new Set(attackers.map(a => a.id));
    s.creatures = s.creatures.filter(c => !ids.has(c.id));

    for (const c of attackers) {
      const params = CREATURE_PARAMS[c.type];
      const raw = params.damageMin + seededRandom(s.tick, 60 + c.id) * (params.damageMax - params.damageMin);

      // Defense — shelter/trap only help near camp
      const nearCamp = dist(s.playerX, s.playerY, s.fireX, s.fireY) < 80;
      const defense = cfg.BASE_DEFENSE +
        (s.hasClub ? cfg.CLUB_DEFENSE : 0) +
        (nearCamp ? s.traps * cfg.TRAP_DEFENSE : 0) +
        (nearCamp && s.hasShelter ? cfg.SHELTER_DEFENSE : 0);
      const damage = Math.max(1, raw - defense);

      const dir = getDirection8(s.playerX, s.playerY, c.x, c.y);
      const msgs: Record<CreatureType, string[]> = {
        timid: ["Something bites from the", "A creature lashes out from the"],
        predator: ["A predator lunges from the", "Claws slash from the", "Jaws snap from the"],
        stalker: ["Something strikes from the", "A shadow attacks from the"],
      };
      const msgList = msgs[c.type];
      const msg = msgList[Math.floor(seededRandom(s.tick, 80 + c.id) * msgList.length)];
      addLog(s, `${msg} ${dir}! ${Math.round(damage)} damage.`, "danger");

      s.health = Math.max(0, s.health - damage);
      if (s.traps > 0 && nearCamp && seededRandom(s.tick, 13 + c.id) < 0.3) {
        s.traps -= 1;
        addLog(s, "A trap is destroyed.", "info");
      }
      if (s.health <= 0) {
        s.status = "dead";
        addLog(s, "The forest claims you.", "danger");
        return s;
      }
    }
  }

  // ── Detection ──
  if (s.tick % cfg.DETECT_COOLDOWN === 0 && s.creatures.length > 0) {
    const fireVis = 0.3 + 0.7 * (s.fire / cfg.FIRE_MAX);
    const medRange = cfg.DETECT_MEDIUM_RANGE * TILE_SIZE / 3 * fireVis;

    const nearby = s.creatures
      .map(c => ({ c, d: dist(c.x, c.y, s.playerX, s.playerY) }))
      .filter(({ d }) => d < medRange)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);

    const sounds = ["Something moves", "You hear movement", "Branches shift", "Leaves crunch"];
    for (const { c } of nearby) {
      const dir = getDirection8(s.playerX, s.playerY, c.x, c.y);
      const snd = sounds[Math.floor(seededRandom(s.tick, 95 + c.id) * sounds.length)];
      addLog(s, `${snd} to the ${dir}.`, c.type === "predator" ? "danger" : "info");
    }
  }

  // ── Creature despawn ──
  s.creatures = s.creatures.filter(c =>
    dist(c.x, c.y, s.playerX, s.playerY) < cfg.CREATURE_DESPAWN_DISTANCE * TILE_SIZE / 3
  );

  // ── Ambient ──
  if (s.tick % 45 === 0 && s.creatures.length === 0) {
    const amb = ["An owl calls.", "Wind rustles above.", "The fire crackles.", "Something drips from the trees."];
    addLog(s, amb[Math.floor(seededRandom(s.tick, 33) * amb.length)], "info");
  }

  return s;
}
