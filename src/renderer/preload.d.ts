import { Channels } from '../preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: {
      ipcRenderer: {
        sendMessage(channel: Channels, ...args: any[]): void;
        on(
          channel: Channels,
          func: (...args: any[]) => void,
        ): (() => void) | undefined;
        once(channel: Channels, func: (...args: any[]) => void): void;
        removeAllListeners(channel: Channels): void;
        invoke<T = any>(channel: Channels, ...args: any[]): Promise<T>;
      };
      windowUtils: {
        isTrayWindow: () => boolean;
      };
    };
  }
}

export {};
