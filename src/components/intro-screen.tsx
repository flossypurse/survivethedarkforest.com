"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Faction } from "./faction-select";

type StoryLine = { text: string; delay: number; pause: number; style?: string };

const PILOT_LINES: StoryLine[] = [
  { text: "", delay: 800, pause: 400 },
  { text: "CONTACT — MULTIPLE BOGEYS", delay: 0, pause: 1000, style: "warning" },
  { text: "WEAPONS FREE", delay: 200, pause: 800, style: "warning" },
  { text: "", delay: 0, pause: 600 },
  { text: "They came three weeks ago. No one knows what they are.", delay: 0, pause: 2200 },
  { text: "The sky over the northern hemisphere went dark — some kind of field, blocking all natural light.", delay: 200, pause: 2500 },
  { text: "Your squadron was scrambled to engage. You never stood a chance.", delay: 200, pause: 2200 },
  { text: "", delay: 0, pause: 400 },
  { text: "WARNING: LOCK — EVASIVE", delay: 0, pause: 800, style: "warning" },
  { text: "IMPACT — EJECTING", delay: 200, pause: 1000, style: "warning" },
  { text: "", delay: 0, pause: 600 },
  { text: "The canopy blew off. The seat fired.", delay: 0, pause: 1500 },
  { text: "Your fighter became a fireball. The only light for miles.", delay: 200, pause: 2000 },
  { text: "", delay: 0, pause: 400 },
  { text: "The parachute opened.", delay: 0, pause: 1200 },
  { text: "Below: nothing but black. An alien darkness that swallowed the world.", delay: 200, pause: 2200 },
  { text: "You crashed through a canopy of trees you couldn't see.", delay: 200, pause: 2000 },
  { text: "", delay: 0, pause: 800 },
  { text: "...", delay: 0, pause: 1500 },
  { text: "", delay: 0, pause: 400 },
  { text: "You're waking up now.", delay: 0, pause: 1800 },
  { text: "It's dark. Not night-dark. Something else. The sky itself has been turned off.", delay: 200, pause: 2500 },
  { text: "Wreckage from your jet burns nearby — the only light in this dead world.", delay: 200, pause: 2200 },
  { text: "", delay: 0, pause: 600 },
  { text: "In your survival vest: a lighter, a knife, some rations.", delay: 0, pause: 1800 },
  { text: "In the forest: things that weren't here three weeks ago.", delay: 200, pause: 2500 },
  { text: "", delay: 0, pause: 800 },
  { text: "You can hear them. They can hear you.", delay: 0, pause: 2500, style: "danger" },
  { text: "Every sound you make in this forest draws them closer.", delay: 200, pause: 2500, style: "danger" },
  { text: "", delay: 0, pause: 600 },
  { text: "Your emergency beacon is transmitting. Rescue ETA: 48 hours.", delay: 0, pause: 2500 },
  { text: "", delay: 0, pause: 400 },
  { text: "F to toggle flashlight. Battery won't last. Use your lighter to start fires.", delay: 0, pause: 2000, style: "hint" },
  { text: "Survive the dark forest.", delay: 200, pause: 2500 },
];

const ALIEN_LINES: StoryLine[] = [
  { text: "", delay: 800, pause: 400 },
  { text: "SIGNAL DETECTED — SECTOR 7", delay: 0, pause: 1000, style: "warning" },
  { text: "DEPLOY HUNTER UNIT", delay: 200, pause: 800, style: "warning" },
  { text: "", delay: 0, pause: 600 },
  { text: "You dropped through the field. The darkness parted for you — it is yours.", delay: 0, pause: 2200 },
  { text: "The impact scattered the pod. You absorbed the wreckage. Adapted.", delay: 200, pause: 2200 },
  { text: "", delay: 0, pause: 400 },
  { text: "HOSTILES DETECTED IN SECTOR", delay: 0, pause: 800, style: "warning" },
  { text: "MIMIC PROTOCOL ACTIVE", delay: 200, pause: 1000, style: "warning" },
  { text: "", delay: 0, pause: 600 },
  { text: "You feel them. Scattered through the trees. Warm. Loud. Afraid.", delay: 0, pause: 2500 },
  { text: "Their fires are beacons. Their noise is invitation.", delay: 200, pause: 2200 },
  { text: "", delay: 0, pause: 800 },
  { text: "...", delay: 0, pause: 1500 },
  { text: "", delay: 0, pause: 400 },
  { text: "You look at your hands. Almost human. Close enough.", delay: 0, pause: 2200 },
  { text: "You can wear their shape. Move like them. Speak like them.", delay: 200, pause: 2500 },
  { text: "But you are not one of them.", delay: 200, pause: 2000, style: "danger" },
  { text: "", delay: 0, pause: 600 },
  { text: "The darkness is yours. You see without light.", delay: 0, pause: 2000 },
  { text: "Fire weakens you. Stay in the shadows.", delay: 200, pause: 2000, style: "hint" },
  { text: "", delay: 0, pause: 400 },
  { text: "Hunt them before rescue arrives. 48 hours.", delay: 0, pause: 2500 },
  { text: "Consume to evolve. Leave no survivors.", delay: 200, pause: 2500, style: "danger" },
];

