/**
 * MixCortex AI Recommendation Engine
 * CloudMix Pro Neural Harmonic Intelligence
 * Provides real-time Camelot harmonic compatibility, BPM pitch range analysis,
 * half-time/double-time matching, energy progression curves, and 'My Style' preference learning.
 */

import {
  CortexTrack,
  CortexRecommendation,
  HarmonicRelation,
  CortexFilterState,
  CortexStyleRecord,
} from '../types/cortex';

// Standard Camelot Reference Table
const CAMELOT_CHORDS: Record<string, string> = {
  // Minor (A)
  '1A': 'G#m', '2A': 'D#m', '3A': 'A#m', '4A': 'Fm',
  '5A': 'Cm',  '6A': 'Gm',  '7A': 'Dm',  '8A': 'Am',
  '9A': 'Em',  '10A': 'Bm', '11A': 'F#m', '12A': 'C#m',
  // Major (B)
  '1B': 'B',   '2B': 'F#',  '3B': 'C#',  '4B': 'G#',
  '5B': 'D#',  '6B': 'A#',  '7B': 'F',   '8B': 'C',
  '9B': 'G',   '10B': 'D',  '11B': 'A',  '12B': 'E',
};

// Reverse lookup dictionary for standard musical key names to Camelot
const MUSICAL_KEY_TO_CAMELOT: Record<string, string> = {
  // Minor keys
  'abm': '1A', 'g#m': '1A', 'ebm': '2A', 'd#m': '2A',
  'bbm': '3A', 'a#m': '3A', 'fm': '4A',
  'cm': '5A',  'gm': '6A',  'dm': '7A',  'am': '8A',
  'em': '9A',  'bm': '10A', 'f#m': '11A', 'gbm': '11A',
  'c#m': '12A', 'dbm': '12A',

  // Major keys
  'b': '1B', 'bmaj': '1B', 'b major': '1B',
  'f#': '2B', 'gb': '2B', 'f#maj': '2B', 'gbmaj': '2B',
  'db': '3B', 'c#': '3B', 'dbmaj': '3B', 'c#maj': '3B',
  'ab': '4B', 'g#': '4B', 'abmaj': '4B', 'g#maj': '4B',
  'eb': '5B', 'd#': '5B', 'ebmaj': '5B', 'd#maj': '5B',
  'bb': '6B', 'a#': '6B', 'bbmaj': '6B', 'a#maj': '6B',
  'f': '7B', 'fmaj': '7B', 'f major': '7B',
  'c': '8B', 'cmaj': '8B', 'c major': '8B',
  'g': '9B', 'gmaj': '9B', 'g major': '9B',
  'd': '10B', 'dmaj': '10B', 'd major': '10B',
  'a': '11B', 'amaj': '11B', 'a major': '11B',
  'e': '12B', 'emaj': '12B', 'e major': '12B',
};

const MY_STYLE_STORAGE_KEY = 'cloudmix_cortex_my_style_transitions';

export class CortexAiService {
  private styleTransitions: Map<string, CortexStyleRecord> = new Map();
  private keyBuckets: Map<string, CortexTrack[]> = new Map();
  private cachedTracksRef: CortexTrack[] | null = null;
  private queryCache: Map<string, CortexRecommendation[]> = new Map();

  constructor() {
    this.loadStyleHistory();
  }

