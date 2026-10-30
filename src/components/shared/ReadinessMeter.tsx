// src/components/shared/ReadinessMeter.tsx
const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ReadinessMeter({ score }: { score: number }) {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  const band = value >= 75 ? 'ok' : value >= 50 ? 'warn' : 'bad';
  const label = band === 'ok' ? 'On track' : band === 'warn' ? 'Needs attention' : 'At risk';

  return (
    <div
      className={`meter meter--${band}`}
      role="meter"
      aria-label="Event readiness"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={`${value} percent, ${label}`}
    >
      <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true" focusable="false">
        <circle cx="60" cy="60" r={RADIUS} className="meter__track" fill="none" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={RADIUS} className="meter__arc" fill="none" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - value / 100)}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <output className="meter__value" aria-live="polite">{value}%</output>
      <span className="meter__label">{label}</span>
    </div>
  );
}
