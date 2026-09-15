const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Log debugging helper
const logFile = path.join(app.getPath('userData'), 'mixcortex_debug.log');
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(logFile, line);
  } catch {}
  console.log(msg);
}

log('MixCortex AI main process starting...');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');
app.commandLine.appendSwitch('disable-web-security');

let mainWindow = null;

function getAppIconPath() {
  const iconCandidates = [
    path.join(__dirname, 'build', 'cortex-icon.png'),
    path.join(__dirname, 'public', 'cortex-icon.png'),
    path.join(__dirname, 'build', 'icon.png'),
  ];
  for (const p of iconCandidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

function createWindow() {
  log('createWindow() called (MixCortex AI Standalone)');
  mainWindow = new BrowserWindow({
    width: 480,
    height: 840,
    minWidth: 380,
    minHeight: 520,
    backgroundColor: '#07090e',
    title: 'MixCortex AI — Neural DJ Co-Pilot',
    autoHideMenuBar: true,
    frame: false,
    alwaysOnTop: true,
    icon: getAppIconPath(),
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      backgroundThrottling: false,
    },
  });

  const distPaths = [
    path.join(__dirname, 'dist', 'index.html'),
    path.join(process.resourcesPath || '', 'app.asar', 'dist', 'index.html'),
    path.join(process.resourcesPath || '', 'app', 'dist', 'index.html'),
  ];

  let targetPath = null;
  for (const p of distPaths) {
    if (fs.existsSync(p)) {
      targetPath = p;
      break;
    }
  }

  log(`Target index.html path: ${targetPath}`);

  if (targetPath) {
    mainWindow.loadFile(targetPath);
  } else {
    mainWindow.loadURL('http://localhost:3001');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  log('MixCortex AI already running. Quitting second instance.');
  app.quit();
} else {
  app.on('second-instance', () => {
    log('Second instance triggered. Focusing window.');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Window Control IPC Handlers
ipcMain.handle('set-window-opacity', (event, opacity) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && typeof opacity === 'number') {
    const clamped = Math.max(0.1, Math.min(1.0, opacity));
    win.setOpacity(clamped);
    return { success: true, opacity: clamped };
  }
  return { success: false };
});

ipcMain.handle('set-always-on-top', (event, flag) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && typeof flag === 'boolean') {
    win.setAlwaysOnTop(flag, 'screen-saver');
    return { success: true, alwaysOnTop: flag };
  }
  return { success: false };
});

ipcMain.handle('minimize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.minimize();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('maximize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
    return { success: true, isMaximized: win.isMaximized() };
  }
  return { success: false };
});

ipcMain.handle('close-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.close();
    return { success: true };
  }
  return { success: false };
});

// Local Audio and File Access
ipcMain.handle('read-local-audio', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }
    throw new Error('File not found: ' + filePath);
  } catch (err) {
    log('Error reading local audio: ' + err);
    throw err;
  }
});

