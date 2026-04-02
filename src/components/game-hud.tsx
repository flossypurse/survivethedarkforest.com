"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import type { GameState, LogEntry } from "@/lib/game-state";
import {
  FIRE_MAX,
  MAX_HEALTH,
  MAX_HUNGER,
  NOISE_MAX,
  TRAP_MATERIAL_COST,
  SHELTER_MATERIAL_COST,
  DAYS_TO_SURVIVE,
} from "@/lib/constants";

// ── Palette — campfire-lit, muted, earthy ──

const C = {
  fire: "#d4915c",
  fireDim: "#7a4a2a",
  health: "#b35454",
  healthDim: "#5c1f1f",
  hunger: "#8aab6e",
  hungerDim: "#3d4f2a",
  noise: "#c9a0d4",
  noiseDim: "#5c3d66",
  wood: "#b89b6a",
  food: "#c47d5a",
  materials: "#8a9bae",
  defense: "#9b8579",
  forage: "#7a9e6d",
  day: "#c9a96e",
  night: "#7b7fad",
  muted: "#6b7280",
  dim: "#3f444d",
  text: "#c9c0a8",
};

interface Props {
  state: GameState;
  onAddWood: () => void;
  onForage: () => void;
  onEat: () => void;
  onBuildTrap: () => void;
  onBuildShelter: () => void;
  onRestart: () => void;
}

// ── Toast system ──

interface Toast {
  id: string;
  entry: LogEntry;
  exiting: boolean;
}

function useToasts(log: LogEntry[]) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevLenRef = useRef(log.length);

  useEffect(() => {
    const prevLen = prevLenRef.current;
    if (log.length > prevLen) {
      const newEntries = log.slice(prevLen);
      const newToasts: Toast[] = newEntries.map((entry, i) => ({
        id: `${entry.tick}-${prevLen + i}-${Date.now()}`,
        entry,
        exiting: false,
      }));
      setToasts((prev) => [...prev, ...newToasts].slice(-3));
      newToasts.forEach((toast) => {
        setTimeout(() => {
          setToasts((prev) =>
            prev.map((t) => (t.id === toast.id ? { ...t, exiting: true } : t))
          );
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== toast.id));
          }, 300);
        }, 4000);
      });
    }
    prevLenRef.current = log.length;
  }, [log]);

  return toasts;
}

// ── Main HUD ──

