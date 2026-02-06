import {
  getHistoryDirectionFromHorizontalDelta,
  getHistoryDeltaForDirection,
  hasScrollableHorizontalAncestor,
  isHistoryNavigationDirection,
  shouldConsiderWheelForHistoryNavigation,
  shouldTriggerHistoryNavigationFromGesture,
} from '../renderer/utils/historyNavigation';

describe('historyNavigation helpers', () => {
  it('maps back to -1 and forward to 1', () => {
    expect(getHistoryDeltaForDirection('back')).toBe(-1);
    expect(getHistoryDeltaForDirection('forward')).toBe(1);
  });

  it('maps horizontal swipe deltas to history directions', () => {
    expect(getHistoryDirectionFromHorizontalDelta(120)).toBe('forward');
    expect(getHistoryDirectionFromHorizontalDelta(-120)).toBe('back');
  });

  it('validates direction values', () => {
    expect(isHistoryNavigationDirection('back')).toBe(true);
    expect(isHistoryNavigationDirection('forward')).toBe(true);
    expect(isHistoryNavigationDirection('left')).toBe(false);
    expect(isHistoryNavigationDirection(null)).toBe(false);
  });

  it('selects only horizontal-dominant wheel events', () => {
    expect(shouldConsiderWheelForHistoryNavigation(16, 5)).toBe(true);
    expect(shouldConsiderWheelForHistoryNavigation(0.4, 0)).toBe(false);
    expect(shouldConsiderWheelForHistoryNavigation(15, 20)).toBe(false);
  });

  it('triggers navigation only for strong horizontal gestures', () => {
    expect(shouldTriggerHistoryNavigationFromGesture(200, 20)).toBe(true);
    expect(shouldTriggerHistoryNavigationFromGesture(30, 5)).toBe(false);
    expect(shouldTriggerHistoryNavigationFromGesture(210, 210)).toBe(false);
  });

  it('detects horizontally scrollable ancestors in the swipe direction', () => {
    const parent = document.createElement('div');
    const child = document.createElement('div');
    parent.appendChild(child);
    document.body.appendChild(parent);

    Object.defineProperty(parent, 'scrollWidth', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(parent, 'clientWidth', {
      configurable: true,
      value: 100,
    });
    Object.defineProperty(parent, 'scrollLeft', {
      configurable: true,
      writable: true,
      value: 50,
    });

    expect(hasScrollableHorizontalAncestor(child, 40)).toBe(true);
    expect(hasScrollableHorizontalAncestor(child, -40)).toBe(true);

    parent.scrollLeft = 0;
    expect(hasScrollableHorizontalAncestor(child, -40)).toBe(false);

    parent.scrollLeft = 300;
    expect(hasScrollableHorizontalAncestor(child, 40)).toBe(false);

    document.body.removeChild(parent);
  });
});
