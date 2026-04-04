import { type GameConfig, DEFAULT_CONFIG, TILE_SIZE } from "./constants";
import type { ExplorationState, PlacedFire, WeaponTier } from "./exploration-state";
import type { CreatureType } from "./game-state";
import { addLog } from "./game-state";
import { type WorldMap, getTile, isPassable } from "./world-gen";

// ── Exploration constants ──

export const PLAYER_SPEED = 2.5;
export const PLAYER_RUN_SPEED = 4.5;
export const FLASHLIGHT_RANGE = 180;
export const FLASHLIGHT_ANGLE = Math.PI * 0.35;
export const INTERACT_RANGE = 60;
export const MOVEMENT_NOISE_PER_FRAME = 0.15;
export const RUN_NOISE_MULTIPLIER = 3;
export const RESOURCE_RESPAWN_TICKS = 60;
export const ATTACK_COOLDOWN_TICKS = 8; // ~8 frames at 60fps... actually tick-based so 8 seconds

function seededRandom(tick: number, salt: number = 0): number {
  let h = (tick + salt * 374761393) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 0x100000000;
}

// ── Creature params ──

interface CreatureParams {
  baseSpeed: number;
  noiseFactor: number;
  health: number;
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
  timid: { baseSpeed: 0.4, noiseFactor: 0.8, health: 10, damageMin: 3, damageMax: 8, fireFleeThreshold: 50, fleeSpeed: 2.0, fireAttract: false, fireAttractThreshold: -1, fireAttractSpeed: 0, spawnWeight: 30 },
  predator: { baseSpeed: 0.9, noiseFactor: 1.2, health: 30, damageMin: 8, damageMax: 18, fireFleeThreshold: -1, fleeSpeed: 0, fireAttract: true, fireAttractThreshold: 20, fireAttractSpeed: 0.6, spawnWeight: 40 },
  stalker: { baseSpeed: 0.6, noiseFactor: 0.3, health: 20, damageMin: 5, damageMax: 12, fireFleeThreshold: -1, fleeSpeed: 0, fireAttract: false, fireAttractThreshold: -1, fireAttractSpeed: 0, spawnWeight: 30 },
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
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
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

// ── Weapon stats helper ──

export function getWeaponStats(weapon: WeaponTier, cfg: GameConfig = DEFAULT_CONFIG) {
  switch (weapon) {
    case "knife": return { damage: cfg.KNIFE_DAMAGE, range: cfg.KNIFE_RANGE, noise: 25 };
    case "spear": return { damage: cfg.SPEAR_DAMAGE, range: cfg.SPEAR_RANGE, noise: 20 };
    case "axe": return { damage: cfg.AXE_DAMAGE, range: cfg.AXE_RANGE, noise: 30 };
  }
}

// ── Player movement (per frame) ──

export function movePlayer(
  state: ExplorationState,
  dx: number,
  dy: number,
  running: boolean,
  world: WorldMap,
): ExplorationState {
  if (state.status !== "playing" || (dx === 0 && dy === 0)) return state;

  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / len;
  const ny = dy / len;
  const speed = running ? PLAYER_RUN_SPEED : PLAYER_SPEED;
  const newX = state.playerX + nx * speed;
  const newY = state.playerY + ny * speed;

  const tileX = Math.floor(newX / TILE_SIZE);
  const tileY = Math.floor(newY / TILE_SIZE);

  if (!isPassable(getTile(world, tileX, tileY))) {
    // Slide
    const canX = isPassable(getTile(world, Math.floor((state.playerX + nx * speed) / TILE_SIZE), Math.floor(state.playerY / TILE_SIZE)));
    const canY = isPassable(getTile(world, Math.floor(state.playerX / TILE_SIZE), Math.floor((state.playerY + ny * speed) / TILE_SIZE)));
    if (canX && Math.abs(nx) > 0.1) {
      return { ...state, playerX: state.playerX + nx * speed, playerAngle: Math.atan2(0, nx), noise: Math.min(100, state.noise + MOVEMENT_NOISE_PER_FRAME * (running ? RUN_NOISE_MULTIPLIER : 1)) };
    }
    if (canY && Math.abs(ny) > 0.1) {
      return { ...state, playerY: state.playerY + ny * speed, playerAngle: Math.atan2(ny, 0), noise: Math.min(100, state.noise + MOVEMENT_NOISE_PER_FRAME * (running ? RUN_NOISE_MULTIPLIER : 1)) };
    }
    return state;
  }

  return {
    ...state,
    playerX: newX,
    playerY: newY,
    playerAngle: Math.atan2(ny, nx),
    noise: Math.min(100, state.noise + MOVEMENT_NOISE_PER_FRAME * (running ? RUN_NOISE_MULTIPLIER : 1)),
  };
}

// ── Player attacks nearest creature ──

export function attackCreature(state: ExplorationState, cfg: GameConfig = DEFAULT_CONFIG): ExplorationState {
  if (state.status !== "playing") return state;
  if (state.tick < state.attackCooldownUntil) return state;

  const stats = getWeaponStats(state.weapon, cfg);

  // Find closest creature in weapon range
  let closest: { idx: number; d: number } | null = null;
  for (let i = 0; i < state.creatures.length; i++) {
    const c = state.creatures[i];
    const d = dist(c.x, c.y, state.playerX, state.playerY);
    if (d <= stats.range && (!closest || d < closest.d)) {
      closest = { idx: i, d };
    }
  }

  if (!closest) {
    addLog(state, "You swing at the darkness. Nothing there.", "info");
    return { ...state, noise: Math.min(100, state.noise + stats.noise * 0.5), attackCooldownUntil: state.tick + 2 };
  }

  const s = { ...state, creatures: [...state.creatures] };
  s.attackCooldownUntil = s.tick + 3; // 3 second cooldown
  s.noise = Math.min(100, s.noise + stats.noise);

  const creature = s.creatures[closest.idx];
  const params = CREATURE_PARAMS[creature.type];
  const creatureHp = params.health;

  if (stats.damage >= creatureHp) {
    // Kill it
    s.creatures.splice(closest.idx, 1);
    const names: Record<CreatureType, string> = { timid: "creature", predator: "predator", stalker: "shadow" };
    addLog(s, `You strike the ${names[creature.type]} with your ${s.weapon}. It falls.`, "success");
  } else {
    // Wound and push back
    const angle = Math.atan2(creature.y - s.playerY, creature.x - s.playerX);
    s.creatures[closest.idx] = {
      ...creature,
      x: creature.x + Math.cos(angle) * 30,
      y: creature.y + Math.sin(angle) * 30,
    };
    addLog(s, `You hit it with your ${s.weapon}. It staggers back.`, "info");
  }

  return s;
}

// ── Toggle flashlight ──

export function toggleFlashlight(state: ExplorationState): ExplorationState {
  if (state.flashlightBattery <= 0 && !state.flashlightOn) {
    addLog(state, "Flashlight batteries are dead.", "danger");
    return state;
  }
  const s = { ...state, flashlightOn: !state.flashlightOn };
  addLog(s, s.flashlightOn ? "Flashlight on." : "Flashlight off. Saving battery.", "info");
  return s;
}

// ── Start a fire (uses lighter) ──

export function startFire(state: ExplorationState, cfg: GameConfig = DEFAULT_CONFIG): ExplorationState {
  if (state.status !== "playing") return state;
  if (state.lighterUses <= 0) {
    addLog(state, "The lighter is empty.", "danger");
    return state;
  }
  if (state.wood < 2) {
    addLog(state, "Need at least 2 wood to start a fire.", "danger");
    return state;
  }

  const s = { ...state, fires: [...state.fires] };
  s.lighterUses -= 1;
  s.wood -= 2;
  s.noise = Math.min(100, s.noise + cfg.NOISE_STOKE);
  s.fires.push({
    id: s.nextFireId,
    x: s.playerX,
    y: s.playerY,
    fuel: cfg.FIRE_START_FUEL,
  });
  s.nextFireId += 1;
  addLog(s, `You strike the lighter and start a fire. ${s.lighterUses} uses left.`, "success");
  return s;
}

// ── Stoke an existing fire ──

export function stokeFire(state: ExplorationState, fireId: number, cfg: GameConfig = DEFAULT_CONFIG): ExplorationState {
  if (state.status !== "playing" || state.wood <= 0) return state;

  const s = { ...state, fires: [...state.fires] };
  const idx = s.fires.findIndex(f => f.id === fireId);
  if (idx === -1) return state;

  s.wood -= 1;
  s.noise = Math.min(100, s.noise + cfg.NOISE_STOKE);
  s.fires[idx] = { ...s.fires[idx], fuel: Math.min(cfg.FIRE_MAX, s.fires[idx].fuel + cfg.WOOD_PER_FUEL) };
  addLog(s, "You feed the fire.", "info");
  return s;
}

// ── Craft weapon upgrade ──

export function craftWeapon(state: ExplorationState, target: WeaponTier, cfg: GameConfig = DEFAULT_CONFIG): ExplorationState {
  if (state.status !== "playing") return state;
  const cost = target === "spear" ? cfg.SPEAR_MATERIAL_COST : cfg.AXE_MATERIAL_COST;
  if (state.materials < cost) return state;

  const s = { ...state };
  s.materials -= cost;
  s.weapon = target;
  s.noise = Math.min(100, s.noise + cfg.NOISE_BUILD);
  const names: Record<WeaponTier, string> = {
    knife: "knife",
    spear: "a spear from a branch and stone",
    axe: "a heavy axe from rock and wood",
  };
  addLog(s, `You craft ${names[target]}. Better.`, "success");
  return s;
}

// ── Has any light source (for foraging check) ──

export function hasLight(state: ExplorationState): boolean {
  if (state.flashlightOn && state.flashlightBattery > 0) return true;
  // Near a fire?
  for (const f of state.fires) {
    if (f.fuel > 0 && dist(state.playerX, state.playerY, f.x, f.y) < 120) return true;
  }
  return false;
}

// ── Spatial game tick (1s) ──

export function explorationTick(
  state: ExplorationState,
  cfg: GameConfig = DEFAULT_CONFIG,
): ExplorationState {
  if (state.status !== "playing") return state;

  const s: ExplorationState = {
    ...state,
    creatures: [...state.creatures],
    resourceNodes: [...state.resourceNodes],
    fires: [...state.fires],
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
      addLog(s, "Rotors. A helicopter breaks the canopy. You're rescued.", "success");
      return s;
    }
    if (remaining <= 6) addLog(s, `${remaining}h until rescue. Hold on.`, "success");
    else if (s.hour % 6 === 0) addLog(s, `${remaining}h until rescue.`, "info");
  }