  // Normalize any key string (Open Key like '3m', '4d' or musical 'Am', 'F#m' or Camelot '8A')
  public normalizeCamelotKey(keyStr: string): string {
    if (!keyStr) return '8A';
    const cleaned = keyStr.trim().toLowerCase();

    // 1. Direct Camelot format (e.g. '8a', '11b')
    const camelotMatch = cleaned.match(/^([1-9]|1[0-2])([ab])$/);
    if (camelotMatch) {
      return `${camelotMatch[1]}${camelotMatch[2].toUpperCase()}`;
    }

    // 2. Open Key format (e.g. '3m' -> '3A', '4d' -> '4B')
    const openKeyMatch = cleaned.match(/^([1-9]|1[0-2])([md])$/);
    if (openKeyMatch) {
      const num = openKeyMatch[1];
      const mode = openKeyMatch[2] === 'm' ? 'A' : 'B';
      return `${num}${mode}`;
    }

    // 3. Musical Key lookup (e.g. 'Am', 'F#m', 'C Major')
    const stripped = cleaned.replace(/[\(\)\[\]]/g, '').trim();
    if (MUSICAL_KEY_TO_CAMELOT[stripped]) {
      return MUSICAL_KEY_TO_CAMELOT[stripped];
    }

    return '8A'; // Fallback default
  }

  // Calculate harmonic relationship between two Camelot keys
  public calculateHarmonicRelation(currentKey: string, targetKey: string): HarmonicRelation {
    const cNorm = this.normalizeCamelotKey(currentKey);
    const tNorm = this.normalizeCamelotKey(targetKey);

    const cNum = parseInt(cNorm.slice(0, -1), 10);
    const cMode = cNorm.slice(-1) as 'A' | 'B';

    const tNum = parseInt(tNorm.slice(0, -1), 10);
    const tMode = tNorm.slice(-1) as 'A' | 'B';

    const keyShift = `${cNorm} ➔ ${tNorm}`;

    // 1. Exact Match (Same Key)
    if (cNum === tNum && cMode === tMode) {
      return {
        type: 'exact',
        label: `Exact Key Match (${tNorm})`,
        badge: 'Harmonic Lock',
        score: 100,
        keyShift,
        isCompatible: true,
      };
    }

    // 2. Relative Major / Minor (Same number, opposite mode: 8A <-> 8B)
    if (cNum === tNum && cMode !== tMode) {
      const targetType = tMode === 'B' ? 'Major' : 'Minor';
      return {
        type: 'relative',
        label: `Relative ${targetType} (${tNorm})`,
        badge: 'Harmonic Pivot',
        score: 93,
        keyShift,
        isCompatible: true,
      };
    }

    // 3. Adjacent Step Up (+1 on wheel: 8A -> 9A or 12A -> 1A)
    const plus1 = cNum === 12 ? 1 : cNum + 1;
    if (tNum === plus1 && cMode === tMode) {
      return {
        type: 'adjacent_plus',
        label: `Energy Shift +1 (${tNorm})`,
        badge: 'Energy Shift +1',
        score: 96,
        keyShift,
        isCompatible: true,
      };
    }

    // 4. Adjacent Step Down (-1 on wheel: 8A -> 7A or 1A -> 12A)
    const minus1 = cNum === 1 ? 12 : cNum - 1;
    if (tNum === minus1 && cMode === tMode) {
      return {
        type: 'adjacent_minus',
        label: `Smooth Cooldown -1 (${tNorm})`,
        badge: 'Smooth Cooldown -1',
        score: 94,
        keyShift,
        isCompatible: true,
      };
    }

    // 5. Energy Boost Modulation (+2 on wheel or +2 semitones: 8A -> 10A)
    const plus2 = ((cNum + 1) % 12) + 1;
    if (tNum === plus2 && cMode === tMode) {
      return {
        type: 'energy_boost_2',
        label: `Energy Surge +2 (${tNorm})`,
        badge: 'Energy Surge +2',
        score: 87,
        keyShift,
        isCompatible: true,
      };
    }

    // 6. Dominant Key Flash (+7 on Camelot wheel: e.g. 8A -> 3A)
    const plus7 = ((cNum + 6) % 12) + 1;
    if (tNum === plus7 && cMode === tMode) {
      return {
        type: 'dominant',
        label: `Dominant Flash (+7) (${tNorm})`,
        badge: 'Key Flash +7',
        score: 83,
        keyShift,
        isCompatible: true,
      };
    }

    // 7. Diagonal Adjacent (e.g. 8A -> 9B or 8A -> 7B)
    if ((tNum === plus1 || tNum === minus1) && cMode !== tMode) {
      return {
        type: 'open',
        label: `Diagonal Blend (${tNorm})`,
        badge: 'Diagonal Harmonic',
        score: 78,
        keyShift,
        isCompatible: true,
      };
    }

    // 8. Distant Key (Open Key)
    const rawDist = Math.min(Math.abs(cNum - tNum), 12 - Math.abs(cNum - tNum));
    const openScore = Math.max(25, 75 - rawDist * 8);

    return {
      type: 'open',
      label: `Key Shift (${tNorm})`,
      badge: 'Open Shift',
      score: openScore,
      keyShift,
      isCompatible: false,
    };
  }

