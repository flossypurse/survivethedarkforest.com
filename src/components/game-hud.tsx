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

// ── Dark-forest palette ──
// Muted, earthy, campfire-lit — not neon defaults.

const palette = {
  fire: "#d4915c",       // warm amber ember
  fireLow: "#7a4a2a",    // dying ember
  health: "#b35454",     // muted crimson
  healthLow: "#5c1f1f",  // dried blood
  hunger: "#8aab6e",     // mossy sage
  hungerLow: "#3d4f2a",  // wilted green
  wood: "#b89b6a",       // pale timber
  food: "#c47d5a",       // berry / cooked root
  materials: "#8a9bae",  // slate stone
  trap: "#9b8579",       // weathered leather
  shelter: "#9b8579",    // same family as trap
  forage: "#7a9e6d",     // forest moss
  day: "#c9a96e",        // golden hour
  night: "#7b7fad",      // moonlit indigo
  noise: "#c9a0d4",      // soft violet — distinct from other bars
  noiseLow: "#5c3d66",   // muted violet
  muted: "#6b7280",      // UI chrome
  mutedDim: "#3f444d",   // disabled chrome
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

// ── Tooltip wrapper ──

function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <div className="tooltip-wrap">
      {children}
      <div className="tooltip-bubble">{text}</div>
    </div>
  );
}

// ── Icons (purpose-built SVGs) ──

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
    </svg>
  );
}

function FireIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
    </svg>
  );
}

/** Drumstick — a leg of meat with a bone end */
function DrumstickIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M15.5 2C13 2 11 4 11 6.5c0 .88.25 1.7.69 2.4L2 18.5V22h3.5l9.6-9.69c.7.44 1.52.69 2.4.69C20 13 22 11 22 8.5S20 2 17.5 2h-2z" />
    </svg>
  );
}

/** Wood — two stacked logs, seen from the side */
function WoodIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="2" y="14" width="20" height="5" rx="2.5" />
      <rect x="5" y="7" width="14" height="5" rx="2.5" opacity="0.75" />
      <circle cx="22" cy="16.5" r="2" opacity="0.4" />
      <circle cx="19" cy="9.5" r="1.8" opacity="0.3" />
    </svg>
  );
}

/** Food — a cluster of three berries on a twig */
function FoodIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="8" cy="14" r="4" />
      <circle cx="15" cy="13" r="3.5" opacity="0.85" />
      <circle cx="12" cy="8" r="3" opacity="0.7" />
      <path d="M12 2c0 0-1 3-1 5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" strokeLinecap="round" />
      <path d="M14 3c0 0 0 2.5-1.5 4.5" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4" strokeLinecap="round" />
    </svg>
  );
}

/** Materials — a rough stone with a smaller chip beside it */
function MaterialsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M4 18l2-7 5-4 6 1 4 5-2 6H4z" />
      <path d="M17 8l3-2 2 3-1 3" opacity="0.55" />
    </svg>
  );
}

/** Trap — open jaw trap, V-shape with teeth along the edges */
function TrapIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M2 8l3 2-1 3 2-1 2 3 1-2 3 1L12 20l0-6 3-1 1 2 2-3 2 1-1-3 3-2-4-1 1-2-3 1-2-3-1 2-3-1z" />
      <circle cx="12" cy="12" r="2.5" opacity="0.3" />
    </svg>
  );
}

/** Shelter — a lean-to / A-frame with supporting pole */
function ShelterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 3L2 19h20L12 3zm0 4l6.5 10.5h-13L12 7z" opacity="0.85" />
      <rect x="11" y="13" width="2" height="6" rx="0.5" />
    </svg>
  );
}

/** Noise — sound waves radiating outward */
function NoiseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1z" />
      <path d="M6 7a1 1 0 011 1v4a1 1 0 11-2 0V8a1 1 0 011-1z" opacity="0.7" />
      <path d="M14 7a1 1 0 011 1v4a1 1 0 11-2 0V8a1 1 0 011-1z" opacity="0.7" />
      <path d="M2 9a1 1 0 011 1v0a1 1 0 11-2 0v0a1 1 0 011-1z" opacity="0.4" />
      <path d="M18 9a1 1 0 011 1v0a1 1 0 11-2 0v0a1 1 0 011-1z" opacity="0.4" />
    </svg>
  );
}

