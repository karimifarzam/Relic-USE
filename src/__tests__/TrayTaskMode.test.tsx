import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Tray from '../renderer/components/Tray';
import { useTheme } from '../renderer/contexts/ThemeContext';

jest.mock('../renderer/contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

const mockTask = {
  id: 42,
  title: 'Go into settings and turn off dark mode',
  description: ['Step 1'],
  category: 'Computer Settings',
  difficulty: 'Medium' as const,
  estEarnings: 450,
  duration: '4 min',
  type: 'Computer software',
};

describe('Tray task mode session typing', () => {
  let invokeMock: jest.Mock;
  let sendMessageMock: jest.Mock;
  let onMock: jest.Mock;

  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: 'dark',
      isDark: true,
      toggleTheme: jest.fn(),
    });

    invokeMock = jest.fn((channel: string, ...args: unknown[]) => {
      switch (channel) {
        case 'ui:set-scaling-enabled':
          return Promise.resolve(true);
        case 'get-displays':
          return Promise.resolve([
            {
              id: 'display-1',
              name: 'Main Display',
              screenSourceId: 'screen:0:0',
            },
          ]);
        case 'get-active-windows':
          return Promise.resolve([]);
        case 'get-active-task-id':
          return Promise.resolve(42);
        case 'get-task':
          return Promise.resolve(args[0] === 42 ? mockTask : null);
        case 'create-session':
          return Promise.resolve(777);
        case 'capture-window':
          return Promise.resolve({
            windowName: 'Desktop',
            timestamp: '2026-02-06T00:00:00.000Z',
            thumbnail: 'thumb',
            screenshot: 'shot',
          });
        case 'save-recording':
          return Promise.resolve(9001);
        case 'get-current-duration':
          return Promise.resolve(0);
        case 'get-sessions':
          return Promise.resolve([]);
        case 'clear-active-task-id':
          return Promise.resolve(true);
        case 'focus-main-window':
        case 'show-editor':
        case 'update-session-duration':
          return Promise.resolve(undefined);
        default:
          return Promise.resolve(null);
      }
    });

    sendMessageMock = jest.fn();
    onMock = jest.fn(() => jest.fn());

    (window as any).electron = {
      ipcRenderer: {
        invoke: invokeMock,
        sendMessage: sendMessageMock,
        on: onMock,
      },
    };
  });

  it('creates and saves recordings as tasked when launched from task mode', async () => {
    render(<Tray />);

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('get-active-task-id');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Recording' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start Recording' }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('create-session', 'tasked', 42);
    });

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        'save-recording',
        expect.objectContaining({ type: 'tasked' }),
      );
    });
  });
});
