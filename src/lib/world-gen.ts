// ── Procedural world generation ──
// Seeded noise + rules → forest map

export type TileType = "ground" | "tree" | "dense_tree" | "rock";

export interface WorldMap {
  seed: number;
  width: number;
  height: number;
  tiles: TileType[];
  spawnX: number;
  spawnY: number;
}

export interface ResourceNode {
  id: number;
  x: number;
  y: number;
  type: "wood" | "food" | "materials";
  depletedUntilTick: number;
}

// ── Simple seeded noise ──

function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 0x100000000;
}

function smoothNoise(x: number, y: number, seed: number, scale: number): number {
  const sx = x / scale;
  const sy = y / scale;
  const ix = Math.floor(sx);
  const iy = Math.floor(sy);
  const fx = sx - ix;
  const fy = sy - iy;

  const tl = hash(ix, iy, seed);
  const tr = hash(ix + 1, iy, seed);
  const bl = hash(ix, iy + 1, seed);
  const br = hash(ix + 1, iy + 1, seed);

  const top = tl + (tr - tl) * fx;
  const bot = bl + (br - bl) * fx;
  return top + (bot - top) * fy;
}

// ── Map generation ──

export const MAP_WIDTH = 150;
export const MAP_HEIGHT = 150;
export const TILE_SIZE = 32; // pixels per tile in world space

export function generateWorld(seed: number): WorldMap {
  const w = MAP_WIDTH;
  const h = MAP_HEIGHT;
  const tiles: TileType[] = new Array(w * h);

  const spawnX = Math.floor(w / 2);
  const spawnY = Math.floor(h / 2);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;

      // Distance from spawn — clearing around start
      const dx = x - spawnX;
      const dy = y - spawnY;
      const distFromSpawn = Math.sqrt(dx * dx + dy * dy);

      // Noise layers for natural-looking forest
      const n1 = smoothNoise(x, y, seed, 8);
      const n2 = smoothNoise(x, y, seed + 1000, 15);
      const n3 = smoothNoise(x, y, seed + 2000, 4);
      const density = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;

      // Clearing around spawn (radius ~6 tiles)
      if (distFromSpawn < 5) {
        tiles[idx] = "ground";
      } else if (distFromSpawn < 8) {
        // Transition zone — sparse trees
        tiles[idx] = density > 0.65 ? "tree" : "ground";
      } else {
        // Dense forest with paths
        if (density > 0.7) {
          tiles[idx] = "dense_tree";
        } else if (density > 0.45) {
          tiles[idx] = "tree";
        } else if (hash(x, y, seed + 5000) < 0.03) {
          tiles[idx] = "rock";
        } else {
          tiles[idx] = "ground";
        }
      }

      // Map border — impassable trees
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        tiles[idx] = "dense_tree";
      }
    }
  }

  // Carve some paths radiating from spawn for exploration
  const pathCount = 4 + Math.floor(hash(0, 0, seed + 9000) * 4);
  for (let p = 0; p < pathCount; p++) {
    const angle = (p / pathCount) * Math.PI * 2 + hash(p, 0, seed + 8000) * 0.5;
    let px = spawnX;
    let py = spawnY;
    const pathLen = 20 + Math.floor(hash(p, 1, seed + 8000) * 40);
    for (let step = 0; step < pathLen; step++) {
      px += Math.cos(angle + smoothNoise(step, p, seed + 7000, 5) * 0.8);
      py += Math.sin(angle + smoothNoise(step, p, seed + 7500, 5) * 0.8);
      const tx = Math.floor(px);
      const ty = Math.floor(py);
      if (tx >= 1 && tx < w - 1 && ty >= 1 && ty < h - 1) {
        tiles[ty * w + tx] = "ground";
        // Widen path slightly
        if (tx + 1 < w - 1) tiles[ty * w + tx + 1] = "ground";
        if (ty + 1 < h - 1) tiles[(ty + 1) * w + tx] = "ground";
      }
    }
  }

  return { seed, width: w, height: h, tiles, spawnX, spawnY };
}

export function getTile(world: WorldMap, x: number, y: number): TileType {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return "dense_tree";
  return world.tiles[y * world.width + x];
}

export function isPassable(tile: TileType): boolean {
  return tile === "ground" || tile === "rock";
}

// ── Resource node generation ──

export function generateResourceNodes(world: WorldMap): ResourceNode[] {
  const nodes: ResourceNode[] = [];
  let nextId = 1;

  for (let y = 2; y < world.height - 2; y += 3) {
    for (let x = 2; x < world.width - 2; x += 3) {
      const tile = getTile(world, x, y);
      if (tile !== "ground") continue;

      const r = hash(x, y, world.seed + 3000);
      if (r > 0.15) continue; // ~15% of ground tiles in the grid

      const typeRoll = hash(x, y, world.seed + 4000);
      const type: ResourceNode["type"] =
        typeRoll < 0.45 ? "wood" :
        typeRoll < 0.75 ? "food" :
        "materials";

      nodes.push({
        id: nextId++,
        x: x * TILE_SIZE + TILE_SIZE / 2,
        y: y * TILE_SIZE + TILE_SIZE / 2,
        type,
        depletedUntilTick: 0,
      });
    }
  }

  return nodes;
}
