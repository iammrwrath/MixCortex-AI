/**
 * UniversalDjBridgeService
 * Universal Cross-Software DJ Integration Hub for MixCortex AI.
 * Seamlessly integrates MixCortex AI with:
 * - CloudMix Pro (Two-way IPC / BroadcastChannel & Remote Deck Loading)
 * - Algoriddim djay Pro (Real-time SQLite MediaLibrary.db inspection)
 * - Serato DJ Pro (History Session Watcher & nowplaying.txt)
 * - Pioneer Rekordbox (Live metadata watcher)
 * - VirtualDJ & Native Instruments Traktor Pro (Broadcast metadata)
 */

import { CortexNowPlaying, CortexSourceMode, CortexTrack } from '../types/cortex';
import { cortexAiService } from './CortexAiService';
import { cortexMonitorService } from './CortexMonitorService';

export interface DjSoftwareConnection {
  id: CortexSourceMode;
  name: string;
  status: 'connected' | 'polling' | 'disconnected' | 'manual';
  latencyMs?: number;
  lastUpdated?: string;
  details?: string;
}

export type BridgeListener = (status: {
  activeSource: CortexSourceMode;
  connections: Record<CortexSourceMode, DjSoftwareConnection>;
  nowPlaying: CortexNowPlaying;
}) => void;

class UniversalDjBridgeService {
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Set<BridgeListener> = new Set();

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
      // Update connection status based on active source
      const currentSource = nowPlaying.source;
      if (this.connections[currentSource]) {
        this.connections[currentSource].status = nowPlaying.isPlaying ? 'connected' : 'polling';
        this.connections[currentSource].lastUpdated = new Date().toLocaleTimeString();
      }
      this.notify();
    });
  }

  private handleIncomingBroadcast(data: any) {
    if (!data || !data.type) return;

    if (data.type === 'CLOUBMIX_STATE_UPDATE') {
      this.connections.cloudmix.status = 'connected';
      this.connections.cloudmix.lastUpdated = new Date().toLocaleTimeString();

      if (cortexMonitorService.getNowPlaying().source === 'cloudmix') {
        // Broadcast received from standalone CloudMix Pro workstation
        if (data.activeTrack) {
          cortexMonitorService.setManualTrack(data.activeTrack);
        }
      }
      this.notify();
    }
  }

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
    };
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((l) => l(s));
  }

  public setSource(source: CortexSourceMode) {
    cortexMonitorService.setSource(source);
    this.notify();
  }

  // Remote Load into CloudMix Pro Deck A or B (works from standalone MixCortex into CloudMix Pro!)
  public loadIntoCloudMixDeck(deckId: 'A' | 'B', track: CortexTrack) {
    // 1. BroadcastChannel local event
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'LOAD_TRACK_COMMAND',
        targetDeck: deckId,
        track,
        timestamp: Date.now(),
      });
    }

    // 2. Desktop API Bridge (if available)
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

  // Copy track information formatted for instant search in djay Pro, Serato, Rekordbox, Traktor, VirtualDJ
  public copyForExternalDjSearch(track: CortexTrack): string {
    const searchString = `${track.artist} ${track.title}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(searchString).catch(() => {});
    }
    return searchString;
  }
}

export const universalDjBridge = new UniversalDjBridgeService();
