import React from 'react';
import SessionCard from './SessionCard';
import { useTheme } from '../../contexts/ThemeContext';

interface Session {
  id: number;
  created_at: string;
  duration: number;
  approval_state: 'draft' | 'submitted' | 'approved' | 'rejected';
  session_status: 'passive' | 'tasked';
  task_id: number | null;
  reward_id: number | null;
}

interface StatusColumnProps {
  title: string;
  sessions: Session[];
  activeSessionId: number | null;
  submittingSessionId?: number | null;
  onSessionClick: (sessionId: number) => void;
  onSessionSubmit?: (sessionId: number) => () => Promise<void>;
  onSessionDeleted?: () => void;
}

function StatusColumn({
  title,
  sessions,
  activeSessionId,
  submittingSessionId,
  onSessionClick,
  onSessionSubmit,
  onSessionDeleted,
}: StatusColumnProps) {
  const { isDark } = useTheme();

  const getColumnColor = (columnTitle: string): string => {
    switch (columnTitle) {
      case 'Draft':
        return '#007aff'; // blue
      case 'Submitted':
        return '#ffcc00'; // yellow
      case 'Rejected':
        return '#ff3b30'; // red
      case 'Approved':
        return '#34c759'; // green
      default:
        return '#666666';
    }
  };

  const handleKeyDown = (sessionId: number) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSessionClick(sessionId);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-2 h-2 rounded-full status-indicator active"
          style={{ backgroundColor: getColumnColor(title) }}
        />
        <h2 className={`text-[11px] uppercase tracking-industrial-wide font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </h2>
        <span className={`text-[10px] font-mono ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
          {sessions.length}
        </span>
      </div>

      {/* Tray underlay container */}
      <div className={`rounded-lg border p-4 ${isDark ? 'bg-industrial-black-secondary border-industrial-border' : 'bg-gray-50 border-gray-200'}`}>
        <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 pt-2 hide-scrollbar show-scrollbar-on-hover">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => onSessionClick(session.id)}
              onKeyDown={handleKeyDown(session.id)}
              className="w-full text-left cursor-pointer"
            >
              <SessionCard
                session={session}
                activeSessionId={activeSessionId}
                submittingSessionId={submittingSessionId}
                onSubmit={onSessionSubmit?.(session.id)}
                onSessionDeleted={onSessionDeleted}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StatusColumn;
