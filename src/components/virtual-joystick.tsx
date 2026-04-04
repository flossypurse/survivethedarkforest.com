"use client";

import { useRef, useCallback, useEffect, useState } from "react";

interface Props {
  onMove: (dx: number, dy: number) => void;
}

const OUTER_R = 55;
const INNER_R = 22;
const MAX_DIST = OUTER_R - INNER_R;

export default function VirtualJoystick({ onMove }: Props) {
  const [active, setActive] = useState(false);
  const [knobX, setKnobX] = useState(0);
  const [knobY, setKnobY] = useState(0);
  const originRef = useRef({ x: 0, y: 0 });
  const moveRef = useRef(onMove);
  moveRef.current = onMove;

  const handleStart = useCallback((clientX: number, clientY: number) => {
    originRef.current = { x: clientX, y: clientY };
    setActive(true);
    setKnobX(0);
    setKnobY(0);
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!active) return;
    let dx = clientX - originRef.current.x;
    let dy = clientY - originRef.current.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > MAX_DIST) {
      dx = (dx / len) * MAX_DIST;
      dy = (dy / len) * MAX_DIST;
    }
    setKnobX(dx);
    setKnobY(dy);
    moveRef.current(dx / MAX_DIST, dy / MAX_DIST);
  }, [active]);

  const handleEnd = useCallback(() => {
    setActive(false);
    setKnobX(0);
    setKnobY(0);
    moveRef.current(0, 0);
  }, []);

  // Touch event handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    handleStart(t.clientX, t.clientY);
  }, [handleStart]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    handleMove(t.clientX, t.clientY);
  }, [handleMove]);

  // Also handle mouse for desktop testing
  useEffect(() => {
    if (!active) return;
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [active, handleMove, handleEnd]);

  return (
    <div
      className="pointer-events-auto"
      style={{
        position: "fixed",
        bottom: "30px",
        left: "30px",
        zIndex: 40,
        touchAction: "none",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={handleEnd}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
    >
      {/* Outer ring */}
      <div
        style={{
          width: OUTER_R * 2,
          height: OUTER_R * 2,
          borderRadius: "50%",
          border: `2px solid rgba(200,200,200,${active ? 0.25 : 0.12})`,
          background: `rgba(20,20,20,${active ? 0.3 : 0.15})`,
          position: "relative",
        }}
      >
        {/* Inner knob */}
        <div
          style={{
            width: INNER_R * 2,
            height: INNER_R * 2,
            borderRadius: "50%",
            background: `rgba(200,200,200,${active ? 0.3 : 0.15})`,
            border: `1px solid rgba(200,200,200,${active ? 0.4 : 0.2})`,
            position: "absolute",
            left: OUTER_R - INNER_R + knobX,
            top: OUTER_R - INNER_R + knobY,
            transition: active ? "none" : "left 0.15s, top 0.15s",
          }}
        />
      </div>
    </div>
  );
}
