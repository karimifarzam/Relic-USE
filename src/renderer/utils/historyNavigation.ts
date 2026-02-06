export type HistoryNavigationDirection = 'back' | 'forward';

const HORIZONTAL_EVENT_MIN_DELTA = 1;
const HORIZONTAL_EVENT_DOMINANCE_RATIO = 1.05;
const HORIZONTAL_GESTURE_TRIGGER_DELTA = 45;
const HORIZONTAL_GESTURE_DOMINANCE_RATIO = 1.1;

export const isHistoryNavigationDirection = (
  direction: unknown,
): direction is HistoryNavigationDirection => {
  return direction === 'back' || direction === 'forward';
};

export const getHistoryDeltaForDirection = (
  direction: HistoryNavigationDirection,
): number => {
  return direction === 'back' ? -1 : 1;
};

export const getHistoryDirectionFromHorizontalDelta = (
  deltaX: number,
): HistoryNavigationDirection => {
  return deltaX > 0 ? 'forward' : 'back';
};

export const shouldConsiderWheelForHistoryNavigation = (
  deltaX: number,
  deltaY: number,
): boolean => {
  const horizontalDelta = Math.abs(deltaX);
  const verticalDelta = Math.abs(deltaY);
  return (
    horizontalDelta >= HORIZONTAL_EVENT_MIN_DELTA &&
    horizontalDelta > verticalDelta * HORIZONTAL_EVENT_DOMINANCE_RATIO
  );
};

export const shouldTriggerHistoryNavigationFromGesture = (
  totalDeltaX: number,
  totalDeltaY: number,
): boolean => {
  const horizontalDelta = Math.abs(totalDeltaX);
  const verticalDelta = Math.abs(totalDeltaY);
  return (
    horizontalDelta >= HORIZONTAL_GESTURE_TRIGGER_DELTA &&
    horizontalDelta > verticalDelta * HORIZONTAL_GESTURE_DOMINANCE_RATIO
  );
};

const canScrollHorizontallyInDirection = (
  element: HTMLElement,
  deltaX: number,
): boolean => {
  if (element.scrollWidth <= element.clientWidth + 1) return false;

  const maxScrollLeft = element.scrollWidth - element.clientWidth;
  if (deltaX > 0) {
    return element.scrollLeft < maxScrollLeft - 1;
  }
  if (deltaX < 0) {
    return element.scrollLeft > 1;
  }
  return false;
};

export const hasScrollableHorizontalAncestor = (
  target: EventTarget | null,
  deltaX: number,
): boolean => {
  if (deltaX === 0) return false;

  let current: Node | null = target instanceof Node ? target : null;
  while (current) {
    if (
      current instanceof HTMLElement &&
      canScrollHorizontallyInDirection(current, deltaX)
    ) {
      return true;
    }
    current = current.parentNode;
  }

  return false;
};
