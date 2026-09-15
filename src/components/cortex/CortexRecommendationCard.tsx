import React, { useEffect, useRef } from 'react';
import { CortexRecommendation, CortexTrack } from '../../types/cortex';
import { cortexAuditionEngine } from '../../services/CortexAuditionEngine';
import { Play, Pause, Plus, Check, Music } from 'lucide-react';

interface CortexRecommendationCardProps {
  rec: CortexRecommendation;
  isFocused: boolean;
  isPreviewing: boolean;
  previewProgress: number;
  addedQueueId: string | null;
  onTogglePreview: (track: CortexTrack) => void;
  onLoadDeck: (deckId: 'A' | 'B', track: CortexTrack) => void;
  onAddToQueue: (track: CortexTrack) => void;
  onSelectCard: () => void;
}

const getCamelotColor = (key: string): { bg: string; text: string; border: string } => {
  if (!key) return { bg: 'bg-zinc-800', text: 'text-zinc-300', border: 'border-zinc-700' };
  const num = parseInt(key.replace(/[^0-9]/g, ''), 10) || 8;
  const colors: Record<number, { bg: string; text: string; border: string }> = {
    1: { bg: 'bg-teal-950/60', text: 'text-teal-400', border: 'border-teal-500/40' },
    2: { bg: 'bg-emerald-950/60', text: 'text-emerald-400', border: 'border-emerald-500/40' },
    3: { bg: 'bg-green-950/60', text: 'text-green-400', border: 'border-green-500/40' },
    4: { bg: 'bg-lime-950/60', text: 'text-lime-400', border: 'border-lime-500/40' },
    5: { bg: 'bg-yellow-950/60', text: 'text-yellow-400', border: 'border-yellow-500/40' },
    6: { bg: 'bg-amber-950/60', text: 'text-amber-400', border: 'border-amber-500/40' },
    7: { bg: 'bg-orange-950/60', text: 'text-orange-400', border: 'border-orange-500/40' },
    8: { bg: 'bg-red-950/60', text: 'text-red-400', border: 'border-red-500/40' },
    9: { bg: 'bg-rose-950/60', text: 'text-rose-400', border: 'border-rose-500/40' },
    10: { bg: 'bg-purple-950/60', text: 'text-purple-400', border: 'border-purple-500/40' },
    11: { bg: 'bg-indigo-950/60', text: 'text-indigo-400', border: 'border-indigo-500/40' },
    12: { bg: 'bg-cyan-950/60', text: 'text-cyan-400', border: 'border-cyan-500/40' },
  };
  return colors[num] || { bg: 'bg-zinc-800', text: 'text-zinc-300', border: 'border-zinc-700' };
};

