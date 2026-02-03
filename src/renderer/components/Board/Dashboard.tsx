import { useEffect, useState, useMemo, useCallback } from 'react';
import BoardHeader from './BoardHeader';
import StatusColumn from './StatusColumn';
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

interface SubmissionProgress {
  current: number;
  total: number;
  status: string;
}

function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [submittingSessionId, setSubmittingSessionId] = useState<number | null>(null);
  const [submissionProgress, setSubmissionProgress] = useState<SubmissionProgress | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const { isDark } = useTheme();

  // Memoize groupedSessions calculation
  const groupedSessions = useMemo(
    () => ({
      draft: sessions.filter((s) => s.approval_state === 'draft'),
      submitted: sessions.filter((s) => s.approval_state === 'submitted'),
      rejected: sessions.filter((s) => s.approval_state === 'rejected'),
      approved: sessions.filter((s) => s.approval_state === 'approved'),
    }),
    [sessions],
  );

  const fetchSessions = useCallback(async () => {
    try {
      const allSessions =
        await window.electron.ipcRenderer.invoke('get-sessions');
      // Force update by creating a new array reference
      setSessions([...allSessions]);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  }, []);

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

  // Memoize session submission handler
  const handleSessionSubmit = useCallback((sessionId: number) => {
    return async () => {
      try {
        setSubmittingSessionId(sessionId);
        setSubmissionProgress({ current: 0, total: 1, status: 'Starting...' });

        const result = await window.electron.ipcRenderer.invoke('submit-session', sessionId);

        if (result.success) {
          setNotification({
            type: 'success',
            message: `Session submitted successfully! +${result.pointsEarned || 0} points earned`,
          });
          setTimeout(() => setNotification(null), 5000);
        } else {
          setNotification({
            type: 'error',
            message: result.error || 'Failed to submit session',
          });
          setTimeout(() => setNotification(null), 5000);
        }

        setSubmittingSessionId(null);
        setSubmissionProgress(null);
        fetchSessions();
      } catch (error: any) {
        console.error('Submit error:', error);
        setNotification({
          type: 'error',
          message: error.message || 'Failed to submit session',
        });
        setTimeout(() => setNotification(null), 5000);
        setSubmittingSessionId(null);
        setSubmissionProgress(null);
      }
    };
  }, [fetchSessions]);

  const handleSessionClick = async (sessionId: number) => {
    try {
      await window.electron.ipcRenderer.invoke('show-editor', sessionId);
    } catch (error) {
      console.error('Failed to open editor:', error);
    }
  };

  return (
    <main className={`min-h-screen ${isDark ? 'bg-industrial-black-primary' : 'bg-white'}`}>
      <div className="py-6">
        <BoardHeader />

        {/* Progress Overlay */}
      {submittingSessionId && submissionProgress && (
        <div className="fixed top-20 right-6 z-50">
          <div className={`p-4 rounded-lg shadow-lg border ${isDark ? 'bg-industrial-black-secondary border-industrial-border' : 'bg-white border-gray-300'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full border-2 border-t-transparent animate-spin ${isDark ? 'border-industrial-orange' : 'border-blue-500'}`}></div>
              <div>
                <p className={`text-sm font-mono font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Uploading to Cloud
                </p>
                <p className={`text-xs font-mono ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
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
            <p className="text-sm font-mono font-semibold">{notification.message}</p>
          </div>
        </div>
      )}

        <div className="grid grid-cols-4 gap-4 pb-6">
          <StatusColumn
            title="Draft"
            sessions={groupedSessions.draft}
            onSessionClick={handleSessionClick}
            onSessionSubmit={handleSessionSubmit}
            onSessionDeleted={fetchSessions}
            activeSessionId={activeSessionId}
            submittingSessionId={submittingSessionId}
          />
          <StatusColumn
            title="Submitted"
            sessions={groupedSessions.submitted}
            onSessionClick={handleSessionClick}
            onSessionDeleted={fetchSessions}
            activeSessionId={activeSessionId}
          />
          <StatusColumn
            title="Rejected"
            sessions={groupedSessions.rejected}
            onSessionClick={handleSessionClick}
            onSessionDeleted={fetchSessions}
            activeSessionId={activeSessionId}
          />
          <StatusColumn
            title="Approved"
            sessions={groupedSessions.approved}
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
