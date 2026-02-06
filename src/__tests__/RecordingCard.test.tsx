import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecordingCard from '../renderer/components/Board/RecordingCard';
import { useTheme } from '../renderer/contexts/ThemeContext';

jest.mock('../renderer/contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('RecordingCard delete behavior', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: 'dark',
      isDark: true,
      toggleTheme: jest.fn(),
    });
  });

  it('calls onDelete directly without using native delete confirmation', () => {
    const onDelete = jest.fn();
    const invokeMock = jest.fn();

    (window as any).electron = {
      ipcRenderer: {
        invoke: invokeMock,
      },
    };

    render(
      <MemoryRouter>
        <RecordingCard
          title="Recording - Session #1"
          date="0h 1m 2s"
          type="passive"
          thumbnail="data:image/png;base64,abc"
          sessionId={1}
          onDelete={onDelete}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete recording' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(invokeMock).not.toHaveBeenCalled();
  });
});