export default function GameHUD({
  state,
  onAddWood,
  onForage,
  onEat,
  onBuildTrap,
  onBuildShelter,
  onRestart,
}: Props) {
  const isPlaying = state.status === "playing";
  const forageCooldown = Math.max(0, state.forageCooldownUntil - state.tick);
  const isNight = state.phase === "night";
  const toasts = useToasts(state.log);

  const healthPct = state.health / MAX_HEALTH;
  const firePct = state.fire / FIRE_MAX;
  const fullPct = (MAX_HUNGER - state.hunger) / MAX_HUNGER;
  const noisePct = state.noise / NOISE_MAX;

  return (
    <div className="absolute inset-0 flex flex-col pointer-events-none">

      {/* ════════ TOP: compact status strip ════════ */}
      <div
        className="pointer-events-auto px-3 py-2 md:px-5 md:py-3"
        style={{
          background: "linear-gradient(to bottom, rgba(5,5,10,0.9) 0%, rgba(5,5,10,0.5) 80%, transparent 100%)",
        }}
      >
        {/* Phase + Day + Creatures */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded"
              style={{
                color: isNight ? C.night : C.day,
                border: `1px solid ${(isNight ? C.night : C.day) + "33"}`,
                background: `${(isNight ? C.night : C.day)}11`,
              }}
            >
              {isNight ? "NIGHT" : "DAY"}
            </span>
            <span className="text-xs" style={{ color: C.muted }}>
              Day {state.day} / {DAYS_TO_SURVIVE}
            </span>
          </div>
          {state.creatures.length > 0 && (
            <span className="text-xs font-medium" style={{ color: C.health }}>
              {state.creatures.length} nearby
            </span>
          )}
        </div>

        {/* Vital bars — 2x2 grid on mobile, row on desktop */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 md:flex md:gap-4">
          <MiniBar label="HP" pct={healthPct} color={C.health} dimColor={C.healthDim} value={Math.round(state.health)} />
          <MiniBar label="FIRE" pct={firePct} color={C.fire} dimColor={C.fireDim} value={Math.round(state.fire)} />
          <MiniBar label="FULL" pct={fullPct} color={C.hunger} dimColor={C.hungerDim} value={Math.round(MAX_HUNGER - state.hunger)} />
          <MiniBar label="NOISE" pct={noisePct} color={C.noise} dimColor={C.noiseDim} value={Math.round(state.noise)} invert />
        </div>
      </div>

      {/* ════════ MIDDLE: canvas breathes + toast log ════════ */}
      <div className="flex-1" />

      <div className="px-3 pb-1 md:px-5 flex flex-col gap-1 items-start pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-enter ${toast.exiting ? "toast-exit" : ""}`}
            style={{
              padding: "5px 10px",
              borderRadius: "6px",
              fontSize: "0.75rem",
              lineHeight: "1.3",
              maxWidth: "min(88vw, 380px)",
              background: "rgba(5,5,10,0.8)",
              border: `1px solid ${
                toast.entry.type === "danger" ? "rgba(179,84,84,0.3)"
                : toast.entry.type === "success" ? "rgba(122,158,109,0.3)"
                : toast.entry.type === "discovery" ? "rgba(138,155,174,0.3)"
                : "rgba(107,114,128,0.15)"
              }`,
              color:
                toast.entry.type === "danger" ? "#d49a9a"
                : toast.entry.type === "success" ? "#a3c290"
                : toast.entry.type === "discovery" ? "#adbdcc"
                : "#8b8fa3",
            }}
          >
            {toast.entry.message}
          </div>
        ))}
      </div>

      {/* ════════ BOTTOM: actions ════════ */}
      <div
        className="pointer-events-auto"
        style={{
          background: "linear-gradient(to top, rgba(5,5,10,0.92) 0%, rgba(5,5,10,0.6) 80%, transparent 100%)",
        }}
      >
        {isPlaying ? (
          <div className="px-3 pt-2 pb-4 md:px-5 md:pt-3 md:pb-5">
            {/* Inventory line — what you HAVE */}
            <div className="flex items-center gap-3 mb-2 px-1">
              <InvItem icon="W" value={state.wood} color={C.wood} />
              <InvItem icon="F" value={state.food} color={C.food} />
              <InvItem icon="M" value={state.materials} color={C.materials} />
              {state.traps > 0 && <InvItem icon="T" value={state.traps} color={C.defense} />}
              {state.hasShelter && (
                <span className="text-xs" style={{ color: C.defense }}>SHELTER</span>
              )}
            </div>

            {/* Action buttons — each shows cost + what it does */}
            <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-2">
              <ActionBtn
                onClick={onAddWood}
                disabled={state.wood <= 0}
                color={C.fire}
                urgent={firePct < 0.3 && state.wood > 0}
              >
                <span className="font-semibold">Stoke Fire</span>
                <span className="action-cost">-1 wood</span>
              </ActionBtn>

              <ActionBtn
                onClick={onForage}
                disabled={isNight || forageCooldown > 0}
                color={C.forage}
              >
                <span className="font-semibold">
                  {forageCooldown > 0 ? `Forage (${forageCooldown}s)` : "Forage"}
                </span>
                <span className="action-cost">
                  {isNight ? "night" : "find stuff"}
                </span>
              </ActionBtn>

              <ActionBtn
                onClick={onEat}
                disabled={state.food <= 0 || state.hunger <= 0}
                color={C.food}
                urgent={fullPct < 0.3 && state.food > 0}
              >
                <span className="font-semibold">Eat</span>
                <span className="action-cost">-1 food</span>
              </ActionBtn>

              <ActionBtn
                onClick={onBuildTrap}
                disabled={state.materials < TRAP_MATERIAL_COST}
                color={C.defense}
              >
                <span className="font-semibold">Trap</span>
                <span className="action-cost">-{TRAP_MATERIAL_COST} mat</span>
              </ActionBtn>

              {!state.hasShelter && (
                <ActionBtn
                  onClick={onBuildShelter}
                  disabled={state.materials < SHELTER_MATERIAL_COST}
                  color={C.defense}
                >
                  <span className="font-semibold">Shelter</span>
                  <span className="action-cost">-{SHELTER_MATERIAL_COST} mat</span>
                </ActionBtn>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 py-6">
            <div
              className="text-lg md:text-xl font-bold"
              style={{
                color: state.status === "won" ? C.hunger : C.health,
                textShadow: `0 0 20px ${state.status === "won" ? "rgba(122,158,109,0.4)" : "rgba(179,84,84,0.4)"}`,
              }}
            >
              {state.status === "won"
                ? "You survived the dark forest."
                : "You perished in the dark forest."}
            </div>
            <div className="text-sm" style={{ color: C.muted }}>
              Survived {state.day - 1} day{state.day - 1 !== 1 ? "s" : ""}
            </div>
            <button
              onClick={onRestart}
              className="px-6 py-3 rounded-lg text-sm font-medium cursor-pointer"
              style={{
                background: "rgba(20,20,15,0.8)",
                color: C.text,
                border: "1px solid rgba(180,160,120,0.25)",
                minHeight: "44px",
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──

/** Compact vital bar with label */
function MiniBar({
  label,
  pct,
  color,
  dimColor,
  value,
  invert,
}: {
  label: string;
  pct: number;
  color: string;
  dimColor: string;
  value: number;
  invert?: boolean;
}) {
  const clamped = Math.max(0, Math.min(1, pct));
  const isWarn = invert ? clamped > 0.6 : clamped < 0.3;
  const c = isWarn ? dimColor : color;

  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <span
        className="text-[10px] font-bold tracking-wider"
        style={{ color: c, minWidth: "2.2rem" }}
      >
        {label}
      </span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(20,20,15,0.7)" }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${clamped * 100}%`,
            background: c,
            boxShadow: isWarn ? `0 0 6px ${c}` : "none",
          }}
        />
      </div>
      <span
        className="text-[10px] font-medium tabular-nums"
        style={{ color: c, minWidth: "1.2rem", textAlign: "right" }}
      >
        {value}
      </span>
    </div>
  );
}

/** Inventory readout */
function InvItem({ icon, value, color }: { icon: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-0.5" style={{ color }}>
      <span className="text-[10px] font-bold opacity-60">{icon}</span>
      <span className="text-xs font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/** Action button — shows label + cost clearly */
function ActionBtn({
  onClick,
  disabled,
  color,
  urgent,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  color: string;
  urgent?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center justify-center
        px-3 py-2.5 rounded-lg w-full
        text-xs transition-all cursor-pointer
        disabled:cursor-not-allowed
        md:px-4 md:py-3 md:w-auto md:min-w-[100px]
        ${urgent ? "action-btn-urgent" : ""}
      `}
      style={{
        background: disabled ? "rgba(10,10,8,0.5)" : "rgba(20,20,15,0.7)",
        color: disabled ? C.dim : color,
        border: `1px solid ${disabled ? "rgba(40,40,30,0.3)" : color + "30"}`,
        opacity: disabled ? 0.45 : 1,
        minHeight: "44px",
        boxShadow: urgent ? `0 0 12px ${color}33` : "none",
        gap: "2px",
      }}
    >
      {children}
    </button>
  );
}
