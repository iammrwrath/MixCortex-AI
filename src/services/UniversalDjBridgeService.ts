/**
 * UniversalDjBridgeService
 * Universal Cross-Software DJ Integration Hub for MixCortex AI.
 * Seamlessly integrates MixCortex AI with:
 * - CloudMix Pro (Two-way IPC / BroadcastChannel & Remote Deck Loading)
 * - Algoriddim djay Pro (Real-time SQLite MediaLibrary.db inspection)
 * - Serato DJ Pro (History Session Watcher & nowplaying.txt)
 * - Pioneer Rekordbox (Live metadata watcher)
 * - VirtualDJ & Native Instruments Traktor Pro (Broadcast metadata)
 *
 * Auto-Detection: polls every 3 seconds and automatically switches to the
 * highest-confidence detected source. CloudMix is detected via BroadcastChannel;
 * djay Pro and file sources are probed via Electron IPC.
 */

import { CortexNowPlaying, CortexSourceMode, CortexTrack } from '../types/cortex';
import { cortexAiService } from './CortexAiService';
import { cortexMonitorService } from './CortexMonitorService';

export interface DjSoftwareConnection {
  id: CortexSourceMode;
  name: string;
  status: 'connected' | 'polling' | 'disconnected' | 'manual' | 'auto-detected';
  latencyMs?: number;
  lastUpdated?: string;
  details?: string;
}

export type BridgeListener = (status: {
  activeSource: CortexSourceMode;
  connections: Record<CortexSourceMode, DjSoftwareConnection>;
  nowPlaying: CortexNowPlaying;
  autoDetectEnabled: boolean;
  lastDetectedSources: Partial<Record<CortexSourceMode, boolean>>;
}) => void;

// Detection priority — higher index = higher priority
const DETECTION_PRIORITY: CortexSourceMode[] = ['file', 'djay_pro', 'cloudmix'];

class UniversalDjBridgeService {
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Set<BridgeListener> = new Set();
  private autoDetectEnabled = true;
  private autoDetectInterval: ReturnType<typeof setInterval> | null = null;
  private cloudmixAliveUntil = 0; // timestamp ms — stays "alive" for 8s after last BroadcastChannel msg
  private lastDetectedSources: Partial<Record<CortexSourceMode, boolean>> = {};
  private userOverrodeSource = false; // set when user manually clicks a source card

  private connections: Record<CortexSourceMode, DjSoftwareConnection> = {
    cloudmix: {
      id: 'cloudmix',
      name: 'CloudMix Pro Workstation',
      status: 'polling',
      details: 'Two-way BroadcastChannel & Deck Control',
    },
    djay_pro: {
      id: 'djay_pro',
      name: 'Algoriddim djay Pro',
      status: 'polling',
      details: 'MediaLibrary.db SQLite Transaction Polling',
    },
    file: {
      id: 'file',
      name: 'Serato / Rekordbox / OBS (nowplaying.txt)',
      status: 'polling',
      details: 'C:\\StreamerBot\\nowplaying.txt live watcher',
    },
    manual: {
      id: 'manual',
      name: 'Manual Pin Reference',
      status: 'manual',
      details: 'Pinned user reference track',
    },
  };

