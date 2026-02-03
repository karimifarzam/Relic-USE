// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

const VALID_CHANNELS = [
  'cursor-moved',
  'set-recording-status',
  'set-theme',
  'theme-changed',
  'take-screenshot',
  'get-sources',
  'get-active-window',
  'get-current-window-info',
  'check-sensitive-content',
  'get-displays',
  'show-dashboard',
  'get-active-windows',
  'start-recording',
  'stop-recording',
  'pause-recording',
  'resume-recording',
  'recording-paused',
  'recording-resumed',
  'create-session',
  'update-session-duration',
  'submit-session',
  'submission-progress',
  'get-sessions',
  'get-active-session',
  'get-current-duration',
  'get-tasks',
  'get-task',
  'start-task',
  'start-passive-mode',
  'open-task',
  'set-mode',
  'capture-window',
  'save-recording',
  'get-session-recordings',
  'new-recording',
  'show-delete-confirmation',
  'delete-session',
  'open-tracker',
  'show-editor',
  'load-editor',
  'delete-recording',
  'show-success-notification',
  'show-error-notification',
  'update-recording-label',
  'create-comment',
  'delete-comment',
  'get-session-comments',
  'update-comment',
  'focus-main-window',
  'auth:sign-up',
  'auth:sign-in',
  'auth:sign-out',
  'auth:get-current-user',
  'auth:get-current-session',
  'auth:reset-password',
  'auth:update-password',
  'auth:get-profile',
  'auth:update-profile',
  'get-user-points',
  'get-notifications',
  'mark-notification-read',
  'clear-all-notifications',
  'ui:set-scaling-enabled',
] as const;

export type Channels = (typeof VALID_CHANNELS)[number];

const validChannelSet = new Set<string>(VALID_CHANNELS);

function assertValidChannel(channel: string): asserts channel is Channels {
  if (!validChannelSet.has(channel)) {
    throw new Error(`Invalid channel: ${channel}`);
  }
}

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      assertValidChannel(channel);
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: any[]) => void) {
      assertValidChannel(channel);
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: any[]) => void) {
      assertValidChannel(channel);
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    removeAllListeners(channel: Channels) {
      assertValidChannel(channel);
      ipcRenderer.removeAllListeners(channel);
    },
    // Add invoke method for two-way communication
    invoke(channel: Channels, ...args: unknown[]) {
      assertValidChannel(channel);
      return ipcRenderer.invoke(channel, ...args);
    },
  },
  // Add utility method to check window type
  windowUtils: {
    isTrayWindow: () => {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('tray') === 'true';
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
