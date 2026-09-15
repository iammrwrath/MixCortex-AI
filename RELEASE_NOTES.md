### ⚡ MixCortex AI v1.0.3 — In-App Patch Downloader Synchronization & Release Notes Delivery

#### 🔄 In-App Patch Downloader Synchronization
- **Independent MixCortex AI Release Channel**: Resolved an issue where the in-app patch downloader modal in standalone mode queried CloudMix Pro rather than the dedicated MixCortex AI release channel.
- **Accurate Version Detection**: Installed version and latest GitHub release now correctly display **MixCortex AI v1.0.3**.
- **1-Click Direct Download**: Clicking **Download & Apply Patch** downloads `MixCortex-AI-Setup.exe` directly from GitHub Releases.
- **Persistent Release Notes**: Integrated rich changelogs directly into the modal with full markdown formatting, highlighting harmonic features, deck integration, and bug fixes.

#### 🎧 Algoriddim djay Pro Native Integration (Included in v1.0.3)
- **Live Deck Swap Detection**: Real-time SQLite polling (`node:sqlite`) of `MediaLibrary.db` automatically detects when you swap between **Deck 1** and **Deck 2**, instantly recalculating harmonic match scores.
- **Native Windows OS Drag-and-Drop (`CF_HDROP`)**: Drag recommendation cards directly onto Deck 1 or Deck 2 inside djay Pro.
- **6,278+ Local Track Library Indexing**: Automatically indexes your local music collection into the neural engine in <350ms.
- **Actionable Load A / Load B Controls**: 1-click clipboard copy of track query with animated HUD feedback.
- **Ultra-Compact Window Support**: Scales smoothly down to 300px width with single-line density mode (~40px rows) and collapsible Now Playing platter HUD.

---

#### 📦 Download Assets
- **`MixCortex-AI-Setup.exe`**: Full Windows installer with auto-update capability.
- **`MixCortex-AI-Portable.exe`**: Zero-install standalone executable for gig rigs and USB drives.
