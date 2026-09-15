import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  CortexTrack,
  CortexRecommendation,
  CortexNowPlaying,
  CortexSourceMode,
  CortexVibeStrategy,
  CortexBpmTolerance,
  CortexHarmonicMode,
  CortexStyleRecord,
} from '../../types/cortex';
import { cortexAiService } from '../../services/CortexAiService';
import { cortexMonitorService } from '../../services/CortexMonitorService';
import { musicLibraryService } from '../../services/MusicLibraryService';
import { cortexAuditionEngine } from '../../services/CortexAuditionEngine';
import { automixService } from '../../services/AutomixService';
import { CamelotWheelRadar } from './CamelotWheelRadar';
import { CortexRecommendationCard } from './CortexRecommendationCard';
import { TrackMetadata, DeckId } from '../../types/dj';
import {
  Activity,
  Sparkles,
  Disc,
  Zap,
  Flame,
  Waves,
  Search,
  ExternalLink,
  Clock,
  Radio,
  Music,
  X,
  Compass,
  ArrowRight,
  Brain,
  ChevronDown,
  ChevronUp,
  LayoutList,
  Grid,
} from 'lucide-react';

interface CortexDJCoPilotProps {
  onLoadTrackToDeck: (deckId: DeckId, track: TrackMetadata) => void;
  onPopOutWindow?: () => void;
  compact?: boolean;
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

export const CortexDJCoPilot: React.FC<CortexDJCoPilotProps> = ({
  onLoadTrackToDeck,
  onPopOutWindow,
  compact = false,
}) => {
  // Live Monitor State
  const [nowPlaying, setNowPlaying] = useState<CortexNowPlaying>(cortexMonitorService.getNowPlaying());
  const [tracks, setTracks] = useState<CortexTrack[]>([]);
  const [recommendations, setRecommendations] = useState<CortexRecommendation[]>([]);

  // Filter and Strategy States
  const [strategy, setStrategy] = useState<CortexVibeStrategy>('all');
  const [bpmTolerance, setBpmTolerance] = useState<CortexBpmTolerance>(0.06);
  const [allowHalfDouble, setAllowHalfDouble] = useState(true);
  const [harmonicMode, setHarmonicMode] = useState<CortexHarmonicMode>('strict');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKeyFilter, setSelectedKeyFilter] = useState<string | null>(null);

  // Performance Windowing (Chunked Rendering for 120 FPS)
  const [visibleCount, setVisibleCount] = useState<number>(30);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  // Audition Engine State
  const [auditionState, setAuditionState] = useState<{
    track: CortexTrack | null;
    isPlaying: boolean;
    progress: number;
  }>({ track: null, isPlaying: false, progress: 0 });

  // UI Panels & Modals
  const [density, setDensity] = useState<'compact' | 'comfortable'>(compact ? 'compact' : 'comfortable');
  const [isNowPlayingExpanded, setIsNowPlayingExpanded] = useState<boolean>(!compact);
  const [showCamelotRadar, setShowCamelotRadar] = useState<boolean>(!compact);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState<boolean>(false);
  const [styleRecords, setStyleRecords] = useState<CortexStyleRecord[]>([]);
  const [addedQueueId, setAddedQueueId] = useState<string | null>(null);

  const feedContainerRef = useRef<HTMLDivElement | null>(null);

  // 1. Subscribe to Monitor, Library, and Audition Engine
  useEffect(() => {
    const unsubMonitor = cortexMonitorService.subscribe(setNowPlaying);
    const unsubLib = musicLibraryService.subscribe(setTracks);
    const unsubAudition = cortexAuditionEngine.subscribe((state) => {
      setAuditionState({
        track: state.track,
        isPlaying: state.isPlaying,
        progress: state.progress,
      });
    });

    musicLibraryService.getTracks().then(setTracks);

    return () => {
      unsubMonitor();
      unsubLib();
      unsubAudition();
      cortexAuditionEngine.stop();
    };
  }, []);

  // 2. High-Speed Accelerated Recommendation Query
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

    let recs = cortexAiService.getRecommendations(currentRef, tracks, {
      strategy,
      bpmTolerance,
      allowHalfDouble,
      harmonicMode: selectedKeyFilter ? 'open' : harmonicMode,
      searchQuery,
      selectedCrate: 'all',
    });

