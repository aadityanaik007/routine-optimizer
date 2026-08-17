interface RingProps {
  percent: number;
  size: number;
  strokeWidth: number;
  color: string;
  trackColor: string;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function Ring({ percent, size, strokeWidth, color, trackColor, showLabel = false, label, className = "" }: RingProps) {
  const safePercent = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safePercent / 100) * circumference;

  return (
    <span className={`ring-wrap ${className}`} style={{ width: size, height: size }} aria-label={`${safePercent}% complete`} role="img">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          className="ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {showLabel && <span className="ring-label">{label ?? `${safePercent}%`}</span>}
    </span>
  );
}
