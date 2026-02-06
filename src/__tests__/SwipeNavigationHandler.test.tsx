import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import SwipeNavigationHandler from '../renderer/components/Navigation/SwipeNavigationHandler';

type HistoryNavigationCallback = (direction: unknown) => void;

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
};

describe('SwipeNavigationHandler', () => {
  let historyCallback: HistoryNavigationCallback | null = null;
  let unsubscribe: jest.Mock;
  let onSpy: jest.Mock;

  beforeEach(() => {
    historyCallback = null;
    unsubscribe = jest.fn();
    onSpy = jest.fn((_channel: string, callback: HistoryNavigationCallback) => {
      historyCallback = callback;
      return unsubscribe;
    });

    (window as any).electron = {
      ipcRenderer: {
        on: onSpy,
      },
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (document as any).startViewTransition;
    delete document.documentElement.dataset.historyNav;
  });

  it('navigates back from editor and ignores forward swipe navigation', () => {
    render(
      <MemoryRouter initialEntries={['/', '/editor']} initialIndex={1}>
        <SwipeNavigationHandler />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('location-path')).toHaveTextContent('/editor');
    expect(onSpy).toHaveBeenCalledWith('history:navigate', expect.any(Function));
    expect(historyCallback).not.toBeNull();

    act(() => {
      historyCallback?.('back');
    });
    expect(screen.getByTestId('location-path')).toHaveTextContent('/');

    act(() => {
      historyCallback?.('forward');
    });
    expect(screen.getByTestId('location-path')).toHaveTextContent('/');
  });

  it('ignores unknown directions', () => {
    render(
      <MemoryRouter initialEntries={['/', '/editor']} initialIndex={1}>
        <SwipeNavigationHandler />
        <LocationProbe />
      </MemoryRouter>,
    );

    act(() => {
      historyCallback?.('left');
    });

    expect(screen.getByTestId('location-path')).toHaveTextContent('/editor');
  });

  it('removes the ipc listener on unmount', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/']}>
        <SwipeNavigationHandler />
      </MemoryRouter>,
    );

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('falls back to dashboard when swiping back from editor without stack entries', () => {
    render(
      <MemoryRouter initialEntries={['/editor']}>
        <SwipeNavigationHandler />
        <LocationProbe />
      </MemoryRouter>,
    );

    act(() => {
      historyCallback?.('back');
    });

    expect(screen.getByTestId('location-path')).toHaveTextContent('/');
  });

  it('does not navigate forward from my board', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <SwipeNavigationHandler />
        <LocationProbe />
      </MemoryRouter>,
    );

    act(() => {
      historyCallback?.('forward');
    });

    expect(screen.getByTestId('location-path')).toHaveTextContent('/');
  });

  it('falls back to trackpad wheel gestures for history navigation', () => {
    jest.useFakeTimers();

    render(
      <MemoryRouter initialEntries={['/', '/editor']} initialIndex={1}>
        <SwipeNavigationHandler />
        <LocationProbe />
      </MemoryRouter>,
    );

    act(() => {
      fireEvent.wheel(window, { deltaX: -120, deltaY: 8 });
      fireEvent.wheel(window, { deltaX: -110, deltaY: 7 });
      jest.advanceTimersByTime(150);
    });

    expect(screen.getByTestId('location-path')).toHaveTextContent('/');
  });

  it('triggers from wheel gestures even when event target is a nested element', () => {
    jest.useFakeTimers();

    render(
      <MemoryRouter initialEntries={['/', '/editor']} initialIndex={1}>
        <SwipeNavigationHandler />
        <div data-testid="scrollable-target">
          <LocationProbe />
        </div>
      </MemoryRouter>,
    );

    const scrollable = screen.getByTestId('scrollable-target');

    act(() => {
      fireEvent.wheel(scrollable, { deltaX: -140, deltaY: 6 });
      fireEvent.wheel(scrollable, { deltaX: -120, deltaY: 5 });
      jest.advanceTimersByTime(150);
    });

    expect(screen.getByTestId('location-path')).toHaveTextContent('/');
  });

  it('uses the view transition API when available', () => {
    const startViewTransition = jest.fn((callback: () => void) => {
      callback();
      return { finished: Promise.resolve() };
    });
    (document as any).startViewTransition = startViewTransition;

    render(
      <MemoryRouter initialEntries={['/', '/editor']} initialIndex={1}>
        <SwipeNavigationHandler />
        <LocationProbe />
      </MemoryRouter>,
    );

    act(() => {
      historyCallback?.('back');
    });

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location-path')).toHaveTextContent('/');
  });

  it('suppresses wheel fallback shortly after ipc swipe navigation', () => {
    jest.useFakeTimers();

    render(
      <MemoryRouter initialEntries={['/', '/editor']} initialIndex={1}>
        <SwipeNavigationHandler />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('location-path')).toHaveTextContent('/editor');

    act(() => {
      historyCallback?.('back');
    });
    expect(screen.getByTestId('location-path')).toHaveTextContent('/');

    act(() => {
      fireEvent.wheel(window, { deltaX: -150, deltaY: 5 });
      fireEvent.wheel(window, { deltaX: -130, deltaY: 4 });
      jest.advanceTimersByTime(200);
    });

    expect(screen.getByTestId('location-path')).toHaveTextContent('/');
  });

  it('prevents back-then-forward bounce from a single gesture', () => {
    jest.useFakeTimers();

    render(
      <MemoryRouter initialEntries={['/', '/editor']} initialIndex={1}>
        <SwipeNavigationHandler />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('location-path')).toHaveTextContent('/editor');

    act(() => {
      historyCallback?.('back');
    });
    expect(screen.getByTestId('location-path')).toHaveTextContent('/');

    act(() => {
      jest.advanceTimersByTime(400);
      fireEvent.wheel(window, { deltaX: 160, deltaY: 4 });
      fireEvent.wheel(window, { deltaX: 150, deltaY: 3 });
      jest.advanceTimersByTime(100);
    });

    expect(screen.getByTestId('location-path')).toHaveTextContent('/');
  });
});
