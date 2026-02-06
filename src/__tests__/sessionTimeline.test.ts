import {
  buildTimestampTimeline,
  getLatestTimelineTimeSeconds,
} from '../shared/sessionTimeline';

describe('sessionTimeline helpers', () => {
  it('sorts by timestamp and floors elapsed seconds', () => {
    const recordings = [
      { id: 3, timestamp: '2026-02-06T10:00:02.999Z' },
      { id: 1, timestamp: '2026-02-06T10:00:00.100Z' },
      { id: 2, timestamp: '2026-02-06T10:00:01.050Z' },
    ];

    const timeline = buildTimestampTimeline(recordings);

    expect(timeline.map((entry) => entry.item.id)).toEqual([1, 2, 3]);
    expect(timeline.map((entry) => entry.time)).toEqual([0, 0, 2]);
    expect(getLatestTimelineTimeSeconds(recordings)).toBe(2);
  });

  it('falls back to stable index ordering when timestamps are invalid', () => {
    const recordings = [
      { id: 10, timestamp: 'not-a-date' },
      { id: 11, timestamp: '' },
      { id: 12, timestamp: null },
    ];

    const timeline = buildTimestampTimeline(recordings);

    expect(timeline.map((entry) => entry.item.id)).toEqual([10, 11, 12]);
    expect(timeline.map((entry) => entry.time)).toEqual([0, 1, 2]);
    expect(getLatestTimelineTimeSeconds(recordings)).toBe(2);
  });
});
