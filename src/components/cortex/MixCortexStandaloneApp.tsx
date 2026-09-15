import React, { useState, useEffect, useRef } from 'react';
import { CortexDJCoPilot } from './CortexDJCoPilot';
import { universalDjBridge, DjSoftwareConnection } from '../../services/UniversalDjBridgeService';
import { cortexMonitorService } from '../../services/CortexMonitorService';
import { CortexTrack, CortexSourceMode } from '../../types/cortex';
import {
  Pin,
  PinOff,
  Minimize2,
  Maximize2,
  X,
  Radio,
  Sliders,
  Sparkles,
  ExternalLink,
  Shield,
  Layers,
  Copy,
  Check,
  Disc,
  ArrowRight,
  Activity,
  Compass,
  Laptop,
} from 'lucide-react';

interface MixCortexStandaloneAppProps {
  onOpenPatchModal?: () => void;
}

export const MixCortexStandaloneApp: React.FC<MixCortexStandaloneAppProps> = ({ onOpenPatchModal }) => {
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(true);
  const [opacity, setOpacity] = useState(1.0);
  const [activeTab, setActiveTab] = useState<'copilot' | 'bridge'>('copilot');
  const [bridgeState, setBridgeState] = useState(universalDjBridge.getState());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = universalDjBridge.subscribe(setBridgeState);
    return () => unsub();
  }, []);

  const handleTogglePin = () => {
    const next = !isAlwaysOnTop;
    setIsAlwaysOnTop(next);
    if ((window as any).desktopAPI?.setAlwaysOnTop) {
      (window as any).desktopAPI.setAlwaysOnTop(next);
    }
  };

  const handleOpacityChange = (newVal: number) => {
    setOpacity(newVal);
    if ((window as any).desktopAPI?.setWindowOpacity) {
      (window as any).desktopAPI.setWindowOpacity(newVal);
    }
  };

  const handleMinimize = () => {
    if ((window as any).desktopAPI?.minimizeWindow) {
      (window as any).desktopAPI.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    if ((window as any).desktopAPI?.maximizeWindow) {
      (window as any).desktopAPI.maximizeWindow();
    }
  };

  const handleClose = () => {
    if ((window as any).desktopAPI?.closeWindow) {
      (window as any).desktopAPI.closeWindow();
    } else {
      window.close();
    }
  };

  // Remote load into CloudMix Pro from standalone MixCortex!
  const handleRemoteLoad = (deckId: 'A' | 'B', track: any) => {
    universalDjBridge.loadIntoCloudMixDeck(deckId, track);
    setCopiedId(`load_${deckId}_${track.id}`);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div
      className="flex flex-col h-screen w-screen bg-[#07090e] text-zinc-100 select-none overflow-hidden font-sans border border-slate-800"
      style={{ opacity }}
    >
      {/* 1. CUSTOM PRO-AUDIO FRAMELESS TITLE BAR */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-slate-950 via-[#0c0e18] to-slate-950 border-b border-slate-800/90 text-xs shrink-0 select-none"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* Left: Brand Identity Logo */}
        <div className="flex items-center space-x-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-md shadow-purple-500/30">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-white" strokeWidth="2.5">
              <path d="M12 3a9 9 0 0 0-9 9c0 3.5 2 6.5 5 8" strokeLinecap="round" />
              <path d="M12 3a9 9 0 0 1 9 9c0 3.5-2 6.5-5 8" strokeLinecap="round" />
              <circle cx="12" cy="12" r="3" fill="#22d3ee" />
            </svg>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <span className="font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-cyan-300 font-mono text-xs sm:text-sm">
              MIXCORTEX
            </span>
            <span className="hidden sm:inline-block px-1 py-0.2 rounded text-[9px] font-mono font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
              AI
            </span>
            {onOpenPatchModal && (
              <button
                onClick={onOpenPatchModal}
                title="MixCortex AI v1.0.1 — Check GitHub for updates"
                className="hidden sm:flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors cursor-pointer ml-1"
              >
                <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                <span>v1.0.1</span>
              </button>
            )}
          </div>
        </div>

        {/* Center: Tabs & Source Selector */}
        <div className="flex items-center space-x-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            onClick={() => setActiveTab('copilot')}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[11px] sm:text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'copilot'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>Co-Pilot</span>
          </button>

          <button
            onClick={() => setActiveTab('bridge')}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[11px] sm:text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'bridge'
                ? 'bg-cyan-600 text-black shadow-sm shadow-cyan-500/30'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Bridge</span>
            {bridgeState.connections[bridgeState.activeSource]?.status === 'connected' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-0.5" />
            )}
          </button>
        </div>

        {/* Right: Opacity Slider, Always-on-top Pin & Window Controls */}
        <div className="flex items-center space-x-1.5" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {/* Opacity Control */}
          <div className="hidden sm:flex items-center space-x-1 bg-slate-900/90 px-2 py-0.5 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400">
            <span>Opacity</span>
            <input
              type="range"
              min="0.4"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
              className="w-12 h-1 accent-purple-500 cursor-pointer"
              title={`Window Opacity: ${Math.round(opacity * 100)}%`}
            />
          </div>

          {/* Always-on-top Pin Button */}
          <button
            onClick={handleTogglePin}
            title={isAlwaysOnTop ? 'Always-on-Top Pinned (Click to unpin)' : 'Pin Always-on-Top'}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
              isAlwaysOnTop
                ? 'bg-purple-600/30 text-purple-300 border-purple-500/60 shadow-sm'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            {isAlwaysOnTop ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
          </button>

          {/* Window Min/Max/Close */}
          <button
            onClick={handleMinimize}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            title="Minimize"
          >
            <div className="w-2.5 h-0.5 bg-current my-1" />
          </button>
          <button
            onClick={handleMaximize}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            title="Maximize / Restore"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-red-600/80 text-slate-400 hover:text-white cursor-pointer transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT: CO-PILOT WORKSTATION VS UNIVERSAL DJ BRIDGE */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'copilot' ? (
          <CortexDJCoPilot
            onLoadTrackToDeck={(deckId, track) => handleRemoteLoad(deckId as any, track)}
            compact={true}
          />
        ) : (
          /* UNIVERSAL DJ SOFTWARE INTEGRATION HUB */
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full">
            {/* Header Description */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/30 via-slate-900/60 to-cyan-950/30 border border-slate-800">
              <div className="flex items-center space-x-2 text-sm font-bold text-white font-mono">
                <Laptop className="w-4 h-4 text-cyan-400" />
                <span>Universal DJ Software Integrations</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                MixCortex AI runs seamlessly alongside all major DJ software. Select your active source below to automatically read what is playing on deck and receive instantaneous harmonic recommendations.
              </p>
            </div>

            {/* Connection Matrix Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. CloudMix Pro */}
              <div
                onClick={() => universalDjBridge.setSource('cloudmix')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  bridgeState.activeSource === 'cloudmix'
                    ? 'bg-purple-950/40 border-purple-500 shadow-[0_0_14px_rgba(168,85,247,0.3)] ring-1 ring-purple-400'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs">
                      ⚡
                    </div>
                    <span className="font-bold text-sm text-white">CloudMix Pro</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      bridgeState.activeSource === 'cloudmix'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {bridgeState.activeSource === 'cloudmix' ? 'ACTIVE' : 'READY'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Direct BroadcastChannel sync with remote 1-click loading into Deck A & Deck B.
                </p>
              </div>

              {/* 2. Algoriddim djay Pro */}
              <div
                onClick={() => universalDjBridge.setSource('djay_pro')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  bridgeState.activeSource === 'djay_pro'
                    ? 'bg-cyan-950/40 border-cyan-500 shadow-[0_0_14px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-cyan-600/30 text-cyan-400 flex items-center justify-center font-bold text-xs">
                      🎧
                    </div>
                    <span className="font-bold text-sm text-white">Algoriddim djay Pro</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      bridgeState.activeSource === 'djay_pro'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {bridgeState.activeSource === 'djay_pro' ? 'ACTIVE' : 'POLLING'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Reads active songs from djay Pro SQLite MediaLibrary.db & StreamerBot nowplaying.
                </p>
              </div>

              {/* 3. Serato DJ Pro & Rekordbox */}
              <div
                onClick={() => universalDjBridge.setSource('file')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  bridgeState.activeSource === 'file'
                    ? 'bg-amber-950/40 border-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.3)] ring-1 ring-amber-400'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-600/30 text-amber-400 flex items-center justify-center font-bold text-xs">
                      🎛️
                    </div>
                    <span className="font-bold text-sm text-white">Serato & Rekordbox</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      bridgeState.activeSource === 'file'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {bridgeState.activeSource === 'file' ? 'ACTIVE' : 'WATCHER'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Listens to C:\StreamerBot\nowplaying.txt and standard session history broadcast logs.
                </p>
              </div>

              {/* 4. Manual Pin Reference */}
              <div
                onClick={() => universalDjBridge.setSource('manual')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  bridgeState.activeSource === 'manual'
                    ? 'bg-purple-950/40 border-purple-500 shadow-[0_0_14px_rgba(168,85,247,0.3)] ring-1 ring-purple-400'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-600/30 text-purple-400 flex items-center justify-center font-bold text-xs">
                      📌
                    </div>
                    <span className="font-bold text-sm text-white">Manual Pin Mode</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      bridgeState.activeSource === 'manual'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {bridgeState.activeSource === 'manual' ? 'ACTIVE' : 'MANUAL'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Manually lock onto any reference track or BPM/Key to plan your next transition.
                </p>
              </div>
            </div>

            {/* Quick Actions & Search Guide */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs space-y-2">
              <span className="font-bold text-slate-300 uppercase tracking-wider font-mono text-[11px]">
                Pro Performance Tip: 1-Click Clipboard Search
              </span>
              <p className="text-slate-400 leading-relaxed">
                When using <strong className="text-slate-200">Algoriddim djay Pro</strong> or <strong className="text-slate-200">Serato</strong>, click the <Copy className="w-3 h-3 inline text-slate-300 mx-0.5" /> copy button on any card in MixCortex. It instantly copies the exact artist and title to your clipboard. Then press <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono text-cyan-300">Ctrl+F</kbd> inside your DJ app to load the track immediately!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
