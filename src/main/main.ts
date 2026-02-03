/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  desktopCapturer,
  Tray,
  nativeImage,
  dialog,
  Notification,
  nativeTheme,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { getCurrentDisplay } from './displayUtils';
import { getCurrentWindow } from './windowUtils';
import { dbHelpers, TimeRangeComment } from './db';
import stateManager from './StateManager';
import {
  getCurrentUser,
  signIn,
  signUp,
  signOut,
  getCurrentSession,
  resetPassword,
  updatePassword,
  getUserProfile,
  updateUserProfile,
} from './auth';
import {
  submitSessionToSupabase,
  createProgressCallback,
} from './submissionService';
import { syncAllSessionsToLocal } from './syncService';
import * as fileStorage from './fileStorage';
import * as migration from './migration';
import { supabase } from './supabase';

// Add this at the top with other constants
const SENSITIVE_KEYWORDS = [
  'hsbc',
  'bank',
  'banking',
  'chase',
  'wellsfargo',
  'barclays',
  'santander',
  'lloyds',
  'halifax',
  'natwest',
  'citibank',
  'creditcard',
  // 'account' removed - too common (e.g., "Google Account", "GitHub - Account Settings")
  'payment',
  'transfer',
  'xvideos',
  'pornhub',
  'xhamster',
  'porn',
  'sex',
  'spankbang',
];

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let appUpdaterInitialized = false;
let ipcHandlersRegistered = false;

let mainWindow: BrowserWindow | null = null;
let trayWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const DEFAULT_WINDOW_WIDTH_RATIO = 0.85;
const DEFAULT_WINDOW_HEIGHT_RATIO = 0.88;
const DEFAULT_WINDOW_ASPECT_GAP = 40;

const getDefaultWindowBounds = () => {
  const { width: workAreaWidth, height: workAreaHeight } = screen.getPrimaryDisplay().workAreaSize;

  let width = Math.round(workAreaWidth * DEFAULT_WINDOW_WIDTH_RATIO);
  let height = Math.round(workAreaHeight * DEFAULT_WINDOW_HEIGHT_RATIO);

  width = Math.min(width, workAreaWidth);
  height = Math.min(height, workAreaHeight);

  if (height >= width) {
    height = Math.min(height, Math.max(1, width - DEFAULT_WINDOW_ASPECT_GAP));
  }

  return { width, height };
};

const UI_SCALE_BASE_WIDTH = 1400;
const UI_SCALE_BASE_HEIGHT = 900;
const UI_SCALE_MIN = 0.75;
const UI_SCALE_MAX = 1.25;
const uiScaleEnabledWebContents = new Set<number>();

const computeUiZoomFactor = (width: number, height: number) => {
  const scale = Math.min(width / UI_SCALE_BASE_WIDTH, height / UI_SCALE_BASE_HEIGHT);
  return Math.max(UI_SCALE_MIN, Math.min(UI_SCALE_MAX, scale));
};

const applyUiZoom = (win: BrowserWindow) => {
  if (win.isDestroyed()) return;
  const { width, height } = win.getContentBounds();
  win.webContents.setZoomFactor(computeUiZoomFactor(width, height));
};

const attachUiScaling = (win: BrowserWindow) => {
  win.on('resize', () => {
    if (uiScaleEnabledWebContents.has(win.webContents.id)) {
      applyUiZoom(win);
    }
  });

  win.on('closed', () => {
    uiScaleEnabledWebContents.delete(win.webContents.id);
  });
};
let isRecording = false;
let isPaused = false;
let lastSensitiveNotification = 0;
const NOTIFICATION_THROTTLE = 5000; // 5 seconds between notifications

let cursorMonitorInterval: NodeJS.Timeout | null = null;
let cursorMonitorInFlight = false;
const CURSOR_MONITOR_INTERVAL_MS = 100;

function sendToRecordingWindows(channel: string, ...args: unknown[]) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
  if (trayWindow && !trayWindow.isDestroyed()) {
    trayWindow.webContents.send(channel, ...args);
  }
}

function sendToAllWindows(channel: string, ...args: unknown[]) {
  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, ...args);
    }
  });
}

function showSensitiveContentNotification() {
  const now = Date.now();
  if (now - lastSensitiveNotification <= NOTIFICATION_THROTTLE) return;

  new Notification({
    title: 'Sensitive Content Detected',
    body: 'Recording has been automatically paused to protect your privacy.',
    urgency: 'critical',
    silent: false,
  }).show();
  lastSensitiveNotification = now;
}

