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
import { getMacDisplayInfo, getCurrentDisplay } from './displayUtils';
import { getCurrentWindow } from './windowUtils';
import { dbHelpers, TimeRangeComment } from './db';
import stateManager from './StateManager';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
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

let mainWindow: BrowserWindow | null = null;
let trayWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isRecording = false;
let isPaused = false;
let lastSensitiveNotification = 0;
const NOTIFICATION_THROTTLE = 5000; // 5 seconds between notifications

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

// Add IPC handler for getting active windows
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
      display_id: source.display_id, // Add display_id for matching screens to displays
    }));
  } catch (error) {
    console.error('Failed to get active windows:', error);
    throw error;
  }
});

// Add IPC handler for capturing a specific window or screen
ipcMain.handle('capture-source', async (event, sourceId) => {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 300, height: 200 },
  });

  const source = sources.find((s) => s.id === sourceId);
  if (!source) return null;

  return {
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL(),
    timestamp: new Date().toISOString(),
  };
});

// Add function to create tray window
const createTrayWindow = () => {
  trayWindow = new BrowserWindow({
    width: 300,
    height: 600,
    show: false,
    frame: false,
    skipTaskbar: true,
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
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
  const dashboardWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: {
      x: 18,
      y: 10,
    },
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
      partition: 'persist:main',
      enableWebSQL: false,
      allowRunningInsecureContent: false,
    },
  });

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

  // Register other handlers...
  ipcMain.handle('get-sessions', async () => {
    try {
      // Check if user is logged in
      const userResult = await getCurrentUser();

      if (userResult.success && userResult.user) {
        // User is logged in - sync from Supabase first
        console.log('User is logged in, syncing sessions from Supabase...');
        try {
          await syncAllSessionsToLocal(userResult.user.id);
        } catch (syncError) {
          console.error('Failed to sync from Supabase, using local data:', syncError);
        }
      }

      // Return local sessions (either synced or offline-only)
      return dbHelpers.getAllSessions();
    } catch (error) {
      console.error('Error in get-sessions handler:', error);
      // Fallback to local sessions on error
      return dbHelpers.getAllSessions();
    }
  });

}

// Add this function to check all visible windows
async function checkForAnySensitiveContent(): Promise<boolean> {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 150, height: 150 },
  });

  // When checking for sensitive content, we need to check ALL window names
  for (const source of sources) {
    // Skip "Entire Screen" entries as they're not actual windows
    if (source.name.toLowerCase().includes('entire screen')) {
      continue;
    }
    if (isSensitiveWindow({ title: source.name })) {
      console.log('Sensitive window detected:', source.name);
      return true;
    }
  }
  return false;
}

