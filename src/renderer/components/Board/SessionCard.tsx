/// <reference types="node" />
import React, { useState, useEffect, useCallback } from 'react';
import RecordingCard from './RecordingCard';
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

interface Recording {
  id?: number;
  session_id: number;
  timestamp: string;
  window_name: string;
  window_id: string;
  thumbnail: string;
  screenshot: string;
  type: 'passive' | 'tasked';
}

interface SessionCardProps {
  session: Session;
  activeSessionId: number | null;
  submittingSessionId?: number | null;
  onSubmit?: () => void;
  onSessionDeleted?: () => void;
}

function SessionCard({
  session,
  activeSessionId,
  submittingSessionId,
  onSubmit,
  onSessionDeleted,
}: SessionCardProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [canSubmit, setCanSubmit] = useState(false);
  const [taskTitle, setTaskTitle] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [comments, setComments] = useState<number>(0);
  const { isDark } = useTheme();

  const isSubmitting = submittingSessionId === session.id;

  // Memoize formatSessionDuration to prevent recreation on every render
  const formatSessionDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }, []);

  // Fetch task details if session has a task_id
  useEffect(() => {
    const fetchTaskDetails = async () => {
      if (session.task_id) {
        try {
          const task = await window.electron.ipcRenderer.invoke(
            'get-task',
            session.task_id,
          );
          if (task) {
            setTaskTitle(task.title);
          }
        } catch (error) {
          console.error('Failed to fetch task details:', error);
        }
      } else {
        setTaskTitle(null);
      }
    };

    fetchTaskDetails();
  }, [session.task_id]);

  // Determine if session can be submitted
  useEffect(() => {
    // Can submit if:
    // 1. Session is in draft state
    // 2. Session is not currently recording
    // 3. Has some duration
    setCanSubmit(
      session.approval_state === 'draft' &&
        session.id !== activeSessionId &&
        session.duration > 0,
    );
  }, [session.approval_state, session.id, activeSessionId, session.duration]);

  // Add polling for active session recordings
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const fetchRecordings = async () => {
      if (session.id) {
        try {
          const sessionRecordings = await window.electron.ipcRenderer.invoke(
            'get-session-recordings',
            session.id,
          );
          setRecordings(sessionRecordings);
        } catch (error) {
          console.error('Failed to fetch recordings:', error);
        }
      }
    };

    // Initial fetch
    fetchRecordings();

    // If this is the active session, poll for updates
    if (session.id === activeSessionId) {
      intervalId = setInterval(fetchRecordings, 5000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [session.id, activeSessionId]);

  // Fetch comment count
  useEffect(() => {
    const fetchComments = async () => {
      if (session.id) {
        try {
          const sessionComments = await window.electron.ipcRenderer.invoke(
            'get-session-comments',
            session.id,
          );
          setComments(sessionComments.length);
        } catch (error) {
          console.error('Failed to fetch comments:', error);
        }
      }
    };

    fetchComments();
  }, [session.id]);

  const handleDeleteRecording = async () => {
    if (session.id) {
      try {
        await window.electron.ipcRenderer.invoke('delete-session', session.id);
        // Clear local state immediately to prevent stale UI
        setRecordings([]);
        // Call the callback to refresh the sessions list
        if (onSessionDeleted) {
          onSessionDeleted();
        }
      } catch (error) {
        console.error('Failed to delete recording:', error);
      }
    }
  };

  const handleConfirmSubmit = () => {
    setShowConfirmDialog(false);
    if (onSubmit) {
      onSubmit();
    }
  };

  return (
    <div className="h-fit">
      {recordings.length > 0 && (
        <div className="h-fit">
          {taskTitle && (
            <div className={`mb-2 px-2 py-1 rounded-md border text-[9px] uppercase tracking-industrial-wide font-mono font-bold ${isDark ? 'bg-industrial-orange/10 border-industrial-orange/30 text-industrial-orange' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
              <span className="opacity-60">Task: </span>{taskTitle}
            </div>
          )}
          <RecordingCard
            key={recordings[recordings.length - 1].id}
            title={`Recording - ${recordings[recordings.length - 1].timestamp.toLocaleString()}`}
            date={formatSessionDuration(session.duration)}
            points={0}
            duration={formatSessionDuration(session.duration)}
            type={recordings[recordings.length - 1].type}
            thumbnail={recordings[recordings.length - 1].thumbnail}
            sessionId={session.id}
            onDelete={handleDeleteRecording}
            approvalState={session.approval_state}
          />
          <div className="flex justify-end items-center mt-3">
            {canSubmit && onSubmit && (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConfirmDialog(true);
                  }}
                  className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-industrial-wide font-mono font-bold transition-all border disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-industrial-orange text-black border-industrial-orange/20 shadow-industrial hover-lift hover:shadow-industrial-lg' : 'bg-blue-500 text-white border-blue-600'}`}
                >
                  {isSubmitting ? 'Uploading...' : 'Submit'}
                </button>

                {/* Confirmation Dialog */}
                {showConfirmDialog && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowConfirmDialog(false);
                    }}
                  >
                    <div
                      className={`w-full max-w-md p-6 rounded-lg border ${isDark ? 'bg-industrial-black-secondary border-industrial-border' : 'bg-white border-gray-300'}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 className={`text-lg font-mono font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Confirm Submission
                      </h3>

                      <div className={`space-y-3 mb-6 ${isDark ? 'text-industrial-white-secondary' : 'text-gray-600'}`}>
                        <div className={`p-3 rounded-lg border ${isDark ? 'bg-industrial-black-tertiary border-industrial-border' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-mono">Duration:</span>
                            <span className={`text-sm font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {formatSessionDuration(session.duration)}
                            </span>
                          </div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-mono">Recordings:</span>
                            <span className={`text-sm font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {recordings.length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-mono">Comments:</span>
                            <span className={`text-sm font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {comments}
                            </span>
                          </div>
                        </div>

                        <p className={`text-xs font-mono ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                          ⚠ Once submitted, this session cannot be edited.
                        </p>
                      </div>

                      <div className="flex gap-3 justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowConfirmDialog(false);
                          }}
                          className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-industrial-wide font-mono font-bold transition-all border ${isDark ? 'bg-industrial-black-tertiary text-white border-industrial-border hover:bg-industrial-black-primary' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmSubmit();
                          }}
                          className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-industrial-wide font-mono font-bold transition-all border ${isDark ? 'bg-industrial-orange text-black border-industrial-orange/20 shadow-industrial hover-lift hover:shadow-industrial-lg' : 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600'}`}
                        >
                          Confirm Submit
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SessionCard;