function ensureCursorMonitorStarted() {
  if (cursorMonitorInterval) return;

  cursorMonitorInterval = setInterval(async () => {
    if (!isRecording || isPaused) return;
    if (cursorMonitorInFlight) return;

    cursorMonitorInFlight = true;
    try {
      const cursorPosition = screen.getCursorScreenPoint();
      const cursorDisplay = screen.getDisplayNearestPoint(cursorPosition);
      const windowInfo = await getCurrentWindow();

      if (isSensitiveWindow(windowInfo)) {
        showSensitiveContentNotification();
        isPaused = true;
        stateManager.pauseActiveSession();
        sendToRecordingWindows('recording-paused');
      }

      sendToRecordingWindows('cursor-moved', {
        position: cursorPosition,
        activeWindow: windowInfo,
        display: {
          id: cursorDisplay.id,
          bounds: cursorDisplay.bounds,
        },
      });
    } finally {
      cursorMonitorInFlight = false;
    }
  }, CURSOR_MONITOR_INTERVAL_MS);
}

function stopCursorMonitor() {
  if (!cursorMonitorInterval) return;
  clearInterval(cursorMonitorInterval);
  cursorMonitorInterval = null;
}

const METADATA_UPDATE_DEBOUNCE_MS = 1500;
const metadataUpdateTimers = new Map<number, NodeJS.Timeout>();

async function updateSessionMetadataNow(sessionId: number) {
  try {
    await fileStorage.updateSessionMetadata(
      sessionId,
      dbHelpers.getSession,
      dbHelpers.getSessionRecordings,
      dbHelpers.getSessionComments,
    );
  } catch (error) {
    console.error('Failed to update session metadata:', error);
  }
}

function scheduleSessionMetadataUpdate(sessionId: number) {
  const existingTimer = metadataUpdateTimers.get(sessionId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    metadataUpdateTimers.delete(sessionId);
    void updateSessionMetadataNow(sessionId);
  }, METADATA_UPDATE_DEBOUNCE_MS);

  metadataUpdateTimers.set(sessionId, timer);
}

async function flushSessionMetadataUpdate(sessionId: number) {
  const existingTimer = metadataUpdateTimers.get(sessionId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    metadataUpdateTimers.delete(sessionId);
  }
  await updateSessionMetadataNow(sessionId);
}

async function getSessionRecordingsWithImages(sessionId: number) {
  const recordings = await dbHelpers.getSessionRecordings(sessionId);

  return recordings.map((recording) => {
    const screenshotFromFile = recording.screenshot_path
      ? fileStorage.readScreenshot(recording.screenshot_path)
      : null;

    const thumbnailFromFile = recording.screenshot_path
      ? fileStorage.readThumbnail(recording.screenshot_path, 300)
      : null;

    const screenshot = screenshotFromFile || recording.screenshot;
    const thumbnail =
      thumbnailFromFile ||
      (recording.thumbnail && recording.thumbnail.length > 0
        ? recording.thumbnail
        : screenshot || recording.thumbnail);

    return {
      ...recording,
      screenshot,
      thumbnail,
    };
  });
}

let currentUserId: string | null = null;
let sessionsSyncInFlight: Promise<void> | null = null;
let lastSessionsSyncAt = 0;
const SESSIONS_SYNC_TTL_MS = 2 * 60 * 1000;

async function syncSessionsIfNeeded(userId: string) {
  const now = Date.now();
  if (sessionsSyncInFlight) return;
  if (now - lastSessionsSyncAt < SESSIONS_SYNC_TTL_MS) return;

  sessionsSyncInFlight = (async () => {
    try {
      await syncAllSessionsToLocal(userId);
      lastSessionsSyncAt = Date.now();
    } catch (error) {
      console.error('Failed to sync sessions from Supabase:', error);
    } finally {
      sessionsSyncInFlight = null;
    }
  })();
}

// Add this function to check for sensitive content
function isSensitiveWindow(windowInfo: any) {
  if (!windowInfo || !windowInfo.title) return false;

  const titleLower = windowInfo.title.toLowerCase();
  const processLower = (windowInfo.processName || '').toLowerCase();

  return SENSITIVE_KEYWORDS.some(
    (keyword) => titleLower.includes(keyword) || processLower.includes(keyword),
  );
}

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

// const isDebug =
//   process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

// if (isDebug) {
//   require('electron-debug')();
// }