/** Search / forage — a hand reaching into undergrowth */
function ForageIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M15 2a4 4 0 00-4 4c0 .6.1 1.1.4 1.6L3 16v4h4l8.4-8.4c.5.2 1 .4 1.6.4a4 4 0 000-8z" opacity="0.9" />
      <path d="M5 18l2 2M7 16l2 2" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4" strokeLinecap="round" />
    </svg>
  );
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

  const healthRatio = state.health / MAX_HEALTH;
  const fireRatio = state.fire / FIRE_MAX;
  const hungerRatio = (MAX_HUNGER - state.hunger) / MAX_HUNGER;
  const noiseRatio = state.noise / NOISE_MAX;

  return (
    <div className="absolute inset-0 flex flex-col pointer-events-none">
      {/* ── Top zone: status + vitals + resources ── */}
      <div
        className="pointer-events-auto"
        style={{
          background:
            "linear-gradient(to bottom, rgba(8,8,15,0.85) 0%, rgba(8,8,15,0.6) 70%, transparent 100%)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        {/* Row 1: Status badge + day + resources */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1 md:px-5">
          <div className="flex items-center gap-3">
            <StatusBadge
              label={state.phase === "day" ? "DAY" : "NIGHT"}
              color={isNight ? palette.night : palette.day}
            />
            <span
              className="text-xs md:text-sm font-medium"
              style={{ color: palette.muted, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
            >
              Day {state.day} / {DAYS_TO_SURVIVE}
            </span>
          </div>

          {/* Resources */}
          <div className="flex items-center gap-2 md:gap-3">
            <Tooltip text="Wood — fuel for your fire">
              <ResourceChip icon={<WoodIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />} value={state.wood} color={palette.wood} />
            </Tooltip>
            <Tooltip text="Food — eat to stave off hunger">
              <ResourceChip icon={<FoodIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />} value={state.food} color={palette.food} />
            </Tooltip>
            <Tooltip text="Materials — stone & vine for building">
              <ResourceChip icon={<MaterialsIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />} value={state.materials} color={palette.materials} />
            </Tooltip>
            {state.traps > 0 && (
              <Tooltip text={`Traps — ${state.traps} set, reduces night damage`}>
                <ResourceChip icon={<TrapIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />} value={state.traps} color={palette.trap} />
              </Tooltip>
            )}
            {state.hasShelter && (
              <Tooltip text="Shelter — built, greatly reduces night damage">
                <div className="flex items-center" style={{ color: palette.shelter }}>
                  <ShelterIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </div>
              </Tooltip>
            )}
            {state.creatures.length > 0 && (
              <Tooltip text={`${state.creatures.length} creature${state.creatures.length !== 1 ? "s" : ""} nearby`}>
                <div
                  className="flex items-center gap-1 text-xs font-medium tabular-nums"
                  style={{ color: palette.health, textShadow: "0 0 6px rgba(179,84,84,0.4)" }}
                >
                  <span>👁</span>
                  <span>{state.creatures.length}</span>
                </div>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Row 2: Vitals */}
        <div className="flex items-center gap-2 px-3 pb-3 md:px-5 md:gap-4">
          <Tooltip text="Health — reaches zero and you die">
            <VitalBar
              icon={<HeartIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
              value={state.health}
              ratio={healthRatio}
              color={palette.health}
              lowColor={palette.healthLow}
            />
          </Tooltip>
          <Tooltip text="Fire — keep it burning or the darkness takes you">
            <VitalBar
              icon={<FireIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
              value={state.fire}
              ratio={fireRatio}
              color={palette.fire}
              lowColor={palette.fireLow}
            />
          </Tooltip>
          <Tooltip text="Fullness — when empty, you starve">
            <VitalBar
              icon={<DrumstickIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
              value={MAX_HUNGER - state.hunger}
              ratio={hungerRatio}
              color={palette.hunger}
              lowColor={palette.hungerLow}
            />
          </Tooltip>
          <Tooltip text="Noise — actions make noise that draws creatures closer">
            <VitalBar
              icon={<NoiseIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
              value={state.noise}
              ratio={noiseRatio}
              color={palette.noise}
              lowColor={palette.noiseLow}
              invertLow
            />
          </Tooltip>
        </div>
      </div>

      {/* ── Spacer — canvas breathes here ── */}
      <div className="flex-1" />

      {/* ── Toast event log ── */}
      <div className="px-3 pb-2 md:px-5 flex flex-col gap-1.5 items-start pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-enter ${toast.exiting ? "toast-exit" : ""}`}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "0.8rem",
              lineHeight: "1.3",
              maxWidth: "min(85vw, 400px)",
              background: "rgba(8,8,15,0.75)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              border: `1px solid ${
                toast.entry.type === "danger"
                  ? "rgba(179,84,84,0.35)"
                  : toast.entry.type === "success"
                    ? "rgba(122,158,109,0.35)"
                    : toast.entry.type === "discovery"
                      ? "rgba(138,155,174,0.35)"
                      : "rgba(107,114,128,0.2)"
              }`,
              color:
                toast.entry.type === "danger"
                  ? "#d49a9a"
                  : toast.entry.type === "success"
                    ? "#a3c290"
                    : toast.entry.type === "discovery"
                      ? "#adbdcc"
                      : "#8b8fa3",
              textShadow: "0 1px 2px rgba(0,0,0,0.6)",
            }}
          >
            {toast.entry.message}
          </div>
        ))}
      </div>

      {/* ── Bottom zone: actions ── */}
      <div
        className="pointer-events-auto"
        style={{
          background:
            "linear-gradient(to top, rgba(8,8,15,0.85) 0%, rgba(8,8,15,0.6) 70%, transparent 100%)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        {isPlaying ? (
          <div className="grid grid-cols-2 gap-3 px-4 py-4 md:flex md:flex-wrap md:gap-3 md:px-6 md:py-5">
            <ActionButton
              label="Stoke Fire"
              sublabel={`${state.wood} wood`}
              tooltip="Add 1 wood to the fire"
              onClick={onAddWood}
              disabled={state.wood <= 0}
              color={palette.fire}
              icon={<FireIcon className="w-4 h-4 md:w-5 md:h-5" />}
              urgent={fireRatio < 0.3 && state.wood > 0}
            />
            <ActionButton
              label={forageCooldown > 0 ? `Forage (${forageCooldown}s)` : "Forage"}
              tooltip="Search the forest edge for wood, food, or materials (day only)"
              onClick={onForage}
              disabled={isNight || forageCooldown > 0}
              color={palette.forage}
              icon={<ForageIcon className="w-4 h-4 md:w-5 md:h-5" />}
            />
            <ActionButton
              label="Eat"
              sublabel={`${state.food} food`}
              tooltip="Consume 1 food to restore fullness"
              onClick={onEat}
              disabled={state.food <= 0 || state.hunger <= 0}
              color={palette.food}
              icon={<FoodIcon className="w-4 h-4 md:w-5 md:h-5" />}
              urgent={hungerRatio < 0.3 && state.food > 0}
            />
            <ActionButton
              label="Build Trap"
              sublabel={`${TRAP_MATERIAL_COST} mat`}
              tooltip={`Spend ${TRAP_MATERIAL_COST} materials to set a perimeter trap`}
              onClick={onBuildTrap}
              disabled={state.materials < TRAP_MATERIAL_COST}
              color={palette.trap}
              icon={<TrapIcon className="w-4 h-4 md:w-5 md:h-5" />}
            />
            {!state.hasShelter && (
              <ActionButton
                label="Shelter"
                sublabel={`${SHELTER_MATERIAL_COST} mat`}
                tooltip={`Spend ${SHELTER_MATERIAL_COST} materials to build a shelter (one-time, big defense boost)`}
                onClick={onBuildShelter}
                disabled={state.materials < SHELTER_MATERIAL_COST}
                color={palette.shelter}
                icon={<ShelterIcon className="w-4 h-4 md:w-5 md:h-5" />}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 py-6">
            <div
              className="text-lg md:text-xl font-bold"
              style={{
                color: state.status === "won" ? palette.hunger : palette.health,
                textShadow: `0 0 20px ${state.status === "won" ? "rgba(122,158,109,0.4)" : "rgba(179,84,84,0.4)"}`,
              }}
            >
              {state.status === "won"
                ? "You survived the dark forest."
                : "You perished in the dark forest."}
            </div>
            <div className="text-sm" style={{ color: palette.muted }}>
              Survived {state.day - 1} day{state.day - 1 !== 1 ? "s" : ""}
            </div>
            <button
              onClick={onRestart}
              className="px-6 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              style={{
                background: "rgba(30,30,20,0.8)",
                color: "#d4c9a8",
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

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <div
      className="text-xs md:text-sm font-bold px-2.5 py-1 rounded-md"
      style={{
        color,
        border: `1px solid ${color}33`,
        background: `${color}11`,
        textShadow: `0 0 8px ${color}44`,
      }}
    >
      {label}
    </div>
  );
}

function VitalBar({
  icon,
  value,
  ratio,
  color,
  lowColor,
  invertLow,
}: {
  icon: ReactNode;
  value: number;
  ratio: number;
  color: string;
  lowColor: string;
  invertLow?: boolean;
}) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const isLow = invertLow ? clamped > 0.6 : clamped < 0.3;
  const barColor = isLow ? lowColor : color;

  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <div style={{ color: barColor, flexShrink: 0 }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div
          className="h-2 md:h-2.5 rounded-full overflow-hidden"
          style={{ background: "rgba(30,30,20,0.7)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${clamped * 100}%`,
              background: barColor,
              boxShadow: isLow ? `0 0 8px ${barColor}` : "none",
            }}
          />
        </div>
      </div>
      <span
        className="text-xs md:text-sm font-medium tabular-nums"
        style={{
          color: barColor,
          minWidth: "1.5rem",
          textAlign: "right",
          textShadow: "0 1px 3px rgba(0,0,0,0.8)",
          flexShrink: 0,
        }}
      >
        {Math.round(value)}
      </span>
    </div>
  );
}

function ResourceChip({
  icon,
  value,
  color,
}: {
  icon: ReactNode;
  value: number;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-1"
      style={{ color, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
    >
      {icon}
      <span className="text-xs md:text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

function ActionButton({
  label,
  sublabel,
  tooltip,
  onClick,
  disabled,
  color,
  icon,
  urgent,
}: {
  label: string;
  sublabel?: string;
  tooltip?: string;
  onClick: () => void;
  disabled?: boolean;
  color: string;
  icon: ReactNode;
  urgent?: boolean;
}) {
  return (
    <Tooltip text={tooltip ?? label}>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          flex items-center justify-center gap-2
          px-4 py-3 rounded-lg w-full
          text-sm md:text-sm font-medium
          transition-all cursor-pointer
          disabled:cursor-not-allowed
          md:px-5 md:py-3.5 md:w-auto
          ${urgent ? "action-btn-urgent" : ""}
        `}
        style={{
          background: disabled ? "rgba(17,17,12,0.6)" : "rgba(30,30,20,0.7)",
          color: disabled ? palette.mutedDim : color,
          border: `1px solid ${disabled ? "rgba(50,50,35,0.4)" : color + "33"}`,
          opacity: disabled ? 0.5 : 1,
          minHeight: "48px",
          backdropFilter: disabled ? "none" : "blur(4px)",
          WebkitBackdropFilter: disabled ? "none" : "blur(4px)",
          boxShadow: urgent ? `0 0 12px ${color}33, inset 0 0 12px ${color}11` : "none",
          textShadow: disabled ? "none" : "0 1px 2px rgba(0,0,0,0.6)",
        }}
      >
        <span style={{ flexShrink: 0 }}>{icon}</span>
        <span>{label}</span>
        {sublabel && (
          <span
            className="text-xs"
            style={{ color: disabled ? palette.mutedDim : palette.muted }}
          >
            ({sublabel})
          </span>
        )}
      </button>
    </Tooltip>
  );
}
