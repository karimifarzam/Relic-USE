export const formatDurationHms = (seconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
};

export const formatBoardTimestamp = (iso: string): string => {
  const parsed = Date.parse(iso || '');
  if (!Number.isFinite(parsed)) return 'Unknown';

  return new Date(parsed).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};