  // Calculate BPM compatibility and detect Half/Double tempo
  public calculateTempoCompatibility(
    currentBpm: number,
    targetBpm: number,
    allowHalfDouble: boolean
  ): {
    score: number;
    bpmDiff: number;
    bpmDiffPct: number;
    isHalfOrDoubleTime: boolean;
    effectiveTargetBpm: number;
  } {
    if (!currentBpm || currentBpm <= 0 || !targetBpm || targetBpm <= 0) {
      return {
        score: 50,
        bpmDiff: 0,
        bpmDiffPct: 0,
        isHalfOrDoubleTime: false,
        effectiveTargetBpm: targetBpm,
      };
    }

    // Direct pitch difference
    const directDiff = targetBpm - currentBpm;
    const directPct = (directDiff / currentBpm) * 100;
    const directAbsPct = Math.abs(directPct);

    // Half / Double tempo check (e.g. 70 BPM <-> 140 BPM, 75 BPM <-> 150 BPM, 87 BPM <-> 174 BPM)
    let isHalfOrDouble = false;
    let effectiveBpm = targetBpm;
    let bestAbsPct = directAbsPct;
    let bestDiff = directDiff;
    let bestPct = directPct;

    if (allowHalfDouble) {
      // Check 2x target tempo
      const doubleTargetBpm = targetBpm * 2;
      const doubleDiff = doubleTargetBpm - currentBpm;
      const doublePct = (doubleDiff / currentBpm) * 100;
      if (Math.abs(doublePct) < bestAbsPct) {
        bestAbsPct = Math.abs(doublePct);
        bestDiff = doubleDiff;
        bestPct = doublePct;
        isHalfOrDouble = true;
        effectiveBpm = doubleTargetBpm;
      }

      // Check 0.5x target tempo
      const halfTargetBpm = targetBpm / 2;
      const halfDiff = halfTargetBpm - currentBpm;
      const halfPct = (halfDiff / currentBpm) * 100;
      if (Math.abs(halfPct) < bestAbsPct) {
        bestAbsPct = Math.abs(halfPct);
        bestDiff = halfDiff;
        bestPct = halfPct;
        isHalfOrDouble = true;
        effectiveBpm = halfTargetBpm;
      }
    }

    // Calculate tempo score
    let score = 100;
    if (bestAbsPct <= 0.5) {
      score = 100; // Exact match
    } else if (bestAbsPct <= 2.0) {
      score = 96; // Flawless blend
    } else if (bestAbsPct <= 4.0) {
      score = 90; // Seamless pitch fader range
    } else if (bestAbsPct <= 6.0) {
      score = 80; // Standard DJ pitch range (±6%)
    } else if (bestAbsPct <= 8.0) {
      score = 70; // Wide pitch range
    } else if (bestAbsPct <= 12.0) {
      score = 55;
    } else {
      score = Math.max(10, Math.round(50 - (bestAbsPct - 12) * 3));
    }

    // Slight bonus for half-time / double-time crowd moments
    if (isHalfOrDouble && score >= 80) {
      score = Math.min(100, score + 4);
    }

    return {
      score,
      bpmDiff: Math.round(bestDiff * 10) / 10,
      bpmDiffPct: Math.round(bestPct * 10) / 10,
      isHalfOrDoubleTime: isHalfOrDouble,
      effectiveTargetBpm: effectiveBpm,
    };
  }

