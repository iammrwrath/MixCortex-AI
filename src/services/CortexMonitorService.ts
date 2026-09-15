/**
 * CortexMonitorService
 * Continuously monitors what track is currently playing across multiple DJ software sources:
 * - CloudMix Pro Decks (Deck A & Deck B)
 * - Algoriddim djay Pro (Direct SQLite MediaLibrary.db polling / Trigger)
 * - Streamer.bot / Serato File Watcher (nowplaying.txt)
 * - Manual Selection / Pin Mode
 */

import { CortexNowPlaying, CortexSourceMode, CortexTrack } from '../types/cortex';
import { DeckState } from '../types/dj';
import { cortexAiService } from './CortexAiService';
import { musicLibraryService } from './MusicLibraryService';

type CortexMonitorListener = (nowPlaying: CortexNowPlaying) => void;

export class CortexMonitorService {
  private nowPlaying: CortexNowPlaying = {
    track: null,
    source: 'cloudmix',
    deckId: 'A',
    title: 'Ready for Next Track',
    artist: 'MixCortex Co-Pilot',
    bpm: 126.0,
    key: '8A',
    camelotKey: '8A',
    energyLevel: 7,
    currentTime: 0,
    duration: 180,
    remainingTime: 180,
    isPlaying: false,
  };

  private listeners: Set<CortexMonitorListener> = new Set();
  private pollInterval: number | null = null;
  private deckStateProvider: (() => { deckA: DeckState; deckB: DeckState; crossfader?: number }) | null = null;
  private lastTrackId: string | null = null;
  private manualTrack: CortexTrack | null = null;

  constructor() {
    this.startPolling();
  }

