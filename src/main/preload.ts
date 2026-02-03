// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Define all valid channels
export type Channels =
  | 'ipc-example'
  | 'cursor-moved'
  | 'stop-recording-sensitive'
  | 'set-recording-status'
  | 'set-theme'
  | 'theme-changed'
  | 'take-screenshot'
  | 'get-sources'
  | 'get-active-window'
  | 'get-current-window-info'
  | 'check-sensitive-content'
  | 'get-displays'
  | 'show-dashboard'
  | 'get-active-windows'
  | 'start-recording'
  | 'stop-recording'
  | 'pause-recording'
  | 'resume-recording'
  | 'recording-paused'
  | 'recording-resumed'
  | 'create-session'
  | 'update-session-duration'
  | 'submit-session'
  | 'submission-progress'
  | 'get-sessions'
  | 'get-active-session'
  | 'get-current-duration'
  | 'get-tasks'
  | 'get-task'
  | 'start-task'
  | 'start-passive-mode'
  | 'open-task'
  | 'capture-window'
  | 'save-recording'
  | 'get-session-recordings'
  | 'new-recording'
  | 'show-delete-confirmation'
  | 'delete-session'
  | 'open-tracker'
  | 'show-editor'
  | 'load-editor'
  | 'delete-recording'
  | 'show-success-notification'
  | 'show-error-notification'
  | 'update-recording-label'
  | 'create-comment'
  | 'delete-comment'
  | 'get-session-comments'
  | 'update-comment'
  | 'focus-main-window'
  | 'auth:sign-up'
  | 'auth:sign-in'
  | 'auth:sign-out'
  | 'auth:get-current-user'
  | 'auth:get-current-session'
  | 'auth:reset-password'
  | 'auth:update-password'
  | 'auth:get-profile'
  | 'auth:update-profile'
  | 'get-user-points'
  | 'get-notifications'
  | 'mark-notification-read'
  | 'clear-all-notifications'
  | 'notification-created'
  | 'ui:set-scaling-enabled';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    removeAllListeners(channel: Channels) {
      ipcRenderer.removeAllListeners(channel);
    },
    // Add invoke method for two-way communication
    invoke(channel: Channels, ...args: unknown[]) {
      const validChannels = [
        'ipc-example',
        'cursor-moved',
        'stop-recording-sensitive',
        'set-recording-status',
        'set-theme',
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
        'get-sessions',
        'get-active-session',
        'get-current-duration',
        'get-tasks',
        'get-task',
        'start-task',
        'start-passive-mode',
        'open-task',
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
        'notification-created',
        'ui:set-scaling-enabled',
      ];
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args);
      }
      return Promise.reject(new Error(`Invalid channel: ${channel}`));
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
