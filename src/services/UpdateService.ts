export interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  percent?: number;
  message?: string;
  error?: string;
}

type UpdateListener = (status: UpdateStatus) => void;

class UpdateService {
  private currentStatus: UpdateStatus = { status: 'idle', version: '1.0.0' };
  private listeners: Set<UpdateListener> = new Set();
  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.initialized) return;
    if (typeof window !== 'undefined' && (window as any).desktopAPI) {
      this.initialized = true;
      const api = (window as any).desktopAPI;

      // Get current application version
      if (api.getAppVersion) {
        api.getAppVersion().then((ver: string) => {
          if (ver) {
            this.currentStatus.version = ver;
            this.notify();
          }
        }).catch(() => {});
      }

      // Listen for main process updater events
      if (api.onUpdaterStatus) {
        api.onUpdaterStatus((data: any) => {
          this.currentStatus = { ...this.currentStatus, ...data };
          this.notify();
        });
      }

      // Check on startup after 5 seconds
      setTimeout(() => {
        this.checkForUpdates();
      }, 5000);
    }
  }

  public getStatus(): UpdateStatus {
    return this.currentStatus;
  }

  public subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    listener(this.currentStatus);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l(this.currentStatus));
  }

  public async checkForUpdates(): Promise<void> {
    this.currentStatus = { ...this.currentStatus, status: 'checking', message: 'Checking GitHub for updates...' };
    this.notify();

    if (typeof window !== 'undefined' && (window as any).desktopAPI?.checkForUpdates) {
      try {
        const res = await (window as any).desktopAPI.checkForUpdates();
        if (!res.success) {
          // Fallback to direct GitHub release API
          await this.checkViaGitHubAPI();
        }
      } catch {
        await this.checkViaGitHubAPI();
      }
    } else {
      await this.checkViaGitHubAPI();
    }
  }

  private async checkViaGitHubAPI(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && (window as any).desktopAPI?.checkGitHubReleases) {
        const gh = await (window as any).desktopAPI.checkGitHubReleases();
        if (gh.success && gh.release) {
          const latestTag = gh.release.tag_name?.replace(/^v/, '');
          const currentVer = this.currentStatus.version || '1.0.0';
          if (latestTag && latestTag !== currentVer) {
            this.currentStatus = {
              status: 'available',
              version: latestTag,
              message: `Patch v${latestTag} available on GitHub!`
            };
          } else {
            this.currentStatus = {
              status: 'not-available',
              message: `MixCortex AI is up to date (v${currentVer}).`
            };
          }
        } else {
          this.currentStatus = {
            status: 'not-available',
            message: `MixCortex AI is up to date (v${this.currentStatus.version || '1.0.0'}).`
          };
        }
      } else {
        // Web fallback
        const resp = await fetch('https://api.github.com/repos/iammrwrath/MixCortex-AI/releases/latest');
        if (resp.ok) {
          const data = await resp.json();
          const latestTag = data.tag_name?.replace(/^v/, '');
          const currentVer = this.currentStatus.version || '1.0.0';
          if (latestTag && latestTag !== currentVer) {
            this.currentStatus = {
              status: 'available',
              version: latestTag,
              message: `Patch v${latestTag} available!`
            };
          } else {
            this.currentStatus = {
              status: 'not-available',
              message: `MixCortex AI is up to date (v${currentVer}).`
            };
          }
        } else {
          this.currentStatus = {
            status: 'not-available',
            message: `MixCortex AI is up to date (v${this.currentStatus.version || '1.0.0'}).`
          };
        }
      }
    } catch {
      this.currentStatus = {
        status: 'not-available',
        message: `MixCortex AI v${this.currentStatus.version || '1.0.0'} (Latest)`
      };
    }
    this.notify();
  }

  public async startDownload(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).desktopAPI?.startUpdateDownload) {
      this.currentStatus = { ...this.currentStatus, status: 'downloading', percent: 0, message: 'Downloading patch...' };
      this.notify();
      await (window as any).desktopAPI.startUpdateDownload();
    } else {
      window.open('https://github.com/iammrwrath/CloudMix-Pro/releases', '_blank');
    }
  }

  public async restartAndApply(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).desktopAPI?.restartAndInstallPatch) {
      await (window as any).desktopAPI.restartAndInstallPatch();
    }
  }
}

export const updateService = new UpdateService();
