export interface TimestampedItem {
  timestamp?: string | null;
}

interface IndexedTimelineItem<T extends TimestampedItem> {
  item: T;
  originalIndex: number;
  parsedTimestamp: number | null;
}

export interface TimelineItem<T extends TimestampedItem> {
  item: T;
  time: number;
}

export const parseComparableTimestamp = (
  timestamp: string | null | undefined,
): number | null => {
  const parsed = Date.parse(timestamp || '');
  return Number.isFinite(parsed) ? parsed : null;
};

export function buildTimestampTimeline<T extends TimestampedItem>(
  items: T[],
): TimelineItem<T>[] {
  if (items.length === 0) return [];

  const sortedItems: IndexedTimelineItem<T>[] = items
    .map((item, originalIndex) => ({
      item,
      originalIndex,
      parsedTimestamp: parseComparableTimestamp(item.timestamp),
    }))
    .sort((left, right) => {
      if (left.parsedTimestamp !== null && right.parsedTimestamp !== null) {
        return left.parsedTimestamp - right.parsedTimestamp;
      }
      if (left.parsedTimestamp !== null) return -1;
      if (right.parsedTimestamp !== null) return 1;
      return left.originalIndex - right.originalIndex;
    });

  const firstTimestamp =
    sortedItems.find((entry) => entry.parsedTimestamp !== null)?.parsedTimestamp ??
    null;

  return sortedItems.map((entry, index) => ({
    item: entry.item,
    time:
      firstTimestamp !== null && entry.parsedTimestamp !== null
        ? Math.max(
            0,
            Math.floor((entry.parsedTimestamp - firstTimestamp) / 1000),
          )
        : index,
  }));
}

export function getLatestTimelineTimeSeconds<T extends TimestampedItem>(
  items: T[],
): number {
  const timelineItems = buildTimestampTimeline(items);
  if (timelineItems.length === 0) {
    return 0;
  }
  return timelineItems[timelineItems.length - 1].time;
}
