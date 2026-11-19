import React from 'react';

interface CountdownProgressProps {
  remaining: number;
  period: number;
  size?: number;
  strokeWidth?: number;
}

export const CountdownProgress: React.FC<CountdownProgressProps> = ({
  remaining,
  period,
  size = 36,
  strokeWidth = 3,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.max(0, Math.min(1, remaining / period));
  const strokeDashoffset = circumference * (1 - progressRatio);

  const isUrgent = remaining <= 5;
  const strokeColor = isUrgent ? '#F43F5E' : '#F59E0B';
  const textColor = isUrgent ? 'text-rose-400 font-bold' : 'text-slate-300 font-medium';

  return (
    <div
      role="progressbar"
      aria-valuenow={remaining}
      aria-valuemin={0}
      aria-valuemax={period}
      aria-label="TOTP 倒计时剩余秒数"
      className={`relative inline-flex items-center justify-center ${
        isUrgent ? 'animate-pulse' : ''
      }`}
      style={{ width: size, height: size }}
      title={`当前周期剩余 ${remaining} 秒`}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90 transform"
      >
        {/* Background track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#18243C"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated active circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-300 ease-linear"
        />
      </svg>
      {/* Remaining seconds text in center */}
      <span
        className={`absolute text-[11px] font-mono select-none ${textColor}`}
      >
        {remaining}
      </span>
    </div>
  );
};