export default function IntroScreen({ faction = "pilot", onComplete }: { faction?: Faction; onComplete: () => void }) {
  const STORY_LINES = faction === "alien" ? ALIEN_LINES : PILOT_LINES;
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [showSkip, setShowSkip] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lineIndexRef = useRef(0);

  const startGame = useCallback(() => {
    setFadeOut(true);
    setTimeout(onComplete, 800);
  }, [onComplete]);

  useEffect(() => {
    // Show skip button after 2s
    const skipTimer = setTimeout(() => setShowSkip(true), 2000);

    const advance = () => {
      const idx = lineIndexRef.current;
      if (idx >= STORY_LINES.length) {
        // All lines shown — auto-advance after 2s
        timerRef.current = setTimeout(startGame, 2000);
        return;
      }

      const line = STORY_LINES[idx];
      timerRef.current = setTimeout(() => {
        lineIndexRef.current = idx + 1;
        setVisibleLines(idx + 1);

        // Schedule next line
        timerRef.current = setTimeout(advance, line.pause);
      }, line.delay);
    };

    advance();

    return () => {
      clearTimeout(skipTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startGame]);

  // Only show recent lines (last 6 non-empty for readability)
  const displayLines = STORY_LINES.slice(0, visibleLines);
  const recentStart = Math.max(0, displayLines.length - 8);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-end z-50 transition-opacity duration-700"
      style={{
        background: "#02020a",
        opacity: fadeOut ? 0 : 1,
        paddingBottom: "25vh",
      }}
    >
      {/* Story text — fixed height, anchored to bottom so new lines don't push content up */}
      <div
        className="max-w-lg w-full flex flex-col justify-end"
        style={{ padding: "0 24px", height: "280px", gap: "4px" }}
      >
        {displayLines.slice(recentStart).map((line, i) => {
          const globalIdx = recentStart + i;
          const age = visibleLines - globalIdx - 1; // 0 = newest
          const opacity = age === 0 ? 1 : Math.max(0.15, 1 - age * 0.2);

          if (line.text === "") return <div key={globalIdx} className="h-3" />;
          if (line.text === "...") {
            return (
              <div
                key={globalIdx}
                className="text-center text-lg tracking-[0.5em] intro-fade-in"
                style={{ color: "#4a4a5a", opacity }}
              >
                ...
              </div>
            );
          }

          const textColor =
            line.style === "warning" ? "#d4915c"
            : line.style === "danger" ? "#b35454"
            : line.style === "hint" ? "#8aab6e"
            : "#9a9aaa";

          const fontSize =
            line.style === "warning" ? "text-xs tracking-widest font-mono font-bold"
            : "text-sm md:text-base";

          return (
            <p
              key={globalIdx}
              className={`${fontSize} leading-relaxed intro-fade-in`}
              style={{ color: textColor, opacity }}
            >
              {line.text}
            </p>
          );
        })}
      </div>

      {/* Skip / Enter button */}
      {showSkip && (
        <button
          onClick={startGame}
          className="rounded-lg text-xs font-medium cursor-pointer intro-fade-in"
          style={{
            background: "rgba(20,20,15,0.6)",
            color: "#6b7280",
            border: "1px solid rgba(100,100,90,0.2)",
            padding: "12px 24px",
            marginTop: "32px",
          }}
        >
          {visibleLines >= STORY_LINES.length ? "Enter the forest" : "Skip intro"}
        </button>
      )}
    </div>
  );
}