  public subscribe(listener: CortexMonitorListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.nowPlaying });
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l({ ...this.nowPlaying }));
  }

  public setSource(source: CortexSourceMode) {
    this.nowPlaying.source = source;
    this.notify();
    this.pollNowPlaying();
  }

  public setDeckStateProvider(provider: () => { deckA: DeckState; deckB: DeckState; crossfader?: number }) {
    this.deckStateProvider = provider;
  }

  public setManualTrack(track: CortexTrack) {
    this.manualTrack = track;
    this.nowPlaying.track = track;
    this.nowPlaying.source = 'manual';
    this.nowPlaying.title = track.title;
    this.nowPlaying.artist = track.artist;
    this.nowPlaying.album = track.album;
    this.nowPlaying.bpm = track.bpm;
    this.nowPlaying.key = track.key;
    this.nowPlaying.camelotKey = track.camelotKey;
    this.nowPlaying.energyLevel = track.energyLevel;
    this.nowPlaying.duration = track.duration;
    this.nowPlaying.remainingTime = track.duration;
    this.nowPlaying.isPlaying = true;
    this.notify();
  }

  private startPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = window.setInterval(() => {
      this.pollNowPlaying();
    }, 500);
  }

  private async pollNowPlaying() {
    switch (this.nowPlaying.source) {
      case 'cloudmix':
        this.pollCloudMix();
        break;
      case 'djay_pro':
        await this.pollDjayPro();
        break;
      case 'file':
        await this.pollExternalFile();
        break;
      case 'manual':
        break;
    }
  }

  // 1. CloudMix Pro Active Deck Listener
  private pollCloudMix() {
    if (!this.deckStateProvider) return;

    const { deckA, deckB, crossfader = 0 } = this.deckStateProvider();
    const isPlayingA = deckA.isPlaying;
    const isPlayingB = deckB.isPlaying;

    let activeDeckId: 'A' | 'B' = 'A';
    let activeDeck = deckA;

    if (isPlayingA && !isPlayingB) {
      activeDeckId = 'A';
      activeDeck = deckA;
    } else if (!isPlayingA && isPlayingB) {
      activeDeckId = 'B';
      activeDeck = deckB;
    } else if (isPlayingA && isPlayingB) {
      if (crossfader > 0.1) {
        activeDeckId = 'B';
        activeDeck = deckB;
      } else {
        activeDeckId = 'A';
        activeDeck = deckA;
      }
    } else {
      if (deckB.track && !deckA.track) {
        activeDeckId = 'B';
        activeDeck = deckB;
      } else {
        activeDeckId = 'A';
        activeDeck = deckA;
      }
    }

    const currentLiveTime = activeDeck.currentTime || 0;
    const duration = activeDeck.duration || (activeDeck.track?.duration ?? 180);
    const remaining = Math.max(0, Math.round(duration - currentLiveTime));
    const isPlaying = activeDeckId === 'A' ? isPlayingA : isPlayingB;

    if (activeDeck.track) {
      const cortexT = musicLibraryService.convertDjTrackToPulse(activeDeck.track);

      // Track transition detection for 'My Style' learning
      if (this.lastTrackId && this.lastTrackId !== cortexT.id && this.nowPlaying.track) {
        cortexAiService.recordTransition(this.nowPlaying.track, cortexT);
      }
      this.lastTrackId = cortexT.id;

      this.nowPlaying = {
        track: cortexT,
        source: 'cloudmix',
        deckId: activeDeckId,
        title: cortexT.title,
        artist: cortexT.artist,
        album: cortexT.album,
        bpm: cortexT.bpm,
        key: cortexT.key,
        camelotKey: cortexT.camelotKey,
        energyLevel: cortexT.energyLevel,
        currentTime: currentLiveTime,
        duration,
        remainingTime: remaining,
        isPlaying,
        coverArtUrl: cortexT.coverArtUrl,
      };
    } else {
      this.nowPlaying.currentTime = currentLiveTime;
      this.nowPlaying.duration = duration;
      this.nowPlaying.remainingTime = remaining;
      this.nowPlaying.isPlaying = isPlaying;
      this.nowPlaying.deckId = activeDeckId;
    }

    this.notify();
  }

  // 2. Algoriddim djay Pro Database / Trigger Polling
  private async pollDjayPro() {
    if (!(window as any).desktopAPI?.readDjayNowPlaying) return;

    try {
      const djayInfo = await (window as any).desktopAPI.readDjayNowPlaying();
      if (djayInfo && djayInfo.title && djayInfo.title !== 'Unknown') {
        const camelot = cortexAiService.normalizeCamelotKey(djayInfo.key || '8A');
        const bpm = parseFloat(djayInfo.bpm) || 124.0;

        const cortexT: CortexTrack = {
          id: `djay_${djayInfo.title}_${djayInfo.artist}`.replace(/[^a-z0-9]/gi, '_'),
          title: djayInfo.title,
          artist: djayInfo.artist || 'djay Pro Artist',
          bpm,
          key: djayInfo.key || camelot,
          camelotKey: camelot,
          energyLevel: bpm >= 128 ? 8 : 6,
          duration: djayInfo.duration || 210,
          fileUrl: '',
          fileSource: 'djay_import',
        };

        const rawDeck = djayInfo.deck ? String(djayInfo.deck) : '1';
        const deckId = rawDeck === '1' ? 'A' : rawDeck === '2' ? 'B' : rawDeck;

        const isChanged =
          this.nowPlaying.title !== cortexT.title ||
          this.nowPlaying.deckId !== deckId ||
          this.nowPlaying.camelotKey !== cortexT.camelotKey ||
          Math.abs(this.nowPlaying.bpm - cortexT.bpm) > 0.4;

        if (isChanged) {
          if (this.nowPlaying.track && this.nowPlaying.title !== cortexT.title) {
            cortexAiService.recordTransition(this.nowPlaying.track, cortexT);
          }
          this.nowPlaying = {
            track: cortexT,
            source: 'djay_pro',
            deckId,
            title: cortexT.title,
            artist: cortexT.artist,
            bpm: cortexT.bpm,
            key: cortexT.key,
            camelotKey: cortexT.camelotKey,
            energyLevel: cortexT.energyLevel,
            currentTime: djayInfo.currentTime || 0,
            duration: cortexT.duration,
            remainingTime: djayInfo.remainingTime ?? Math.max(0, cortexT.duration - (djayInfo.currentTime || 0)),
            isPlaying: true,
          };
          this.notify();
        } else {
          this.nowPlaying.currentTime = djayInfo.currentTime ?? this.nowPlaying.currentTime;
          this.nowPlaying.remainingTime = djayInfo.remainingTime ?? Math.max(0, this.nowPlaying.duration - this.nowPlaying.currentTime);
          this.notify();
        }
      }
    } catch (err) {
      console.warn('djay Pro poll error:', err);
    }
  }

  // 3. External File Watcher (C:\StreamerBot\nowplaying.txt)
  private async pollExternalFile() {
    if (!(window as any).desktopAPI?.readExternalNowPlayingFile) return;

    try {
      const text = await (window as any).desktopAPI.readExternalNowPlayingFile(
        'C:\\StreamerBot\\nowplaying.txt'
      );
      if (text && text.trim() && text !== this.nowPlaying.title) {
        this.parseNowPlayingText(text.trim());
      }
    } catch (err) {
      console.warn('External file poll error:', err);
    }
  }

  private parseNowPlayingText(rawText: string) {
    let title = rawText;
    let artist = 'DJ Track';
    let bpm = 126.0;
    let key = '8A';

    const bpmKeyMatch = rawText.match(/\[([0-9.]+)\s*BPM\s*\|\s*([0-9a-zA-Z]+)\]/i);
    if (bpmKeyMatch) {
      bpm = parseFloat(bpmKeyMatch[1]) || 126.0;
      key = bpmKeyMatch[2].trim();
    }

    const cleanName = rawText.replace(/\[.*?\]|\(.*?\)/g, '').trim();
    if (cleanName.includes(' - ')) {
      const parts = cleanName.split(' - ');
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    } else {
      title = cleanName;
    }

    const camelotKey = cortexAiService.normalizeCamelotKey(key);

    const cortexT: CortexTrack = {
      id: `file_${title}_${artist}`.replace(/[^a-z0-9]/gi, '_'),
      title,
      artist,
      bpm,
      key,
      camelotKey,
      energyLevel: 7,
      duration: 180,
      fileUrl: '',
      fileSource: 'local',
    };

    this.nowPlaying = {
      track: cortexT,
      source: 'file',
      title,
      artist,
      bpm,
      key,
      camelotKey,
      energyLevel: 7,
      currentTime: 0,
      duration: 180,
      remainingTime: 180,
      isPlaying: true,
    };
    this.notify();
  }

  public getNowPlaying(): CortexNowPlaying {
    return { ...this.nowPlaying };
  }
}

export const cortexMonitorService = new CortexMonitorService();

// Backwards compatibility alias
export const pulseMonitorService = cortexMonitorService;
export const PulseMonitorService = CortexMonitorService;
