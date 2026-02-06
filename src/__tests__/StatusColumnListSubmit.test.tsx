import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StatusColumn from '../renderer/components/Board/StatusColumn';
import { useTheme } from '../renderer/contexts/ThemeContext';

jest.mock('../renderer/contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('StatusColumn list submit flow', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: 'dark',
      isDark: true,
      toggleTheme: jest.fn(),
    });
  });

  it('requires confirmation before triggering submit action in list mode', () => {
    const submitAction = jest.fn().mockResolvedValue(undefined);
    const onSessionSubmit = jest.fn(() => submitAction);

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <StatusColumn
                title="Draft"
                sessions={[
                  {
                    id: 77,
                    created_at: '2026-02-06T03:00:00.000Z',
                    duration: 120,
                    approval_state: 'draft',
                    session_status: 'passive',
                    task_id: null,
                    reward_id: null,
                  },
                ]}
                viewMode="list"
                activeSessionId={null}
                submittingSessionId={null}
                onSessionClick={jest.fn()}
                onSessionSubmit={onSessionSubmit}
              />
            }
          />
          <Route path="/editor" element={<div>Editor Route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(screen.getByText('Confirm Submission')).toBeInTheDocument();
    expect(onSessionSubmit).not.toHaveBeenCalled();
    expect(submitAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Submit' }));

    expect(onSessionSubmit).toHaveBeenCalledWith(77);
    expect(submitAction).toHaveBeenCalledTimes(1);
  });

  it('opens the session when a list row is clicked', () => {
    const onSessionClick = jest.fn();

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <StatusColumn
                title="Submitted"
                sessions={[
                  {
                    id: 88,
                    created_at: '2026-02-06T03:00:00.000Z',
                    duration: 90,
                    approval_state: 'submitted',
                    session_status: 'passive',
                    task_id: null,
                    reward_id: null,
                  },
                ]}
                viewMode="list"
                activeSessionId={null}
                submittingSessionId={null}
                onSessionClick={onSessionClick}
              />
            }
          />
          <Route path="/editor" element={<div>Editor Route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    const title = screen.getByText('Session #88');
    const row = title.closest('[role="button"]');
    expect(row).not.toBeNull();

    fireEvent.click(row!);
    expect(onSessionClick).toHaveBeenCalledWith(88);
    expect(screen.getByText('Editor Route')).toBeInTheDocument();
  });
});
