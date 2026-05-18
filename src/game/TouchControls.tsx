import { useEffect, useRef, useState } from 'react';
import { TOUCH_DEADZONE } from './config';
import type { AnalogInput } from './types';

export function TouchControls({
  disabled,
  onMove,
  onDash,
  dashLabel,
}: Readonly<{
  disabled: boolean;
  onMove: (input: AnalogInput) => void;
  onDash: () => void;
  dashLabel: string;
}>) {
  const stick = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const [isPulsing, setIsPulsing] = useState(false);
  const visibleThumb = disabled ? { x: 0, y: 0 } : thumb;

  useEffect(() => {
    if (disabled) {
      onMove({ x: 0, y: 0 });
    }
  }, [disabled, onMove]);

  const updateThumb = (clientX: number, clientY: number) => {
    const zone = stick.current;
    if (!zone) {
      return;
    }

    const rect = zone.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const radius = rect.width * 0.35;
    const length = Math.hypot(deltaX, deltaY) || 1;
    const scale = Math.min(1, radius / length);
    const nextX = deltaX * scale;
    const nextY = deltaY * scale;

    setThumb({ x: nextX, y: nextY });

    const rawX = nextX / radius;
    const rawY = -nextY / radius;
    const magnitude = Math.hypot(rawX, rawY);

    if (magnitude < TOUCH_DEADZONE) {
      onMove({ x: 0, y: 0 });
      return;
    }

    const remapped = (magnitude - TOUCH_DEADZONE) / (1 - TOUCH_DEADZONE);
    const normX = rawX / magnitude;
    const normY = rawY / magnitude;
    onMove({ x: normX * remapped, y: normY * remapped });
  };

  return (
    <div className="touch-layer">
      <div
        className={`joystick ${disabled ? 'is-disabled' : ''}`}
        ref={stick}
        onPointerDown={(event) => {
          if (disabled) {
            return;
          }
          event.currentTarget.setPointerCapture(event.pointerId);
          updateThumb(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) {
            return;
          }
          updateThumb(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId);
          setThumb({ x: 0, y: 0 });
          onMove({ x: 0, y: 0 });
        }}
      >
        <div className="joystick-ring" />
        <div
          className="joystick-thumb"
          style={{
            transform: `translate(${visibleThumb.x}px, ${visibleThumb.y}px)`,
          }}
        />
      </div>

      <button
        type="button"
        className={`dash-button ${isPulsing ? 'is-pulsing' : ''}`}
        disabled={disabled}
        onAnimationEnd={() => setIsPulsing(false)}
        onPointerDown={(event) => {
          event.preventDefault();
          if (!disabled) {
            onDash();
            setIsPulsing(true);
          }
        }}
      >
        {dashLabel}
      </button>
    </div>
  );
}
