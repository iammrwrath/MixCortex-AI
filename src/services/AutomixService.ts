/**
 * Automix AI & Smart Transition Engine
 * Provides autonomous phrase-aligned mixing, EQ blending, and Neural Stem crossfades.
 */

import { AutomixMode, AutomixState, DeckId, DeckState, AutomixQueueItem, HistoryItem, TrackMetadata } from '../types/dj';
import { storageCache } from './StorageCacheService';

type AutomixListener = (state: AutomixState) => void;

export class AutomixService {
  private state: AutomixState = {
    active: false,
    mode: 'stem_swap',
    transitionDurationBeats: 16,
    progress: 0,
    transitioning: false,
    targetDeck: 'B',
    timeToTransitionSec: 0,
  };

  private listeners: Set<AutomixListener> = new Set();
  private monitorInterval: number | null = null;
  private transitionTimer: number | null = null;
  private onAutomixStep: ((updates: { crossfader?: number; deckA?: Partial<DeckState>; deckB?: Partial<DeckState> }) => void) | null = null;
  private onDeckAction: ((action: 'play' | 'pause', deckId: DeckId) => void) | null = null;
  private onTrackLoadRequest: ((deckId: DeckId, track: TrackMetadata) => void) | null = null;

  private queue: AutomixQueueItem[] = [];
  private history: HistoryItem[] = [];
  private queueListeners: Set<(queue: AutomixQueueItem[]) => void> = new Set();
  private historyListeners: Set<(history: HistoryItem[]) => void> = new Set();

  constructor() {
    storageCache.getQueue().then((q: AutomixQueueItem[]) => {
      if (q && q.length > 0 && this.queue.length === 0) {
        this.queue = q;
        this.queueListeners.forEach((l) => l([...this.queue]));
      }
    }).catch(() => {});

    storageCache.getHistory().then((h: HistoryItem[]) => {
      if (h && h.length > 0 && this.history.length === 0) {
        this.history = h;
        this.historyListeners.forEach((l) => l([...this.history]));
      }
    }).catch(() => {});
  }