  // ── Noise decay ──
  s.noise = Math.max(0, s.noise - cfg.NOISE_DECAY);

  // ── Flashlight battery ──
  if (s.flashlightOn && s.flashlightBattery > 0) {
    s.flashlightBattery = Math.max(0, s.flashlightBattery - cfg.FLASHLIGHT_DRAIN_PER_TICK);
    if (s.flashlightBattery <= 0) {
      s.flashlightOn = false;
      addLog(s, "Flashlight batteries died.", "danger");
    } else if (s.flashlightBattery < 15 && s.tick % 20 === 0) {
      addLog(s, "Flashlight flickering. Battery low.", "danger");
    }
  }

  // ── Fire decay (all fires) ──
  s.fires = s.fires.map(f => ({
    ...f,
    fuel: Math.max(0, f.fuel - cfg.FIRE_BURN_RATE),
  })).filter(f => {
    if (f.fuel <= 0) {
      addLog(s, "A fire has gone out.", "info");
      return false;
    }
    return true;
  });

  // ── Hunger ──
  s.hunger = Math.min(cfg.MAX_HUNGER, s.hunger + cfg.HUNGER_RATE);
  if (s.hunger >= cfg.MAX_HUNGER) {
    s.health = Math.max(0, s.health - cfg.HUNGER_DAMAGE);
    if (s.health <= 0) {
      s.status = "dead";
      addLog(s, "You collapse from starvation.", "danger");
      return s;
    }
    if (s.tick % 20 === 0) addLog(s, "You're starving.", "danger");
  }

