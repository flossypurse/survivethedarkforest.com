"use client";

import { useRef, useEffect, useCallback } from "react";
import type { GameState } from "@/lib/game-state";

// ── Particle types ──

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number; // 15–45 (red-orange-yellow)
}

interface FogParticle {
  x: number;
  y: number;
  vx: number;
  size: number;
  opacity: number;
}

interface Star {
  x: number;
  y: number;
  brightness: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

interface EyePair {
  x: number;
  y: number;
  blinkTimer: number;
  visible: boolean;
  dx: number; // drift speed
}

interface SoundRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
}

// ── Color palette ──
const BG = "#08080f";
const TREE_COLOR = "#0d0d1a";
const TREE_HIGHLIGHT = "#141428";

export default function GameCanvas({ state }: { state: GameState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const embersRef = useRef<Ember[]>([]);
  const fogRef = useRef<FogParticle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const eyesRef = useRef<EyePair[]>([]);
  const ripplesRef = useRef<SoundRipple[]>([]);
  const prevNoiseRef = useRef(0);
  const initedRef = useRef(false);

  // Initialize particles once
  const initParticles = useCallback((w: number, h: number) => {
    if (initedRef.current) return;
    initedRef.current = true;

    // Stars
    starsRef.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h * 0.4,
      brightness: 0.3 + Math.random() * 0.7,
      twinkleSpeed: 0.5 + Math.random() * 2,
      twinkleOffset: Math.random() * Math.PI * 2,
    }));

    // Fog
    fogRef.current = Array.from({ length: 20 }, () => ({
      x: Math.random() * w,
      y: h * 0.5 + Math.random() * h * 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      size: 40 + Math.random() * 80,
      opacity: 0.02 + Math.random() * 0.04,
    }));
  }, []);

  // Spawn ember
  const spawnEmber = useCallback((cx: number, cy: number, fireLevel: number) => {
    if (embersRef.current.length > 40) return;
    const intensity = fireLevel / 100;
    if (Math.random() > intensity * 0.6) return;

    embersRef.current.push({
      x: cx + (Math.random() - 0.5) * 20 * intensity,
      y: cy,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -(1 + Math.random() * 2) * intensity,
      life: 1,
      maxLife: 40 + Math.random() * 60,
      size: 1 + Math.random() * 2.5,
      hue: 15 + Math.random() * 30,
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      initedRef.current = false; // reinit particles on resize
    };

    resize();
    window.addEventListener("resize", resize);

    let time = 0;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      initParticles(w, h);

      time += 1;
      const fireLevel = state.fire;
      const isNight = state.phase === "night";
      const intensity = fireLevel / 100;

      // Fire position
      const fireCx = w / 2;
      const fireCy = h * 0.68;

      // ── Background ──
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, w, h);

      // ── Stars (fade with fire brightness, stronger at night) ──
      const starVisibility = isNight ? 1 - intensity * 0.3 : 0.2 - intensity * 0.15;
      if (starVisibility > 0) {
        for (const star of starsRef.current) {
          const twinkle =
            Math.sin(time * 0.02 * star.twinkleSpeed + star.twinkleOffset) *
              0.3 +
            0.7;
          const alpha = star.brightness * twinkle * starVisibility;
          ctx.beginPath();
          ctx.arc(star.x, star.y, 1, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 220, 255, ${alpha})`;
          ctx.fill();
        }
      }

      // ── Tree silhouettes (background layer) ──
      drawTrees(ctx, w, h, time, isNight);

      // ── Fog particles ──
      for (const fog of fogRef.current) {
        fog.x += fog.vx;
        if (fog.x < -fog.size) fog.x = w + fog.size;
        if (fog.x > w + fog.size) fog.x = -fog.size;

        const fogAlpha = fog.opacity * (isNight ? 1.5 : 0.8);
        ctx.beginPath();
        ctx.arc(fog.x, fog.y, fog.size, 0, Math.PI * 2);
        const fogGrad = ctx.createRadialGradient(
          fog.x, fog.y, 0,
          fog.x, fog.y, fog.size
        );
        fogGrad.addColorStop(0, `rgba(180, 190, 210, ${fogAlpha})`);
        fogGrad.addColorStop(1, "rgba(180, 190, 210, 0)");
        ctx.fillStyle = fogGrad;
        ctx.fill();
      }

      // ── Fire glow (ambient light on ground) ──
      const glowRadius = (80 + intensity * 150) * (1 + Math.sin(time * 0.05) * 0.05);
      const groundGlow = ctx.createRadialGradient(
        fireCx, fireCy + 10, 0,
        fireCx, fireCy + 10, glowRadius * 1.5
      );
      groundGlow.addColorStop(0, `rgba(255, 140, 50, ${0.08 * intensity})`);
      groundGlow.addColorStop(0.5, `rgba(255, 80, 20, ${0.03 * intensity})`);
      groundGlow.addColorStop(1, "rgba(255, 60, 10, 0)");
      ctx.fillStyle = groundGlow;
      ctx.fillRect(0, 0, w, h);

      // ── Fire core ──
      const fireRadius = 8 + intensity * 18;
      const pulse = Math.sin(time * 0.08) * 3 + Math.sin(time * 0.13) * 2;
      const r = fireRadius + pulse;

      // Outer glow
      const outerGlow = ctx.createRadialGradient(
        fireCx, fireCy, r * 0.5,
        fireCx, fireCy, r * 4
      );
      outerGlow.addColorStop(0, `rgba(255, 120, 30, ${0.15 * intensity})`);
      outerGlow.addColorStop(0.4, `rgba(255, 60, 10, ${0.05 * intensity})`);
      outerGlow.addColorStop(1, "rgba(255, 40, 0, 0)");
      ctx.beginPath();
      ctx.arc(fireCx, fireCy, r * 4, 0, Math.PI * 2);
      ctx.fillStyle = outerGlow;
      ctx.fill();

      // Inner core
      const coreGrad = ctx.createRadialGradient(
        fireCx, fireCy - 2, 0,
        fireCx, fireCy, r
      );
      coreGrad.addColorStop(0, `rgba(255, 240, 200, ${0.9 * intensity})`);
      coreGrad.addColorStop(0.3, `rgba(255, 180, 60, ${0.7 * intensity})`);
      coreGrad.addColorStop(0.7, `rgba(255, 100, 20, ${0.4 * intensity})`);
      coreGrad.addColorStop(1, "rgba(255, 50, 5, 0)");
      ctx.beginPath();
      ctx.arc(fireCx, fireCy, r, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // ── Embers ──
      spawnEmber(fireCx, fireCy, fireLevel);

      embersRef.current = embersRef.current.filter((e) => {
        e.x += e.vx + Math.sin(time * 0.1 + e.y * 0.01) * 0.3;
        e.y += e.vy;
        e.vy *= 0.99;
        e.life += 1;

        const lifeRatio = 1 - e.life / e.maxLife;
        if (lifeRatio <= 0) return false;

        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * lifeRatio, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${e.hue}, 100%, ${50 + lifeRatio * 30}%, ${lifeRatio * 0.8})`;
        ctx.fill();

        return true;
      });

      // ── Creature eyes (positioned from actual game state) ──
      for (const creature of state.creatures) {
        // Map creature world coords to screen coords
        // Creatures are at distance ~8-130 from origin; map to screen space around fire
        const dist = Math.sqrt(creature.x * creature.x + creature.y * creature.y);
        if (dist < 10) continue; // too close, about to attack

        // Normalize creature position to angle, map to screen edge area
        const angle = Math.atan2(creature.y, creature.x);
        const distRatio = Math.min(1, dist / 100); // 0 = at camp, 1 = far away

        // Screen position: closer creatures are nearer to fire, far ones at edges
        const screenDist = glowRadius * 0.6 + distRatio * (Math.min(w, h) * 0.35);
        const eyeX = fireCx + Math.cos(angle) * screenDist;
        const eyeY = fireCy + Math.sin(angle) * screenDist * 0.6; // compress vertically

        // Only show if on screen and outside fire glow
        if (eyeX < -20 || eyeX > w + 20 || eyeY < 0 || eyeY > h) continue;

        // Blink using creature id as seed
        const blinkCycle = Math.sin(time * 0.02 + creature.id * 7.3);
        if (blinkCycle > 0.9) continue; // blink

        // Alpha based on distance — closer = brighter
        const alpha = (0.15 + (1 - distRatio) * 0.5) * (isNight ? 1 : 0.3);
        if (alpha < 0.05) continue;

        // Eye color by type
        const eyeColors: Record<string, string> = {
          timid: `rgba(180, 200, 140, ${alpha})`,
          predator: `rgba(220, 140, 40, ${alpha})`,
          stalker: `rgba(160, 120, 200, ${alpha})`,
        };
        ctx.fillStyle = eyeColors[creature.type] || `rgba(200, 180, 50, ${alpha})`;

        const eyeSize = 1.2 + (1 - distRatio) * 1.2;
        ctx.beginPath();
        ctx.ellipse(eyeX - 3.5, eyeY, eyeSize, eyeSize * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(eyeX + 3.5, eyeY, eyeSize, eyeSize * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Sound ripples (when noise spikes) ──
      if (state.noise > prevNoiseRef.current + 5) {
        const rippleSize = 30 + (state.noise / 100) * 80;
        ripplesRef.current.push({
          x: fireCx,
          y: fireCy,
          radius: 10,
          maxRadius: rippleSize,
          life: 1,
        });
      }
      prevNoiseRef.current = state.noise;

      ripplesRef.current = ripplesRef.current.filter((r) => {
        r.radius += 1.5;
        r.life -= 0.025;
        if (r.life <= 0) return false;

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(201, 160, 212, ${r.life * 0.25})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        return true;
      });

      // ── Vignette ──
      const vignette = ctx.createRadialGradient(
        w / 2, h / 2, Math.min(w, h) * 0.2,
        w / 2, h / 2, Math.max(w, h) * 0.7
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, `rgba(0,0,0,${isNight ? 0.6 : 0.3})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, [state.fire, state.phase, state.day, state.noise, state.creatures, initParticles, spawnEmber]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: BG }}
    />
  );
}

// ── Tree drawing ──

function drawTrees(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  isNight: boolean
) {
  const treeline = h * 0.35;
  const treeCount = Math.ceil(w / 30);

  ctx.save();

  for (let i = 0; i < treeCount; i++) {
    const x = (i / treeCount) * w + Math.sin(i * 1.5) * 15;
    const treeH = 60 + Math.sin(i * 2.3) * 30 + Math.cos(i * 0.7) * 20;
    const treeW = 12 + Math.sin(i * 3.1) * 6;
    const sway = Math.sin(time * 0.01 + i * 0.5) * 1.5;

    const baseY = treeline + Math.sin(i * 1.1) * 15;

    // Tree trunk + canopy as a simple triangle
    ctx.beginPath();
    ctx.moveTo(x + sway, baseY - treeH);
    ctx.lineTo(x - treeW + sway * 0.5, baseY);
    ctx.lineTo(x + treeW + sway * 0.5, baseY);
    ctx.closePath();

    ctx.fillStyle = isNight ? TREE_COLOR : TREE_HIGHLIGHT;
    ctx.fill();
  }

  // Ground plane
  ctx.fillStyle = isNight ? "#060610" : "#0a0a18";
  ctx.fillRect(0, treeline + 15, w, h - treeline);

  // Ground gradient to blend
  const groundGrad = ctx.createLinearGradient(0, treeline - 10, 0, treeline + 40);
  groundGrad.addColorStop(0, "rgba(8,8,15,0)");
  groundGrad.addColorStop(1, isNight ? "#060610" : "#0a0a18");
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, treeline - 10, w, 50);

  ctx.restore();
}
