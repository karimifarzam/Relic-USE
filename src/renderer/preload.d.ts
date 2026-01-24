import { Channels } from '../preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: {
      ipcRenderer: {
        sendMessage(channel: Channels, ...args: unknown[]): void;
        on(
          channel: Channels,
          func: (...args: unknown[]) => void,
        ): (() => void) | undefined;
        once(channel: Channels, func: (...args: unknown[]) => void): void;
        removeAllListeners(channel: Channels): void;
        invoke(channel: Channels, ...args: unknown[]): Promise<unknown>;
      };
      windowUtils: {
        isTrayWindow: () => boolean;
      };
    };
  }
}

export {};
