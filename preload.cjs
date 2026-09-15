const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  // Local File Access
  readLocalAudio: (filePath) => ipcRenderer.invoke('read-local-audio', filePath),
  scanDirectory: (dirPath) => ipcRenderer.invoke('scan-directory', dirPath),
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // Universal DJ Bridge & NowPlaying Integration
  writeNowPlayingBroadcast: (payload) => ipcRenderer.invoke('write-now-playing-broadcast', payload),
  readDjayNowPlaying: () => ipcRenderer.invoke('read-djay-nowplaying'),
  readDjayLibrary: () => ipcRenderer.invoke('read-djay-library'),
  readExternalNowPlayingFile: (filePath) => ipcRenderer.invoke('read-external-nowplaying-file', filePath),
  startNativeDrag: (payload) => ipcRenderer.send('start-native-drag', payload),

  // Standalone Window Controls
  setWindowOpacity: (opacity) => ipcRenderer.invoke('set-window-opacity', opacity),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('set-always-on-top', flag),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // In-App Auto-Updater & GitHub Patching Engine
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  startUpdateDownload: () => ipcRenderer.invoke('start-update-download'),
  restartAndInstallPatch: () => ipcRenderer.invoke('restart-and-install-patch'),
  checkGitHubReleases: () => ipcRenderer.invoke('check-github-releases'),
  onUpdaterStatus: (callback) => {
    const subscription = (event, value) => callback(value);
    ipcRenderer.on('updater-status', subscription);
    return () => ipcRenderer.removeListener('updater-status', subscription);
  },
});
