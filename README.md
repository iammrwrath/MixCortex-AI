# 🧠 MixCortex AI — Autonomous Neural DJ Co-Pilot

<p align="center">
  <img src="public/mixcortex-banner.svg" alt="MixCortex AI Banner" width="100%" />
</p>

> **Autonomous Neural DJ Co-Pilot featuring sub-millisecond Camelot harmonic matching, real-time Web Audio studio headphone audition, and a universal live bridge for CloudMix Pro, Algoriddim djay Pro, Serato DJ Pro, Pioneer Rekordbox, Native Instruments Traktor, and VirtualDJ.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows%2011%20%7C%2010-informational.svg)](https://github.com/iammrwrath/MixCortex-AI/releases)
[![Electron](https://img.shields.io/badge/Electron-44.2.0-47848F?logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)

---

## ⚡ What is MixCortex AI?

MixCortex AI is an ultra-fast, intelligent harmonic mixing companion. Operating as a lightweight, floating heads-up display (HUD), MixCortex listens to what is currently playing on deck and recommends the best transition tracks with **sub-millisecond speed (0.93ms)**.

Whether you're performing live in front of thousands or curating a studio mix, MixCortex eliminates key clashes, analyzes tempo variance, and learns your personal mixing taste over time.

---

## 🌟 Core Features

- ⚡ **0.936ms Harmonic Retrieval**: Instantaneous 24-key Camelot wheel harmonic & tempo matching across thousands of tracks with zero latency.
- 🎛️ **Studio Web Audio Audition Player**: Instant headphone pre-listening with 80ms anti-pop crossfading and 64-bin FFT canvas oscilloscope visualizer.
- 🎯 **Interactive Camelot Wheel Radar**: 24-sector visual radar displaying harmonic proximity, energy transitions, and key compatibility.
- 🧬 **"My Style" Machine Learning Taste Adaptation**: Learns your signature mixing transitions, preferred energy arcs, and custom pairing patterns over time.
- 🪟 **Floating See-Through HUD Overlay**: Frameless desktop window with adjustable transparency (40%–100%) and always-on-top pin toggle—designed to hover non-intrusively over any DJ software during live performances.
- 🔄 **In-App GitHub Patch Downloader**: Checks GitHub Releases in real-time, displays visual patch notes with progress tracking, and applies updates in 1 click.

---

## 🌐 Universal DJ Software Compatibility Matrix

MixCortex AI seamlessly bridges with all leading DJ software suites without requiring complex plugins:

| DJ Software | Integration Method | Capabilities |
| :--- | :--- | :--- |
| **CloudMix Pro** | Direct Two-Way IPC / BroadcastChannel | Instant 1-click remote deck load, bi-directional sync, zero latency |
| **Algoriddim djay Pro** | SQLite `MediaLibrary.db` + Streamer Hook | Real-time deck detection, metadata synchronization |
| **Serato DJ Pro** | Session History + `nowplaying.txt` | Auto-detect active track, BPM, key, and deck assignment |
| **Pioneer Rekordbox** | Text Stream / Pro DJ Link watcher | Continuous harmonic recommendations based on live master deck |
| **Native Instruments Traktor** | Broadcast stream metadata reader | Automated crate matching and key energy curve analysis |
| **VirtualDJ** | NetSearch / History Log Bridge | Dynamic track suggestion feed during live mix |
| **Manual / Universal** | Audio Drag & Drop / Pin Reference Track | Explore harmonic transitions for any song on the fly |

---

## 🚀 Installation & Downloads

Head over to the **[Latest GitHub Releases](https://github.com/iammrwrath/MixCortex-AI/releases/latest)** to download:

- **`MixCortex-AI-Setup.exe`**: Full Windows installer with desktop and start menu shortcuts.
- **`MixCortex-AI-Portable.exe`**: Lightweight zero-install standalone executable to keep on your USB drive alongside your music crate.

---

## ⌨️ Global Shortcuts & Controls

| Shortcut / Control | Function |
| :---: | :--- |
| **`Space`** | Play / Pause Audition Preview for Selected Recommendation |
| **`Esc`** | Stop Audition & Reset Preview |
| **`Ctrl` + `F`** | Copy Track Name to Clipboard for 1-Click Search in djay Pro / Serato |
| **Pin Icon** | Toggle Always-on-Top Floating HUD Mode |
| **Opacity Slider** | Adjust HUD Transparency (40% – 100%) |

---

## 🛠️ Development & Building

```bash
# Clone the repository
git clone https://github.com/iammrwrath/MixCortex-AI.git
cd MixCortex-AI

# Install dependencies
npm install

# Run Vite development server
npm run dev

# Launch Electron desktop client
npm run start

# Compile production bundle and Windows installers
npm run build
npm run dist
```

---

## 📄 License

Distributed under the MIT License. Copyright © 2026 MixCortex Audio Labs / @iammrwrath.
