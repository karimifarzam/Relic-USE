import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import BoardHeader from './BoardHeader';
import StatusColumn from './StatusColumn';
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

interface SubmissionProgress {
  current: number;
  total: number;
  status: string;
}

function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [viewMode, setViewMode] = useState<BoardViewMode>('preview');
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [submittingSessionId, setSubmittingSessionId] = useState<number | null>(
    null,
  );
  const [submissionProgress, setSubmissionProgress] =
    useState<SubmissionProgress | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const { isDark } = useTheme();
  const notificationTimeoutRef = useRef<number | null>(null);

  // Group sessions in one pass to avoid repeated filtering per render.
  const groupedSessions = useMemo(() => {
    const grouped = {
      draft: [] as Session[],
      submitted: [] as Session[],
      rejected: [] as Session[],
      approved: [] as Session[],
    };

    sessions.forEach((currentSession) => {
      grouped[currentSession.approval_state].push(currentSession);
    });

    return grouped;
  }, [sessions]);

  const fetchSessions = useCallback(async () => {
    try {
      const allSessions =
        await window.electron.ipcRenderer.invoke('get-sessions');
      setSessions(allSessions);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  }, []);

  const showTimedNotification = useCallback(
    (type: 'success' | 'error', message: string) => {
      if (notificationTimeoutRef.current !== null) {
        window.clearTimeout(notificationTimeoutRef.current);
      }
      setNotification({ type, message });
      notificationTimeoutRef.current = window.setTimeout(() => {
        setNotification(null);
        notificationTimeoutRef.current = null;
      }, 5000);
    },
    [],
  );

  useEffect(() => {
    fetchSessions();

    // Listen for recording status changes
    const startListener = window.electron.ipcRenderer.on(
      'start-recording',
      (sessionId: number) => {
        setActiveSessionId(sessionId);
        fetchSessions();
      },
    );

    const stopListener = window.electron.ipcRenderer.on(
      'stop-recording',
      () => {
        setActiveSessionId(null);
        fetchSessions();
      },
    );

    // Add new effect to listen for recording updates
    const recordingListener = window.electron.ipcRenderer.on(
      'new-recording',
      () => {
        // Refresh sessions when new recording is created
        fetchSessions();
      },
    );

    // Listen for submission progress updates
    const submissionProgressListener = window.electron.ipcRenderer.on(
      'submission-progress',
      (progress: SubmissionProgress) => {
        setSubmissionProgress(progress);
      },
    );

    // Refresh when window gains focus
    const handleFocus = () => {
      fetchSessions();
    };
    window.addEventListener('focus', handleFocus);

    // Refresh when component becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchSessions();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      startListener?.();
      stopListener?.();
      recordingListener?.();
      submissionProgressListener?.();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchSessions]);

  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current !== null) {
        window.clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  // Memoize session submission handler
  const handleSessionSubmit = useCallback(
    (sessionId: number) => {
      return async () => {
        try {
          setSubmittingSessionId(sessionId);
          setSubmissionProgress({
            current: 0,
            total: 1,
            status: 'Starting...',
          });

          const result = await window.electron.ipcRenderer.invoke(
            'submit-session',
            sessionId,
          );

          if (result.success) {
            showTimedNotification(
              'success',
              `Session submitted successfully! +${result.pointsEarned || 0} points earned`,
            );
          } else {
            showTimedNotification(
              'error',
              result.error || 'Failed to submit session',
            );
          }
        } catch (error: any) {
          console.error('Submit error:', error);
          showTimedNotification(
            'error',
            error.message || 'Failed to submit session',
          );
        } finally {
          setSubmittingSessionId(null);
          setSubmissionProgress(null);
          fetchSessions();
        }
      };
    },
    [fetchSessions, showTimedNotification],
  );

  const handleSessionClick = useCallback(async (sessionId: number) => {
    try {
      await window.electron.ipcRenderer.invoke('show-editor', sessionId);
    } catch (error) {
      console.error('Failed to open editor:', error);
    }
  }, []);

  return (
    <main
      className={`min-h-0 ${isDark ? 'bg-industrial-black-primary' : 'bg-white'}`}
    >
      <div className="py-6">
        <BoardHeader viewMode={viewMode} onViewModeChange={setViewMode} />
        {/* Progress Overlay */}
        {submittingSessionId && submissionProgress && (
          <div className="fixed top-20 right-6 z-50">
            <div
              className={`p-4 rounded-lg shadow-lg border ${isDark ? 'bg-industrial-black-secondary border-industrial-border' : 'bg-white border-gray-300'}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full border-2 border-t-transparent animate-spin ${isDark ? 'border-industrial-orange' : 'border-blue-500'}`}
                ></div>
                <div>
                  <p
                    className={`text-sm font-mono font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    Uploading to Cloud
                  </p>
                  <p
                    className={`text-xs font-mono ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}
                  >
                    {submissionProgress.status}
                  </p>
                  <div className="mt-2 w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${isDark ? 'bg-industrial-orange' : 'bg-blue-500'}`}
                      style={{
                        width: `${submissionProgress.total > 0 ? (submissionProgress.current / submissionProgress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notification Toast */}
        {notification && (
          <div className="fixed top-20 right-6 z-50 animate-slide-in">
            <div
              className={`p-4 rounded-lg shadow-lg border ${
                notification.type === 'success'
                  ? isDark
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-green-50 border-green-200 text-green-700'
                  : isDark
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <p className="text-sm font-mono font-semibold">
                {notification.message}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 pb-6">
          <StatusColumn
            title="Draft"
            sessions={groupedSessions.draft}
            viewMode={viewMode}
            onSessionClick={handleSessionClick}
            onSessionSubmit={handleSessionSubmit}
            onSessionDeleted={fetchSessions}
            activeSessionId={activeSessionId}
            submittingSessionId={submittingSessionId}
          />
          <StatusColumn
            title="Submitted"
            sessions={groupedSessions.submitted}
            viewMode={viewMode}
            onSessionClick={handleSessionClick}
            onSessionDeleted={fetchSessions}
            activeSessionId={activeSessionId}
          />
          <StatusColumn
            title="Rejected"
            sessions={groupedSessions.rejected}
            viewMode={viewMode}
            onSessionClick={handleSessionClick}
            onSessionDeleted={fetchSessions}
            activeSessionId={activeSessionId}
          />
          <StatusColumn
            title="Approved"
            sessions={groupedSessions.approved}
            viewMode={viewMode}
            onSessionClick={handleSessionClick}
            onSessionDeleted={fetchSessions}
            activeSessionId={activeSessionId}
          />
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}

export default Dashboard;
