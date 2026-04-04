"use client";

import { useRef, useEffect } from "react";
import type { ExplorationState } from "@/lib/exploration-state";
import { type WorldMap, getTile, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from "@/lib/world-gen";
import { FLASHLIGHT_RANGE, FLASHLIGHT_ANGLE } from "@/lib/exploration-engine";
import { FIRE_MAX } from "@/lib/constants";

const GROUND_COLORS = ["#0c0c14", "#0b0b13", "#0d0d15", "#0a0a12"];
const TREE_COLOR = "#080812";
const DENSE_TREE = "#050510";
const ROCK_COLOR = "#16161e";

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
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
      ctx.scale(dpr, dpr);
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

      const cam = cameraRef.current;
      cam.x += (state.playerX - cam.x) * 0.12;
      cam.y += (state.playerY - cam.y) * 0.12;
      const ox = w / 2 - cam.x;
      const oy = h / 2 - cam.y;

      ctx.fillStyle = "#03030a";
      ctx.fillRect(0, 0, w, h);

      // ── Tiles ──
      const tsX = Math.max(0, Math.floor((cam.x - w / 2) / TILE_SIZE) - 1);
      const tsY = Math.max(0, Math.floor((cam.y - h / 2) / TILE_SIZE) - 1);
      const teX = Math.min(MAP_WIDTH, Math.ceil((cam.x + w / 2) / TILE_SIZE) + 1);
      const teY = Math.min(MAP_HEIGHT, Math.ceil((cam.y + h / 2) / TILE_SIZE) + 1);

      for (let ty = tsY; ty < teY; ty++) {
        for (let tx = tsX; tx < teX; tx++) {
          const tile = getTile(world, tx, ty);
          const sx = tx * TILE_SIZE + ox;
          const sy = ty * TILE_SIZE + oy;

          if (tile === "ground") {
            ctx.fillStyle = GROUND_COLORS[(tx * 7 + ty * 13) & 3];
            ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
          } else if (tile === "tree") {
            ctx.fillStyle = GROUND_COLORS[0];
            ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "#0e0e16";
            ctx.fillRect(sx + 13, sy + 18, 6, 14);
            ctx.fillStyle = TREE_COLOR;
            ctx.beginPath();
            ctx.arc(sx + 16, sy + 14, 12, 0, Math.PI * 2);
            ctx.fill();
          } else if (tile === "dense_tree") {
            ctx.fillStyle = DENSE_TREE;
            ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "#040410";
            ctx.beginPath();
            ctx.arc(sx + 10, sy + 12, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(sx + 22, sy + 18, 12, 0, Math.PI * 2);
            ctx.fill();
          } else if (tile === "rock") {
            ctx.fillStyle = GROUND_COLORS[0];
            ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = ROCK_COLOR;
            ctx.beginPath();
            ctx.arc(sx + 16, sy + 18, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // ── Resource nodes ──
      for (const node of state.resourceNodes) {
        if (node.depletedUntilTick > state.tick) continue;
        const nx = node.x + ox;
        const ny = node.y + oy;
        if (nx < -20 || nx > w + 20 || ny < -20 || ny > h + 20) continue;
        const colors = { wood: "#4a3a20", food: "#2a3a20", materials: "#2a2a3a" };
        ctx.fillStyle = colors[node.type];
        ctx.beginPath();
        ctx.arc(nx, ny, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Fires ──
      for (const fire of state.fires) {
        const fx = fire.x + ox;
        const fy = fire.y + oy;
        const intensity = fire.fuel / FIRE_MAX;

        if (intensity > 0) {
          const glowR = 25 + intensity * 60;
          const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, glowR);
          glow.addColorStop(0, `rgba(255, 140, 50, ${0.15 * intensity})`);
          glow.addColorStop(0.5, `rgba(255, 80, 20, ${0.06 * intensity})`);
          glow.addColorStop(1, "rgba(255, 50, 10, 0)");
          ctx.fillStyle = glow;
          ctx.fillRect(fx - glowR, fy - glowR, glowR * 2, glowR * 2);

          const pulse = Math.sin(time * 0.08 + fire.id) * 2;
          ctx.fillStyle = `rgba(255, 200, 100, ${0.8 * intensity})`;
          ctx.beginPath();
          ctx.arc(fx, fy, 3 + intensity * 5 + pulse, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "#1a1510";
          ctx.beginPath();
          ctx.arc(fx, fy, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Player character ──
      const px = state.playerX + ox;
      const py = state.playerY + oy;
      const pa = state.playerAngle;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(pa + Math.PI / 2);

      // Body
      ctx.fillStyle = "#6a7a60";
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = "#8a9a80";
      ctx.beginPath();
      ctx.arc(0, -6, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Arms
      ctx.strokeStyle = "#6a7a60";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, -2);
      ctx.lineTo(-7, 3);
      ctx.moveTo(4, -2);
      ctx.lineTo(7, 3);
      ctx.stroke();

      // Weapon indicator at front
      const weaponColors = { knife: "#aaa", spear: "#c8a060", axe: "#b06040" };
      ctx.fillStyle = weaponColors[state.weapon];
      if (state.weapon === "knife") {
        ctx.fillRect(-0.5, -11, 1, 4);
      } else if (state.weapon === "spear") {
        ctx.fillRect(-0.5, -14, 1, 7);
        ctx.fillStyle = "#ccc";
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(-1.5, -12);
        ctx.lineTo(1.5, -12);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(-0.5, -12, 1, 5);
        ctx.fillStyle = "#888";
        ctx.fillRect(-3, -13, 6, 2);
      }

      ctx.restore();

      // ── Darkness mask ──
      const dpr = window.devicePixelRatio || 1;
      const lctx = lightCanvas.getContext("2d")!;
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lctx.fillStyle = "rgba(0, 0, 0, 0.96)";
      lctx.fillRect(0, 0, w, h);
      lctx.globalCompositeOperation = "destination-out";

      // Flashlight
      if (state.flashlightOn && state.flashlightBattery > 0) {
        const batteryFactor = Math.min(1, state.flashlightBattery / 20); // dims below 20%
        const flRange = FLASHLIGHT_RANGE * (0.5 + batteryFactor * 0.5);
        const flicker = state.flashlightBattery < 15 ? Math.random() * 0.3 : 0;
        const flGrad = lctx.createRadialGradient(px, py, 0, px, py, flRange);
        flGrad.addColorStop(0, `rgba(255,255,255,${(0.95 - flicker) * batteryFactor})`);
        flGrad.addColorStop(0.7, `rgba(255,255,255,${0.4 * batteryFactor})`);
        flGrad.addColorStop(1, "rgba(255,255,255,0)");
        lctx.fillStyle = flGrad;
        lctx.beginPath();
        lctx.moveTo(px, py);
        lctx.arc(px, py, flRange, pa - FLASHLIGHT_ANGLE, pa + FLASHLIGHT_ANGLE);
        lctx.closePath();
        lctx.fill();
      }

      // Tiny ambient glow (always — you can barely see your feet)
      const ambGrad = lctx.createRadialGradient(px, py, 0, px, py, 20);
      ambGrad.addColorStop(0, "rgba(255,255,255,0.25)");
      ambGrad.addColorStop(1, "rgba(255,255,255,0)");
      lctx.fillStyle = ambGrad;
      lctx.beginPath();
      lctx.arc(px, py, 20, 0, Math.PI * 2);
      lctx.fill();

      // Fire lights
      for (const fire of state.fires) {
        if (fire.fuel <= 0) continue;
        const ffx = fire.x + ox;
        const ffy = fire.y + oy;
        const fi = fire.fuel / FIRE_MAX;
        const fireR = 35 + fi * 100;
        const fGrad = lctx.createRadialGradient(ffx, ffy, 0, ffx, ffy, fireR);
        fGrad.addColorStop(0, `rgba(255,255,255,${0.8 * fi})`);
        fGrad.addColorStop(0.5, `rgba(255,255,255,${0.3 * fi})`);
        fGrad.addColorStop(1, "rgba(255,255,255,0)");
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

        const haloR = 5 + (1 - dr) * 6;
        const halo = ctx.createRadialGradient(ex, ey, 0, ex, ey, haloR);
        halo.addColorStop(0, `rgba(${er},${eg},${eb},${alpha * 0.2})`);
        halo.addColorStop(1, `rgba(${er},${eg},${eb},0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(ex, ey, haloR, 0, Math.PI * 2);
        ctx.fill();

        const sz = 1.5 + (1 - dr) * 1.5;
        ctx.fillStyle = `rgba(${er},${eg},${eb},${alpha})`;
        ctx.beginPath();
        ctx.ellipse(ex - 3, ey, sz, sz * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(ex + 3, ey, sz, sz * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
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
      style={{ background: "#03030a" }}
    />
  );
}
