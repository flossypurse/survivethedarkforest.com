"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const STORY_LINES = [
  { text: "", delay: 800, pause: 400 }, // initial darkness
  { text: "WARNING: ENGINE FAILURE", delay: 0, pause: 1200, style: "warning" },
  { text: "ALTITUDE: 3,200ft — DROPPING FAST", delay: 200, pause: 800, style: "warning" },
  { text: "", delay: 0, pause: 600 },
  { text: "You pulled the ejection handle.", delay: 0, pause: 1800 },
  { text: "The canopy blew off. The seat fired.", delay: 200, pause: 1500 },
  { text: "Behind you, the plane exploded — a ball of orange light swallowed by the dark.", delay: 200, pause: 2200 },
  { text: "", delay: 0, pause: 400 },
  { text: "The parachute opened.", delay: 0, pause: 1200 },
  { text: "Below you: nothing but black. An endless canopy of trees.", delay: 200, pause: 2000 },
  { text: "You crashed through branches, tangled in cords, hit the ground hard.", delay: 200, pause: 2000 },
  { text: "", delay: 0, pause: 800 },
  { text: "...", delay: 0, pause: 1500 },
  { text: "", delay: 0, pause: 400 },
  { text: "You're waking up now.", delay: 0, pause: 1800 },
  { text: "It's dark. Impossibly dark.", delay: 200, pause: 1500 },
  { text: "Beside you, a small fire crackles — lit from wreckage that fell with you.", delay: 200, pause: 2200 },
  { text: "", delay: 0, pause: 600 },
  { text: "In your pockets: a lighter, a knife, some rations.", delay: 0, pause: 1800 },
  { text: "Around you: the sound of a forest that knows you're here.", delay: 200, pause: 2500 },
  { text: "", delay: 0, pause: 800 },
  { text: "Every sound you make... something is listening.", delay: 0, pause: 2500, style: "danger" },
  { text: "", delay: 0, pause: 600 },
  { text: "Your emergency beacon is transmitting. Rescue ETA: 48 hours.", delay: 0, pause: 2500 },
  { text: "", delay: 0, pause: 400 },
  { text: "Keep the fire alive. Find food. Stay quiet.", delay: 0, pause: 2000, style: "hint" },
  { text: "Or don't. The forest doesn't care.", delay: 200, pause: 2500 },
];

export default function IntroScreen({ onComplete }: { onComplete: () => void }) {
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
