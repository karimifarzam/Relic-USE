/* @refresh reset */
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getHistoryDirectionFromHorizontalDelta,
  isHistoryNavigationDirection,
  shouldConsiderWheelForHistoryNavigation,
  shouldTriggerHistoryNavigationFromGesture,
} from '../../utils/historyNavigation';

const TRACKPAD_GESTURE_IDLE_MS = 45;
const TRACKPAD_NAVIGATION_COOLDOWN_MS = 420;
const DUPLICATE_NAVIGATION_GUARD_MS = 220;
const IPC_TO_WHEEL_SUPPRESSION_MS = 1000;
const HISTORY_NAV_TRANSITION_FALLBACK_MS = 220;

type ViewTransitionCapableDocument = Document & {
  startViewTransition?: (
    updateCallback: () => void | Promise<void>,
  ) => {
    finished: Promise<void>;
  };
};

type TrackpadGestureState = {
  accumulatedDeltaX: number;
  accumulatedDeltaY: number;
  gestureTimerId: number | null;
  lastTrackpadNavigationAt: number;
};

type NavigationInputSource = 'ipc' | 'wheel';

export default function SwipeNavigationHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastNavigationAtRef = useRef(0);
  const lastNavigationSourceRef = useRef<NavigationInputSource | null>(null);
  const lastNavigationDirectionRef = useRef<'back' | 'forward' | null>(null);
  const lastIpcNavigationAtRef = useRef(0);
  const locationPathnameRef = useRef(location.pathname);
  const clearNavDataTimeoutRef = useRef<number | null>(null);

  const clearNavigationDirection = () => {
    if (clearNavDataTimeoutRef.current !== null) {
      window.clearTimeout(clearNavDataTimeoutRef.current);
      clearNavDataTimeoutRef.current = null;
    }
    delete document.documentElement.dataset.historyNav;
  };

  const runSmoothHistoryNavigation = (
    direction: 'back' | 'forward',
    navigateAction: () => void,
  ) => {
    const html = document.documentElement;
    html.dataset.historyNav = direction;

    const transitionDocument = document as ViewTransitionCapableDocument;
    if (typeof transitionDocument.startViewTransition === 'function') {
      const transition = transitionDocument.startViewTransition(() => {
        navigateAction();
      });
      transition.finished
        .catch(() => {
          // Ignore transition race conditions from rapid repeated swipes.
        })
        .finally(() => {
          if (html.dataset.historyNav === direction) {
            clearNavigationDirection();
          }
        });
      return;
    }

    navigateAction();
    clearNavDataTimeoutRef.current = window.setTimeout(() => {
      if (html.dataset.historyNav === direction) {
        clearNavigationDirection();
      }
    }, HISTORY_NAV_TRANSITION_FALLBACK_MS);
  };

  const navigateBackFromEditor = (source: NavigationInputSource) => {
    const currentPathname = locationPathnameRef.current;
    if (!currentPathname.startsWith('/editor')) {
      return;
    }

    runSmoothHistoryNavigation('back', () => {
      navigate('/');
    });

    const navigationTimestamp = Date.now();
    lastNavigationAtRef.current = navigationTimestamp;
    lastNavigationSourceRef.current = source;
    lastNavigationDirectionRef.current = 'back';
  };

  useEffect(() => {
    locationPathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    const unsubscribe = window.electron.ipcRenderer.on(
      'history:navigate',
      (direction: unknown) => {
        if (!isHistoryNavigationDirection(direction)) return;
        if (direction !== 'back') return;
        const now = Date.now();
        const isLikelyWheelDuplicate =
          now - lastNavigationAtRef.current < DUPLICATE_NAVIGATION_GUARD_MS &&
          lastNavigationSourceRef.current === 'wheel' &&
          lastNavigationDirectionRef.current === direction;

        if (isLikelyWheelDuplicate) {
          return;
        }
        lastIpcNavigationAtRef.current = now;
        navigateBackFromEditor('ipc');
      },
    );

    return () => {
      unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    const gesture: TrackpadGestureState = {
      accumulatedDeltaX: 0,
      accumulatedDeltaY: 0,
      gestureTimerId: null,
      lastTrackpadNavigationAt: 0,
    };

    const clearGestureTimer = () => {
      if (gesture.gestureTimerId === null) return;
      window.clearTimeout(gesture.gestureTimerId);
      gesture.gestureTimerId = null;
    };

    const resetGesture = () => {
      gesture.accumulatedDeltaX = 0;
      gesture.accumulatedDeltaY = 0;
      clearGestureTimer();
    };

    const maybeNavigate = () => {
      const now = Date.now();

      const ipcNavigationRecentlyTriggered =
        now - lastIpcNavigationAtRef.current < IPC_TO_WHEEL_SUPPRESSION_MS;
      if (ipcNavigationRecentlyTriggered) {
        resetGesture();
        return;
      }

      const navigatedVeryRecently =
        now - lastNavigationAtRef.current < DUPLICATE_NAVIGATION_GUARD_MS;
      if (navigatedVeryRecently) {
        resetGesture();
        return;
      }

      const stillInCooldown =
        now - gesture.lastTrackpadNavigationAt < TRACKPAD_NAVIGATION_COOLDOWN_MS;
      if (stillInCooldown) {
        resetGesture();
        return;
      }

      if (
        shouldTriggerHistoryNavigationFromGesture(
          gesture.accumulatedDeltaX,
          gesture.accumulatedDeltaY,
        )
      ) {
        const direction = getHistoryDirectionFromHorizontalDelta(
          gesture.accumulatedDeltaX,
        );
        if (direction === 'back') {
          navigateBackFromEditor('wheel');
          gesture.lastTrackpadNavigationAt = Date.now();
        }
      }

      resetGesture();
    };

    const handleWheel = (event: WheelEvent) => {
      if (!shouldConsiderWheelForHistoryNavigation(event.deltaX, event.deltaY)) {
        return;
      }

      gesture.accumulatedDeltaX += event.deltaX;
      gesture.accumulatedDeltaY += event.deltaY;

      if (
        shouldTriggerHistoryNavigationFromGesture(
          gesture.accumulatedDeltaX,
          gesture.accumulatedDeltaY,
        )
      ) {
        clearGestureTimer();
        maybeNavigate();
        return;
      }

      clearGestureTimer();
      gesture.gestureTimerId = window.setTimeout(
        maybeNavigate,
        TRACKPAD_GESTURE_IDLE_MS,
      );
    };

    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      clearGestureTimer();
      clearNavigationDirection();
    };
  }, [navigate]);

  return null;
}

if (process.env.NODE_ENV === 'development' && (module as any).hot) {
  (module as any).hot.accept();
  (module as any).hot.dispose(() => {
    window.location.reload();
  });
}
