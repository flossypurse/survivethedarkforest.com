"use client";

import { useRef, useEffect } from "react";
import type { ExplorationState } from "@/lib/exploration-state";
import { type WorldMap, getTile, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from "@/lib/world-gen";
import { FLASHLIGHT_RANGE, FLASHLIGHT_ANGLE } from "@/lib/exploration-engine";
import { FIRE_MAX } from "@/lib/constants";

// Seeded hash for consistent per-tile variation
function tileHash(x: number, y: number, salt: number): number {
  let h = (x * 374761393 + y * 668265263 + salt * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = h ^ (h >>> 13);
  return (h >>> 0) / 0x100000000;
}

interface Props {
  state: ExplorationState;
  world: WorldMap;
}

export default function TopDownCanvas({ state, world }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef(0);
  const cameraRef = useRef({ x: state.playerX, y: state.playerY });
  const eyePositionsRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  // Track previous player position for walk animation
  const walkPhaseRef = useRef(0);
  const prevPosRef = useRef({ x: state.playerX, y: state.playerY });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    if (!lightCanvasRef.current) {
      lightCanvasRef.current = document.createElement("canvas");
    }
    const lightCanvas = lightCanvasRef.current;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lightCanvas.width = canvas.width;
      lightCanvas.height = canvas.height;
    };

    resize();
    window.addEventListener("resize", resize);
    let time = 0;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      time += 1;

      // Camera follow
      const cam = cameraRef.current;
      cam.x += (state.playerX - cam.x) * 0.12;
      cam.y += (state.playerY - cam.y) * 0.12;
      const ox = w / 2 - cam.x;
      const oy = h / 2 - cam.y;

      // Walk animation phase
      const dx = state.playerX - prevPosRef.current.x;
      const dy = state.playerY - prevPosRef.current.y;
      const moving = Math.abs(dx) + Math.abs(dy) > 0.1;
      if (moving) walkPhaseRef.current += 0.25;
      prevPosRef.current = { x: state.playerX, y: state.playerY };

      // ── Background (solid, no alpha — prevents flashing) ──
      ctx.fillStyle = "#06060e";
      ctx.fillRect(0, 0, w, h);

      // ── Visible tile range ──
      const tsX = Math.max(0, Math.floor((cam.x - w / 2) / TILE_SIZE) - 1);
      const tsY = Math.max(0, Math.floor((cam.y - h / 2) / TILE_SIZE) - 1);
      const teX = Math.min(MAP_WIDTH, Math.ceil((cam.x + w / 2) / TILE_SIZE) + 1);
      const teY = Math.min(MAP_HEIGHT, Math.ceil((cam.y + h / 2) / TILE_SIZE) + 1);

      // ── Draw tiles ──
      for (let ty = tsY; ty < teY; ty++) {
        for (let tx = tsX; tx < teX; tx++) {
          const tile = getTile(world, tx, ty);
          const sx = tx * TILE_SIZE + ox;
          const sy = ty * TILE_SIZE + oy;
          const h1 = tileHash(tx, ty, 0);
          const h2 = tileHash(tx, ty, 1);

          if (tile === "ground") {
            // Dark earth with subtle variation
            const shade = 8 + Math.floor(h1 * 5);
            ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade + 4})`;
            ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
            // Occasional dirt speckle
            if (h2 > 0.85) {
              ctx.fillStyle = `rgba(80, 70, 50, 0.15)`;
              ctx.beginPath();
              ctx.arc(sx + h1 * 28 + 2, sy + h2 * 28 + 2, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (tile === "tree") {
            // Ground under tree
            ctx.fillStyle = "#070710";
            ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
            // Trunk — brown
            const trunkX = sx + 12 + h1 * 8;
            ctx.fillStyle = `rgb(${35 + Math.floor(h1 * 15)}, ${25 + Math.floor(h2 * 10)}, ${15})`;
            ctx.fillRect(trunkX, sy + 16, 4 + h2 * 3, 16);
            // Canopy — varied greens (will show color when lit)
            const greenR = 15 + Math.floor(h1 * 25);
            const greenG = 35 + Math.floor(h2 * 35);
            const greenB = 10 + Math.floor(h1 * 15);
            ctx.fillStyle = `rgb(${greenR}, ${greenG}, ${greenB})`;
            const canopyR = 10 + h2 * 5;
            ctx.beginPath();
            ctx.arc(trunkX + 2, sy + 10 + h1 * 4, canopyR, 0, Math.PI * 2);
            ctx.fill();
            // Second canopy cluster for fullness
            ctx.fillStyle = `rgb(${greenR - 4}, ${greenG + 5}, ${greenB - 2})`;
            ctx.beginPath();
            ctx.arc(trunkX + 5 + h2 * 4, sy + 7 + h2 * 3, canopyR * 0.7, 0, Math.PI * 2);
            ctx.fill();
          } else if (tile === "dense_tree") {
            ctx.fillStyle = "#050509";
            ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
            // Multiple overlapping dark canopies
            for (let t = 0; t < 3; t++) {
              const th = tileHash(tx, ty, t + 10);
              const gR = 10 + Math.floor(th * 15);
              const gG = 20 + Math.floor(tileHash(tx, ty, t + 20) * 25);
              ctx.fillStyle = `rgb(${gR}, ${gG}, ${8})`;
              ctx.beginPath();
              ctx.arc(sx + 6 + th * 20, sy + 6 + tileHash(tx, ty, t + 30) * 20, 10 + th * 6, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (tile === "rock") {
            ctx.fillStyle = "#080810";
            ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
            // Rock — grey with shape
            const rockGrey = 30 + Math.floor(h1 * 20);
            ctx.fillStyle = `rgb(${rockGrey}, ${rockGrey}, ${rockGrey + 5})`;
            ctx.beginPath();
            ctx.ellipse(sx + 14 + h1 * 4, sy + 16 + h2 * 4, 5 + h1 * 3, 4 + h2 * 2, h1 * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // ── Resource nodes — distinct icons per type ──
      for (const node of state.resourceNodes) {
        if (node.depletedUntilTick > state.tick) continue;
        const nx = node.x + ox;
        const ny = node.y + oy;
        if (nx < -20 || nx > w + 20 || ny < -20 || ny > h + 20) continue;

        if (node.type === "wood") {
          // Small log icon
          ctx.fillStyle = "#5a4a30";
          ctx.save();
          ctx.translate(nx, ny);
          ctx.rotate(0.3);
          ctx.fillRect(-6, -2, 12, 4);
          ctx.fillStyle = "#4a3a20";
          ctx.fillRect(-5, -4, 10, 3);
          ctx.restore();
        } else if (node.type === "food") {
          // Berry cluster
          ctx.fillStyle = "#6a3040";
          ctx.beginPath(); ctx.arc(nx - 2, ny, 3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#7a3848";
          ctx.beginPath(); ctx.arc(nx + 2, ny - 1, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#5a2830";
          ctx.beginPath(); ctx.arc(nx, ny + 2, 2, 0, Math.PI * 2); ctx.fill();
          // Tiny leaf
          ctx.fillStyle = "#2a4a20";
          ctx.beginPath(); ctx.ellipse(nx + 1, ny - 4, 2, 1, -0.3, 0, Math.PI * 2); ctx.fill();
        } else {
          // Materials — stone + vine
          ctx.fillStyle = "#4a4a5a";
          ctx.beginPath();
          ctx.moveTo(nx - 4, ny + 3);
          ctx.lineTo(nx - 1, ny - 4);
          ctx.lineTo(nx + 5, ny - 2);
          ctx.lineTo(nx + 3, ny + 4);
          ctx.closePath();
          ctx.fill();
          // Vine
          ctx.strokeStyle = "#2a5a2a";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(nx + 3, ny - 2);
          ctx.quadraticCurveTo(nx + 6, ny, nx + 4, ny + 3);
          ctx.stroke();
        }
      }

      // ── Fires ──
      for (const fire of state.fires) {
        const fx = fire.x + ox;
        const fy = fire.y + oy;
        const fi = fire.fuel / FIRE_MAX;

        if (fi > 0) {
          const glowR = 25 + fi * 60;
          const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, glowR);
          glow.addColorStop(0, `rgba(255, 140, 50, ${0.15 * fi})`);
          glow.addColorStop(0.5, `rgba(255, 80, 20, ${0.06 * fi})`);
          glow.addColorStop(1, "rgba(255, 50, 10, 0)");
          ctx.fillStyle = glow;
          ctx.fillRect(fx - glowR, fy - glowR, glowR * 2, glowR * 2);

          // Flame
          const pulse = Math.sin(time * 0.1 + fire.id) * 2;
          const r = 3 + fi * 5 + pulse;
          ctx.fillStyle = `rgba(255, 200, 100, ${0.9 * fi})`;
          ctx.beginPath(); ctx.arc(fx, fy - 2, r * 0.6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = `rgba(255, 120, 40, ${0.7 * fi})`;
          ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI * 2); ctx.fill();
          // Embers
          if (Math.random() < fi * 0.3) {
            ctx.fillStyle = `rgba(255, 180, 60, 0.5)`;
            ctx.beginPath();
            ctx.arc(fx + (Math.random() - 0.5) * 8, fy - 4 - Math.random() * 6, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Ash pile
          ctx.fillStyle = "#1a1510";
          ctx.beginPath(); ctx.arc(fx, fy, 4, 0, Math.PI * 2); ctx.fill();
        }
      }

      // ── Player character — proper pilot sprite ──
      const px = state.playerX + ox;
      const py = state.playerY + oy;
      const pa = state.playerAngle;
      const walkBob = moving ? Math.sin(walkPhaseRef.current) * 1.5 : 0;

      ctx.save();
      ctx.translate(px, py + walkBob * 0.3);
      ctx.rotate(pa + Math.PI / 2);

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(0, 4, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Boots
      const legSpread = moving ? Math.sin(walkPhaseRef.current) * 2 : 0;
      ctx.fillStyle = "#3a3530";
      ctx.fillRect(-3 - legSpread, 3, 3, 5);
      ctx.fillRect(legSpread, 3, 3, 5);

      // Body — flight suit (olive drab)
      ctx.fillStyle = "#4a5240";
      ctx.beginPath();
      ctx.roundRect(-5, -5, 10, 12, 2);
      ctx.fill();

      // Vest/harness
      ctx.strokeStyle = "#3a4230";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-2, -4); ctx.lineTo(-2, 5);
      ctx.moveTo(2, -4); ctx.lineTo(2, 5);
      ctx.stroke();

      // Arms (swing when walking)
      const armSwing = moving ? Math.sin(walkPhaseRef.current) * 12 : 0;
      ctx.fillStyle = "#4a5240";
      // Left arm
      ctx.save();
      ctx.translate(-5, -1);
      ctx.rotate((armSwing * Math.PI) / 180);
      ctx.fillRect(-1.5, 0, 3, 7);
      ctx.restore();
      // Right arm (holds weapon)
      ctx.save();
      ctx.translate(5, -1);
      ctx.rotate((-armSwing * Math.PI) / 180);
      ctx.fillRect(-1.5, 0, 3, 7);
      ctx.restore();

      // Head — with helmet
      ctx.fillStyle = "#5a6250";
      ctx.beginPath();
      ctx.arc(0, -8, 4, 0, Math.PI * 2);
      ctx.fill();
      // Visor
      ctx.fillStyle = "#2a3a4a";
      ctx.beginPath();
      ctx.arc(0, -8.5, 2.5, -Math.PI * 0.7, Math.PI * 0.7);
      ctx.fill();

      // Weapon in front
      const wc = { knife: "#9a9a9a", spear: "#c8a060", axe: "#a05838" }[state.weapon];
      ctx.fillStyle = wc;
      if (state.weapon === "knife") {
        ctx.fillRect(-0.5, -13, 1, 5);
        ctx.fillStyle = "#ccc";
        ctx.beginPath();
        ctx.moveTo(0, -14); ctx.lineTo(-1, -12); ctx.lineTo(1, -12);
        ctx.closePath(); ctx.fill();
      } else if (state.weapon === "spear") {
        ctx.fillRect(-0.5, -18, 1, 10);
        ctx.fillStyle = "#bbb";
        ctx.beginPath();
        ctx.moveTo(0, -19); ctx.lineTo(-2, -15); ctx.lineTo(2, -15);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.fillRect(-0.5, -15, 1, 7);
        ctx.fillStyle = "#888";
        ctx.beginPath();
        ctx.moveTo(-3, -16); ctx.lineTo(3, -16); ctx.lineTo(2, -13); ctx.lineTo(-2, -13);
        ctx.closePath(); ctx.fill();
      }

      ctx.restore();

      // ── Darkness mask ──
      const dpr = window.devicePixelRatio || 1;
      const lctx = lightCanvas.getContext("2d")!;
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lctx.fillStyle = "rgba(0, 0, 0, 0.97)";
      lctx.fillRect(0, 0, w, h);
      lctx.globalCompositeOperation = "destination-out";

      // Flashlight cone
      if (state.flashlightOn && state.flashlightBattery > 0) {
        const bf = Math.min(1, state.flashlightBattery / 20);
        const flRange = FLASHLIGHT_RANGE * (0.5 + bf * 0.5);
        const flicker = state.flashlightBattery < 15 ? Math.random() * 0.3 : 0;

        // Warm-tinted flashlight
        const flGrad = lctx.createRadialGradient(px, py, 0, px, py, flRange);
        flGrad.addColorStop(0, `rgba(255,255,240,${(0.95 - flicker) * bf})`);
        flGrad.addColorStop(0.6, `rgba(255,255,230,${0.5 * bf})`);
        flGrad.addColorStop(1, "rgba(255,255,220,0)");
        lctx.fillStyle = flGrad;
        lctx.beginPath();
        lctx.moveTo(px, py);
        lctx.arc(px, py, flRange, pa - FLASHLIGHT_ANGLE, pa + FLASHLIGHT_ANGLE);
        lctx.closePath();
        lctx.fill();
      }

      // Tiny ambient glow
      const ambGrad = lctx.createRadialGradient(px, py, 0, px, py, 18);
      ambGrad.addColorStop(0, "rgba(255,255,255,0.2)");
      ambGrad.addColorStop(1, "rgba(255,255,255,0)");
      lctx.fillStyle = ambGrad;
      lctx.beginPath();
      lctx.arc(px, py, 18, 0, Math.PI * 2);
      lctx.fill();

      // Fire lights
      for (const fire of state.fires) {
        if (fire.fuel <= 0) continue;
        const ffx = fire.x + ox;
        const ffy = fire.y + oy;
        const fi = fire.fuel / FIRE_MAX;
        const fireR = 35 + fi * 100;
        const fGrad = lctx.createRadialGradient(ffx, ffy, 0, ffx, ffy, fireR);
        fGrad.addColorStop(0, `rgba(255,240,200,${0.85 * fi})`);
        fGrad.addColorStop(0.4, `rgba(255,200,150,${0.4 * fi})`);
        fGrad.addColorStop(1, "rgba(255,150,100,0)");
        lctx.fillStyle = fGrad;
        lctx.beginPath();
        lctx.arc(ffx, ffy, fireR, 0, Math.PI * 2);
        lctx.fill();
      }

      lctx.globalCompositeOperation = "source-over";
      ctx.drawImage(lightCanvas, 0, 0, w, h);

      // ── Creature eyes (on top of darkness) ──
      const activeIds = new Set<number>();
      for (const c of state.creatures) {
        activeIds.add(c.id);
        const cx = c.x + ox;
        const cy = c.y + oy;
        if (cx < -30 || cx > w + 30 || cy < -30 || cy > h + 30) continue;

        const prev = eyePositionsRef.current.get(c.id);
        const ex = prev ? prev.x + (cx - prev.x) * 0.1 : cx;
        const ey = prev ? prev.y + (cy - prev.y) * 0.1 : cy;
        eyePositionsRef.current.set(c.id, { x: ex, y: ey });

        const d = Math.sqrt((c.x - state.playerX) ** 2 + (c.y - state.playerY) ** 2);
        const dr = Math.min(1, d / 500);
        if (Math.sin(time * 0.025 + c.id * 7.3) > 0.92) continue;
        const alpha = 0.3 + (1 - dr) * 0.6;
        if (alpha < 0.05) continue;

        const ec: Record<string, [number, number, number]> = {
          timid: [160, 200, 100], predator: [240, 130, 30], stalker: [180, 100, 220],
        };
        const [er, eg, eb] = ec[c.type] || [200, 180, 50];

        // Glow halo
        const haloR = 5 + (1 - dr) * 6;
        const halo = ctx.createRadialGradient(ex, ey, 0, ex, ey, haloR);
        halo.addColorStop(0, `rgba(${er},${eg},${eb},${alpha * 0.2})`);
        halo.addColorStop(1, `rgba(${er},${eg},${eb},0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(ex, ey, haloR, 0, Math.PI * 2);
        ctx.fill();

        // Eye pair
        const sz = 1.5 + (1 - dr) * 1.5;
        ctx.fillStyle = `rgba(${er},${eg},${eb},${alpha})`;
        ctx.beginPath(); ctx.ellipse(ex - 3, ey, sz, sz * 0.65, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(ex + 3, ey, sz, sz * 0.65, 0, 0, Math.PI * 2); ctx.fill();
      }
      for (const id of eyePositionsRef.current.keys()) {
        if (!activeIds.has(id)) eyePositionsRef.current.delete(id);
      }

      // ── Noise ripple ──
      if (state.noise > 20) {
        const rippleR = 20 + (state.noise / 100) * 40 + Math.sin(time * 0.15) * 5;
        ctx.strokeStyle = `rgba(201, 160, 212, ${(state.noise / 100) * 0.15})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, rippleR, 0, Math.PI * 2);
        ctx.stroke();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, [state, world]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: "#06060e" }}
    />
  );
}
