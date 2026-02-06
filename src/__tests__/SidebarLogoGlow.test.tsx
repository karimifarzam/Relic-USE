import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../renderer/components/Layout/Sidebar';
import { useTheme } from '../renderer/contexts/ThemeContext';
import { useAuth } from '../renderer/contexts/AuthContext';

jest.mock('../renderer/contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../renderer/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockedUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const renderSidebar = (isDark: boolean) => {
  mockedUseTheme.mockReturnValue({
    theme: isDark ? 'dark' : 'light',
    isDark,
    toggleTheme: jest.fn(),
  });

  mockedUseAuth.mockReturnValue({
    profile: null,
    signOut: jest.fn(),
  } as any);

  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  );
};

describe('Sidebar logo hover glow', () => {
  it('renders hover hotspot and dark-mode orange glow classes', () => {
    renderSidebar(true);

    const hotspot = screen.getByTestId('logo-hover-hotspot');
    const glow = screen.getByTestId('logo-hover-glow');
    const cursorGlow = screen.getByTestId('logo-hover-cursor-glow');

    expect(hotspot).toBeInTheDocument();
    expect(glow).toHaveClass('group-hover:opacity-100');
    expect(glow).toHaveClass('bg-industrial-orange/20');
    expect(cursorGlow).toHaveClass('bg-industrial-orange/70');
  });

  it('renders light-mode blue glow class', () => {
    renderSidebar(false);

    const glow = screen.getByTestId('logo-hover-glow');
    const cursorGlow = screen.getByTestId('logo-hover-cursor-glow');

    expect(glow).toHaveClass('bg-blue-400/24');
    expect(cursorGlow).toHaveClass('bg-blue-400/75');
  });

  it('moves glow slightly with mouse position and resets on leave', () => {
    renderSidebar(true);

    const hoverGroup = screen.getByTestId('logo-hover-group');
    const glow = screen.getByTestId('logo-hover-glow');
    const cursorGlow = screen.getByTestId('logo-hover-cursor-glow');

    Object.defineProperty(hoverGroup, 'getBoundingClientRect', {
      value: () => ({
        left: 0,
        top: 0,
        right: 100,
        bottom: 40,
        width: 100,
        height: 40,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    expect(glow.getAttribute('style')).toContain(
      'translate(calc(-50% + var(--logo-glow-x, 0px)), var(--logo-glow-y, 0px))',
    );
    expect(cursorGlow.getAttribute('style')).toContain(
      'translate(calc(-50% + var(--logo-cursor-glow-x, 0px)), calc(-50% + 10px + var(--logo-cursor-glow-y, 0px)))',
    );
    expect((hoverGroup as HTMLElement).style.getPropertyValue('--logo-glow-x')).toBe('');
    expect((hoverGroup as HTMLElement).style.getPropertyValue('--logo-glow-y')).toBe('');
    expect((hoverGroup as HTMLElement).style.getPropertyValue('--logo-cursor-glow-x')).toBe(
      '',
    );
    expect((hoverGroup as HTMLElement).style.getPropertyValue('--logo-cursor-glow-y')).toBe(
      '',
    );

    fireEvent.mouseMove(hoverGroup, { clientX: 75, clientY: 30 });
    expect((hoverGroup as HTMLElement).style.getPropertyValue('--logo-glow-x')).toBe(
      '1.60px',
    );
    expect((hoverGroup as HTMLElement).style.getPropertyValue('--logo-glow-y')).toBe(
      '1.05px',
    );
    expect(
      (hoverGroup as HTMLElement).style.getPropertyValue('--logo-cursor-glow-x'),
    ).toBe('4.00px');
    expect(
      (hoverGroup as HTMLElement).style.getPropertyValue('--logo-cursor-glow-y'),
    ).toBe('3.00px');
    expect(
      (hoverGroup as HTMLElement).style.getPropertyValue(
        '--logo-cursor-glow-opacity',
      ),
    ).toBe('1');

    fireEvent.mouseLeave(hoverGroup);
    expect((hoverGroup as HTMLElement).style.getPropertyValue('--logo-glow-x')).toBe(
      '0px',
    );
    expect((hoverGroup as HTMLElement).style.getPropertyValue('--logo-glow-y')).toBe(
      '0px',
    );
    expect(
      (hoverGroup as HTMLElement).style.getPropertyValue('--logo-cursor-glow-x'),
    ).toBe('0px');
    expect(
      (hoverGroup as HTMLElement).style.getPropertyValue('--logo-cursor-glow-y'),
    ).toBe('0px');
    expect(
      (hoverGroup as HTMLElement).style.getPropertyValue(
        '--logo-cursor-glow-opacity',
      ),
    ).toBe('0');
  });
});
