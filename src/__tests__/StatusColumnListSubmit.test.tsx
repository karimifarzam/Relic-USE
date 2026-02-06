import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
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
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(screen.getByText('Confirm Submission')).toBeInTheDocument();
    expect(onSessionSubmit).not.toHaveBeenCalled();
    expect(submitAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Submit' }));

    expect(onSessionSubmit).toHaveBeenCalledWith(77);
    expect(submitAction).toHaveBeenCalledTimes(1);
  });
});
