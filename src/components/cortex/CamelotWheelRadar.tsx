import React, { useState } from 'react';
import { cortexAiService } from '../../services/CortexAiService';

interface CamelotWheelRadarProps {
  currentKey: string;
  selectedKeyFilter?: string | null;
  onSelectKey: (key: string | null) => void;
  compact?: boolean;
}

// Chords corresponding to Camelot positions
const CHORD_NAMES: Record<string, string> = {
  '1A': 'G#m', '2A': 'D#m', '3A': 'A#m', '4A': 'Fm',
  '5A': 'Cm',  '6A': 'Gm',  '7A': 'Dm',  '8A': 'Am',
  '9A': 'Em',  '10A': 'Bm', '11A': 'F#m', '12A': 'C#m',
  '1B': 'B',   '2B': 'F#',  '3B': 'C#',  '4B': 'G#',
  '5B': 'D#',  '6B': 'A#',  '7B': 'F',   '8B': 'C',
  '9B': 'G',   '10B': 'D',  '11B': 'A',  '12B': 'E',
};

// Standard Camelot Colors
const CAMELOT_HUES: Record<number, string> = {
  1: '#14b8a6', // teal
  2: '#10b981', // emerald
  3: '#22c55e', // green
  4: '#84cc16', // lime
  5: '#eab308', // yellow
  6: '#f59e0b', // amber
  7: '#f97316', // orange
  8: '#ef4444', // red
  9: '#f43f5e', // rose
  10: '#a855f7', // purple
  11: '#6366f1', // indigo
  12: '#06b6d4', // cyan
};