const createWindow = async () => {
  // Close any existing main windows first
  BrowserWindow.getAllWindows().forEach(win => {
    if (win !== trayWindow) {
      win.close();
    }
  });

  // Create main window with original dimensions
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: {
      x: 18,
      y: 10,
    },
    webPreferences: {
      allowRunningInsecureContent: false,
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
      partition: 'persist:main',
      enableWebSQL: false,
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  // Create tray icon
  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  const icon = nativeImage.createFromPath(getAssetPath('icon.png'));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  // Set dock icon on macOS using RelicDockPadded.png (properly sized with padding)
  if (process.platform === 'darwin' && app.dock) {
    const dockIcon = nativeImage.createFromPath(getAssetPath('RelicDockPadded.png'));
    app.dock.setIcon(dockIcon);
  }

  tray.on('click', (event, bounds) => {
    if (!trayWindow) {
      createTrayWindow();
    }

    if (!trayWindow) return;

    const trayBounds = bounds;
    const windowBounds = trayWindow.getBounds();

    // Position window above the tray icon
    const yPosition =
      process.platform === 'darwin'
        ? trayBounds.y
        : trayBounds.y - windowBounds.height;

    const xPosition = Math.round(
      trayBounds.x - windowBounds.width / 2 + trayBounds.width / 2,
    );

    trayWindow.setPosition(xPosition, yPosition);

    if (trayWindow.isVisible()) {
      trayWindow.hide();
    } else {
      trayWindow.show();
      trayWindow.focus();
    }
  });

  // Show main window when ready
  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    mainWindow.show();
    mainWindow.focus();
  });

  // Add IPC handlers
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
    isRecording = status;
  });

  ipcMain.handle('take-screenshot', async () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height },
    });

    return sources[0].thumbnail.toDataURL();
  });

  ipcMain.handle('get-sources', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 100, height: 100 },
    });
    return sources;
  });

  ipcMain.handle('check-sensitive-content', async (event, windowInfo) => {
    const windows = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 100, height: 100 },
    });

    const hasSensitiveContent = windows.some((window) =>
      isSensitiveWindow({ title: window.name }),
    );
    return hasSensitiveContent;
  });

  // Track cursor position and window under cursor
  let lastUpdate = 0;
  const THROTTLE_MS = 100;

  // Add this function to create a consistent notification
  function showSensitiveContentNotification() {
    const now = Date.now();
    if (now - lastSensitiveNotification > NOTIFICATION_THROTTLE) {
      new Notification({
        title: 'Sensitive Content Detected',
        body: 'Recording has been automatically paused to protect your privacy.',
        urgency: 'critical',
        silent: false,
      }).show();
      lastSensitiveNotification = now;
    }
  }

  setInterval(async () => {
    if (!mainWindow || !isRecording || isPaused) return;

    const now = Date.now();
    if (now - lastUpdate < THROTTLE_MS) return;

    const cursorPosition = screen.getCursorScreenPoint();
    const cursorDisplay = screen.getDisplayNearestPoint(cursorPosition);
    const windowInfo = await getCurrentWindow();

    // Check for sensitive content
    if (isSensitiveWindow(windowInfo)) {
      showSensitiveContentNotification();
      // Pause recording instead of stopping
      isPaused = true;
      stateManager.pauseActiveSession();
      mainWindow.webContents.send('recording-paused');
      trayWindow?.webContents.send('recording-paused');
    }

    // Send cursor position update
    mainWindow.webContents.send('cursor-moved', {
      position: cursorPosition,
      activeWindow: windowInfo,
      display: {
        id: cursorDisplay.id,
        bounds: cursorDisplay.bounds,
      },
    });

    lastUpdate = now;
  }, THROTTLE_MS);

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();

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
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Add this handler for window.open
  mainWindow.webContents.setWindowOpenHandler(({ url, features }) => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        frame: false,
        titleBarStyle: 'hidden',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: app.isPackaged
            ? path.join(__dirname, 'preload.js')
            : path.join(__dirname, '../../.erb/dll/preload.js'),
        },
      },
    };
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

    // Minimize all windows before starting recording
    if (mainWindow?.isVisible() && !mainWindow?.isMinimized()) {
      mainWindow?.minimize();
    }
    if (trayWindow?.isVisible() && !trayWindow?.isMinimized()) {
      trayWindow?.hide();
    }

    mainWindow?.webContents.send('start-recording', sessionId);
    trayWindow?.webContents.send('start-recording', sessionId);
  });

  ipcMain.on('stop-recording', async () => {
    isRecording = false;
    isPaused = false;
    const { sessionId, finalDuration } = stateManager.stopActiveSession();

    if (sessionId && finalDuration !== null) {
      try {
        await dbHelpers.updateDuration(sessionId, finalDuration);
        mainWindow?.webContents.send('stop-recording');
        trayWindow?.webContents.send('stop-recording');
      } catch (error) {
        console.error('Failed to update session duration:', error);
      }
    }
  });

  // Add new IPC handlers for pause/resume
  ipcMain.on('pause-recording', () => {
    if (isRecording && !isPaused) {
      isPaused = true;
      stateManager.pauseActiveSession();
      mainWindow?.webContents.send('recording-paused');
      trayWindow?.webContents.send('recording-paused');
    }
  });

  ipcMain.on('resume-recording', () => {
    if (isRecording && isPaused) {
      isPaused = false;
      stateManager.resumeActiveSession();
      mainWindow?.webContents.send('recording-resumed');
      trayWindow?.webContents.send('recording-resumed');
    }
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

  ipcMain.handle(
    'create-session',
    async (event, sessionType: 'passive' | 'tasked', taskId?: number) => {
      try {
        console.log('Creating new session:', { sessionType, taskId });
        const sessionId = await dbHelpers.createSession(sessionType, taskId);
        console.log('Session created with ID:', sessionId);
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
      // 1. Get authenticated user
      const userResult = await getCurrentUser();
      if (!userResult.success || !userResult.user) {
        return {
          success: false,
          error: 'You must be signed in to submit recordings',
        };
      }

      // 2. Create progress callback to send updates to renderer
      const progressCallback = createProgressCallback(event.sender);

      // 3. Upload session to Supabase
      const result = await submitSessionToSupabase(
        userResult.user.id,
        sessionId,
        progressCallback
      );

      // 4. Update local status if successful
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

  // Migration handlers
  ipcMain.handle('migrate-recordings', async () => {
    try {
      console.log('Starting migration of recordings to file-based storage...');
      const result = await migration.migrateRecordingsToFiles();
      console.log('Migration result:', result);
      return result;
    } catch (error: any) {
      console.error('Migration error:', error);
      return {
        success: false,
        migrated: 0,
        failed: 0,
        errors: [{ recordingId: -1, error: error.message || 'Unknown error' }],
      };
    }
  });

  ipcMain.handle('verify-migration', async () => {
    try {
      console.log('Verifying migration...');
      const result = await migration.verifyMigration();
      console.log('Verification result:', result);
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
      console.log('Cleaning up legacy Base64 data...');
      const result = await migration.cleanupLegacyBase64Data();
      console.log('Cleanup result:', result);
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
      if (trayWindow) {
        // If tray window exists, show it and send the task
        trayWindow.webContents.send('open-task', taskId);
        trayWindow.show();
        trayWindow.focus();
      } else {
        // If tray window doesn't exist, create it
        const window = createTrayWindow();
        // Wait for window to load before sending the task
        window.webContents.on('did-finish-load', () => {
          window.webContents.send('open-task', taskId);
        });
      }
    } catch (error) {
      console.error('Failed to start task:', error);
      throw error;
    }
  });

  ipcMain.handle('start-passive-mode', () => {
    try {
      if (!trayWindow) {
        createTrayWindow();
      }

      if (trayWindow && tray) {
        // Position the tray window near the tray icon
        const trayBounds = tray.getBounds();
        const windowBounds = trayWindow.getBounds();

        // Position window above/below the tray icon depending on platform
        const yPosition =
          process.platform === 'darwin'
            ? trayBounds.y
            : trayBounds.y - windowBounds.height;

        const xPosition = Math.round(
          trayBounds.x - windowBounds.width / 2 + trayBounds.width / 2,
        );

        trayWindow.setPosition(xPosition, yPosition);
        trayWindow.show();
        trayWindow.focus();
        trayWindow.webContents.send('set-mode', 'passive');
      }
    } catch (error) {
      console.error('Failed to start passive mode:', error);
      throw error;
    }
  });

  // Add caching for desktopCapturer sources
  let sourceCache: {
    timestamp: number;
    sources: Electron.DesktopCapturerSource[];
  } | null = null;

  const SOURCE_CACHE_TTL = 1000; // 1 second cache

  async function getCachedSources(thumbnailSize: {
    width: number;
    height: number;
  }) {
    const now = Date.now();
    if (sourceCache && now - sourceCache.timestamp < SOURCE_CACHE_TTL) {
      return sourceCache.sources;
    }

    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize,
    });

    sourceCache = {
      timestamp: now,
      sources,
    };

    return sources;
  }

  // Simplified capture-window handler - reliably captures 1 screenshot per call
  ipcMain.handle(
    'capture-window',
    async (event, sourceId: string, sourceType: 'window' | 'screen') => {
      try {
        console.log(`[CAPTURE] Starting capture: sourceId=${sourceId}, sourceType=${sourceType}`);

        const sources = await desktopCapturer.getSources({
          types: ['window', 'screen'],
          thumbnailSize: { width: 1920, height: 1080 },
        });

        // Find the source - try multiple matching strategies
        let source = sources.find((s) => s.id === sourceId);

        // If not found by exact ID, try other matching methods for screens
        if (!source && sourceType === 'screen') {
          source = sources.find((s) =>
            s.id.startsWith('screen:') && (
              s.display_id?.toString() === sourceId ||
              s.display_id?.toString() === sourceId.replace('screen:', '').split(':')[0]
            )
          );

          // Fallback: just use the first screen source
          if (!source) {
            source = sources.find((s) => s.id.startsWith('screen:'));
            console.log('[CAPTURE] Using fallback screen source:', source?.id);
          }
        }

        if (!source) {
          console.error('[CAPTURE] No source found. Available:', sources.map(s => s.id));
          return null;
        }

        console.log(`[CAPTURE] Found source: ${source.id} (${source.name})`);

        // Check if thumbnail is valid
        const thumbnailSize = source.thumbnail.getSize();
        if (!thumbnailSize || thumbnailSize.width === 0 || thumbnailSize.height === 0) {
          console.warn('[CAPTURE] Empty thumbnail - Screen Recording permission may not be granted');
          return null;
        }

        const thumbnail = source.thumbnail.resize({
          width: 300,
          height: Math.round(300 * source.thumbnail.getAspectRatio()),
        });

        console.log(`[CAPTURE] Success: ${thumbnailSize.width}x${thumbnailSize.height}`);

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
      console.log('Saving recording:', {
        session_id: recording.session_id,
        window_name: recording.window_name,
        timestamp: recording.timestamp,
      });

      // Save screenshot as PNG file
      const screenshotPath = fileStorage.saveScreenshot(
        recording.session_id,
        Date.now(), // Use timestamp as temp ID
        recording.screenshot
      );

      // Add screenshot path to recording data
      const recordingData = {
        ...recording,
        screenshot_path: screenshotPath,
      };

      const result = await dbHelpers.createRecording(recordingData);

      // Update metadata files
      await fileStorage.updateSessionMetadata(
        recording.session_id,
        dbHelpers.getSession,
        dbHelpers.getSessionRecordings,
        dbHelpers.getSessionComments
      );

      // Notify all windows about the new recording
      BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send('new-recording', {
          sessionId: recording.session_id,
          recordingId: result,
        });
      });

      console.log('Recording saved successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to save recording:', error);
      throw error;
    }
  });

  ipcMain.handle('get-session-recordings', async (event, sessionId: number) => {
    const recordings = await dbHelpers.getSessionRecordings(sessionId);

    // Load images from files if screenshot_path exists
    return recordings.map((recording) => {
      if (recording.screenshot_path) {
        const screenshot = fileStorage.readScreenshot(recording.screenshot_path);
        return {
          ...recording,
          screenshot: screenshot || recording.screenshot,
          thumbnail: screenshot || recording.thumbnail,
        };
      }
      return recording;
    });
  });

  ipcMain.handle('show-editor', async (event, sessionId: number) => {
    try {
      // Get the recordings for this session
      const recordings = await dbHelpers.getSessionRecordings(sessionId);

      // Hide tray window if it's visible
      if (trayWindow && !trayWindow.isDestroyed()) {
        trayWindow.hide();
      }

      // Find any existing editor windows (exclude tray window)
      const existingEditorWindow = BrowserWindow.getAllWindows().find(win => {
        const url = win.webContents.getURL();
        return url.includes('index.html') && !url.includes('tray=true') && !win.isDestroyed() && win !== trayWindow;
      });

      if (existingEditorWindow) {
        // Reuse existing window
        if (existingEditorWindow.isMinimized()) {
          existingEditorWindow.restore();
        }
        existingEditorWindow.show();
        existingEditorWindow.focus();
        // Wait for the component to mount and set up listeners
        setTimeout(() => {
          existingEditorWindow.webContents.send('load-editor', { sessionId, recordings });
        }, 150);
      } else {
        // Create new window only if none exists
        if (!mainWindow || mainWindow.isDestroyed()) {
          await createWindow();
        }

        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          // Wait for the component to mount and set up listeners
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('load-editor', { sessionId, recordings });
            }
          }, 150);
        }
      }
    } catch (error) {
      console.error('Failed to show editor:', error);
      throw error;
    }
  });

  ipcMain.handle('open-tracker', (event, mode: 'passive' | 'tasks') => {
    try {
      if (trayWindow) {
        // If tray window exists, show it and set the mode
        const display = screen.getPrimaryDisplay();
        const { width, height } = trayWindow.getBounds();

        // Position near the top-right corner of the screen
        const x = display.bounds.width - width - 20;
        const y = 40; // Leave space for the menu bar

        trayWindow.setPosition(x, y);
        trayWindow.webContents.send('set-mode', mode);
        trayWindow.show();
        trayWindow.focus();
      } else {
        // If tray window doesn't exist, create it
        const window = createTrayWindow();
        // Wait for window to load before setting the mode
        window.webContents.on('did-finish-load', () => {
          window.webContents.send('set-mode', mode);
        });
      }
    } catch (error) {
      console.error('Failed to open tracker:', error);
      throw error;
    }
  });

  // Add handler for deleting individual recordings
  ipcMain.handle(
    'delete-recording',
    async (event, { sessionId, recordingId }) => {
      try {
        // Delete the recording from the database
        await dbHelpers.deleteRecording(sessionId, recordingId);
        return true;
      } catch (error) {
        console.error('Failed to delete recording:', error);
        throw error;
      }
    },
  );

  // Add handler for updating recording labels
  ipcMain.handle(
    'update-recording-label',
    async (event, { recordingId, label }) => {
      try {
        await dbHelpers.updateRecordingLabel(recordingId, label);
        return true;
      } catch (error) {
        console.error('Failed to update recording label:', error);
        throw error;
      }
    },
  );

  // Add handlers for notifications
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
      return result;
    } catch (error) {
      console.error('Failed to create comment:', error);
      throw error;
    }
  });

  ipcMain.handle('delete-comment', async (event, commentId: number) => {
    try {
      await dbHelpers.deleteComment(commentId);
      return true;
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  });

  ipcMain.handle('update-comment', async (event, commentId: number, updatedComment: Partial<TimeRangeComment>) => {
    try {
      await dbHelpers.updateComment(commentId, updatedComment);
      return true;
    } catch (error) {
      console.error('Failed to update comment:', error);
      throw error;
    }
  });

  ipcMain.handle('get-session-comments', async (event, sessionId: number) => {
    try {
      const comments = await dbHelpers.getSessionComments(sessionId);
      return comments;
    } catch (error) {
      console.error('Failed to get session comments:', error);
      throw error;
    }
  });

  // Authentication handlers
  const {
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    getCurrentSession,
    resetPassword,
    updatePassword,
    getUserProfile,
    updateUserProfile,
    updateUserPoints,
  } = require('./auth');

  ipcMain.handle('auth:sign-up', async (event, params) => {
    try {
      const result = await signUp(params);
      return result;
    } catch (error: any) {
      console.error('Failed to sign up:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:sign-in', async (event, params) => {
    try {
      const result = await signIn(params);

      // If sign-in successful, sync user's sessions from Supabase
      if (result.success && result.user) {
        console.log('Sign-in successful, syncing sessions...');
        try {
          await syncAllSessionsToLocal(result.user.id);
          console.log('Sessions synced successfully');
        } catch (syncError) {
          console.error('Failed to sync sessions after login:', syncError);
          // Don't fail the login if sync fails
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
      return result;
    } catch (error: any) {
      console.error('Failed to sign out:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:get-current-user', async () => {
    try {
      const result = await getCurrentUser();
      return result;
    } catch (error: any) {
      console.error('Failed to get current user:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:get-current-session', async () => {
    try {
      const result = await getCurrentSession();
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

  ipcMain.handle('auth:update-password', async (event, newPassword: string) => {
    try {
      const result = await updatePassword(newPassword);
      return result;
    } catch (error: any) {
      console.error('Failed to update password:', error);
      return { success: false, error: error.message };
    }
  });

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

  // Points handler
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

  // Notification handlers
  const { supabase } = require('./supabase');

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

  ipcMain.handle('mark-notification-read', async (event, notificationId: string) => {
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
  });

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

    app.on('activate', () => {
      if (tray === null) {
        createWindow();
      }
    });
  })
  .catch(console.log);

app.on('before-quit', () => {
  if (tray) {
    tray.destroy();
  }
});
// Add a new handler for getting all displays
ipcMain.handle('get-displays', async () => {
  // Get screen sources from desktopCapturer to get the actual source IDs
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 150, height: 150 },
  });

  // Get display info from Electron's screen API
  const displays = screen.getAllDisplays();

  console.log('Screen sources:', sources.map(s => ({ id: s.id, name: s.name, display_id: s.display_id })));
  console.log('System displays:', displays.map(d => ({ id: d.id, label: d.label, bounds: d.bounds })));

  // Map displays to include screen source IDs
  return displays.map((display, index) => {
    // Try to match by display_id first, then by index
    const matchingSource = sources.find(s => s.display_id?.toString() === display.id.toString()) ||
                           sources[index];

    return {
      id: display.id.toString(),
      name: display.label || `Display ${display.id}`,
      resolution: `${display.size.width}x${display.size.height}`,
      screenSourceId: matchingSource?.id || `screen:${index}:0`,
    };
  });
});

// Add IPC handler for opening tray window
ipcMain.handle('open-tray-window', (event, bounds) => {
  if (!trayWindow) {
    createTrayWindow();
  }

  if (!trayWindow) return;

  const windowBounds = trayWindow.getBounds();

  // Position relative to the clicked button if bounds are provided
  if (bounds) {
    const yPosition = bounds.y - windowBounds.height;
    const xPosition = Math.round(
      bounds.x - windowBounds.width / 2 + bounds.width / 2,
    );
    trayWindow.setPosition(xPosition, yPosition);
  }

  trayWindow.show();
  trayWindow.focus();
});

// Add IPC handler for theme changes
ipcMain.handle('set-theme', (event, theme: 'light' | 'dark') => {
  nativeTheme.themeSource = theme;

  // Broadcast theme change to all windows
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('theme-changed', theme);
  });
});
