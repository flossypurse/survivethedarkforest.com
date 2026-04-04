"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import type { GameState, LogEntry } from "@/lib/game-state";
import {
  FIRE_MAX,
  MAX_HEALTH,
  MAX_HUNGER,
  NOISE_MAX,
  HOURS_TO_SURVIVE,
  CLUB_MATERIAL_COST,
  TRAP_MATERIAL_COST,
  SHELTER_MATERIAL_COST,
  RELIGHT_WOOD_COST,
} from "@/lib/constants";

// ── Palette ──

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
  rescue: "#7b9cc4",
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
  onBuildClub: () => void;
  onRelightFire: () => void;
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
  onBuildClub,
  onRelightFire,
  onRestart,
}: Props) {
  const isPlaying = state.status === "playing";
  const forageCooldown = Math.max(0, state.forageCooldownUntil - state.tick);
  const toasts = useToasts(state.log);

  const healthPct = state.health / MAX_HEALTH;
  const firePct = state.fire / FIRE_MAX;
  const fullPct = (MAX_HUNGER - state.hunger) / MAX_HUNGER;
  const noisePct = state.noise / NOISE_MAX;

  const hoursRemaining = Math.max(0, HOURS_TO_SURVIVE - state.hour);

  return (
    <div className="absolute inset-0 flex flex-col pointer-events-none">

      {/* ════════ TOP ════════ */}
      <div
        className="pointer-events-auto"
        style={{
          background: "linear-gradient(to bottom, rgba(5,5,10,0.92) 0%, rgba(5,5,10,0.5) 85%, transparent 100%)",
          padding: "12px 16px 16px",
        }}
      >
        {/* Rescue countdown + creatures */}
        <div className="flex items-center justify-between" style={{ marginBottom: "10px" }}>
          <div className="flex items-center" style={{ gap: "10px" }}>
            <span
              className="font-mono font-bold tabular-nums"
              style={{
                color: hoursRemaining <= 6 ? C.rescue : C.muted,
                fontSize: "0.8rem",
                letterSpacing: "0.05em",
                textShadow: hoursRemaining <= 6 ? `0 0 8px ${C.rescue}44` : "none",
              }}
            >
              RESCUE IN {hoursRemaining}h
            </span>
          </div>
          {state.creatures.length > 0 && (
            <span
              className="font-medium"
              style={{ color: C.health, fontSize: "0.75rem" }}
            >
              {state.creatures.length} nearby
            </span>
          )}
        </div>

        {/* Vital bars — 2x2 grid on mobile, row on desktop */}
        <div
          className="grid grid-cols-2 md:flex"
          style={{ gap: "6px 12px" }}
        >
          <MiniBar label="HP" pct={healthPct} color={C.health} dimColor={C.healthDim} value={Math.round(state.health)} />
          <MiniBar label="FIRE" pct={firePct} color={C.fire} dimColor={C.fireDim} value={Math.round(state.fire)} />
          <MiniBar label="FULL" pct={fullPct} color={C.hunger} dimColor={C.hungerDim} value={Math.round(MAX_HUNGER - state.hunger)} />
          <MiniBar label="NOISE" pct={noisePct} color={C.noise} dimColor={C.noiseDim} value={Math.round(state.noise)} invert />
        </div>
      </div>

      {/* ════════ MIDDLE ════════ */}
      <div className="flex-1" />

      <div style={{ padding: "0 16px 6px" }} className="flex flex-col items-start pointer-events-none" >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-enter ${toast.exiting ? "toast-exit" : ""}`}
            style={{
              padding: "6px 12px",
              marginBottom: "4px",
              borderRadius: "6px",
              fontSize: "0.75rem",
              lineHeight: "1.35",
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

      {/* ════════ BOTTOM ════════ */}
      <div
        className="pointer-events-auto"
        style={{
          background: "linear-gradient(to top, rgba(5,5,10,0.94) 0%, rgba(5,5,10,0.6) 85%, transparent 100%)",
          padding: "10px 16px 20px",
        }}
      >
        {isPlaying ? (
          <>
            {/* Inventory */}
            <div
              className="flex items-center"
              style={{ gap: "12px", marginBottom: "10px", paddingLeft: "4px" }}
            >
              <InvItem label="Wood" value={state.wood} color={C.wood} />
              <InvItem label="Food" value={state.food} color={C.food} />
              <InvItem label="Material" value={state.materials} color={C.materials} />
              {state.hasClub && <InvTag label="CLUB" color={C.defense} />}
              {state.traps > 0 && <InvItem label="Traps" value={state.traps} color={C.defense} />}
              {state.hasShelter && <InvTag label="SHELTER" color={C.defense} />}
            </div>

            {/* Actions */}
            <div
              className="grid grid-cols-2 md:flex md:flex-wrap"
              style={{ gap: "8px" }}
            >
              {/* Relight fire — only shows when fire is out */}
              {state.fire <= 0 ? (
                <ActionBtn
                  onClick={onRelightFire}
                  disabled={state.wood < RELIGHT_WOOD_COST}
                  color={C.fire}
                  urgent={state.wood >= RELIGHT_WOOD_COST}
                >
                  <span className="font-semibold">Relight Fire</span>
                  <span className="action-cost">-{RELIGHT_WOOD_COST} wood</span>
                </ActionBtn>
              ) : (
                <ActionBtn
                  onClick={onAddWood}
                  disabled={state.wood <= 0}
                  color={C.fire}
                  urgent={firePct < 0.3 && state.wood > 0}
                >
                  <span className="font-semibold">Stoke Fire</span>
                  <span className="action-cost">-1 wood</span>
                </ActionBtn>
              )}

              <ActionBtn
                onClick={onForage}
                disabled={forageCooldown > 0 || state.fire <= 0}
                color={C.forage}
              >
                <span className="font-semibold">
                  {forageCooldown > 0 ? `Forage (${forageCooldown}s)` : "Forage"}
                </span>
                <span className="action-cost">{state.fire <= 0 ? "need fire" : "loud — find stuff"}</span>
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

              {!state.hasClub && (
                <ActionBtn
                  onClick={onBuildClub}
                  disabled={state.materials < CLUB_MATERIAL_COST}
                  color={C.defense}
                >
                  <span className="font-semibold">Club</span>
                  <span className="action-cost">-{CLUB_MATERIAL_COST} material</span>
                </ActionBtn>
              )}

              <ActionBtn
                onClick={onBuildTrap}
                disabled={state.materials < TRAP_MATERIAL_COST}
                color={C.defense}
              >
                <span className="font-semibold">Trap</span>
                <span className="action-cost">-{TRAP_MATERIAL_COST} material</span>
              </ActionBtn>

              {!state.hasShelter && (
                <ActionBtn
                  onClick={onBuildShelter}
                  disabled={state.materials < SHELTER_MATERIAL_COST}
                  color={C.defense}
                >
                  <span className="font-semibold">Shelter</span>
                  <span className="action-cost">-{SHELTER_MATERIAL_COST} material</span>
                </ActionBtn>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center" style={{ gap: "12px", padding: "12px 0" }}>
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
              Survived {state.hour} hour{state.hour !== 1 ? "s" : ""}
            </div>
            <button
              onClick={onRestart}
              className="rounded-lg text-sm font-medium cursor-pointer"
              style={{
                background: "rgba(20,20,15,0.8)",
                color: C.text,
                border: "1px solid rgba(180,160,120,0.25)",
                padding: "12px 24px",
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
    <div className="flex items-center flex-1 min-w-0" style={{ gap: "6px" }}>
      <span
        className="font-bold"
        style={{ color: c, fontSize: "0.6rem", letterSpacing: "0.08em", minWidth: "1.8rem" }}
      >
        {label}
      </span>
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: "5px", background: "rgba(20,20,15,0.7)" }}
      >
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
        className="font-medium tabular-nums"
        style={{ color: c, fontSize: "0.6rem", minWidth: "1.2rem", textAlign: "right" }}
      >
        {value}
      </span>
    </div>
  );
}

function InvTag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ color, fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.04em" }}>
      {label}
    </span>
  );
}

function InvItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center" style={{ color, gap: "4px" }}>
      <span style={{ fontSize: "0.6rem", fontWeight: 600, opacity: 0.6 }}>{label}</span>
      <span className="font-semibold tabular-nums" style={{ fontSize: "0.8rem" }}>{value}</span>
    </div>
  );
}

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
        rounded-lg w-full
        text-xs transition-all cursor-pointer
        disabled:cursor-not-allowed
        md:w-auto md:min-w-[100px]
        ${urgent ? "action-btn-urgent" : ""}
      `}
      style={{
        padding: "10px 14px",
        background: disabled ? "rgba(10,10,8,0.5)" : "rgba(20,20,15,0.7)",
        color: disabled ? C.dim : color,
        border: `1px solid ${disabled ? "rgba(40,40,30,0.3)" : color + "30"}`,
        opacity: disabled ? 0.45 : 1,
        minHeight: "48px",
        boxShadow: urgent ? `0 0 12px ${color}33` : "none",
        gap: "3px",
      }}
    >
      {children}
    </button>
  );
}
