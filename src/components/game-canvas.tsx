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
  hue: number;
}

interface FogParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

interface Cloud {
  x: number;
  y: number;
  vx: number;
  width: number;
  height: number;
  opacity: number;
}

interface SoundRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
}

// ── Color palette ──
const BG = "#05050a";

export default function GameCanvas({ state }: { state: GameState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const embersRef = useRef<Ember[]>([]);
  const fogRef = useRef<FogParticle[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  const ripplesRef = useRef<SoundRipple[]>([]);
  const prevNoiseRef = useRef(0);
  const initedRef = useRef(false);

  const initParticles = useCallback((w: number, h: number) => {
    if (initedRef.current) return;
    initedRef.current = true;

    // Dark clouds — slow, massive, oppressive
    cloudsRef.current = Array.from({ length: 12 }, (_, i) => ({
      x: Math.random() * w * 1.5 - w * 0.25,
      y: Math.random() * h * 0.3,
      vx: (0.05 + Math.random() * 0.12) * (i % 2 === 0 ? 1 : -1),
      width: 120 + Math.random() * 250,
      height: 30 + Math.random() * 50,
      opacity: 0.04 + Math.random() * 0.06,
    }));

    // Ground fog — low-lying, creepy
    fogRef.current = Array.from({ length: 25 }, () => ({
      x: Math.random() * w,
      y: h * 0.55 + Math.random() * h * 0.35,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.05,
      size: 50 + Math.random() * 100,
      opacity: 0.02 + Math.random() * 0.04,
    }));
  }, []);

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
      initedRef.current = false;
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

      const intensity = fireLevel / 100;

      const fireCx = w / 2;
      const fireCy = h * 0.68;

      // ── Background — pitch dark ──
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, w, h);

      // ── Dark clouds ──
      for (const cloud of cloudsRef.current) {
        cloud.x += cloud.vx;
        if (cloud.x > w + cloud.width) cloud.x = -cloud.width;
        if (cloud.x < -cloud.width) cloud.x = w + cloud.width;

        const alpha = cloud.opacity * 1.2;
        const grad = ctx.createRadialGradient(
          cloud.x + cloud.width / 2, cloud.y + cloud.height / 2, 0,
          cloud.x + cloud.width / 2, cloud.y + cloud.height / 2, cloud.width / 2
        );
        grad.addColorStop(0, `rgba(15, 15, 25, ${alpha})`);
        grad.addColorStop(0.5, `rgba(12, 12, 20, ${alpha * 0.6})`);
        grad.addColorStop(1, "rgba(10, 10, 18, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(
          cloud.x, cloud.y,
          cloud.width, cloud.height * 2
        );
      }

      // ── Tree silhouettes — 3 layers for depth ──
      drawTreeLayer(ctx, w, h, time, 0.18, 0.7, "#060610", 0.3);
      drawTreeLayer(ctx, w, h, time, 0.28, 0.85, "#080814", 0.6);
      drawTreeLayer(ctx, w, h, time, 0.35, 1.0, "#0a0a18", 1.0);

      // ── Ground plane ──
      const groundY = h * 0.38;
      ctx.fillStyle = "#050510";
      ctx.fillRect(0, groundY, w, h - groundY);
      const groundGrad = ctx.createLinearGradient(0, groundY - 15, 0, groundY + 30);
      groundGrad.addColorStop(0, "rgba(5,5,10,0)");
      groundGrad.addColorStop(1, "#050510");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, groundY - 15, w, 45);

      // ── Ground fog ──
      for (const fog of fogRef.current) {
        fog.x += fog.vx;
        fog.y += fog.vy;
        if (fog.x < -fog.size) fog.x = w + fog.size;
        if (fog.x > w + fog.size) fog.x = -fog.size;
        if (fog.y < h * 0.5) fog.vy = Math.abs(fog.vy);
        if (fog.y > h * 0.9) fog.vy = -Math.abs(fog.vy);

        const fogAlpha = fog.opacity * 1.8;
        const fogGrad = ctx.createRadialGradient(
          fog.x, fog.y, 0,
          fog.x, fog.y, fog.size
        );
        fogGrad.addColorStop(0, `rgba(120, 130, 150, ${fogAlpha})`);
        fogGrad.addColorStop(1, "rgba(120, 130, 150, 0)");
        ctx.beginPath();
        ctx.arc(fog.x, fog.y, fog.size, 0, Math.PI * 2);
        ctx.fillStyle = fogGrad;
        ctx.fill();
      }

      // ── Fire glow (ambient light on ground) ──
      const glowRadius = (80 + intensity * 150) * (1 + Math.sin(time * 0.05) * 0.05);
      const groundGlow = ctx.createRadialGradient(
        fireCx, fireCy + 10, 0,
        fireCx, fireCy + 10, glowRadius * 1.5
      );
      groundGlow.addColorStop(0, `rgba(255, 140, 50, ${0.1 * intensity})`);
      groundGlow.addColorStop(0.4, `rgba(255, 80, 20, ${0.04 * intensity})`);
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

      // ── Creature eyes — bigger, glowing, with halo ──
      for (const creature of state.creatures) {
        const dist = Math.sqrt(creature.x * creature.x + creature.y * creature.y);
        if (dist < 10) continue;

        const angle = Math.atan2(creature.y, creature.x);
        const distRatio = Math.min(1, dist / 100);

        const screenDist = glowRadius * 0.5 + distRatio * (Math.min(w, h) * 0.38);
        const eyeX = fireCx + Math.cos(angle) * screenDist;
        const eyeY = fireCy + Math.sin(angle) * screenDist * 0.5;

        if (eyeX < -20 || eyeX > w + 20 || eyeY < 0 || eyeY > h) continue;

        // Blink
        const blinkCycle = Math.sin(time * 0.025 + creature.id * 7.3);
        if (blinkCycle > 0.92) continue;

        // Alpha — more visible, especially close
        const baseAlpha = 0.3 + (1 - distRatio) * 0.6;
        const alpha = baseAlpha;
        if (alpha < 0.08) continue;

        // Eye glow halo
        const haloR = 6 + (1 - distRatio) * 8;
        const eyeColors: Record<string, [number, number, number]> = {
          timid: [160, 200, 100],
          predator: [240, 130, 30],
          stalker: [180, 100, 220],
        };
        const [er, eg, eb] = eyeColors[creature.type] || [200, 180, 50];

        // Outer glow
        const haloGrad = ctx.createRadialGradient(eyeX, eyeY, 0, eyeX, eyeY, haloR);
        haloGrad.addColorStop(0, `rgba(${er}, ${eg}, ${eb}, ${alpha * 0.15})`);
        haloGrad.addColorStop(1, `rgba(${er}, ${eg}, ${eb}, 0)`);
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, haloR, 0, Math.PI * 2);
        ctx.fillStyle = haloGrad;
        ctx.fill();

        // Eye pair
        const eyeSize = 1.8 + (1 - distRatio) * 1.8;
        const gap = 3.5 + (1 - distRatio) * 1.5;
        ctx.fillStyle = `rgba(${er}, ${eg}, ${eb}, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(eyeX - gap, eyeY, eyeSize, eyeSize * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(eyeX + gap, eyeY, eyeSize, eyeSize * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bright pupil center
        ctx.fillStyle = `rgba(255, 255, 230, ${alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(eyeX - gap, eyeY, eyeSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eyeX + gap, eyeY, eyeSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Sound ripples ──
      if (state.noise > prevNoiseRef.current + 5) {
        const rippleSize = 40 + (state.noise / 100) * 100;
        ripplesRef.current.push({
          x: fireCx, y: fireCy,
          radius: 10, maxRadius: rippleSize, life: 1,
        });
      }
      prevNoiseRef.current = state.noise;

      ripplesRef.current = ripplesRef.current.filter((rp) => {
        rp.radius += 2;
        rp.life -= 0.02;
        if (rp.life <= 0) return false;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(201, 160, 212, ${rp.life * 0.3})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        return true;
      });

      // ── Vignette — heavy, oppressive ──
      const vignette = ctx.createRadialGradient(
        fireCx, fireCy, Math.min(w, h) * 0.15,
        w / 2, h / 2, Math.max(w, h) * 0.6
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(0.5, "rgba(0,0,0,0.3)");
      vignette.addColorStop(1, "rgba(0,0,0,0.75)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, [state.fire, state.noise, state.creatures, initParticles, spawnEmber]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: BG }}
    />
  );
}

// ── Multi-layer tree drawing ──

function drawTreeLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  yPosition: number, // 0-1 where on screen
  scale: number, // size multiplier
  color: string,
  swayAmount: number,
) {
  const treeline = h * yPosition;
  const treeCount = Math.ceil(w / (20 * scale));

  ctx.save();

  for (let i = 0; i < treeCount; i++) {
    const x = (i / treeCount) * w + Math.sin(i * 1.5 + yPosition * 10) * 15;
    const treeH = (50 + Math.sin(i * 2.3) * 25 + Math.cos(i * 0.7) * 15) * scale;
    const treeW = (10 + Math.sin(i * 3.1) * 4) * scale;
    const sway = Math.sin(time * 0.008 + i * 0.5 + yPosition * 3) * swayAmount * 2;

    const baseY = treeline + Math.sin(i * 1.1) * 10 * scale;

    // Multi-tier canopy for fuller trees
    for (let tier = 0; tier < 3; tier++) {
      const tierY = baseY - treeH * (0.4 + tier * 0.25);
      const tierW = treeW * (1.3 - tier * 0.25);
      ctx.beginPath();
      ctx.moveTo(x + sway * (1 + tier * 0.3), tierY);
      ctx.lineTo(x - tierW + sway * (0.5 + tier * 0.15), baseY - treeH * 0.3 * tier);
      ctx.lineTo(x + tierW + sway * (0.5 + tier * 0.15), baseY - treeH * 0.3 * tier);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    // Trunk
    ctx.fillStyle = color;
    ctx.fillRect(x - 1.5 * scale + sway * 0.3, baseY - treeH * 0.15, 3 * scale, treeH * 0.15);
  }

  ctx.restore();
}
