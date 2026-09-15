/**
 * MixCortex AI Co-Pilot Data Types & Interfaces
 * CloudMix Pro Neural Harmonic Intelligence
 */

export interface CortexTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  year?: number;
  duration: number; // in seconds
  bpm: number;
  key: string; // e.g. '8A', '3m', 'Am'
  camelotKey: string; // normalized Camelot e.g. '8A', '3A', '4B'
  energyLevel: number; // 1 to 10
  fileUrl: string;
  filePath?: string;
  fileSource: 'local' | 'csv' | 'drive' | 'stream' | 'djay_import' | 'youtube';
  coverArtUrl?: string;
  rating?: number;
}

export type HarmonicRelationType =
  | 'exact'
  | 'adjacent_plus'
  | 'adjacent_minus'
  | 'relative'
  | 'energy_boost_1'
  | 'energy_boost_2'
  | 'energy_drop_1'
  | 'dominant'
  | 'subdominant'
  | 'open';

export interface HarmonicRelation {
  type: HarmonicRelationType;
  label: string;
  badge: string;
  score: number; // 0 to 100
  keyShift: string; // e.g. "8A ➔ 9A"
  isCompatible: boolean;
}

export interface CortexRecommendation {
  track: CortexTrack;
  matchScore: number; // 0 to 100 composite percentage
  harmonicScore: number;
  tempoScore: number;
  energyScore: number;
  styleScore: number;
  harmonicRelation: HarmonicRelation;
  bpmDiff: number; // target - current
  bpmDiffPct: number; // e.g. +1.6
  isHalfOrDoubleTime: boolean;
  effectiveTargetBpm: number;
  energyTag: 'maintain' | 'boost' | 'chill' | 'peak';
  recommendationBadges: string[];
  transitionReason: string;
}

export type CortexSourceMode = 'cloudmix' | 'djay_pro' | 'file' | 'manual';
export type CortexVibeStrategy = 'all' | 'maintain' | 'boost' | 'chill' | 'peak' | 'style';
export type CortexHarmonicMode = 'strict' | 'boost' | 'open';
export type CortexBpmTolerance = 0.03 | 0.06 | 0.08 | 0.10 | 0.20 | 1.0; // 3%, 6%, 8%, 10%, 20%, Any

export interface CortexNowPlaying {
  track: CortexTrack | null;
  source: CortexSourceMode;
  deckId?: string; // 'A' | 'B' | '1' | '2'
  title: string;
  artist: string;
  album?: string;
  bpm: number;
  key: string;
  camelotKey: string;
  energyLevel: number;
  currentTime: number;
  duration: number;
  remainingTime: number;
  isPlaying: boolean;
  coverArtUrl?: string;
}

export interface CortexStyleRecord {
  pairKey: string; // `${sourceId}:::${targetId}`
  sourceTitle: string;
  targetTitle: string;
  sourceArtist: string;
  targetArtist: string;
  transitionCount: number;
  lastPlayed: string;
}

export interface CortexFilterState {
  strategy: CortexVibeStrategy;
  bpmTolerance: CortexBpmTolerance;
  allowHalfDouble: boolean;
  harmonicMode: CortexHarmonicMode;
  searchQuery: string;
  selectedCrate: string; // 'all' | 'csv' | 'djay' | 'gdrive' | 'favorites'
}

// Backwards compatibility aliases
export type PulseTrack = CortexTrack;
export type PulseRecommendation = CortexRecommendation;
export type PulseSourceMode = CortexSourceMode;
export type PulseVibeStrategy = CortexVibeStrategy;
export type PulseHarmonicMode = CortexHarmonicMode;
export type PulseBpmTolerance = CortexBpmTolerance;
export type PulseNowPlaying = CortexNowPlaying;
export type PulseStyleRecord = CortexStyleRecord;
export type PulseFilterState = CortexFilterState;