  // Calculate Energy Compatibility based on Vibe Strategy
  public calculateEnergyScore(
    currentEnergy: number,
    targetEnergy: number,
    strategy: CortexFilterState['strategy'],
    bpmDiffPct: number
  ): { score: number; tag: 'maintain' | 'boost' | 'chill' | 'peak' } {
    const diff = targetEnergy - currentEnergy;
    let tag: 'maintain' | 'boost' | 'chill' | 'peak' = 'maintain';

    if (diff >= 2 || bpmDiffPct >= 2.5) {
      tag = 'boost';
    } else if (diff <= -2 || bpmDiffPct <= -2.5) {
      tag = 'chill';
    } else if (targetEnergy >= 8) {
      tag = 'peak';
    } else {
      tag = 'maintain';
    }

    let score = 75;
    switch (strategy) {
      case 'maintain':
        score = Math.abs(diff) <= 1 ? 95 : Math.max(30, 90 - Math.abs(diff) * 15);
        break;

      case 'boost':
        if (diff > 0 || bpmDiffPct > 0.5) {
          score = Math.min(100, 85 + diff * 5);
        } else {
          score = Math.max(25, 70 - Math.abs(diff) * 12);
        }
        break;

      case 'chill':
        if (diff < 0 || bpmDiffPct < -0.5) {
          score = Math.min(100, 85 + Math.abs(diff) * 5);
        } else {
          score = Math.max(25, 65 - diff * 12);
        }
        break;

      case 'peak':
        score = targetEnergy >= 8 ? 98 : targetEnergy >= 6 ? 80 : 40;
        break;

      case 'style':
      case 'all':
      default:
        score = 80;
        break;
    }

    return { score, tag };
  }

  // "My Style" Machine Learning Preference Engine
  private loadStyleHistory() {
    try {
      const stored = localStorage.getItem(MY_STYLE_STORAGE_KEY) || localStorage.getItem('pulsedj_my_style_transitions');
      if (stored) {
        const records: CortexStyleRecord[] = JSON.parse(stored);
        records.forEach((r) => this.styleTransitions.set(r.pairKey, r));
      }
    } catch {}
  }

  public recordTransition(sourceTrack: CortexTrack, targetTrack: CortexTrack) {
    if (!sourceTrack || !targetTrack || sourceTrack.id === targetTrack.id) return;

    const pairKey = `${sourceTrack.id}:::${targetTrack.id}`;
    const existing = this.styleTransitions.get(pairKey);
    const count = (existing?.transitionCount || 0) + 1;

    const updated: CortexStyleRecord = {
      pairKey,
      sourceTitle: sourceTrack.title,
      targetTitle: targetTrack.title,
      sourceArtist: sourceTrack.artist,
      targetArtist: targetTrack.artist,
      transitionCount: count,
      lastPlayed: new Date().toISOString(),
    };

    this.styleTransitions.set(pairKey, updated);
    try {
      const records = Array.from(this.styleTransitions.values());
      localStorage.setItem(MY_STYLE_STORAGE_KEY, JSON.stringify(records.slice(-200)));
    } catch {}
  }

  public getStyleScore(sourceTrackId: string, targetTrackId: string): number {
    const pairKey = `${sourceTrackId}:::${targetTrackId}`;
    const record = this.styleTransitions.get(pairKey);
    if (!record) return 50;
    return Math.min(100, 60 + record.transitionCount * 10);
  }

  public getStyleRecords(): CortexStyleRecord[] {
    return Array.from(this.styleTransitions.values()).sort(
      (a, b) => b.transitionCount - a.transitionCount
    );
  }

