import {
  formatBoardTimestamp,
  formatDurationHms,
} from '../shared/timeFormatting';

describe('timeFormatting helpers', () => {
  it('formats seconds into h/m/s', () => {
    expect(formatDurationHms(3661)).toBe('1h 1m 1s');
    expect(formatDurationHms(0)).toBe('0h 0m 0s');
  });

  it('clamps negative durations to zero', () => {
    expect(formatDurationHms(-42)).toBe('0h 0m 0s');
  });

  it('returns Unknown for invalid timestamps', () => {
    expect(formatBoardTimestamp('not-a-date')).toBe('Unknown');
    expect(formatBoardTimestamp('')).toBe('Unknown');
  });

  it('delegates date formatting to locale formatting', () => {
    const toLocaleStringSpy = jest
      .spyOn(Date.prototype, 'toLocaleString')
      .mockReturnValue('Nov 15, 10:30 AM');

    expect(formatBoardTimestamp('2025-11-15T10:30:00.000Z')).toBe(
      'Nov 15, 10:30 AM',
    );
    expect(toLocaleStringSpy).toHaveBeenCalledTimes(1);

    toLocaleStringSpy.mockRestore();
  });
});