export const CortexRecommendationCard: React.FC<CortexRecommendationCardProps> = React.memo(
  ({
    rec,
    isFocused,
    isPreviewing,
    previewProgress,
    addedQueueId,
    onTogglePreview,
    onLoadDeck,
    onAddToQueue,
    onSelectCard,
  }) => {
    const { track, matchScore, harmonicRelation, bpmDiff, bpmDiffPct, energyTag, recommendationBadges } = rec;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const keyColor = getCamelotColor(track.camelotKey);

    // Live Oscilloscope Frequency Bar Visualizer
    useEffect(() => {
      if (!isPreviewing || !canvasRef.current) return;
      let animId: number;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const renderWave = () => {
        const spectrum = cortexAuditionEngine.getFrequencySpectrum();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (spectrum) {
          const barWidth = 3;
          const barGap = 1.5;
          const numBars = Math.min(24, Math.floor(canvas.width / (barWidth + barGap)));

          for (let i = 0; i < numBars; i++) {
            const val = spectrum[i * 2] || 0;
            const h = Math.max(2, (val / 255) * canvas.height);
            const x = i * (barWidth + barGap);
            const y = canvas.height - h;

            ctx.fillStyle = val > 180 ? '#ec4899' : val > 100 ? '#a855f7' : '#06b6d4';
            ctx.fillRect(x, y, barWidth, h);
          }
        }
        animId = requestAnimationFrame(renderWave);
      };

      animId = requestAnimationFrame(renderWave);
      return () => cancelAnimationFrame(animId);
    }, [isPreviewing]);

    // Drag-and-drop handler for loading into Deck A / Deck B
    const handleDragStart = (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({
        id: track.id,
        title: track.title,
        artist: track.artist,
        bpm: track.bpm,
        key: track.key,
        camelotKey: track.camelotKey,
        duration: track.duration,
        fileUrl: track.fileUrl,
        fileSource: track.fileSource,
      }));
      e.dataTransfer.effectAllowed = 'copyMove';
    };

    return (
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={onSelectCard}
        className={`group relative flex flex-col p-3 rounded-xl border transition-all duration-150 select-none cursor-pointer ${
          isFocused
            ? 'bg-slate-800/95 border-purple-500 shadow-[0_0_16px_rgba(168,85,247,0.35)] ring-1 ring-purple-400'
            : isPreviewing
            ? 'bg-purple-950/40 border-pink-500/60 shadow-[0_0_12px_rgba(236,72,153,0.2)]'
            : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800/80 hover:border-slate-700'
        }`}
      >
        {/* Top Header: Score, Key Shift & Badges */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          {/* Left: Composite Match Badge */}
          <div className="flex items-center gap-1.5">
            <div
              className={`flex items-center justify-center px-2 py-0.5 rounded-md font-mono text-xs font-black shadow-sm ${
                matchScore >= 95
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-black shadow-emerald-500/30'
                  : matchScore >= 88
                  ? 'bg-purple-500 text-white shadow-purple-500/30'
                  : matchScore >= 75
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {matchScore}%
            </div>

            {/* Key Badge */}
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold border ${keyColor.bg} ${keyColor.text} ${keyColor.border}`}
            >
              {track.camelotKey}
            </span>

            {/* BPM Pitch Delta */}
            <span
              className={`font-mono text-[11px] font-semibold ${
                Math.abs(bpmDiffPct) <= 0.5
                  ? 'text-emerald-400'
                  : Math.abs(bpmDiffPct) <= 3.0
                  ? 'text-slate-300'
                  : 'text-amber-400'
              }`}
            >
              {track.bpm.toFixed(1)} <span className="text-[9.5px] opacity-70">BPM</span>
              <span className="text-[10px] ml-1 opacity-80">
                ({bpmDiff >= 0 ? '+' : ''}{bpmDiff.toFixed(1)})
              </span>
            </span>
          </div>

          {/* Right: Harmonic Relation & Energy Tag */}
          <div className="flex items-center gap-1 shrink-0">
            {harmonicRelation.isCompatible && (
              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-semibold bg-blue-950/60 text-blue-300 border border-blue-500/30">
                {harmonicRelation.badge}
              </span>
            )}
            <span
              className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase ${
                energyTag === 'peak'
                  ? 'bg-red-950/80 text-red-400 border border-red-500/40'
                  : energyTag === 'boost'
                  ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                  : energyTag === 'chill'
                  ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {energyTag}
            </span>
          </div>
        </div>

        {/* Middle Track Info */}
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm text-slate-100 truncate group-hover:text-white transition-colors">
              {track.title}
            </h4>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {track.artist}
              {track.album && <span className="text-slate-500 ml-1.5">• {track.album}</span>}
            </p>
          </div>

          {/* Quick Audition Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePreview(track);
            }}
            title={isPreviewing ? 'Stop Preview' : 'Audition Preview (Drop / 25%)'}
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all cursor-pointer ${
              isPreviewing
                ? 'bg-pink-500 text-white shadow-[0_0_12px_rgba(236,72,153,0.7)] animate-pulse'
                : 'bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white'
            }`}
          >
            {isPreviewing ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
        </div>

        {/* Live Audio Visualizer (when previewing) */}
        {isPreviewing && (
          <div className="mt-2 pt-2 border-t border-purple-500/30 flex items-center justify-between gap-2">
            <canvas ref={canvasRef} width={120} height={18} className="rounded" />
            <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-400 transition-all duration-100"
                style={{ width: `${previewProgress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-purple-300 shrink-0">Auditioning</span>
          </div>
        )}

        {/* Badges Ribbon */}
        {recommendationBadges.length > 1 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {recommendationBadges.slice(1, 3).map((badge, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/50"
              >
                {badge}
              </span>
            ))}
          </div>
        )}

        {/* Action Tray: Load A, Load B, Add to Queue */}
        <div className="flex items-center justify-between gap-1.5 mt-2.5 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLoadDeck('A', track);
              }}
              className="px-2.5 py-1 rounded bg-blue-950/80 hover:bg-blue-600 border border-blue-500/40 hover:border-blue-400 text-blue-300 hover:text-white font-mono text-[11px] font-bold transition-all cursor-pointer shadow-sm active:scale-95"
            >
              LOAD A
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLoadDeck('B', track);
              }}
              className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-600 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-white font-mono text-[11px] font-bold transition-all cursor-pointer shadow-sm active:scale-95"
            >
              LOAD B
            </button>
          </div>

          {/* Add to Queue Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToQueue(track);
            }}
            title="Add to Mixing Queue"
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
              addedQueueId === track.id
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60'
            }`}
          >
            {addedQueueId === track.id ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Queued</span>
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" />
                <span>Queue</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }
);