  constructor() {
    this.initBroadcastChannel();
    this.initMonitorSync();
    this.startAutoDetect();
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('cloudmix_universal_bridge');
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingBroadcast(event.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel initialization warning:', err);
      }
    }
  }

  private initMonitorSync() {
    cortexMonitorService.subscribe((nowPlaying) => {
      const currentSource = nowPlaying.source;
      if (this.connections[currentSource]) {
        this.connections[currentSource].status = nowPlaying.isPlaying ? 'connected' : 'polling';
        this.connections[currentSource].lastUpdated = new Date().toLocaleTimeString();
      }
      this.notify();
    });
  }

  // ─── Auto-Detection ───────────────────────────────────────────────────────

  private startAutoDetect() {
    if (this.autoDetectInterval) clearInterval(this.autoDetectInterval);
    // Run immediately then every 3 seconds
    this.runAutoDetect();
    this.autoDetectInterval = setInterval(() => this.runAutoDetect(), 3000);
  }

  private async runAutoDetect() {
    if (!this.autoDetectEnabled) return;
    if (this.userOverrodeSource) return;

    // Build detection map
    const detected: Partial<Record<CortexSourceMode, boolean>> = {};

    // 1. CloudMix Pro — purely client-side via BroadcastChannel heartbeat
    detected.cloudmix = Date.now() < this.cloudmixAliveUntil;

    // 2. djay Pro + file — ask main process
    if (typeof window !== 'undefined' && (window as any).desktopAPI?.detectDjSoftware) {
      try {
        const result = await (window as any).desktopAPI.detectDjSoftware();
        if (result) {
          detected.djay_pro = !!result.djay_pro;
          detected.file = !!result.file;
        }
      } catch {}
    }

    this.lastDetectedSources = detected;

    // Update connection status badges
    for (const [src, alive] of Object.entries(detected) as [CortexSourceMode, boolean][]) {
      if (this.connections[src]) {
        if (alive) {
          this.connections[src].status = 'auto-detected';
        } else if (this.connections[src].status === 'auto-detected') {
          this.connections[src].status = 'polling';
        }
      }
    }

    // Pick highest-priority detected source
    const currentSource = cortexMonitorService.getNowPlaying().source;
    if (currentSource === 'manual') {
      // Never auto-switch out of manual — user explicitly pinned
      this.notify();
      return;
    }

    let bestSource: CortexSourceMode | null = null;
    for (const src of DETECTION_PRIORITY) {
      if (detected[src]) bestSource = src;
    }

    if (bestSource && bestSource !== currentSource) {
      cortexMonitorService.setSource(bestSource);
    }

    this.notify();
  }

  // ─── BroadcastChannel Handler ─────────────────────────────────────────────

  private handleIncomingBroadcast(data: any) {
    if (!data || !data.type) return;

    if (data.type === 'CLOUBMIX_STATE_UPDATE' || data.type === 'CLOUDMIX_STATE_UPDATE') {
      // Keep CloudMix alive for 8 seconds after last heartbeat
      this.cloudmixAliveUntil = Date.now() + 8000;
      this.connections.cloudmix.status = 'connected';
      this.connections.cloudmix.lastUpdated = new Date().toLocaleTimeString();

      if (cortexMonitorService.getNowPlaying().source === 'cloudmix') {
        if (data.activeTrack) {
          cortexMonitorService.setManualTrack(data.activeTrack);
        }
      }
      this.notify();
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  public subscribe(listener: BridgeListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public getState() {
    const nowPlaying = cortexMonitorService.getNowPlaying();
    return {
      activeSource: nowPlaying.source,
      connections: { ...this.connections },
      nowPlaying,
      autoDetectEnabled: this.autoDetectEnabled,
      lastDetectedSources: { ...this.lastDetectedSources },
    };
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((l) => l(s));
  }

  public setSource(source: CortexSourceMode) {
    // User manually chose a source — pause auto-detect switching until the next
    // auto-detect cycle finds something different (15s grace period)
    this.userOverrodeSource = true;
    setTimeout(() => { this.userOverrodeSource = false; }, 15000);
    cortexMonitorService.setSource(source);
    this.notify();
  }

  public setAutoDetect(enabled: boolean) {
    this.autoDetectEnabled = enabled;
    if (enabled) {
      this.userOverrodeSource = false;
      this.runAutoDetect();
    }
    this.notify();
  }

  // Remote Load into CloudMix Pro Deck A or B
  public loadIntoCloudMixDeck(deckId: 'A' | 'B', track: CortexTrack) {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'LOAD_TRACK_COMMAND',
        targetDeck: deckId,
        track,
        timestamp: Date.now(),
      });
    }

    if (typeof window !== 'undefined' && (window as any).desktopAPI?.writeNowPlayingBroadcast) {
      (window as any).desktopAPI.writeNowPlayingBroadcast({
        title: track.title,
        artist: track.artist,
        bpm: track.bpm,
        key: track.camelotKey,
        deck: deckId,
      }).catch(() => {});
    }
  }

  public copyForExternalDjSearch(track: CortexTrack): string {
    const searchString = `${track.artist} ${track.title}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(searchString).catch(() => {});
    }
    return searchString;
  }
}

export const universalDjBridge = new UniversalDjBridgeService();