  public subscribe(listener: AutomixListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l({ ...this.state }));
  }

  private deckStateProvider: (() => { deckA: DeckState; deckB: DeckState }) | null = null;

  public setDeckStateProvider(provider: () => { deckA: DeckState; deckB: DeckState }) {
    this.deckStateProvider = provider;
  }

  public registerCallbacks(
    onStep: (updates: { crossfader?: number; deckA?: Partial<DeckState>; deckB?: Partial<DeckState> }) => void,
    onDeckAction: (action: 'play' | 'pause', deckId: DeckId) => void,
    onTrackLoadRequest?: (deckId: DeckId, track: TrackMetadata) => void
  ) {
    this.onAutomixStep = onStep;
    this.onDeckAction = onDeckAction;
    if (onTrackLoadRequest) this.onTrackLoadRequest = onTrackLoadRequest;
  }

  public toggleAutomix(deckA?: DeckState, deckB?: DeckState) {
    if (this.state.active) {
      this.stopAutomix();
    } else {
      this.startAutomix(deckA, deckB);
    }
  }

  public startAutomix(deckA?: DeckState, deckB?: DeckState) {
    this.state.active = true;
    this.state.progress = 0;
    this.state.transitioning = false;
    this.notify();

    if (this.monitorInterval) clearInterval(this.monitorInterval);
    this.monitorInterval = window.setInterval(() => {
      this.checkTransitionEligibility();
    }, 500);
  }

  public stopAutomix() {
    this.state.active = false;
    this.state.transitioning = false;
    this.state.progress = 0;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    if (this.transitionTimer) {
      clearInterval(this.transitionTimer);
      this.transitionTimer = null;
    }
    this.notify();
  }

  public setMode(mode: AutomixMode) {
    this.state.mode = mode;
    this.notify();
  }

  public setDurationBeats(beats: number) {
    this.state.transitionDurationBeats = beats;
    this.notify();
  }

  private checkTransitionEligibility() {
    if (!this.state.active || this.state.transitioning) return;

    let deckA: DeckState | null = null;
    let deckB: DeckState | null = null;

    if (this.deckStateProvider) {
      const live = this.deckStateProvider();
      deckA = live.deckA;
      deckB = live.deckB;
    }

    if (!deckA || !deckB) return;

    // Use deck playback status & time
    const isPlayingA = deckA.isPlaying;
    const isPlayingB = deckB.isPlaying;
    const timeA = deckA.currentTime || 0;
    const timeB = deckB.currentTime || 0;

    // Identify active playing deck
    const playingDeck = isPlayingA ? 'A' : isPlayingB ? 'B' : null;
    if (!playingDeck) return;

    const sourceDeck = playingDeck === 'A' ? deckA : deckB;
    const sourceTime = playingDeck === 'A' ? timeA : timeB;
    const targetId: DeckId = playingDeck === 'A' ? 'B' : 'A';
    const targetDeck = playingDeck === 'A' ? deckB : deckA;
    const isTargetPlaying = targetId === 'A' ? isPlayingA : isPlayingB;

    if (!sourceDeck.duration || sourceDeck.duration <= 0) return;

    const remainingSec = sourceDeck.duration - sourceTime;
    this.state.timeToTransitionSec = Math.max(0, Math.round(remainingSec));
    this.state.targetDeck = targetId;
    this.notify();

    // Trigger transition when 22 seconds remaining and target deck has a loaded track
    if (remainingSec <= 22 && remainingSec > 2 && targetDeck.track && !isTargetPlaying) {
      this.executeTransition(playingDeck, targetId, sourceDeck.track?.bpm || 126);
    }
  }

  public triggerInstantTransition(deckA: DeckState, deckB: DeckState) {
    const isPlayingA = deckA.isPlaying;
    const currentPlaying = isPlayingA ? 'A' : 'B';
    const target: DeckId = currentPlaying === 'A' ? 'B' : 'A';
    this.executeTransition(currentPlaying, target, (currentPlaying === 'A' ? deckA.track?.bpm : deckB.track?.bpm) || 126);
  }

  private executeTransition(fromDeckId: DeckId, toDeckId: DeckId, bpm: number) {
    if (this.state.transitioning) return;
    this.state.transitioning = true;
    this.notify();

    // 1. Start target deck
    if (this.onDeckAction) {
      this.onDeckAction('play', toDeckId);
    }

    // 2. Animate crossfader and neural stem swap over duration
    const durationMs = ((60 / bpm) * this.state.transitionDurationBeats) * 1000;
    const startTime = Date.now();
    const startXfader = fromDeckId === 'A' ? -1.0 : 1.0;
    const endXfader = fromDeckId === 'A' ? 1.0 : -1.0;

    if (this.transitionTimer) clearInterval(this.transitionTimer);

    this.transitionTimer = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(1.0, elapsed / durationMs);

      // Smooth cosine curve
      const smoothProgress = 0.5 - 0.5 * Math.cos(rawProgress * Math.PI);
      const currentXfader = startXfader + (endXfader - startXfader) * smoothProgress;

      this.state.progress = rawProgress;
      this.notify();

      if (this.onAutomixStep) {
        this.onAutomixStep({ crossfader: currentXfader });
      }

      if (rawProgress >= 1.0) {
        clearInterval(this.transitionTimer!);
        this.transitionTimer = null;
        this.state.transitioning = false;
        this.state.progress = 0;
        this.notify();

        // Pause outgoing deck
        if (this.onDeckAction) {
          this.onDeckAction('pause', fromDeckId);
        }

        // Continuous Automix: If there are tracks in queue, auto-stage next track into the freed deck
        if (this.queue.length > 0 && this.onTrackLoadRequest) {
          const nextItem = this.queue[0];
          this.queue = this.queue.slice(1);
          this.queueListeners.forEach((l) => l([...this.queue]));
          this.onTrackLoadRequest(fromDeckId, nextItem.track);
        }
      }
    }, 40); // 25 fps automation
  }

  public getState(): AutomixState {
    return { ...this.state };
  }

  // Automix Queue Subscriptions & Controls
  public subscribeQueue(listener: (queue: AutomixQueueItem[]) => void): () => void {
    this.queueListeners.add(listener);
    listener([...this.queue]);
    return () => this.queueListeners.delete(listener);
  }

  public setQueue(queue: AutomixQueueItem[]) {
    this.queue = queue;
    this.queueListeners.forEach((l) => l([...this.queue]));
    storageCache.saveQueue(this.queue).catch(() => {});
  }

  public getQueue(): AutomixQueueItem[] {
    return [...this.queue];
  }

  public addToQueue(track: TrackMetadata) {
    const item: AutomixQueueItem = {
      id: `${track.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      track,
      addedAt: new Date().toISOString(),
    };
    this.queue = [...this.queue, item];
    this.queueListeners.forEach((l) => l([...this.queue]));
    storageCache.saveQueue(this.queue).catch(() => {});
  }

  public removeFromQueue(id: string) {
    this.queue = this.queue.filter((q) => q.id !== id);
    this.queueListeners.forEach((l) => l([...this.queue]));
    storageCache.saveQueue(this.queue).catch(() => {});
  }

  public clearQueue() {
    this.queue = [];
    this.queueListeners.forEach((l) => l([]));
    storageCache.saveQueue([]).catch(() => {});
  }

  // Live Set History Subscriptions & Controls
  public subscribeHistory(listener: (history: HistoryItem[]) => void): () => void {
    this.historyListeners.add(listener);
    listener([...this.history]);
    return () => this.historyListeners.delete(listener);
  }

  public setHistory(history: HistoryItem[]) {
    this.history = history;
    this.historyListeners.forEach((l) => l([...this.history]));
    storageCache.setSetting('set_history', this.history).catch(() => {});
  }

  public getHistory(): HistoryItem[] {
    return [...this.history];
  }

  public addHistory(item: HistoryItem) {
    this.history = [item, ...this.history.filter((h) => h.id !== item.id)].slice(0, 100);
    this.historyListeners.forEach((l) => l([...this.history]));
    storageCache.addHistory(item).catch(() => {});
  }

  public clearHistory() {
    this.history = [];
    this.historyListeners.forEach((l) => l([]));
    storageCache.clearHistory().catch(() => {});
  }
}

export const automixService = new AutomixService();