// function installExtensions() {
//   const installer = require('electron-devtools-installer');
//   const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
//   const extensions = ['REACT_DEVELOPER_TOOLS'];

//   return installer
//     .default(
//       extensions.map((name) => installer[name]),
//       forceDownload,
//     )
//     .catch(console.log);
// }

// installExtensions();

// Add this before createWindow()
const userDataPath = app.getPath('userData');
app.setPath('userData', path.join(userDataPath, 'electron-cache'));

const getPreloadScriptPath = () =>
  app.isPackaged
    ? path.join(__dirname, 'preload.js')
    : path.join(__dirname, '../../.erb/dll/preload.js');

const getAssetsBasePath = () =>
  app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

const getAssetPath = (...paths: string[]): string => {
  return path.join(getAssetsBasePath(), ...paths);
};

// Add function to create tray window
const createTrayWindow = () => {
  trayWindow = new BrowserWindow({
    width: 300,
    height: 600,
    show: false,
    frame: false,
    skipTaskbar: true,
    webPreferences: {
      preload: getPreloadScriptPath(),
      partition: 'persist:main',
      enableWebSQL: false,
      allowRunningInsecureContent: false,
    },
  });

  // Update the URL loading to handle both development and production
  if (app.isPackaged) {
    trayWindow.loadURL(`${resolveHtmlPath('index.html')}?tray=true`);
  } else {
    trayWindow.loadURL(
      `http://localhost:${process.env.PORT || 1212}/index.html?tray=true`,
    );
  }

  // Hide window when it loses focus
  trayWindow.on('blur', () => {
    trayWindow?.hide();
  });

  return trayWindow;
};

// Add this after the createTrayWindow function
const createDashboardWindow = () => {
  const { width: defaultWidth, height: defaultHeight } = getDefaultWindowBounds();
  const dashboardWindow = new BrowserWindow({
    width: defaultWidth,
    height: defaultHeight,
    show: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: {
      x: 18,
      y: 10,
    },
    webPreferences: {
      preload: getPreloadScriptPath(),
      partition: 'persist:main',
      enableWebSQL: false,
      allowRunningInsecureContent: false,
    },
  });
  attachUiScaling(dashboardWindow);

  if (app.isPackaged) {
    dashboardWindow.loadURL(`${resolveHtmlPath('index.html')}?dashboard=true`);
  } else {
    dashboardWindow.loadURL(
      `http://localhost:${process.env.PORT || 1212}/index.html?dashboard=true`,
    );
  }

  dashboardWindow.once('ready-to-show', () => {
    dashboardWindow.show();
    dashboardWindow.focus();
  });

  return dashboardWindow;
};

