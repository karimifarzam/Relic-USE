import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SessionCard from './SessionCard';
import { useTheme } from '../../contexts/ThemeContext';
import type { BoardViewMode } from './BoardHeader';

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
  viewMode: BoardViewMode;
  activeSessionId: number | null;
  submittingSessionId?: number | null;
  onSessionClick: (sessionId: number) => void;
  onSessionSubmit?: (sessionId: number) => () => Promise<void>;
  onSessionDeleted?: () => void;
}

function StatusColumn({
  title,
  sessions,
  viewMode,
  activeSessionId,
  submittingSessionId,
  onSessionClick,
  onSessionSubmit,
  onSessionDeleted,
}: StatusColumnProps) {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [confirmingSession, setConfirmingSession] = useState<Session | null>(
    null,
  );

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

  const formatDuration = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(seconds || 0));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const formatCreatedAt = (iso: string) => {
    const parsed = Date.parse(iso || '');
    if (!Number.isFinite(parsed)) return 'Unknown';
    return new Date(parsed).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleConfirmSubmit = () => {
    if (!confirmingSession) return;
    const submitAction = onSessionSubmit?.(confirmingSession.id);
    setConfirmingSession(null);
    if (submitAction) {
      void submitAction();
    }
  };

  const openSessionLikePreview = (sessionId: number) => {
    try {
      onSessionClick(sessionId);
      navigate('/editor');
    } catch (error) {
      console.error('Failed to open session from list mode:', error);
    }
  };

  const handleListRowKeyDown = (sessionId: number) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openSessionLikePreview(sessionId);
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
        {viewMode === 'preview' ? (
          <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 pt-2 hide-scrollbar show-scrollbar-on-hover">
            {sessions.length === 0 ? (
              <p
                className={`text-[9px] font-mono px-1 ${
                  isDark
                    ? 'text-industrial-white-tertiary'
                    : 'text-gray-500'
                }`}
              >
                No sessions yet.
              </p>
            ) : null}
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
        ) : (
          <div className="space-y-1 max-h-[700px] overflow-y-auto pr-2 pt-2 hide-scrollbar show-scrollbar-on-hover">
            {sessions.length === 0 ? (
              <p
                className={`text-[9px] font-mono px-1 ${
                  isDark
                    ? 'text-industrial-white-tertiary'
                    : 'text-gray-500'
                }`}
              >
                No sessions yet.
              </p>
            ) : null}
            {sessions.map((session) => {
              const isActive = activeSessionId === session.id;
              const isSubmitting = submittingSessionId === session.id;
              const isPassive = session.session_status === 'passive';
              const canSubmit =
                title === 'Draft' &&
                session.approval_state === 'draft' &&
                !isActive &&
                !!onSessionSubmit;

              return (
                <div
                  key={session.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openSessionLikePreview(session.id)}
                  onKeyDown={handleListRowKeyDown(session.id)}
                  className={`rounded-lg border p-1.5 ${
                    isDark
                      ? 'bg-industrial-black-tertiary border-industrial-border-subtle'
                      : 'bg-white border-gray-200'
                  } cursor-pointer`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0">
                      <p
                        className={`text-[10px] uppercase tracking-industrial-wide font-mono font-bold ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        Session #{session.id}
                      </p>
                      <p
                        className={`text-[8px] font-mono ${
                          isDark
                            ? 'text-industrial-white-tertiary'
                            : 'text-gray-500'
                        }`}
                      >
                        {formatCreatedAt(session.created_at)}
                      </p>
                    </div>
                    <span
                      className={`text-[8px] uppercase tracking-industrial-wide font-mono font-bold px-1.5 py-0.5 rounded border ${
                        isDark
                          ? isPassive
                            ? 'bg-black/90 border-industrial-border-subtle text-white'
                            : 'bg-industrial-orange/10 border-industrial-orange/30 text-industrial-orange'
                          : isPassive
                            ? 'bg-gray-100 border-gray-300 text-gray-700'
                            : 'bg-blue-50 border-blue-200 text-blue-700'
                      }`}
                    >
                      {session.session_status}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-1.5">
                    <span
                      className={`text-[8px] font-mono ${
                        isDark
                          ? 'text-industrial-white-tertiary'
                          : 'text-gray-500'
                      }`}
                    >
                      {formatDuration(session.duration)}
                    </span>
                    {canSubmit ? (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          setConfirmingSession(session);
                        }}
                        className={`px-1.5 py-0.5 rounded-md text-[8px] uppercase tracking-industrial-wide font-mono font-bold transition-all border disabled:opacity-50 disabled:cursor-not-allowed hover-lift ${
                          isDark
                            ? 'bg-industrial-orange text-black border-industrial-orange/20 shadow-industrial hover:shadow-industrial-lg'
                            : 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600'
                        }`}
                      >
                        {isSubmitting ? 'Uploading...' : 'Submit'}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {confirmingSession ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(event) => {
            event.stopPropagation();
            setConfirmingSession(null);
          }}
        >
          <div
            className={`w-full max-w-md p-6 rounded-lg border ${
              isDark
                ? 'bg-industrial-black-secondary border-industrial-border'
                : 'bg-white border-gray-300'
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              className={`text-lg font-mono font-bold mb-4 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Confirm Submission
            </h3>

            <div
              className={`space-y-3 mb-6 ${
                isDark ? 'text-industrial-white-secondary' : 'text-gray-600'
              }`}
            >
              <div
                className={`p-3 rounded-lg border ${
                  isDark
                    ? 'bg-industrial-black-tertiary border-industrial-border'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-mono">Session:</span>
                  <span
                    className={`text-sm font-mono font-bold ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    #{confirmingSession.id}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-mono">Duration:</span>
                  <span
                    className={`text-sm font-mono font-bold ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {formatDuration(confirmingSession.duration)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-mono">Captured:</span>
                  <span
                    className={`text-sm font-mono font-bold ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {formatCreatedAt(confirmingSession.created_at)}
                  </span>
                </div>
              </div>

              <p
                className={`text-xs font-mono ${
                  isDark ? 'text-yellow-400' : 'text-yellow-600'
                }`}
              >
                ⚠ Once submitted, this session cannot be edited.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setConfirmingSession(null);
                }}
                className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-industrial-wide font-mono font-bold transition-all border ${
                  isDark
                    ? 'bg-industrial-black-tertiary text-white border-industrial-border hover:bg-industrial-black-primary'
                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleConfirmSubmit();
                }}
                className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-industrial-wide font-mono font-bold transition-all border ${
                  isDark
                    ? 'bg-industrial-orange text-black border-industrial-orange/20 shadow-industrial hover-lift hover:shadow-industrial-lg'
                    : 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600'
                }`}
              >
                Confirm Submit
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default StatusColumn;