  // Generate All MixCortex Recommendations for Current Track
  public getRecommendations(
    currentTrack: CortexTrack | { bpm: number; camelotKey: string; id?: string; title?: string; artist?: string; energyLevel?: number },
    candidateTracks: CortexTrack[],
    filters: CortexFilterState
  ): CortexRecommendation[] {
    if (!currentTrack || !candidateTracks || candidateTracks.length === 0) {
      return [];
    }

    const currentBpm = currentTrack.bpm || 126;
    const currentKey = this.normalizeCamelotKey(currentTrack.camelotKey || '8A');
    const currentEnergy = currentTrack.energyLevel || 6;
    const currentId = currentTrack.id || '';

    // 1. Maintain in-memory key buckets for sub-millisecond harmonic retrieval
    if (this.cachedTracksRef !== candidateTracks) {
      this.keyBuckets.clear();
      this.queryCache.clear();
      for (let i = 0; i < candidateTracks.length; i++) {
        const t = candidateTracks[i];
        const k = t.camelotKey || '8A';
        let bucket = this.keyBuckets.get(k);
        if (!bucket) {
          bucket = [];
          this.keyBuckets.set(k, bucket);
        }
        bucket.push(t);
      }
      this.cachedTracksRef = candidateTracks;
    }

    // 2. High-speed Cache check
    const cacheKey = `${currentId}_${currentKey}_${currentBpm.toFixed(1)}_${filters.strategy}_${filters.bpmTolerance}_${filters.allowHalfDouble}_${filters.harmonicMode}_${filters.searchQuery}_${filters.selectedCrate}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached) return cached;

    // 3. Fast Candidate Selection
    let candidatePool = candidateTracks;
    if (!filters.searchQuery) {
      if (filters.harmonicMode === 'strict') {
        const cNum = parseInt(currentKey.slice(0, -1), 10);
        const cMode = currentKey.slice(-1) as 'A' | 'B';
        const oppMode = cMode === 'A' ? 'B' : 'A';
        const plus1 = cNum === 12 ? 1 : cNum + 1;
        const minus1 = cNum === 1 ? 12 : cNum - 1;
        const plus2 = ((cNum + 1) % 12) + 1;

        const allowedKeys = [
          currentKey,
          `${cNum}${oppMode}`,
          `${plus1}${cMode}`,
          `${minus1}${cMode}`,
          `${plus2}${cMode}`,
          `${plus1}${oppMode}`,
          `${minus1}${oppMode}`,
        ];

        const fastList: CortexTrack[] = [];
        for (const k of allowedKeys) {
          const b = this.keyBuckets.get(k);
          if (b) fastList.push(...b);
        }
        candidatePool = fastList;
      }
    }

    const results: CortexRecommendation[] = [];
    const q = filters.searchQuery ? filters.searchQuery.toLowerCase().trim() : '';

    for (let i = 0; i < candidatePool.length; i++) {
      const candidate = candidatePool[i];

      // Exclude identical track if currently playing
      if (currentId && candidate.id === currentId) {
        continue;
      }

      // Filter: Search Query
      if (q) {
        const matches =
          candidate.title.toLowerCase().includes(q) ||
          candidate.artist.toLowerCase().includes(q) ||
          (candidate.album && candidate.album.toLowerCase().includes(q)) ||
          candidate.camelotKey.toLowerCase().includes(q) ||
          candidate.bpm.toString().includes(q);
        if (!matches) continue;
      }

      // Filter: Crate
      if (filters.selectedCrate !== 'all') {
        if (filters.selectedCrate === 'csv' && candidate.fileSource !== 'csv') continue;
        if (filters.selectedCrate === 'djay' && candidate.fileSource !== 'djay_import') continue;
        if (filters.selectedCrate === 'gdrive' && candidate.fileSource !== 'drive') continue;
        if (filters.selectedCrate === 'favorites' && (candidate.rating || 0) < 5) continue;
      }

      // 1. Harmonic Analysis
      const harmonicRelation = this.calculateHarmonicRelation(currentKey, candidate.camelotKey);

      // Filter: Harmonic Mode
      if (filters.harmonicMode === 'strict' && !harmonicRelation.isCompatible) {
        continue;
      }
      if (filters.harmonicMode === 'boost' && harmonicRelation.type !== 'energy_boost_2' && harmonicRelation.type !== 'adjacent_plus' && harmonicRelation.type !== 'exact') {
        continue;
      }

      // 2. Tempo & BPM Analysis
      const tempo = this.calculateTempoCompatibility(
        currentBpm,
        candidate.bpm,
        filters.allowHalfDouble
      );

      // Filter: BPM Tolerance
      const absDiffPct = Math.abs(tempo.bpmDiffPct) / 100;
      if (filters.bpmTolerance < 1.0 && absDiffPct > filters.bpmTolerance) {
        continue;
      }

      // 3. Energy Analysis
      const energy = this.calculateEnergyScore(
        currentEnergy,
        candidate.energyLevel || 6,
        filters.strategy,
        tempo.bpmDiffPct
      );

      // 4. "My Style" Learning Score
      const styleScore = currentId ? this.getStyleScore(currentId, candidate.id) : 50;

      // 5. Composite Match Percentage
      const rawScore =
        harmonicRelation.score * 0.38 +
        tempo.score * 0.32 +
        energy.score * 0.20 +
        styleScore * 0.10;

      const matchScore = Math.min(99, Math.max(40, Math.round(rawScore)));

      // Generate Descriptive Badges
      const badges: string[] = [];
      badges.push(harmonicRelation.badge);

      if (tempo.isHalfOrDoubleTime) {
        badges.push(tempo.effectiveTargetBpm > currentBpm ? 'Double-Time Jump 🚀' : 'Half-Time Flip 🌀');
      } else if (Math.abs(tempo.bpmDiffPct) <= 0.5) {
        badges.push('Zero Pitch Drift ✨');
      } else if (Math.abs(tempo.bpmDiffPct) <= 2.5) {
        badges.push('Seamless Tempo');
      }

      if (energy.tag === 'boost') {
        badges.push('Energy Booster ⚡');
      } else if (energy.tag === 'chill') {
        badges.push('Vibe Down 🌊');
      } else if (energy.tag === 'peak') {
        badges.push('Peak Banger 🔥');
      }

      if (styleScore > 70) {
        badges.push('⭐ My Style Favorite');
      }

      // Summary reason
      const bpmDeltaStr = `${tempo.bpmDiff >= 0 ? '+' : ''}${tempo.bpmDiff} BPM (${tempo.bpmDiffPct >= 0 ? '+' : ''}${tempo.bpmDiffPct}%)`;
      const transitionReason = `${harmonicRelation.label} • ${bpmDeltaStr}`;

      results.push({
        track: candidate,
        matchScore,
        harmonicScore: harmonicRelation.score,
        tempoScore: tempo.score,
        energyScore: energy.score,
        styleScore,
        harmonicRelation,
        bpmDiff: tempo.bpmDiff,
        bpmDiffPct: tempo.bpmDiffPct,
        isHalfOrDoubleTime: tempo.isHalfOrDoubleTime,
        effectiveTargetBpm: tempo.effectiveTargetBpm,
        energyTag: energy.tag,
        recommendationBadges: badges,
        transitionReason,
      });
    }

    // Sort descending by matchScore
    results.sort((a, b) => b.matchScore - a.matchScore);

    if (this.queryCache.size > 40) {
      this.queryCache.clear();
    }
    this.queryCache.set(cacheKey, results);

    return results;
  }
}

export const cortexAiService = new CortexAiService();

// Backwards compatibility alias
export const pulseAiService = cortexAiService;
export const PulseAiService = CortexAiService;
