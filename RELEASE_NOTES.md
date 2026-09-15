### 🎧 MixCortex AI v1.0.2 — Live djay Pro Deck Swap Detection, Native Drag-and-Drop & 6k+ Library Indexing

#### ⚡ Real-Time Algoriddim djay Pro Deck Monitoring
- **Live Deck Swap Detection**: Sub-millisecond SQLite polling of `MediaLibrary.db` automatically tracks when you transition or switch between **Deck 1 (Deck A)** and **Deck 2 (Deck B)**.
- **Instant Harmonic Recalculation**: Immediately updates Now Playing Camelot Key and BPM, recalibrating harmonic recommendations for the newly active deck in real-time.
- **Automatic Fallback Pipeline**: Gracefully falls back to local HTTP metadata daemon (`port 8765`) or `nowplaying.txt` if djay Pro is closed.

#### 🪟 Native Windows OS Drag-and-Drop (`CF_HDROP`)
- **Direct Deck Loading**: Recommendation cards now support native Windows OLE file drags. Grab any recommendation and drop it directly onto Deck 1 or Deck 2 inside Algoriddim djay Pro or any native DJ software.
- **True File Path Resolution**: Resolves disk audio paths (`.mp3`, `.wav`, `.flac`, `.m4a`) from your local library.

#### 📚 6,278+ Local Track Library Ingestion
- **Automated SQLite Indexing**: MixCortex AI scans your local djay Pro database on startup, loading your real music collection (6,278+ tracks) into the neural engine in ~300ms.
- **Accurate Metadata**: Analyzes 64-bit IEEE float BPM values and maps key signatures directly to standard Camelot notation (`1A–12B`).

#### 🎯 Actionable Load A & Load B Controls
- **1-Click Clipboard Assist**: Clicking Load A or Load B instantly copies the track title and artist to your clipboard for immediate search in djay Pro (`Ctrl+V`).
- **Visual Feedback**: On-screen animated toast notifications confirm target deck loading and remind you of drag-and-drop availability.
- **CloudMix Pro Sync**: Broadcasts live loading intents to CloudMix Pro when running side-by-side.

---

#### 📦 Included Binaries
- **`MixCortex-AI-Setup.exe`**: Full Windows installer with auto-update capability.
- **`MixCortex-AI-Portable.exe`**: Zero-install standalone executable for gig rigs and USB drives.
