import React, { useState, useEffect, useMemo } from 'react';
import {
  CortexTrack,
  CortexRecommendation,
  CortexNowPlaying,
  CortexVibeStrategy,
} from '../../types/cortex';
import { cortexAiService } from '../../services/CortexAiService';
import { cortexMonitorService } from '../../services/CortexMonitorService';
import { musicLibraryService } from '../../services/MusicLibraryService';
import { cortexAuditionEngine } from '../../services/CortexAuditionEngine';
import {
  Play,
  Pause,
  Clock,
  Zap,
  Waves,
  Flame,
  Search,
  Disc,
  Copy,
  Check,
  Brain,
} from 'lucide-react';

export const CortexFloatingWindow: React.FC = () => {
  const [nowPlaying, setNowPlaying] = useState<CortexNowPlaying>(cortexMonitorService.getNowPlaying());
  const [tracks, setTracks] = useState<CortexTrack[]>([]);
  const [recommendations, setRecommendations] = useState<CortexRecommendation[]>([]);
  const [strategy, setStrategy] = useState<CortexVibeStrategy>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [auditionTrackId, setAuditionTrackId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubMon = cortexMonitorService.subscribe(setNowPlaying);
    const unsubLib = musicLibraryService.subscribe(setTracks);
    const unsubAudition = cortexAuditionEngine.subscribe((state) => {
      setAuditionTrackId(state.isPlaying && state.track ? state.track.id : null);
    });

    musicLibraryService.getTracks().then(setTracks);

    return () => {
      unsubMon();
      unsubLib();
      unsubAudition();
      cortexAuditionEngine.stop();
    };
  }, []);

  useEffect(() => {
    if (!tracks || tracks.length === 0) return;
    const currentRef = nowPlaying.track || {
      id: 'active_ref',
      title: nowPlaying.title,
      artist: nowPlaying.artist,
      bpm: nowPlaying.bpm,
      camelotKey: nowPlaying.camelotKey,
      energyLevel: nowPlaying.energyLevel,
    };

    const recs = cortexAiService.getRecommendations(currentRef, tracks, {
      strategy,
      bpmTolerance: 0.08,
      allowHalfDouble: true,
      harmonicMode: 'strict',
      searchQuery,
      selectedCrate: 'all',
    });
    setRecommendations(recs);
  }, [nowPlaying, tracks, strategy, searchQuery]);

  const handleTogglePreview = (track: CortexTrack) => {
    cortexAuditionEngine.play(track, 0.25);
  };

  const handleCopyTitle = (track: CortexTrack) => {
    navigator.clipboard.writeText(`${track.artist} - ${track.title}`);
    setCopiedId(track.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const visibleRecs = useMemo(() => recommendations.slice(0, 40), [recommendations]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#07090e] text-zinc-100 p-2.5 select-none overflow-hidden font-sans">
      {/* 1. Mini Top Window Drag Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-black text-xs tracking-wider text-purple-300 font-mono">MIXCORTEX COMPANION</span>
          <span className="text-[8.5px] bg-purple-950 text-purple-300 px-1 py-0.2 rounded border border-purple-800/50">
            FLOAT HUD
          </span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="text-[10px] text-zinc-400 uppercase font-mono">{nowPlaying.source}</span>
        </div>
      </div>

      {/* 2. Compact Now Playing Card */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 mb-2 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-2.5 min-w-0">
          <Disc className={`w-8 h-8 text-purple-400 flex-shrink-0 ${nowPlaying.isPlaying ? 'animate-spin' : ''}`} />
          <div className="min-w-0">
            <div className="text-[8.5px] font-bold text-purple-400 uppercase tracking-wider">NOW PLAYING</div>
            <div className="font-bold text-xs text-white truncate max-w-[170px]">{nowPlaying.title}</div>
            <div className="text-[11px] text-zinc-400 truncate max-w-[170px]">{nowPlaying.artist}</div>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          <div className="text-center px-1.5 py-0.5 bg-zinc-950 rounded border border-zinc-800">
            <div className="text-[8px] text-zinc-500 font-bold">KEY</div>
            <div className="font-black text-xs text-purple-300">{nowPlaying.camelotKey}</div>
          </div>
          <div className="text-center px-1.5 py-0.5 bg-zinc-950 rounded border border-zinc-800">
            <div className="text-[8px] text-zinc-500 font-bold">BPM</div>
            <div className="font-black text-xs text-zinc-200">{nowPlaying.bpm.toFixed(0)}</div>
          </div>
          <div className="text-center px-1.5 py-0.5 bg-zinc-950 rounded border border-zinc-800">
            <Clock className="w-2.5 h-2.5 mx-auto text-zinc-400" />
            <div className="font-mono text-[10px] font-bold text-zinc-300">
              {formatTime(nowPlaying.remainingTime)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Strategy Pills & Search */}
      <div className="flex items-center justify-between mb-2 space-x-1">
        <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setStrategy('all')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
              strategy === 'all' ? 'bg-purple-600 text-white' : 'bg-zinc-900 text-zinc-400'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStrategy('boost')}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
              strategy === 'boost' ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-zinc-400'
            }`}
          >
            <Zap className="w-2.5 h-2.5" />
            <span>Boost</span>
          </button>
          <button
            onClick={() => setStrategy('chill')}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
              strategy === 'chill' ? 'bg-teal-500 text-black' : 'bg-zinc-900 text-zinc-400'
            }`}
          >
            <Waves className="w-2.5 h-2.5" />
            <span>Chill</span>
          </button>
          <button
            onClick={() => setStrategy('peak')}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
              strategy === 'peak' ? 'bg-rose-500 text-black' : 'bg-zinc-900 text-zinc-400'
            }`}
          >
            <Flame className="w-2.5 h-2.5" />
            <span>Peak</span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-3 h-3 absolute left-1.5 top-1.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-5 pr-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-white focus:outline-none w-24"
          />
        </div>
      </div>

      {/* 4. Recommendation Cards Feed */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 scrollbar-thin scrollbar-thumb-zinc-800">
        {visibleRecs.map((rec) => (
          <div
            key={rec.track.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', JSON.stringify(rec.track));
            }}
            className="group flex items-center justify-between p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 transition cursor-grab"
          >
            <div className="flex items-center space-x-2 min-w-0">
              {/* Match Badge */}
              <div
                className={`w-9 text-center py-0.5 rounded font-black text-[10px] ${
                  rec.matchScore >= 90
                    ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                    : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                {rec.matchScore}%
              </div>

              {/* Audition Button */}
              <button
                onClick={() => handleTogglePreview(rec.track)}
                className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
              >
                {auditionTrackId === rec.track.id ? (
                  <Pause className="w-3 h-3 text-pink-400" />
                ) : (
                  <Play className="w-3 h-3 ml-0.5" />
                )}
              </button>

              {/* Song title */}
              <div className="min-w-0">
                <div className="font-bold text-[11px] text-white truncate max-w-[140px]">
                  {rec.track.title}
                </div>
                <div className="text-[10px] text-zinc-400 truncate max-w-[140px]">
                  {rec.track.artist}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="text-right text-[10px]">
                <span className="font-bold text-purple-300">{rec.track.camelotKey}</span>
                <span className="text-zinc-500 ml-1">
                  ({rec.bpmDiffPct >= 0 ? `+${rec.bpmDiffPct}%` : `${rec.bpmDiffPct}%`})
                </span>
              </div>

              <button
                onClick={() => handleCopyTitle(rec.track)}
                title="Copy Title to Clipboard"
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer"
              >
                {copiedId === rec.track.id ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Backwards compatibility alias
export const PulseDJFloatingWindow = CortexFloatingWindow;
