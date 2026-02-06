import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import BoardHeader from '../renderer/components/Board/BoardHeader';
import { useTheme } from '../renderer/contexts/ThemeContext';

jest.mock('../renderer/contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('BoardHeader view mode toggle', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: 'dark',
      isDark: true,
      toggleTheme: jest.fn(),
    });
  });

  it('shows preview as active when view mode is preview', () => {
    render(
      <BoardHeader
        viewMode="preview"
        onViewModeChange={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'preview' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'list' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('calls onViewModeChange when list is clicked', () => {
    const onViewModeChange = jest.fn();
    render(
      <BoardHeader
        viewMode="preview"
        onViewModeChange={onViewModeChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'list' }));
    expect(onViewModeChange).toHaveBeenCalledWith('list');
  });
});
