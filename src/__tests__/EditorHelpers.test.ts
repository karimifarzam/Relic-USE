import { getLatestRecordingIndex, getLatestSessionId } from '../renderer/components/Editor/Editor';

describe('Editor latest selection helpers', () => {
  it('returns null when there are no sessions', () => {
    expect(getLatestSessionId([])).toBeNull();
  });

  it('returns the newest session by created_at', () => {
    const sessions = [
      { id: 3, created_at: '2026-02-01T12:00:00.000Z' },
      { id: 9, created_at: '2026-02-06T18:30:00.000Z' },
      { id: 7, created_at: '2026-02-03T08:15:00.000Z' },
    ];

    expect(getLatestSessionId(sessions)).toBe(9);
  });

  it('falls back to highest id when created_at values are invalid', () => {
    const sessions = [
      { id: 11, created_at: 'invalid-date' },
      { id: 18, created_at: 'also-invalid' },
      { id: 5, created_at: 'bad' },
    ];

    expect(getLatestSessionId(sessions)).toBe(18);
  });

  it('defaults to the last recording index', () => {
    const recordings = [
      {
        id: 1,
        session_id: 1,
        timestamp: '2026-02-06T10:00:00.000Z',
        window_name: 'A',
        window_id: 'window:1',
        thumbnail: 'thumb',
        screenshot: 'shot',
        type: 'passive' as const,
      },
      {
        id: 2,
        session_id: 1,
        timestamp: '2026-02-06T10:00:01.000Z',
        window_name: 'B',
        window_id: 'window:2',
        thumbnail: 'thumb2',
        screenshot: 'shot2',
        type: 'passive' as const,
      },
    ];

    expect(getLatestRecordingIndex(recordings)).toBe(1);
    expect(getLatestRecordingIndex([])).toBe(0);
  });
});
