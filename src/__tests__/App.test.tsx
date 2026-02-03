import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import App from '../renderer/App';

describe('App', () => {
  beforeAll(() => {
    // Minimal preload mock for renderer tests (Jest runs without Electron preload).
    (window as any).electron = {
      ipcRenderer: {
        sendMessage: jest.fn(),
        on: jest.fn(() => jest.fn()),
        once: jest.fn(),
        removeAllListeners: jest.fn(),
        invoke: jest.fn(async () => ({ success: false })),
      },
      windowUtils: {
        isTrayWindow: () => false,
      },
    };
  });

  it('should render', () => {
    expect(render(<App />)).toBeTruthy();
  });
});
