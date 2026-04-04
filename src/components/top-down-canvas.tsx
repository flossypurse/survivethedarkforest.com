"use client";

import { useRef, useEffect } from "react";
import type { ExplorationState } from "@/lib/exploration-state";
import { type WorldMap, getTile, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from "@/lib/world-gen";
import { FLASHLIGHT_RANGE, FLASHLIGHT_ANGLE } from "@/lib/exploration-engine";
import { FIRE_MAX } from "@/lib/constants";

// ── Colors ──
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

    // Create offscreen canvas for lighting mask
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

      // ── Camera follow (lerp) ──
      const cam = cameraRef.current;
      cam.x += (state.playerX - cam.x) * 0.12;
      cam.y += (state.playerY - cam.y) * 0.12;

      const offsetX = w / 2 - cam.x;
      const offsetY = h / 2 - cam.y;

      // ── Clear ──
      ctx.fillStyle = "#03030a";
      ctx.fillRect(0, 0, w, h);

      // ── Visible tile range ──
      const tileStartX = Math.max(0, Math.floor((cam.x - w / 2) / TILE_SIZE) - 1);
      const tileStartY = Math.max(0, Math.floor((cam.y - h / 2) / TILE_SIZE) - 1);
      const tileEndX = Math.min(MAP_WIDTH, Math.ceil((cam.x + w / 2) / TILE_SIZE) + 1);
      const tileEndY = Math.min(MAP_HEIGHT, Math.ceil((cam.y + h / 2) / TILE_SIZE) + 1);

      // ── Draw tiles ──
      for (let ty = tileStartY; ty < tileEndY; ty++) {
        for (let tx = tileStartX; tx < tileEndX; tx++) {
          const tile = getTile(world, tx, ty);
          const sx = tx * TILE_SIZE + offsetX;
          const sy = ty * TILE_SIZE + offsetY;

          if (tile === "ground") {
            ctx.fillStyle = GROUND_COLORS[(tx * 7 + ty * 13) & 3];
            ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
          } else if (tile === "tree") {
            ctx.fillStyle = GROUND_COLORS[0];
            ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
            // Tree trunk
            ctx.fillStyle = "#0e0e16";
            ctx.fillRect(sx + 13, sy + 18, 6, 14);
            // Canopy
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

      // ── Resource nodes (small glow markers) ──
      for (const node of state.resourceNodes) {
        if (node.depletedUntilTick > state.tick) continue;
        const nx = node.x + offsetX;
        const ny = node.y + offsetY;
        if (nx < -20 || nx > w + 20 || ny < -20 || ny > h + 20) continue;

        const colors = { wood: "#4a3a20", food: "#2a3a20", materials: "#2a2a3a" };
        ctx.fillStyle = colors[node.type];
        ctx.beginPath();
        ctx.arc(nx, ny, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Campfire ──
      const fireScreenX = state.fireX + offsetX;
      const fireScreenY = state.fireY + offsetY;
      const fireIntensity = state.fire / FIRE_MAX;

      if (fireIntensity > 0) {
        // Glow
        const glowR = 30 + fireIntensity * 80;
        const glow = ctx.createRadialGradient(fireScreenX, fireScreenY, 0, fireScreenX, fireScreenY, glowR);
        glow.addColorStop(0, `rgba(255, 140, 50, ${0.15 * fireIntensity})`);
        glow.addColorStop(0.5, `rgba(255, 80, 20, ${0.06 * fireIntensity})`);
        glow.addColorStop(1, "rgba(255, 50, 10, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(fireScreenX - glowR, fireScreenY - glowR, glowR * 2, glowR * 2);

        // Core
        const pulse = Math.sin(time * 0.08) * 2;
        const r = 4 + fireIntensity * 6 + pulse;
        ctx.fillStyle = `rgba(255, 200, 100, ${0.8 * fireIntensity})`;
        ctx.beginPath();
        ctx.arc(fireScreenX, fireScreenY, r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Dead fire marker
        ctx.fillStyle = "#1a1510";
        ctx.beginPath();
        ctx.arc(fireScreenX, fireScreenY, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Player ──
      const px = state.playerX + offsetX;
      const py = state.playerY + offsetY;
      const pa = state.playerAngle;

      // Body
      ctx.fillStyle = "#8a9080";
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();

      // Direction indicator
      ctx.fillStyle = "#b0b8a0";
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(pa) * 10, py + Math.sin(pa) * 10);
      ctx.lineTo(px + Math.cos(pa + 2.4) * 5, py + Math.sin(pa + 2.4) * 5);
      ctx.lineTo(px + Math.cos(pa - 2.4) * 5, py + Math.sin(pa - 2.4) * 5);
      ctx.closePath();
      ctx.fill();

      // ── Darkness mask with flashlight + fire cutouts ──
      const dpr = window.devicePixelRatio || 1;
      const lctx = lightCanvas.getContext("2d")!;
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lctx.fillStyle = "rgba(0, 0, 0, 0.94)";
      lctx.fillRect(0, 0, w, h);
      lctx.globalCompositeOperation = "destination-out";

      // Flashlight cone
      const flGrad = lctx.createRadialGradient(px, py, 0, px, py, FLASHLIGHT_RANGE);
      flGrad.addColorStop(0, "rgba(255,255,255,0.95)");
      flGrad.addColorStop(0.7, "rgba(255,255,255,0.4)");
      flGrad.addColorStop(1, "rgba(255,255,255,0)");
      lctx.fillStyle = flGrad;
      lctx.beginPath();
      lctx.moveTo(px, py);
      lctx.arc(px, py, FLASHLIGHT_RANGE, pa - FLASHLIGHT_ANGLE, pa + FLASHLIGHT_ANGLE);
      lctx.closePath();
      lctx.fill();

      // Small ambient glow around player (can see immediately around you)
      const ambGrad = lctx.createRadialGradient(px, py, 0, px, py, 35);
      ambGrad.addColorStop(0, "rgba(255,255,255,0.5)");
      ambGrad.addColorStop(1, "rgba(255,255,255,0)");
      lctx.fillStyle = ambGrad;
      lctx.beginPath();
      lctx.arc(px, py, 35, 0, Math.PI * 2);
      lctx.fill();

      // Fire light
      if (fireIntensity > 0) {
        const fireR = 40 + fireIntensity * 120;
        const fireGrad = lctx.createRadialGradient(fireScreenX, fireScreenY, 0, fireScreenX, fireScreenY, fireR);
        fireGrad.addColorStop(0, `rgba(255,255,255,${0.8 * fireIntensity})`);
        fireGrad.addColorStop(0.5, `rgba(255,255,255,${0.3 * fireIntensity})`);
        fireGrad.addColorStop(1, "rgba(255,255,255,0)");
        lctx.fillStyle = fireGrad;
        lctx.beginPath();
        lctx.arc(fireScreenX, fireScreenY, fireR, 0, Math.PI * 2);
        lctx.fill();
      }

      lctx.globalCompositeOperation = "source-over";

      // Apply darkness
      ctx.drawImage(lightCanvas, 0, 0, w, h);

      // ── Creature eyes ON TOP of darkness (they glow through) ──
      const activeIds = new Set<number>();
      for (const c of state.creatures) {
        activeIds.add(c.id);
        const cx = c.x + offsetX;
        const cy = c.y + offsetY;
        if (cx < -30 || cx > w + 30 || cy < -30 || cy > h + 30) continue;

        // Lerp eye positions
        const prev = eyePositionsRef.current.get(c.id);
        const lerpSpeed = 0.1;
        const ex = prev ? prev.x + (cx - prev.x) * lerpSpeed : cx;
        const ey = prev ? prev.y + (cy - prev.y) * lerpSpeed : cy;
        eyePositionsRef.current.set(c.id, { x: ex, y: ey });

        const d = Math.sqrt((c.x - state.playerX) ** 2 + (c.y - state.playerY) ** 2);
        const distRatio = Math.min(1, d / 500);

        // Blink
        if (Math.sin(time * 0.025 + c.id * 7.3) > 0.92) continue;

        const alpha = 0.3 + (1 - distRatio) * 0.6;
        if (alpha < 0.05) continue;

        const eyeColors: Record<string, [number, number, number]> = {
          timid: [160, 200, 100],
          predator: [240, 130, 30],
          stalker: [180, 100, 220],
        };
        const [er, eg, eb] = eyeColors[c.type] || [200, 180, 50];

        // Glow halo
        const haloR = 5 + (1 - distRatio) * 6;
        const halo = ctx.createRadialGradient(ex, ey, 0, ex, ey, haloR);
        halo.addColorStop(0, `rgba(${er},${eg},${eb},${alpha * 0.2})`);
        halo.addColorStop(1, `rgba(${er},${eg},${eb},0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(ex, ey, haloR, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        const sz = 1.5 + (1 - distRatio) * 1.5;
        const gap = 3;
        ctx.fillStyle = `rgba(${er},${eg},${eb},${alpha})`;
        ctx.beginPath();
        ctx.ellipse(ex - gap, ey, sz, sz * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(ex + gap, ey, sz, sz * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const id of eyePositionsRef.current.keys()) {
        if (!activeIds.has(id)) eyePositionsRef.current.delete(id);
      }

      // ── Noise ripple ──
      // (simple ring expanding from player when noise is high)
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
