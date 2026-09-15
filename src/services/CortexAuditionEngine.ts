/**
 * CortexAuditionEngine
 * Studio-grade Web Audio preview and pre-listening engine for MixCortex AI.
 * Provides smooth 80ms anti-pop gain ramps, real-time frequency analysis (FFT),
 * and canvas oscilloscope rendering for instant low-latency track auditioning.
 */

import { CortexTrack } from '../types/cortex';

type AuditionListener = (state: {
  track: CortexTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
}) => void;

export class CortexAuditionEngine {
  private audioCtx: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  private currentTrack: CortexTrack | null = null;
  private isPlaying: boolean = false;
  private progress: number = 0;
  private duration: number = 0;
  private currentTime: number = 0;

  private listeners: Set<AuditionListener> = new Set();
  private freqData: Uint8Array<ArrayBuffer> | null = null;

  constructor() {
    // Lazy initialize Web Audio API on first user interaction
  }

  private initAudio() {
    if (this.audioCtx) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioContextClass();

    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';

    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);

    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 128; // 64 frequency bins
    this.analyserNode.smoothingTimeConstant = 0.8;
    this.freqData = new Uint8Array(this.analyserNode.frequencyBinCount);

    try {
      this.sourceNode = this.audioCtx.createMediaElementSource(this.audioElement);
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioCtx.destination);
    } catch {
      // Fallback direct connection if createMediaElementSource is restricted
    }

    this.audioElement.ontimeupdate = () => {
      if (this.audioElement && this.audioElement.duration) {
        this.currentTime = this.audioElement.currentTime;
        this.duration = this.audioElement.duration;
        this.progress = (this.currentTime / this.duration) * 100;
        this.notify();
      }
    };

    this.audioElement.onended = () => {
      this.stop();
    };
  }

  public subscribe(listener: AuditionListener): () => void {
    this.listeners.add(listener);
    listener({
      track: this.currentTrack,
      isPlaying: this.isPlaying,
      currentTime: this.currentTime,
      duration: this.duration,
      progress: this.progress,
    });
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const s = {
      track: this.currentTrack,
      isPlaying: this.isPlaying,
      currentTime: this.currentTime,
      duration: this.duration,
      progress: this.progress,
    };
    this.listeners.forEach((l) => l(s));
  }

  public play(track: CortexTrack, startFraction: number = 0.25) {
    this.initAudio();

    if (this.audioCtx?.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    if (!this.audioElement || !this.gainNode || !this.audioCtx) return;

    // If same track is already playing, toggle pause
    if (this.currentTrack?.id === track.id && this.isPlaying) {
      this.stop();
      return;
    }

    this.currentTrack = track;
    this.isPlaying = true;

    // Smooth fade out before changing src
    const now = this.audioCtx.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(0, now + 0.04);

    setTimeout(() => {
      if (!this.audioElement || !this.gainNode || !this.audioCtx) return;

      this.audioElement.src = track.fileUrl;
      this.audioElement.currentTime = (track.duration || 180) * startFraction;

      this.audioElement.play().then(() => {
        if (!this.gainNode || !this.audioCtx) return;
        const playTime = this.audioCtx.currentTime;
        this.gainNode.gain.cancelScheduledValues(playTime);
        this.gainNode.gain.setValueAtTime(0, playTime);
        this.gainNode.gain.linearRampToValueAtTime(0.85, playTime + 0.08); // 80ms smooth fade-in
        this.isPlaying = true;
        this.notify();
      }).catch(() => {
        this.isPlaying = false;
        this.notify();
      });
    }, 45);
  }

  public stop() {
    if (!this.gainNode || !this.audioCtx || !this.audioElement) {
      this.isPlaying = false;
      this.currentTrack = null;
      this.notify();
      return;
    }

    const now = this.audioCtx.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(0, now + 0.06);

    setTimeout(() => {
      if (this.audioElement) {
        this.audioElement.pause();
      }
      this.isPlaying = false;
      this.currentTrack = null;
      this.progress = 0;
      this.notify();
    }, 65);
  }

  public seek(fraction: number) {
    if (this.audioElement && this.audioElement.duration) {
      this.audioElement.currentTime = this.audioElement.duration * Math.max(0, Math.min(1, fraction));
    }
  }

  public getFrequencySpectrum(): Uint8Array<ArrayBuffer> | null {
    if (this.analyserNode && this.freqData && this.isPlaying) {
      this.analyserNode.getByteFrequencyData(this.freqData);
      return this.freqData;
    }
    return null;
  }

  public getCurrentTrack(): CortexTrack | null {
    return this.currentTrack;
  }

  public isTrackPlaying(trackId: string): boolean {
    return this.isPlaying && this.currentTrack?.id === trackId;
  }
}

export const cortexAuditionEngine = new CortexAuditionEngine();

// Backwards compatibility alias
export const pulseAuditionEngine = cortexAuditionEngine;
export const PulseAuditionEngine = CortexAuditionEngine;