    if (selectedKeyFilter) {
      recs = recs.filter((r) => r.track.camelotKey === selectedKeyFilter);
    }

    setRecommendations(recs);
    setVisibleCount(30);
    setFocusedIndex(0);
  }, [nowPlaying, tracks, strategy, bpmTolerance, allowHalfDouble, harmonicMode, searchQuery, selectedKeyFilter]);

  // 3. Pro DJ Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(recommendations.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (recommendations[focusedIndex]) {
          handleTogglePreview(recommendations[focusedIndex].track);
        }
      } else if (e.key === 'a' || e.key === 'A') {
        if (recommendations[focusedIndex]) {
          handleLoadDeck('A', recommendations[focusedIndex].track);
        }
      } else if (e.key === 'b' || e.key === 'B') {
        if (recommendations[focusedIndex]) {
          handleLoadDeck('B', recommendations[focusedIndex].track);
        }
      } else if (e.key === 'q' || e.key === 'Q') {
        if (recommendations[focusedIndex]) {
          handleAddToQueue(recommendations[focusedIndex].track);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recommendations, focusedIndex]);

  const handleTogglePreview = useCallback((track: CortexTrack) => {
    cortexAuditionEngine.play(track, 0.25);
  }, []);

  const handleLoadDeck = useCallback((deckId: DeckId, cortexTrack: CortexTrack) => {
    const meta: TrackMetadata = {
      id: cortexTrack.id,
      title: cortexTrack.title,
      artist: cortexTrack.artist,
      album: cortexTrack.album,
      genre: cortexTrack.genre,
      year: cortexTrack.year,
      duration: cortexTrack.duration,
      bpm: cortexTrack.bpm,
      key: cortexTrack.key,
      camelotKey: cortexTrack.camelotKey,
      fileUrl: cortexTrack.fileUrl,
      fileSource: cortexTrack.fileSource,
      rating: cortexTrack.rating || 5,
      dateAdded: new Date().toLocaleDateString(),
      hotCues: [],
      savedLoops: [],
      beatGrid: { bpm: cortexTrack.bpm, firstBeatOffset: 0.0, meter: 4 },
      coverArtUrl: cortexTrack.coverArtUrl,
    };
    onLoadTrackToDeck(deckId, meta);
  }, [onLoadTrackToDeck]);

  const handleAddToQueue = useCallback((cortexTrack: CortexTrack) => {
    const meta: TrackMetadata = {
      id: cortexTrack.id,
      title: cortexTrack.title,
      artist: cortexTrack.artist,
      album: cortexTrack.album,
      duration: cortexTrack.duration,
      bpm: cortexTrack.bpm,
      key: cortexTrack.key,
      camelotKey: cortexTrack.camelotKey,
      fileUrl: cortexTrack.fileUrl,
      fileSource: cortexTrack.fileSource,
      dateAdded: new Date().toLocaleDateString(),
      hotCues: [],
      savedLoops: [],
      beatGrid: { bpm: cortexTrack.bpm, firstBeatOffset: 0.0, meter: 4 },
    };
    automixService.addToQueue(meta);
    setAddedQueueId(cortexTrack.id);
    setTimeout(() => setAddedQueueId(null), 1800);
  }, []);

  const handleScroll = () => {
    if (!feedContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedContainerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 80) {
      if (visibleCount < recommendations.length) {
        setVisibleCount((prev) => Math.min(recommendations.length, prev + 25));
      }
    }
  };

  const handleOpenStyleModal = () => {
    setStyleRecords(cortexAiService.getStyleRecords());
    setIsStyleModalOpen(true);
  };

  const formatTimeRemaining = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const nowColor = getCamelotColor(nowPlaying.camelotKey);
  const remainingPct = nowPlaying.duration > 0
    ? Math.max(0, Math.min(100, (nowPlaying.remainingTime / nowPlaying.duration) * 100))
    : 0;
  const isUrgent = nowPlaying.remainingTime <= 30 && nowPlaying.remainingTime > 0;

  const visibleRecommendations = useMemo(() => {
    return recommendations.slice(0, visibleCount);
  }, [recommendations, visibleCount]);

  return (
    <div className="flex flex-col h-full bg-[#080a0f] text-zinc-100 select-none overflow-hidden p-3 font-sans">
      {/* 1. TOP HEADER & CO-PILOT TOOLBAR */}
      <div className={`flex items-center justify-between border-b border-zinc-800/80 ${compact ? 'pb-2 mb-2' : 'pb-2.5 mb-2.5'}`}>
        {!compact ? (
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 via-indigo-500 to-cyan-400 shadow-md shadow-purple-500/25">
              <Brain className="w-5 h-5 text-white animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-cyan-400 text-sm sm:text-base font-mono">
                  MIXCORTEX AI
                </h2>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-purple-500/10 text-purple-300 border border-purple-500/30 font-mono">
                  NEURAL CO-PILOT
                </span>
              </div>
              <p className="text-[10.5px] text-zinc-400 hidden sm:block">Real-time harmonic intelligence & vibe recommendations</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 text-xs text-zinc-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-zinc-200 font-bold tracking-wide">LIVE CO-PILOT</span>
            </div>
          </div>
        )}

        {/* Source Switcher, Radar Toggle & Desktop Pop-Out */}
        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
          {/* Source Dropdown */}
          <div className="flex items-center space-x-1 bg-zinc-900/90 border border-zinc-800 rounded-lg px-1.5 py-0.5 text-xs">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <select
              value={nowPlaying.source}
              onChange={(e) => cortexMonitorService.setSource(e.target.value as CortexSourceMode)}
              className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer text-xs max-w-[130px] sm:max-w-none truncate"
            >
              <option value="cloudmix" className="bg-zinc-900 text-zinc-200">
                CloudMix Deck
              </option>
              <option value="djay_pro" className="bg-zinc-900 text-zinc-200">
                djay Pro DB
              </option>
              <option value="file" className="bg-zinc-900 text-zinc-200">
                Streamer.bot (txt)
              </option>
              <option value="manual" className="bg-zinc-900 text-zinc-200">
                Manual Pin
              </option>
            </select>
          </div>

          {/* Camelot Wheel Radar Toggle Button */}
          <button
            onClick={() => setShowCamelotRadar(!showCamelotRadar)}
            title="Toggle Interactive Camelot Wheel Radar"
            className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              showCamelotRadar
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-sm shadow-purple-500/20'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            <Compass className={`w-3.5 h-3.5 ${showCamelotRadar ? 'text-cyan-400' : ''}`} />
            <span className="hidden md:inline">Camelot Radar</span>
          </button>

          {/* "My Style" Learning Hub */}
          <button
            onClick={handleOpenStyleModal}
            title="My Style Machine Learning Insights"
            className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60 border border-indigo-500/30 text-xs transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">My Style</span>
          </button>

          {/* Pop Out Floating HUD Button */}
          {onPopOutWindow && (
            <button
              onClick={onPopOutWindow}
              title="Pop Out Desktop Floating Companion Window"
              className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pop Out HUD</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. DYNAMIC WORKSPACE: NOW PLAYING + RADAR + FEED */}
      <div className="flex-1 flex space-x-3 overflow-hidden">
        {/* Left / Side Panel: Interactive Camelot Wheel Radar */}
        {showCamelotRadar && (
          <div className="hidden lg:flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 w-64 flex-shrink-0 shadow-lg relative">
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[11px] font-bold text-zinc-300 flex items-center space-x-1">
                <Compass className="w-3 h-3 text-cyan-400" />
                <span>HARMONIC RADAR</span>
              </span>
              <span className="text-[9px] text-zinc-500 font-mono">CLICK TO FILTER</span>
            </div>

            <CamelotWheelRadar
              currentKey={nowPlaying.camelotKey}
              selectedKeyFilter={selectedKeyFilter}
              onSelectKey={(k) => setSelectedKeyFilter(k)}
              compact={false}
            />

            {/* Quick Keyboard Reference */}
            <div className="mt-3 pt-2 border-t border-zinc-800/80 w-full flex items-center justify-around text-[10px] text-zinc-400 font-mono">
              <span className="flex items-center space-x-1">
                <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-cyan-300">Space</kbd>
                <span>Audition</span>
              </span>
              <span className="flex items-center space-x-1">
                <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-cyan-300">A/B</kbd>
                <span>Load</span>
              </span>
              <span className="flex items-center space-x-1">
                <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-cyan-300">Q</kbd>
                <span>Queue</span>
              </span>
            </div>
          </div>
        )}

        {/* Main Center Column: Hero Card + Vibe Filters + Recommendations Feed */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* NOW PLAYING HUD (Collapsible) */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-zinc-950 via-zinc-900/90 to-zinc-950 border border-zinc-800 p-2 sm:p-2.5 mb-2 shadow-lg flex-shrink-0 transition-all">
            {isNowPlayingExpanded ? (
              <div className="flex items-center justify-between">
                {/* Left: Vinyl Platter & Track Metadata */}
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="relative flex-shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-zinc-950 border border-zinc-700/60 flex items-center justify-center shadow-lg overflow-hidden">
                    <Disc className={`w-6 h-6 sm:w-8 sm:h-8 text-cyan-400/90 ${nowPlaying.isPlaying ? 'animate-[spin_3s_linear_infinite]' : ''}`} />
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-600" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-cyan-400 flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                        <span>NOW PLAYING</span>
                      </span>
                      {nowPlaying.deckId && (
                        <span className="text-[8.5px] font-black text-cyan-300 bg-cyan-950/80 px-1 py-0.2 rounded border border-cyan-800/40">
                          DECK {nowPlaying.deckId}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-xs sm:text-sm text-white truncate max-w-[200px] sm:max-w-md">
                      {nowPlaying.title}
                    </h3>
                    <p className="text-[11px] text-zinc-400 truncate max-w-[200px] sm:max-w-md">
                      {nowPlaying.artist} {nowPlaying.album ? `— ${nowPlaying.album}` : ''}
                    </p>
                  </div>
                </div>

                {/* Right: Key + BPM + Circular Countdown Ring + Collapse Button */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <div className={`px-2 py-0.5 rounded-md border flex flex-col items-center ${nowColor.bg} ${nowColor.border}`}>
                    <span className="text-[7.5px] font-bold text-zinc-400 uppercase">KEY</span>
                    <span className={`font-black text-xs ${nowColor.text}`}>{nowPlaying.camelotKey}</span>
                  </div>

                  <div className="px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 flex flex-col items-center">
                    <span className="text-[7.5px] font-bold text-zinc-400 uppercase">BPM</span>
                    <span className="font-black text-xs text-cyan-300">{nowPlaying.bpm.toFixed(1)}</span>
                  </div>

                  <div className="relative flex items-center justify-center w-9 h-9">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-zinc-800"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={`${isUrgent ? 'text-rose-500 animate-pulse' : 'text-cyan-400'} transition-all duration-300`}
                        strokeDasharray={`${remainingPct}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <Clock className={`w-2 h-2 ${isUrgent ? 'text-rose-400 animate-bounce' : 'text-zinc-400'}`} />
                      <span className={`text-[8px] font-mono font-bold ${isUrgent ? 'text-rose-400' : 'text-zinc-200'}`}>
                        {formatTimeRemaining(nowPlaying.remainingTime)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsNowPlayingExpanded(false)}
                    title="Collapse Now Playing banner"
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer transition"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Compact Mini-Strip */
              <div className="flex items-center justify-between h-7 text-xs">
                <div className="flex items-center space-x-2 min-w-0">
                  <Disc className={`w-4 h-4 text-cyan-400 flex-shrink-0 ${nowPlaying.isPlaying ? 'animate-[spin_3s_linear_infinite]' : ''}`} />
                  {nowPlaying.deckId && (
                    <span className="text-[8.5px] font-bold text-cyan-300 bg-cyan-950 px-1 py-0.2 rounded border border-cyan-800/50 flex-shrink-0">
                      {nowPlaying.deckId}
                    </span>
                  )}
                  <span className="font-bold text-white truncate max-w-[120px] sm:max-w-[200px]">{nowPlaying.title}</span>
                  <span className="text-zinc-400 truncate hidden sm:inline text-[11px]">— {nowPlaying.artist}</span>
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-black border ${nowColor.bg} ${nowColor.border} ${nowColor.text}`}>
                    {nowPlaying.camelotKey}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-zinc-900 border border-zinc-800 text-cyan-300 font-mono">
                    {nowPlaying.bpm.toFixed(0)} BPM
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${isUrgent ? 'text-rose-400 animate-pulse' : 'text-zinc-400'}`}>
                    {formatTimeRemaining(nowPlaying.remainingTime)}
                  </span>
                  <button
                    onClick={() => setIsNowPlayingExpanded(true)}
                    title="Expand Now Playing details"
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer transition"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* VIBE & STRATEGY FILTER BAR */}
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-2 mb-2 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
            {/* Strategy Buttons */}
            <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setStrategy('all')}
                className={`px-2.5 py-0.8 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  strategy === 'all'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                All Ideas
              </button>
              <button
                onClick={() => setStrategy('maintain')}
                className={`flex items-center space-x-1 px-2.5 py-0.8 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  strategy === 'maintain'
                    ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <Music className="w-3 h-3" />
                <span>Maintain</span>
              </button>
              <button
                onClick={() => setStrategy('boost')}
                className={`flex items-center space-x-1 px-2.5 py-0.8 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  strategy === 'boost'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>Boost</span>
              </button>
              <button
                onClick={() => setStrategy('chill')}
                className={`flex items-center space-x-1 px-2.5 py-0.8 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  strategy === 'chill'
                    ? 'bg-teal-500 text-black shadow-md shadow-teal-500/20'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <Waves className="w-3 h-3" />
                <span>Cooldown</span>
              </button>
              <button
                onClick={() => setStrategy('peak')}
                className={`flex items-center space-x-1 px-2.5 py-0.8 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  strategy === 'peak'
                    ? 'bg-rose-500 text-black shadow-md shadow-rose-500/20'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <Flame className="w-3 h-3" />
                <span>Peak</span>
              </button>
              <button
                onClick={() => setStrategy('style')}
                className={`flex items-center space-x-1 px-2.5 py-0.8 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  strategy === 'style'
                    ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>My Style</span>
              </button>
            </div>

            {/* BPM Tolerance + Half-Double + Key Filter + Search */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 bg-zinc-950 px-2 py-0.5 rounded-lg border border-zinc-800 text-xs">
                <span className="text-zinc-500 text-[10px]">BPM:</span>
                <select
                  value={bpmTolerance}
                  onChange={(e) => setBpmTolerance(parseFloat(e.target.value) as CortexBpmTolerance)}
                  className="bg-transparent text-zinc-200 cursor-pointer focus:outline-none text-xs"
                >
                  <option value={0.03} className="bg-zinc-900">±3% (Tight)</option>
                  <option value={0.06} className="bg-zinc-900">±6% (Mixable)</option>
                  <option value={0.10} className="bg-zinc-900">±10% (Wide)</option>
                  <option value={1.0} className="bg-zinc-900">Any BPM</option>
                </select>
              </div>

              <button
                onClick={() => setAllowHalfDouble(!allowHalfDouble)}
                title="Toggle Half/Double Tempo matching (e.g. 70 BPM to 140 BPM)"
                className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition border cursor-pointer ${
                  allowHalfDouble
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                    : 'bg-zinc-950 text-zinc-500 border-zinc-800'
                }`}
              >
                2x/0.5x
              </button>

              <div className="flex items-center space-x-1 bg-zinc-950 px-2 py-0.5 rounded-lg border border-zinc-800 text-xs">
                <span className="text-zinc-500 text-[10px]">KEY:</span>
                <select
                  value={harmonicMode}
                  onChange={(e) => setHarmonicMode(e.target.value as CortexHarmonicMode)}
                  className="bg-transparent text-zinc-200 cursor-pointer focus:outline-none text-xs"
                >
                  <option value="strict" className="bg-zinc-900">Camelot Lock (±1)</option>
                  <option value="boost" className="bg-zinc-900">Modulations (+1/+2)</option>
                  <option value="open" className="bg-zinc-900">Open Harmonic</option>
                </select>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Instant search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 w-28 sm:w-36 transition"
                />
              </div>
            </div>
          </div>

          {/* NEXT TRACK IDEAS FEED (High-Performance Windowed Scroll) */}
          <div
            ref={feedContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-zinc-800"
          >
            <div className="flex items-center justify-between text-xs text-zinc-400 px-1 py-0.5 mb-1 flex-shrink-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-zinc-200 text-xs">
                  MixCortex Ideas ({recommendations.length})
                </span>
                <span className="text-[10px] text-zinc-500 hidden sm:inline">
                  • {tracks.length} indexed
                </span>
              </div>

              {/* Density View Mode Toggle */}
              <div className="flex items-center space-x-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                <button
                  onClick={() => setDensity('compact')}
                  title="Compact List View (Fit maximum tracks on screen)"
                  className={`px-1.5 py-0.5 rounded flex items-center space-x-1 text-[10px] font-semibold transition cursor-pointer ${
                    density === 'compact'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <LayoutList className="w-3 h-3" />
                  <span>Compact</span>
                </button>
                <button
                  onClick={() => setDensity('comfortable')}
                  title="Card View (Detailed Camelot & Energy breakdown)"
                  className={`px-1.5 py-0.5 rounded flex items-center space-x-1 text-[10px] font-semibold transition cursor-pointer ${
                    density === 'comfortable'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Grid className="w-3 h-3" />
                  <span>Cards</span>
                </button>
              </div>
            </div>

            {recommendations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 text-center p-6">
                <Disc className="w-8 h-8 text-zinc-600 mb-2 animate-spin" />
                <p className="font-semibold text-zinc-300 text-xs">No matching tracks found</p>
                <p className="text-[11px] text-zinc-500 mt-1 max-w-sm">
                  Try switching BPM tolerance to "Any BPM" or Key to "Open Harmonic".
                </p>
              </div>
            ) : (
              visibleRecommendations.map((rec, idx) => (
                <CortexRecommendationCard
                  key={rec.track.id}
                  rec={rec}
                  density={density}
                  isFocused={focusedIndex === idx}
                  isPreviewing={auditionState.isPlaying && auditionState.track?.id === rec.track.id}
                  previewProgress={auditionState.progress}
                  addedQueueId={addedQueueId}
                  onTogglePreview={handleTogglePreview}
                  onLoadDeck={handleLoadDeck}
                  onAddToQueue={handleAddToQueue}
                  onSelectCard={() => setFocusedIndex(idx)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. "MY STYLE" LEARNING MODAL */}
      {isStyleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1219] border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/80">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-base">MixCortex "My Style" Model</h3>
              </div>
              <button
                onClick={() => setIsStyleModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl text-xs text-purple-200">
                <p className="font-semibold text-purple-300 mb-1">
                  How MixCortex "My Style" Learning Works:
                </p>
                MixCortex observes your live transitions as you DJ. When you mix from Track A into Track B, MixCortex records this harmonic pair affinity. Tracks you frequently pair together receive recommendation boosts with the <span className="text-purple-300 font-bold">⭐ My Style Favorite</span> badge.
              </div>

              <div>
                <h4 className="font-bold text-xs text-zinc-300 uppercase tracking-wider mb-2">
                  Learned Transition Pairings ({styleRecords.length})
                </h4>

                {styleRecords.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-xs">
                    No transition pairs recorded yet. As you mix songs in CloudMix Pro or djay Pro, your custom transition pairs will appear here!
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {styleRecords.map((rec, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-white truncate max-w-[150px]">
                              {rec.sourceTitle}
                            </span>
                            <ArrowRight className="w-3 h-3 text-purple-400 flex-shrink-0" />
                            <span className="font-semibold text-cyan-300 truncate max-w-[150px]">
                              {rec.targetTitle}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            {rec.sourceArtist} ➔ {rec.targetArtist}
                          </p>
                        </div>

                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold text-[11px] border border-purple-500/30">
                          {rec.transitionCount} {rec.transitionCount === 1 ? 'blend' : 'blends'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 border-t border-zinc-800 flex justify-end bg-zinc-900/40">
              <button
                onClick={() => setIsStyleModalOpen(false)}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Backwards compatibility alias
export const PulseDJCoPilot = CortexDJCoPilot;