ipcMain.handle('scan-directory', async (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) return [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'];
    const results = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (audioExtensions.includes(ext)) {
          const fullPath = path.join(dirPath, entry.name);
          const stats = fs.statSync(fullPath);
          results.push({
            name: entry.name,
            fullPath,
            size: stats.size,
          });
        }
      }
    }
    return results;
  } catch (err) {
    log('Error scanning directory: ' + err);
    return [];
  }
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Universal DJ Software Bridge IPCs
ipcMain.handle('write-now-playing-broadcast', async (event, { title, artist, bpm, key, deck }) => {
  try {
    const streamerDir = 'C:\\StreamerBot';
    const nowPlayingFile = path.join(streamerDir, 'nowplaying.txt');
    if (!fs.existsSync(streamerDir)) {
      try { fs.mkdirSync(streamerDir, { recursive: true }); } catch {}
    }
    const cleanKey = key || '8A';
    const textContent = `${artist} - ${title} [${bpm} BPM | ${cleanKey}] (Deck ${deck || 1})`;
    fs.writeFileSync(nowPlayingFile, textContent, 'utf8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('read-djay-nowplaying', async () => {
  try {
    const streamerTxt = 'C:\\StreamerBot\\nowplaying.txt';
    if (fs.existsSync(streamerTxt)) {
      const raw = fs.readFileSync(streamerTxt, 'utf8').trim();
      let title = raw;
      let artist = 'djay Pro Artist';
      let bpm = 124.0;
      let key = '8A';
      let deck = '1';

      const bpmKeyMatch = raw.match(/\[([0-9.]+)\s*BPM\s*\|\s*([0-9a-zA-Z]+)\]/i);
      if (bpmKeyMatch) {
        bpm = parseFloat(bpmKeyMatch[1]) || 124.0;
        key = bpmKeyMatch[2].trim();
      }

      const deckMatch = raw.match(/\(Deck\s*([0-9a-zA-Z]+)\)/i);
      if (deckMatch) {
        deck = deckMatch[1].trim();
      }

      const cleanName = raw.replace(/\[.*?\]|\(.*?\)/g, '').trim();
      if (cleanName.includes(' - ')) {
        const parts = cleanName.split(' - ');
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      } else {
        title = cleanName;
      }

      return { title, artist, bpm, key, deck, currentTime: 0, duration: 210 };
    }
  } catch (err) {
    log('read-djay-nowplaying error: ' + err.message);
  }
  return null;
});

ipcMain.handle('read-external-nowplaying-file', async (event, filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch (err) {
    log('read-external-nowplaying-file error: ' + err.message);
  }
  return null;
});

// Auto-Updater & GitHub Patch Engine
let autoUpdater = null;
try {
  const updaterModule = require('electron-updater');
  autoUpdater = updaterModule.autoUpdater;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('updater-status', { status: 'checking', message: 'Checking GitHub for updates...' });
  });

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('updater-status', {
      status: 'available',
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
      message: `MixCortex AI v${info.version} is available!`
    });
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('updater-status', { status: 'not-available', message: 'MixCortex AI is up to date.' });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const pct = Math.round(progressObj.percent || 0);
    mainWindow?.webContents.send('updater-status', {
      status: 'downloading',
      percent: pct,
      message: `Downloading update: ${pct}%`,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('updater-status', {
      status: 'downloaded',
      version: info.version,
      message: `Update v${info.version} ready. Click Restart & Apply.`,
    });
  });

  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('updater-status', {
      status: 'error',
      error: err.message,
      message: 'Updater error: ' + err.message,
    });
  });
} catch (e) {
  log('electron-updater load warning: ' + e.message);
}

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('check-for-updates', async () => {
  if (autoUpdater) {
    try {
      const res = await autoUpdater.checkForUpdates();
      return { success: true, updateInfo: res?.updateInfo };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'autoUpdater not available' };
});

let downloadedInstallerPath = null;

ipcMain.handle('start-update-download', async () => {
  if (autoUpdater) {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err) {
      log('autoUpdater.downloadUpdate fallback to direct GitHub download: ' + err.message);
    }
  }

  // Direct GitHub release asset fallback
  try {
    const https = require('https');
    const os = require('os');

    const releaseData = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: '/repos/iammrwrath/MixCortex-AI/releases/latest',
        method: 'GET',
        headers: {
          'User-Agent': 'MixCortex-AI/' + app.getVersion(),
          'Accept': 'application/vnd.github.v3+json',
        },
      };
      https.get(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });

    const asset = releaseData?.assets?.find((a) => a.name.endsWith('Setup.exe') || a.name.endsWith('.exe'));
    if (!asset || !asset.browser_download_url) {
      throw new Error('No executable setup asset found in latest MixCortex AI release');
    }

    const downloadUrl = asset.browser_download_url;
    const tempFile = path.join(os.tmpdir(), `MixCortex-AI-Setup-${releaseData.tag_name || 'latest'}.exe`);
    const fileStream = fs.createWriteStream(tempFile);

    const downloadWithRedirect = (url) => {
      return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'MixCortex-AI' } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return downloadWithRedirect(res.headers.location).then(resolve).catch(reject);
          }
          if (res.statusCode !== 200) {
            return reject(new Error('Download failed with status: ' + res.statusCode));
          }

          const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
          let downloadedBytes = 0;

          res.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            if (totalBytes > 0) {
              const pct = Math.round((downloadedBytes / totalBytes) * 100);
              mainWindow?.webContents.send('updater-status', {
                status: 'downloading',
                percent: pct,
                message: `Downloading update: ${pct}%`,
              });
            }
          });

          res.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            resolve(tempFile);
          });
          fileStream.on('error', reject);
        }).on('error', reject);
      });
    };

    downloadedInstallerPath = await downloadWithRedirect(downloadUrl);
    mainWindow?.webContents.send('updater-status', {
      status: 'downloaded',
      version: releaseData.tag_name?.replace(/^v/, ''),
      message: `Update ${releaseData.tag_name} ready. Click Restart & Apply.`,
    });

    return { success: true };
  } catch (err) {
    mainWindow?.webContents.send('updater-status', {
      status: 'error',
      error: err.message,
      message: 'Download failed: ' + err.message,
    });
    return { success: false, error: err.message };
  }
});

ipcMain.handle('restart-and-install-patch', async () => {
  if (downloadedInstallerPath && fs.existsSync(downloadedInstallerPath)) {
    const { spawn } = require('child_process');
    spawn(downloadedInstallerPath, [], { detached: true, stdio: 'ignore' }).unref();
    app.quit();
    return { success: true };
  }

  if (autoUpdater) {
    try {
      autoUpdater.quitAndInstall(false, true);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'No downloaded update available to execute' };
});

ipcMain.handle('check-github-releases', async () => {
  try {
    const https = require('https');
    return new Promise((resolve) => {
      const options = {
        hostname: 'api.github.com',
        path: '/repos/iammrwrath/MixCortex-AI/releases/latest',
        method: 'GET',
        headers: {
          'User-Agent': 'MixCortex-AI/' + app.getVersion(),
          'Accept': 'application/vnd.github.v3+json'
        }
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const release = JSON.parse(data);
              resolve({ success: true, release });
            } catch {
              resolve({ success: false, error: 'JSON parse error' });
            }
          } else if (res.statusCode === 404) {
            resolve({ success: true, release: null, message: 'No releases published yet' });
          } else {
            resolve({ success: false, statusCode: res.statusCode });
          }
        });
      });
      req.on('error', (e) => resolve({ success: false, error: e.message }));
      req.end();
    });
  } catch (e) {
    return { success: false, error: e.message };
  }
});