// All IPC handler registrations are in registerIpcHandlers()
function registerIpcHandlers() {
  if (ipcHandlersRegistered) return;
  ipcHandlersRegistered = true;

  const ensureTrayWindow = () => {
    if (!trayWindow || trayWindow.isDestroyed()) {
      createTrayWindow();
    }
    return trayWindow;
  };

  const ensureMainWindow = async () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      await createWindow();
    }
    return mainWindow;
  };

  ipcMain.handle('ui:set-scaling-enabled', (event, enabled: boolean) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return false;

    if (enabled) {
      uiScaleEnabledWebContents.add(event.sender.id);
      applyUiZoom(win);
      return true;
    }

    uiScaleEnabledWebContents.delete(event.sender.id);
    win.webContents.setZoomFactor(1);
    return true;
  });

  ipcMain.handle('set-theme', (event, theme: 'light' | 'dark') => {
    nativeTheme.themeSource = theme;
    sendToAllWindows('theme-changed', theme);
  });

  ipcMain.handle('show-delete-confirmation', async (event, options) => {
    const result = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['Cancel', 'Delete'],
      defaultId: 0,
      title: options.title || 'Confirm Delete',
      message: options.message || 'Are you sure you want to delete this item?',
    });

    return result.response === 1;
  });

  ipcMain.handle('get-active-windows', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 150, height: 150 },
      });

      return sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
        display_id: source.display_id,
      }));
    } catch (error) {
      console.error('Failed to get active windows:', error);
      throw error;
    }
  });

  ipcMain.handle('get-displays', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 150, height: 150 },
    });

    const displays = screen.getAllDisplays();

    return displays.map((display, index) => {
      const matchingSource =
        sources.find(
          (source) =>
            source.display_id?.toString() === display.id.toString(),
        ) || sources[index];

      return {
        id: display.id.toString(),
        name: display.label || `Display ${display.id}`,
        resolution: `${display.size.width}x${display.size.height}`,
        screenSourceId: matchingSource?.id || `screen:${index}:0`,
      };
    });
  });

  ipcMain.handle('open-tray-window', (event, bounds) => {
    const win = ensureTrayWindow();
    if (!win) return;

    const windowBounds = win.getBounds();

    if (bounds) {
      const yPosition = bounds.y - windowBounds.height;
      const xPosition = Math.round(
        bounds.x - windowBounds.width / 2 + bounds.width / 2,
      );
      win.setPosition(xPosition, yPosition);
    }

    win.show();
    win.focus();
  });

  ipcMain.handle('show-dashboard', () => {
    const existingDashboard = BrowserWindow.getAllWindows().find((win) => {
      const url = win.webContents.getURL();
      return url.includes('dashboard=true');
    });

    if (existingDashboard) {
      if (existingDashboard.isMinimized()) {
        existingDashboard.restore();
      }
      existingDashboard.focus();
      return;
    }

    createDashboardWindow();
  });

  ipcMain.handle('focus-main-window', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  });

  ipcMain.handle('get-current-window-info', async () => {
    const cursorPosition = screen.getCursorScreenPoint();
    const cursorDisplay = screen.getDisplayNearestPoint(cursorPosition);

    let displayInfo = null;
    if (process.platform === 'darwin') {
      displayInfo = await getCurrentDisplay(cursorPosition.x, cursorPosition.y);
    }

    const windowInfo = await getCurrentWindow();

    return {
      position: cursorPosition,
      activeWindow: windowInfo,
      display: {
        id: displayInfo?.id || cursorDisplay.id,
        name: displayInfo?.name || `Display ${cursorDisplay.id}`,
        bounds: cursorDisplay.bounds,
      },
    };
  });

  ipcMain.handle('set-recording-status', (event, status) => {
    isRecording = Boolean(status);
  });

  ipcMain.handle('take-screenshot', async () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height },
    });

    return sources[0]?.thumbnail.toDataURL() || null;
  });

  ipcMain.handle('get-sources', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 100, height: 100 },
    });
    return sources;
  });

  ipcMain.handle('check-sensitive-content', async () => {
    const windows = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 100, height: 100 },
    });

    return windows.some((window) =>
      isSensitiveWindow({ title: window.name }),
    );
  });

  ipcMain.on('start-recording', async (event, sessionId) => {
    const windowInfo = await getCurrentWindow();
    if (isSensitiveWindow(windowInfo)) {
      new Notification({
        title: 'Sensitive Content Detected',
        body: 'Cannot start recording due to sensitive content!',
      }).show();
      return;
    }

    stateManager.setActiveSession(sessionId);
    await stateManager.initializeFromDb(dbHelpers);
    isRecording = true;
    isPaused = false;

    if (mainWindow?.isVisible() && !mainWindow.isMinimized()) {
      mainWindow.minimize();
    }
    if (trayWindow?.isVisible() && !trayWindow.isMinimized()) {
      trayWindow.hide();
    }

    sendToRecordingWindows('start-recording', sessionId);
  });

  ipcMain.on('stop-recording', async () => {
    isRecording = false;
    isPaused = false;
    const { sessionId, finalDuration } = stateManager.stopActiveSession();

    if (sessionId && finalDuration !== null) {
      try {
        await dbHelpers.updateDuration(sessionId, finalDuration);
        await flushSessionMetadataUpdate(sessionId);
        sendToRecordingWindows('stop-recording');
      } catch (error) {
        console.error('Failed to update session duration:', error);
      }
    }
  });

  ipcMain.on('pause-recording', () => {
    if (!isRecording || isPaused) return;
    isPaused = true;
    stateManager.pauseActiveSession();
    sendToRecordingWindows('recording-paused');
  });

  ipcMain.on('resume-recording', () => {
    if (!isRecording || !isPaused) return;
    isPaused = false;
    stateManager.resumeActiveSession();
    sendToRecordingWindows('recording-resumed');
  });

  ipcMain.handle('get-active-session', () => {
    return {
      id: stateManager.getActiveSessionId(),
      duration: stateManager.getCurrentDuration(),
    };
  });

  ipcMain.handle('get-current-duration', () => {
    return stateManager.getCurrentDuration();
  });

  ipcMain.handle('delete-session', async (event, sessionId: number) => {
    try {
      // Delete from database
      await dbHelpers.deleteSession(sessionId);
      // Delete session folder and files
      fileStorage.deleteSessionFolder(sessionId);
      return true;
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  });

  ipcMain.handle('get-sessions', async () => {
    try {
      if (currentUserId) {
        void syncSessionsIfNeeded(currentUserId);
      }
      return await dbHelpers.getAllSessions();
    } catch (error) {
      console.error('Error in get-sessions handler:', error);
      // Fallback to local sessions on error
      return dbHelpers.getAllSessions();
    }
  });

  ipcMain.handle(
    'create-session',
    async (event, sessionType: 'passive' | 'tasked', taskId?: number) => {
      try {
        const sessionId = await dbHelpers.createSession(
          sessionType,
          taskId ?? null,
        );
        return sessionId;
      } catch (error) {
        console.error('Failed to create session:', error);
        throw error;
      }
    },
  );

  ipcMain.handle(
    'update-session-duration',
    (event, sessionId: number, duration: number) => {
      return dbHelpers.updateDuration(sessionId, duration);
    },
  );

  ipcMain.handle('submit-session', async (event, sessionId: number) => {
    try {
      const userResult = await getCurrentUser();
      if (!userResult.success || !userResult.user) {
        return {
          success: false,
          error: 'You must be signed in to submit recordings',
        };
      }

      const progressCallback = createProgressCallback(event.sender);

      const result = await submitSessionToSupabase(
        userResult.user.id,
        sessionId,
        progressCallback,
      );

      if (result.success) {
        await dbHelpers.submitForApproval(sessionId);
      }

      return result;
    } catch (error: any) {
      console.error('Submit session error:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit session',
      };
    }
  });

  ipcMain.handle('migrate-recordings', async () => {
    try {
      const result = await migration.migrateRecordingsToFiles();
      return result;
    } catch (error: any) {
      console.error('Migration error:', error);
      return {
        success: false,
        migrated: 0,
        failed: 0,
        errors: [
          { recordingId: -1, error: error.message || 'Unknown error' },
        ],
      };
    }
  });

  ipcMain.handle('verify-migration', async () => {
    try {
      const result = await migration.verifyMigration();
      return result;
    } catch (error: any) {
      console.error('Verification error:', error);
      return {
        success: false,
        total: 0,
        valid: 0,
        invalid: 0,
        details: [],
      };
    }
  });

  ipcMain.handle('cleanup-legacy-data', async () => {
    try {
      const result = await migration.cleanupLegacyBase64Data();
      return result;
    } catch (error: any) {
      console.error('Cleanup error:', error);
      return {
        success: false,
        cleaned: 0,
        error: error.message || 'Unknown error',
      };
    }
  });

  ipcMain.handle('get-tasks', () => {
    return dbHelpers.getAllTasks();
  });

  ipcMain.handle('get-task', (event, taskId: number) => {
    return dbHelpers.getTaskById(taskId);
  });

  ipcMain.handle('start-task', (event, taskId: number) => {
    try {
      if (trayWindow && !trayWindow.isDestroyed()) {
        trayWindow.webContents.send('open-task', taskId);
        trayWindow.show();
        trayWindow.focus();
        return;
      }

      const win = createTrayWindow();
      win.webContents.once('did-finish-load', () => {
        win.webContents.send('open-task', taskId);
        win.show();
        win.focus();
      });
    } catch (error) {
      console.error('Failed to start task:', error);
      throw error;
    }
  });

  ipcMain.handle('start-passive-mode', () => {
    try {
      ensureTray();
      if (!tray) return;

      const applyPassiveMode = (win: BrowserWindow) => {
        const trayBounds = tray.getBounds();
        const windowBounds = win.getBounds();

        const yPosition =
          process.platform === 'darwin'
            ? trayBounds.y
            : trayBounds.y - windowBounds.height;

        const xPosition = Math.round(
          trayBounds.x - windowBounds.width / 2 + trayBounds.width / 2,
        );

        win.setPosition(xPosition, yPosition);
        win.show();
        win.focus();
        win.webContents.send('set-mode', 'passive');
      };

      if (trayWindow && !trayWindow.isDestroyed()) {
        applyPassiveMode(trayWindow);
        return;
      }

      const win = createTrayWindow();
      win.webContents.once('did-finish-load', () => applyPassiveMode(win));
    } catch (error) {
      console.error('Failed to start passive mode:', error);
      throw error;
    }
  });

  ipcMain.handle('open-tracker', (event, mode: 'passive' | 'tasks') => {
    try {
      const applyTrackerMode = (win: BrowserWindow) => {
        const display = screen.getPrimaryDisplay();
        const { width } = win.getBounds();

        const x = display.bounds.width - width - 20;
        const y = 40;

        win.setPosition(x, y);
        win.webContents.send('set-mode', mode);
        win.show();
        win.focus();
      };

      if (trayWindow && !trayWindow.isDestroyed()) {
        applyTrackerMode(trayWindow);
        return;
      }

      const win = createTrayWindow();
      win.webContents.once('did-finish-load', () => applyTrackerMode(win));
    } catch (error) {
      console.error('Failed to open tracker:', error);
      throw error;
    }
  });

  ipcMain.handle(
    'capture-window',
    async (event, sourceId: string, sourceType: 'window' | 'screen') => {
      try {
        const sources = await desktopCapturer.getSources({
          types: ['window', 'screen'],
          thumbnailSize: { width: 1920, height: 1080 },
        });

        let source = sources.find((s) => s.id === sourceId);

        if (!source && sourceType === 'screen') {
          source = sources.find(
            (s) =>
              s.id.startsWith('screen:') &&
              (s.display_id?.toString() === sourceId ||
                s.display_id?.toString() ===
                  sourceId.replace('screen:', '').split(':')[0]),
          );

          if (!source) {
            source = sources.find((s) => s.id.startsWith('screen:'));
          }
        }

        if (!source) return null;

        const size = source.thumbnail.getSize();
        if (!size || size.width === 0 || size.height === 0) {
          return null;
        }

        const thumbnailWidth = 300;
        const thumbnailHeight = Math.max(
          1,
          Math.round((size.height / size.width) * thumbnailWidth),
        );
        const thumbnail = source.thumbnail.resize({
          width: thumbnailWidth,
          height: thumbnailHeight,
        });

        return {
          windowId: source.id,
          windowName: source.name,
          timestamp: new Date().toISOString(),
          thumbnail: thumbnail.toDataURL(),
          screenshot: source.thumbnail.toDataURL(),
        };
      } catch (error) {
        console.error('[CAPTURE] Error:', error);
        return null;
      }
    },
  );

  ipcMain.handle('save-recording', async (event, recording) => {
    try {
      // Insert DB row first to get a stable recording ID, then write the screenshot to disk.
      const recordingId = await dbHelpers.createRecording({
        ...recording,
        screenshot: '',
        screenshot_path: null,
      });

      const screenshotPath = fileStorage.saveScreenshot(
        recording.session_id,
        recordingId,
        recording.screenshot,
      );
      await dbHelpers.updateRecordingScreenshotPath(recordingId, screenshotPath);

      scheduleSessionMetadataUpdate(recording.session_id);

      sendToAllWindows('new-recording', {
        sessionId: recording.session_id,
        recordingId,
      });

      return recordingId;
    } catch (error) {
      console.error('Failed to save recording:', error);
      throw error;
    }
  });

  ipcMain.handle('get-session-recordings', async (event, sessionId: number) => {
    return getSessionRecordingsWithImages(sessionId);
  });

  ipcMain.handle('show-editor', async (event, sessionId: number) => {
    try {
      const recordings = await getSessionRecordingsWithImages(sessionId);

      if (trayWindow && !trayWindow.isDestroyed()) {
        trayWindow.hide();
      }

      const existingEditorWindow = BrowserWindow.getAllWindows().find((win) => {
        const url = win.webContents.getURL();
        return (
          url.includes('index.html') &&
          !url.includes('tray=true') &&
          !win.isDestroyed() &&
          win !== trayWindow
        );
      });

      if (existingEditorWindow) {
        if (existingEditorWindow.isMinimized()) {
          existingEditorWindow.restore();
        }
        existingEditorWindow.show();
        existingEditorWindow.focus();
        setTimeout(() => {
          existingEditorWindow.webContents.send('load-editor', {
            sessionId,
            recordings,
          });
        }, 150);
        return;
      }

      const win = await ensureMainWindow();
      if (!win || win.isDestroyed()) return;

      win.show();
      win.focus();
      setTimeout(() => {
        if (win.isDestroyed()) return;
        win.webContents.send('load-editor', { sessionId, recordings });
      }, 150);
    } catch (error) {
      console.error('Failed to show editor:', error);
      throw error;
    }
  });

  ipcMain.handle(
    'delete-recording',
    async (event, { sessionId, recordingId }) => {
      try {
        const recording = await dbHelpers.getRecordingById(recordingId);
        await dbHelpers.deleteRecording(sessionId, recordingId);
        if (recording?.screenshot_path) {
          fileStorage.deleteScreenshotFile(recording.screenshot_path);
        }
        scheduleSessionMetadataUpdate(sessionId);
        return true;
      } catch (error) {
        console.error('Failed to delete recording:', error);
        throw error;
      }
    },
  );

  ipcMain.handle(
    'update-recording-label',
    async (event, { recordingId, label }) => {
      try {
        await dbHelpers.updateRecordingLabel(recordingId, label);
        const recording = await dbHelpers.getRecordingById(recordingId);
        if (recording?.session_id) {
          scheduleSessionMetadataUpdate(recording.session_id);
        }
        return true;
      } catch (error) {
        console.error('Failed to update recording label:', error);
        throw error;
      }
    },
  );

  ipcMain.on('show-success-notification', (event, { title, message }) => {
    new Notification({
      title,
      body: message,
      silent: false,
    }).show();
  });

  ipcMain.on('show-error-notification', (event, { title, message }) => {
    new Notification({
      title,
      body: message,
      urgency: 'critical',
      silent: false,
    }).show();
  });

  ipcMain.handle('create-comment', async (event, comment: TimeRangeComment) => {
    try {
      const result = await dbHelpers.createComment(comment);
      scheduleSessionMetadataUpdate(comment.session_id);
      return result;
    } catch (error) {
      console.error('Failed to create comment:', error);
      throw error;
    }
  });

  ipcMain.handle('delete-comment', async (event, commentId: number) => {
    try {
      const comment = await dbHelpers.getCommentById(commentId);
      await dbHelpers.deleteComment(commentId);
      if (comment?.session_id) {
        scheduleSessionMetadataUpdate(comment.session_id);
      }
      return true;
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  });

  ipcMain.handle(
    'update-comment',
    async (
      event,
      commentId: number,
      updatedComment: Partial<TimeRangeComment>,
    ) => {
      try {
        const comment = await dbHelpers.getCommentById(commentId);
        await dbHelpers.updateComment(commentId, updatedComment);
        if (comment?.session_id) {
          scheduleSessionMetadataUpdate(comment.session_id);
        }
        return true;
      } catch (error) {
        console.error('Failed to update comment:', error);
        throw error;
      }
    },
  );

  ipcMain.handle('get-session-comments', async (event, sessionId: number) => {
    try {
      const comments = await dbHelpers.getSessionComments(sessionId);
      return comments;
    } catch (error) {
      console.error('Failed to get session comments:', error);
      throw error;
    }
  });

  ipcMain.handle('auth:sign-up', async (event, params) => {
    try {
      const result = await signUp(params);
      if (result.success && result.user) {
        currentUserId = result.user.id;
      }
      return result;
    } catch (error: any) {
      console.error('Failed to sign up:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:sign-in', async (event, params) => {
    try {
      const result = await signIn(params);

      if (result.success && result.user) {
        currentUserId = result.user.id;
        try {
          await syncAllSessionsToLocal(result.user.id);
          lastSessionsSyncAt = Date.now();
        } catch (syncError) {
          console.error('Failed to sync sessions after login:', syncError);
        }
      }

      return result;
    } catch (error: any) {
      console.error('Failed to sign in:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:sign-out', async () => {
    try {
      const result = await signOut();
      currentUserId = null;
      return result;
    } catch (error: any) {
      console.error('Failed to sign out:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:get-current-user', async () => {
    try {
      const result = await getCurrentUser();
      if (result.success && result.user) {
        currentUserId = result.user.id;
      } else {
        currentUserId = null;
      }
      return result;
    } catch (error: any) {
      console.error('Failed to get current user:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:get-current-session', async () => {
    try {
      const result = await getCurrentSession();
      if (result.success && result.session?.user?.id) {
        currentUserId = result.session.user.id;
      }
      return result;
    } catch (error: any) {
      console.error('Failed to get current session:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:reset-password', async (event, email: string) => {
    try {
      const result = await resetPassword(email);
      return result;
    } catch (error: any) {
      console.error('Failed to reset password:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    'auth:update-password',
    async (event, newPassword: string) => {
      try {
        const result = await updatePassword(newPassword);
        return result;
      } catch (error: any) {
        console.error('Failed to update password:', error);
        return { success: false, error: error.message };
      }
    },
  );

  ipcMain.handle('auth:get-profile', async (event, userId: string) => {
    try {
      const result = await getUserProfile(userId);
      return result;
    } catch (error: any) {
      console.error('Failed to get user profile:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:update-profile', async (event, { userId, updates }) => {
    try {
      const result = await updateUserProfile(userId, updates);
      return result;
    } catch (error: any) {
      console.error('Failed to update user profile:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-user-points', async (event, userId: string) => {
    try {
      const result = await getUserProfile(userId);
      if (result.success && result.profile) {
        return { success: true, points: result.profile.points_earned };
      }
      return { success: false, error: 'Failed to get points' };
    } catch (error: any) {
      console.error('Failed to get user points:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-notifications', async (event, userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to get notifications:', error);
        return { success: false, error: error.message };
      }

      return { success: true, notifications: data };
    } catch (error: any) {
      console.error('Failed to get notifications:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    'mark-notification-read',
    async (event, notificationId: string) => {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notificationId);

        if (error) {
          console.error('Failed to mark notification as read:', error);
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (error: any) {
        console.error('Failed to mark notification as read:', error);
        return { success: false, error: error.message };
      }
    },
  );

  ipcMain.handle('clear-all-notifications', async (event, userId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to clear notifications:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Failed to clear notifications:', error);
      return { success: false, error: error.message };
    }
  });
}

const ensureTray = () => {
  if (tray) return;

  const trayIcon = nativeImage.createFromPath(getAssetPath('icon.png'));
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));

  // Set dock icon on macOS using RelicDockPadded.png (properly sized with padding)
  if (process.platform === 'darwin' && app.dock) {
    const dockIcon = nativeImage.createFromPath(getAssetPath('RelicDockPadded.png'));
    app.dock.setIcon(dockIcon);
  }

  tray.on('click', (_event, bounds) => {
    if (!trayWindow) {
      createTrayWindow();
    }

    if (!trayWindow) return;

    const windowBounds = trayWindow.getBounds();

    // Position window above the tray icon
    const yPosition =
      process.platform === 'darwin'
        ? bounds.y
        : bounds.y - windowBounds.height;

    const xPosition = Math.round(bounds.x - windowBounds.width / 2 + bounds.width / 2);

    trayWindow.setPosition(xPosition, yPosition);

    if (trayWindow.isVisible()) {
      trayWindow.hide();
    } else {
      trayWindow.show();
      trayWindow.focus();
    }
  });
};

const createWindow = async () => {
  // Close any existing main windows first
  BrowserWindow.getAllWindows().forEach((win) => {
    if (win !== trayWindow) {
      win.close();
    }
  });

  const { width, height } = getDefaultWindowBounds();

  mainWindow = new BrowserWindow({
    width,
    height,
    show: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: {
      x: 18,
      y: 10,
    },
    webPreferences: {
      allowRunningInsecureContent: false,
      preload: getPreloadScriptPath(),
      partition: 'persist:main',
      enableWebSQL: false,
    },
  });
  attachUiScaling(mainWindow);

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  // Show main window when ready
  mainWindow.on('ready-to-show', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Add this handler for window.open
  mainWindow.webContents.setWindowOpenHandler(() => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        frame: false,
        titleBarStyle: 'hidden',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: getPreloadScriptPath(),
        },
      },
    };
  });

  ensureTray();

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  ensureCursorMonitorStarted();

  if (!appUpdaterInitialized) {
    appUpdaterInitialized = true;
    // eslint-disable-next-line no-new
    new AppUpdater();
  }
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  if (mainWindow) {
    mainWindow.close();
  }
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    registerIpcHandlers();
    createWindow();

    void (async () => {
      const userResult = await getCurrentUser();
      if (userResult.success && userResult.user) {
        currentUserId = userResult.user.id;
        void syncSessionsIfNeeded(userResult.user.id);
      } else {
        currentUserId = null;
      }
    })();

    app.on('activate', () => {
      if (tray === null) {
        createWindow();
      }
    });
  })
  .catch(console.log);

app.on('before-quit', () => {
  stopCursorMonitor();
  metadataUpdateTimers.forEach((timer) => clearTimeout(timer));
  metadataUpdateTimers.clear();
  if (tray) {
    tray.destroy();
  }
});