  // ── Creature spawning ──
  if (s.creatures.length < cfg.CREATURE_MAX) {
    // Fire beacon — fires attract creatures
    let fireBonus = 0;
    for (const f of s.fires) {
      if (f.fuel > 0) fireBonus += (f.fuel / cfg.FIRE_MAX) * 0.3;
    }
    const spawnChance = (cfg.CREATURE_SPAWN_RATE + cfg.CREATURE_SPAWN_ESCALATION * s.hour) * (1 + fireBonus);
    if (seededRandom(s.tick, 50) < spawnChance) {
      const angle = seededRandom(s.tick, 51) * Math.PI * 2;
      const spawnDist = cfg.CREATURE_SPAWN_DISTANCE * TILE_SIZE / 3;
      s.creatures.push({
        id: s.nextCreatureId,
        type: pickCreatureType(s.tick),
        x: s.playerX + Math.cos(angle) * spawnDist,
        y: s.playerY + Math.sin(angle) * spawnDist,
        spawnTick: s.tick,
      });
      s.nextCreatureId += 1;
    }
  }

  // ── Creature movement ──
  const noiseRatio = s.noise / cfg.NOISE_MAX;
  s.creatures = s.creatures.map((c) => {
    const d = dist(c.x, c.y, s.playerX, s.playerY);
    if (d < 1) return c;

    const params = CREATURE_PARAMS[c.type];
    const dx = (s.playerX - c.x) / d;
    const dy = (s.playerY - c.y) / d;

    // Flee from nearby fires (timid)
    for (const f of s.fires) {
      if (f.fuel <= 0) continue;
      const fd = dist(c.x, c.y, f.x, f.y);
      if (params.fireFleeThreshold > 0 && f.fuel > params.fireFleeThreshold && fd < 150) {
        const fdx = (c.x - f.x) / fd;
        const fdy = (c.y - f.y) / fd;
        return { ...c, x: c.x + fdx * params.fleeSpeed, y: c.y + fdy * params.fleeSpeed };
      }
    }

    let speed = params.baseSpeed + params.noiseFactor * noiseRatio;

    // Attracted to fires (predators)
    if (params.fireAttract) {
      for (const f of s.fires) {
        if (f.fuel > params.fireAttractThreshold) {
          speed += params.fireAttractSpeed * (f.fuel / cfg.FIRE_MAX);
          break;
        }
      }
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
      const damage = Math.max(1, raw);

      const dir = getDirection8(s.playerX, s.playerY, c.x, c.y);
      const msgs: Record<CreatureType, string[]> = {
        timid: ["Something bites from the", "A creature lashes out from the"],
        predator: ["A predator lunges from the", "Claws slash from the"],
        stalker: ["Something strikes from the", "A shadow attacks from the"],
      };
      const msgList = msgs[c.type];
      const msg = msgList[Math.floor(seededRandom(s.tick, 80 + c.id) * msgList.length)];
      addLog(s, `${msg} ${dir}! ${Math.round(damage)} damage.`, "danger");

      s.health = Math.max(0, s.health - damage);
      if (s.health <= 0) {
        s.status = "dead";
        addLog(s, "The forest claims you.", "danger");
        return s;
      }
    }
  }

  // ── Detection ──
  if (s.tick % cfg.DETECT_COOLDOWN === 0 && s.creatures.length > 0) {
    const medRange = cfg.DETECT_MEDIUM_RANGE * TILE_SIZE / 3;
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
    const amb = ["An owl calls.", "Wind rustles above.", "Something drips from the trees.", "Silence."];
    addLog(s, amb[Math.floor(seededRandom(s.tick, 33) * amb.length)], "info");
  }

  return s;
}
