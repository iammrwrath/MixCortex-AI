export type DeckId = 'A' | 'B' | 'C' | 'D';

export interface HotCue {
  id: number; // 0 to 7 (8 hot cues)
  position: number; // in seconds
  color: string;
  label?: string;
  active: boolean;
}

export interface SavedLoop {
  id: number;
  start: number;
  end: number;
  lengthBeats: number;
  active: boolean;
}

export interface BeatGrid {
  bpm: number;
  firstBeatOffset: number; // in seconds
  meter: number; // e.g. 4 for 4/4
}

export interface WaveformData {
  overviewPeaks: Float32Array; // Subsampled full track amplitude for overview
  lowPeaks: Float32Array; // Bass (<250Hz)
  midPeaks: Float32Array; // Mid (250Hz - 2500Hz)
  highPeaks: Float32Array; // High (>2500Hz)
  duration: number;
  samplesPerPixel: number;
}

export interface TrackMetadata {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  year?: number;
  duration: number; // seconds
  bpm: number;
  key: string; // e.g. '8A', '11B' (Camelot) or 'Am'
  camelotKey?: string;
  fileUrl: string;
  fileSource: 'drive' | 'local' | 'stream' | 'djay_import' | 'youtube' | 'csv';
  driveFileId?: string;
  sizeBytes?: number;
  coverArtUrl?: string;
  dateAdded: string;
  rating?: number;
  playCount?: number;
  isOfflineCached?: boolean;
  hotCues: HotCue[];
  savedLoops: SavedLoop[];
  beatGrid: BeatGrid;
  lyricsUrl?: string;
  lyricsLrc?: string;
}

export interface StemState {
  vocals: number; // 0.0 to 1.5 (1.0 default)
  harmonics: number;
  bass: number;
  drums: number;
  vocalsMuted: boolean;
  harmonicsMuted: boolean;
  bassMuted: boolean;
  drumsMuted: boolean;
  vocalsSolo: boolean;
  harmonicsSolo: boolean;
  bassSolo: boolean;
  drumsSolo: boolean;
}

export type NeuralTransitionMode = 'standard' | 'bass_swap' | 'vocal_swap' | 'harmonic_swap';
export type EQMode = 'isolator' | 'stems';

export interface DeckState {
  deckId: DeckId;
  track: TrackMetadata | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number; // 1.0 is normal speed
  tempoRange: number; // 0.08, 0.16, 0.50
  keyLock: boolean; // Master tempo
  musicalKey: string;
  pitchSemitones: number;
  isSync: boolean;
  isMaster: boolean;
  volume: number; // 0.0 to 1.0
  trimGain: number; // 0.0 to 2.0 (1.0 default)
  eqMode: EQMode;
  eqHigh: number; // -1.0 to 1.0 (0 default)
  eqMid: number;
  eqLow: number;
  eqHighKill: boolean;
  eqMidKill: boolean;
  eqLowKill: boolean;
  stems: StemState;
  filter: number; // -1.0 (LPF) to 0.0 (Bypass) to +1.0 (HPF)
  activeLoop: { start: number; end: number; beats: number } | null;
  slipMode: boolean;
  sandboxMode: boolean;
  shadowPlayheadTime: number; // Time tracking during scratch or slip
  isScratching: boolean;
  selectedPadMode: 'hotcue' | 'loop' | 'beatjump' | 'stems';
  meterLevelL: number; // 0.0 to 1.0 for VU meter
  meterLevelR: number;
  fx: FXUnit;
  fxSlots?: [FXUnit, FXUnit, FXUnit];
}

export type FXType = 'echo' | 'reverb' | 'flanger' | 'bitcrusher' | 'roll' | 'filter';
export type FXTarget = 'master' | 'vocals' | 'bass' | 'harmonics' | 'drums';

export interface FXUnit {
  enabled: boolean;
  type: FXType;
  wetDry: number; // 0.0 to 1.0
  beats: number; // 0.125, 0.25, 0.5, 1, 2, 4
  param: number; // secondary param (feedback, size, resonance)
  target?: FXTarget;
}

export interface HistoryItem {
  id: string;
  track: TrackMetadata;
  playedAt: string;
  durationSec: number;
  deckId: DeckId;
}

export interface AutomixQueueItem {
  id: string;
  track: TrackMetadata;
  addedAt: string;
}

export type LayoutMode = 'horizontal' | 'vertical' | 'split';
export type AutomixMode = 'off' | 'eq_blend' | 'stem_swap' | 'echo_drop';

export interface AutomixState {
  active: boolean;
  mode: AutomixMode;
  transitionDurationBeats: number;
  progress: number;
  transitioning: boolean;
  targetDeck: DeckId;
  timeToTransitionSec?: number;
}

export interface SamplerSlot {
  id: number;
  name: string;
  color: string;
  volume: number;
  isPlaying: boolean;
  isCustom?: boolean;
}

export interface RecordingState {
  isRecording: boolean;
  duration: number;
  fileSizeBytes: number;
}

export type BottomDrawerTab = 'library' | 'fx' | 'sampler' | 'automix' | 'cortex' | 'pulsedj';

export interface MixerState {
  crossfader: number; // -1.0 (Deck A) to 0.0 (Center) to 1.0 (Deck B)
  crossfaderCurve: 'smooth' | 'linear' | 'scratch';
  neuralTransitionMode: NeuralTransitionMode;
  masterVolume: number; // 0.0 to 1.0
  boothVolume: number;
  headphoneVolume: number;
  headphoneCueA: boolean;
  headphoneCueB: boolean;
  headphoneMix: number; // 0.0 (Cue) to 1.0 (Master)
  masterMeterL: number;
  masterMeterR: number;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  dateCreated: string;
  dateUpdated: string;
  isCloudSynced: boolean;
  isPinnedOffline: boolean;
}

export interface MidiMappingRule {
  controlName: string; // e.g. "DeckA_Play", "DeckB_EQ_High", "Crossfader"
  statusByte: number; // e.g. 0x90 (Note On), 0xB0 (CC)
  data1: number; // Note number or CC number
  channel: number;
  type: 'button' | 'toggle' | 'slider' | 'knob' | 'jog';
}

export interface MidiProfile {
  id: string;
  name: string;
  manufacturer: string;
  description: string;
  tags: string[];
  deviceMatchNames: string[];
  mappings: MidiMappingRule[];
}

export interface LyricsLine {
  timestampMs: number;
  text: string;
  translation?: string;
}