export const CamelotWheelRadar: React.FC<CamelotWheelRadarProps> = ({
  currentKey,
  selectedKeyFilter,
  onSelectKey,
  compact = false,
}) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const normCurrent = cortexAiService.normalizeCamelotKey(currentKey || '8A');
  const currentNum = parseInt(normCurrent.slice(0, -1), 10) || 8;
  const currentMode = (normCurrent.slice(-1) as 'A' | 'B') || 'A';

  const size = compact ? 220 : 280;
  const center = size / 2;
  const outerRadius = size * 0.44;
  const innerRadius = size * 0.28;
  const coreRadius = size * 0.16;

  // Compute 12 slice angles (in degrees, 12 at top = -90 deg)
  const getAngle = (num: number) => {
    // 12 is top (-90 deg), 1 is -60 deg, etc.
    return (num * 30 - 90) * (Math.PI / 180);
  };

  const getCoordinates = (radius: number, angleRad: number) => {
    return {
      x: center + radius * Math.cos(angleRad),
      y: center + radius * Math.sin(angleRad),
    };
  };

  const keysA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => `${n}A`);
  const keysB = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => `${n}B`);

  // Active key positions for glow arcs
  const activeRad = getAngle(currentNum);
  const activePoint = getCoordinates(
    currentMode === 'A' ? (innerRadius + coreRadius) / 2 : (outerRadius + innerRadius) / 2,
    activeRad
  );

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-1">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible drop-shadow-2xl"
      >
        <defs>
          <radialGradient id="radarSweep" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(168, 85, 247, 0.25)" />
            <stop offset="70%" stopColor="rgba(168, 85, 247, 0.05)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </radialGradient>
          <filter id="cortexGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Radar Background Circle */}
        <circle
          cx={center}
          cy={center}
          r={outerRadius + 4}
          fill="#0a0d14"
          stroke="#1e2433"
          strokeWidth="1.5"
        />
        <circle cx={center} cy={center} r={outerRadius} fill="url(#radarSweep)" />

        {/* Outer Ring: B (Major) */}
        {keysB.map((key) => {
          const num = parseInt(key.slice(0, -1), 10);
          const angle = getAngle(num);
          const arcStart = angle - (14 * Math.PI) / 180;
          const arcEnd = angle + (14 * Math.PI) / 180;

          const p1 = getCoordinates(outerRadius, arcStart);
          const p2 = getCoordinates(outerRadius, arcEnd);
          const p3 = getCoordinates(innerRadius + 1, arcEnd);
          const p4 = getCoordinates(innerRadius + 1, arcStart);

          const pathD = `M ${p1.x} ${p1.y} A ${outerRadius} ${outerRadius} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerRadius + 1} ${innerRadius + 1} 0 0 0 ${p4.x} ${p4.y} Z`;

          const isCurrent = normCurrent === key;
          const isSelected = selectedKeyFilter === key;
          const isHovered = hoveredKey === key;
          const rel = cortexAiService.calculateHarmonicRelation(normCurrent, key);
          const isCompatible = rel.isCompatible;

          const hue = CAMELOT_HUES[num];
          const textPos = getCoordinates((outerRadius + innerRadius) / 2, angle);

          return (
            <g
              key={key}
              className="cursor-pointer transition-transform duration-150"
              onClick={() => onSelectKey(selectedKeyFilter === key ? null : key)}
              onMouseEnter={() => setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <path
                d={pathD}
                fill={
                  isCurrent
                    ? hue
                    : isSelected
                    ? `${hue}dd`
                    : isHovered
                    ? `${hue}66`
                    : isCompatible
                    ? `${hue}22`
                    : '#121620'
                }
                stroke={
                  isCurrent
                    ? '#ffffff'
                    : isSelected
                    ? hue
                    : isCompatible
                    ? `${hue}aa`
                    : '#1e2433'
                }
                strokeWidth={isCurrent || isSelected ? '2' : '1'}
                filter={isCurrent ? 'url(#cortexGlow)' : undefined}
                className="transition-colors duration-150"
              />
              <text
                x={textPos.x}
                y={textPos.y - 1}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={compact ? '8.5' : '10'}
                fontWeight={isCurrent || isSelected ? 'bold' : '600'}
                fill={isCurrent ? '#ffffff' : isSelected ? '#ffffff' : isCompatible ? '#f1f5f9' : '#64748b'}
                className="pointer-events-none font-mono"
              >
                {key}
              </text>
              {!compact && (
                <text
                  x={textPos.x}
                  y={textPos.y + 8.5}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="7"
                  fontWeight="500"
                  fill={isCurrent ? '#ffffff' : isSelected ? '#ffffff' : isCompatible ? '#94a3b8' : '#475569'}
                  className="pointer-events-none"
                >
                  {CHORD_NAMES[key]}
                </text>
              )}
            </g>
          );
        })}

        {/* Inner Ring: A (Minor) */}
        {keysA.map((key) => {
          const num = parseInt(key.slice(0, -1), 10);
          const angle = getAngle(num);
          const arcStart = angle - (14 * Math.PI) / 180;
          const arcEnd = angle + (14 * Math.PI) / 180;

          const p1 = getCoordinates(innerRadius - 1, arcStart);
          const p2 = getCoordinates(innerRadius - 1, arcEnd);
          const p3 = getCoordinates(coreRadius, arcEnd);
          const p4 = getCoordinates(coreRadius, arcStart);

          const pathD = `M ${p1.x} ${p1.y} A ${innerRadius - 1} ${innerRadius - 1} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${coreRadius} ${coreRadius} 0 0 0 ${p4.x} ${p4.y} Z`;

          const isCurrent = normCurrent === key;
          const isSelected = selectedKeyFilter === key;
          const isHovered = hoveredKey === key;
          const rel = cortexAiService.calculateHarmonicRelation(normCurrent, key);
          const isCompatible = rel.isCompatible;

          const hue = CAMELOT_HUES[num];
          const textPos = getCoordinates((innerRadius + coreRadius) / 2, angle);

          return (
            <g
              key={key}
              className="cursor-pointer transition-transform duration-150"
              onClick={() => onSelectKey(selectedKeyFilter === key ? null : key)}
              onMouseEnter={() => setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <path
                d={pathD}
                fill={
                  isCurrent
                    ? hue
                    : isSelected
                    ? `${hue}dd`
                    : isHovered
                    ? `${hue}66`
                    : isCompatible
                    ? `${hue}26`
                    : '#0d111a'
                }
                stroke={
                  isCurrent
                    ? '#ffffff'
                    : isSelected
                    ? hue
                    : isCompatible
                    ? `${hue}99`
                    : '#1e2433'
                }
                strokeWidth={isCurrent || isSelected ? '2' : '1'}
                filter={isCurrent ? 'url(#cortexGlow)' : undefined}
                className="transition-colors duration-150"
              />
              <text
                x={textPos.x}
                y={textPos.y - 1}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={compact ? '8' : '9.5'}
                fontWeight={isCurrent || isSelected ? 'bold' : '600'}
                fill={isCurrent ? '#ffffff' : isSelected ? '#ffffff' : isCompatible ? '#f1f5f9' : '#64748b'}
                className="pointer-events-none font-mono"
              >
                {key}
              </text>
              {!compact && (
                <text
                  x={textPos.x}
                  y={textPos.y + 7.5}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="6.5"
                  fontWeight="500"
                  fill={isCurrent ? '#ffffff' : isSelected ? '#ffffff' : isCompatible ? '#94a3b8' : '#475569'}
                  className="pointer-events-none"
                >
                  {CHORD_NAMES[key]}
                </text>
              )}
            </g>
          );
        })}

        {/* Glowing Harmonic Connection Arcs from Current Track */}
        {normCurrent && (
          <circle
            cx={activePoint.x}
            cy={activePoint.y}
            r="4"
            fill="#ffffff"
            filter="url(#cortexGlow)"
            className="animate-ping pointer-events-none"
          />
        )}

        {/* Core Center Display */}
        <circle
          cx={center}
          cy={center}
          r={coreRadius - 1}
          fill="#06080d"
          stroke="#3b82f6"
          strokeWidth="1.5"
        />
        <text
          x={center}
          y={center - 7}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={compact ? '12' : '14'}
          fontWeight="900"
          fill="#60a5fa"
          className="font-mono tracking-wider"
        >
          {selectedKeyFilter || normCurrent}
        </text>
        <text
          x={center}
          y={center + 7}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={compact ? '7.5' : '8.5'}
          fontWeight="600"
          fill="#94a3b8"
        >
          {CHORD_NAMES[selectedKeyFilter || normCurrent] || 'Am'}
        </text>
      </svg>

      {/* Quick Reset Filter */}
      {selectedKeyFilter && (
        <button
          onClick={() => onSelectKey(null)}
          className="mt-1 px-2 py-0.5 rounded-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[10px] font-mono border border-blue-500/30 transition-all cursor-pointer"
        >
          Clear Key Filter ({selectedKeyFilter}) ✕
        </button>
      )}
    </div>
  );
};
