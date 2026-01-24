import React, { useState, useEffect, JSX, useRef, useCallback } from 'react';
import {
  Monitor,
  Bell,
  LayoutDashboard,
  Clock,
  Database,
  LayoutGrid,
  Target,
} from 'lucide-react';
import DropdownField from './Dropdown';
import pfp from '../../../assets/images/pfp.png';
import RecordingCard from './Board/RecordingCard';
import type { Timeout } from 'node:timers';
import { useTheme } from '../contexts/ThemeContext';

interface TrayProps {
  onStartEarning?: () => void;
}

interface Display {
  id: string;
  name: string;
  resolution?: string;
  screenSourceId?: string; // The actual screen source ID for recording (e.g., "screen:0:0")
}

interface Window {
  id: string;
  name: string;
  thumbnail: string;
  display: string;
  display_id?: string; // Add display_id for matching screens to displays
}

interface Task {
  id: number;
  title: string;
  description: string[];
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estEarnings: number;
  duration: string;
  type: string;
  completion?: number;
}

function Tray({ onStartEarning }: TrayProps): JSX.Element {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('passive');
  const [displays, setDisplays] = useState<Display[]>([]);
  const [selectedDisplay, setSelectedDisplay] = useState<string>('');
  const [activeWindows, setActiveWindows] = useState<Window[]>([]);
  const [selectedWindow, setSelectedWindow] = useState<string | null>(null);
  const [useWindowRecording, setUseWindowRecording] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [storage, setStorage] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const captureInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCapturedWindowId = useRef<string | null>(null);
  const [lastCapture, setLastCapture] = useState<{
    windowName: string;
    timestamp: string;
    thumbnail: string;
  } | null>(null);
  const [recordingSource, setRecordingSource] = useState<{
    id: string;
    type: 'window' | 'screen';
  } | null>(null);

  const fetchActiveWindows = useCallback(async () => {
    try {
      const allSources =
        await window.electron.ipcRenderer.invoke('get-active-windows');

      // Filter out screen sources - only keep actual windows
      const actualWindows = allSources.filter((source: Window) =>
        source.id.startsWith('window:')
      );

      setActiveWindows(actualWindows);
    } catch (error) {
      console.error('Failed to fetch active windows:', error);
    }
  }, []);

  useEffect(() => {
    const fetchDisplays = async () => {
      try {
        // Get display information with screen source IDs from main process
        const systemDisplays = await window.electron.ipcRenderer.invoke('get-displays');

        console.log('Fetched displays:', systemDisplays);

        // Use the displays directly - they now include screenSourceId
        const displayList = systemDisplays.map((display: Display & { screenSourceId?: string }) => ({
          id: display.id,
          name: display.name,
          screenSourceId: display.screenSourceId,
        }));

        setDisplays(displayList);
        if (!selectedDisplay && displayList.length > 0) {
          setSelectedDisplay(displayList[0].id);
          // Also set the recording source to the first display
          if (displayList[0].screenSourceId) {
            setRecordingSource({
              id: displayList[0].screenSourceId,
              type: 'screen',
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch displays:', error);
      }
    };

    fetchDisplays();
    fetchActiveWindows();

    // Refresh active windows list periodically
    const intervalId = setInterval(fetchActiveWindows, 5000);
    return () => clearInterval(intervalId);
  }, [fetchActiveWindows, selectedDisplay]);

  useEffect(() => {
    if (currentSessionId) {
      // Get initial session data
      const fetchSessionDuration = async () => {
        const sessions =
          await window.electron.ipcRenderer.invoke('get-sessions');
        const currentSession = sessions.find((s) => s.id === currentSessionId);
        if (currentSession) {
          setElapsedTime(currentSession.duration);
        }
      };
      fetchSessionDuration();
    }
  }, [currentSessionId]);

  useEffect(() => {
    let timerInterval: ReturnType<typeof setInterval>;

    if (isRecording && currentSessionId && !isPaused) {
      // Update elapsed time every second from the main process
      timerInterval = setInterval(async () => {
        try {
          const duration = await window.electron.ipcRenderer.invoke(
            'get-current-duration',
          );
          setElapsedTime(duration);
        } catch (error) {
          console.error('Failed to get current duration:', error);
        }
      }, 1000);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [isRecording, currentSessionId, isPaused]);

  useEffect(() => {
    const taskListener = window.electron.ipcRenderer.on(
      'open-task',
      async (args) => {
        const taskId = args as number;
        setActiveTab('tasks');
        try {
          const task = await window.electron.ipcRenderer.invoke(
            'get-task',
            taskId,
          );
          if (task) {
            setSelectedTask(task);
          }
        } catch (error) {
          console.error('Failed to load task:', error);
        }
      },
    );

    return () => {
      taskListener?.();
    };
  }, []);

  useEffect(() => {
    const modeListener = window.electron.ipcRenderer.on(
      'set-mode' as any,
      (mode) => {
        setActiveTab(mode as 'passive' | 'tasks');
        if (mode === 'passive') {
          setSelectedTask(null);
        }

        // When switching to passive mode, set default display but don't select a window
        // This ensures we default to screen recording
        if (mode === 'passive' && displays.length > 0) {
          setSelectedDisplay(displays[0].id);
          setSelectedWindow(null);
          setRecordingSource(null);
        }
      },
    );

    return () => {
      modeListener?.();
    };
  }, [displays]);

  useEffect(() => {
    // Add listeners for pause/resume events
    const pauseListener = window.electron.ipcRenderer.on(
      'recording-paused',
      () => {
        setIsPaused(true);
      },
    );

    const resumeListener = window.electron.ipcRenderer.on(
      'recording-resumed',
      () => {
        setIsPaused(false);
      },
    );

    return () => {
      pauseListener?.();
      resumeListener?.();
    };
  }, []);

  const handlePauseRecording = () => {
    if (captureInterval.current) {
      clearInterval(captureInterval.current);
      captureInterval.current = null;
    }
    window.electron.ipcRenderer.sendMessage('pause-recording');
  };

  const handleResumeRecording = () => {
    window.electron.ipcRenderer.sendMessage('resume-recording');
    // Restart capture interval
    startCaptureInterval(currentSessionId);
  };

  const captureActiveWindow = useCallback(
    async (sessionId: number, source?: { id: string; type: 'window' | 'screen' }) => {
      const sourceToCapture = source || recordingSource;
      if (!sourceToCapture) {
        console.log('[TRAY] No source to capture');
        return;
      }

      try {
        const sourceId = sourceToCapture.id;
        console.log(`[TRAY] Capturing session ${sessionId}, source: ${sourceId}`);

        const capture = await window.electron.ipcRenderer.invoke(
          'capture-window',
          sourceId,
          sourceToCapture.type,
        );

        if (capture) {
          console.log(`[TRAY] Capture success, saving...`);

          setLastCapture({
            windowName: capture.windowName,
            timestamp: capture.timestamp,
            thumbnail: capture.thumbnail,
          });

          const saveResult = await window.electron.ipcRenderer.invoke('save-recording', {
            session_id: sessionId,
            timestamp: capture.timestamp,
            window_name: capture.windowName,
            window_id: sourceId,
            thumbnail: capture.thumbnail,
            screenshot: capture.screenshot,
            type: selectedTask ? 'tasked' : 'passive',
          });
          console.log(`[TRAY] Saved recording ID: ${saveResult}`);
        } else {
          console.log('[TRAY] Capture returned null');
        }
      } catch (error) {
        console.error('[TRAY] Capture error:', error);
      }
    },
    [recordingSource, selectedTask],
  );

  const startCaptureInterval = useCallback(
    (sessionId?: number, source?: { id: string; type: 'window' | 'screen' }) => {
      const activeSessionId = sessionId || currentSessionId;
      const sourceToUse = source || recordingSource;

      if (!activeSessionId || !sourceToUse) {
        console.log('[TRAY] Cannot start capture - missing sessionId or source');
        return;
      }

      // Clear any existing interval
      if (captureInterval.current) {
        clearInterval(captureInterval.current);
        captureInterval.current = null;
      }

      console.log(`[TRAY] Starting 1/second capture for session ${activeSessionId}`);

      // Capture immediately
      captureActiveWindow(activeSessionId, sourceToUse);

      // Then capture every 1 second
      captureInterval.current = setInterval(() => {
        captureActiveWindow(activeSessionId, sourceToUse);
      }, 1000);
    },
    [currentSessionId, recordingSource, captureActiveWindow],
  );

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const displayOptions = displays.map((display) => display.name);
  const windowOptions = activeWindows.map((window) => window.name);

  const handleDisplayChange = async (displayName: string) => {
    const display = displays.find((d) => d.name === displayName);

    if (display && display.screenSourceId) {
      setSelectedDisplay(display.id);

      // Use the screen source ID directly from the display
      setRecordingSource({
        id: display.screenSourceId, // e.g., "screen:0:0"
        type: 'screen',
      });
    } else {
      console.error('No screen source found for display:', displayName);
    }
  };

  const handleWindowChange = (windowName: string) => {
    const window = activeWindows.find((w) => w.name === windowName);
    if (window) {
      setSelectedWindow(window.id);
      // Only set recording source if checkbox is enabled
      if (useWindowRecording) {
        setRecordingSource({
          id: window.id,
          type: 'window',
        });
      }
    }
  };

  const handleWindowRecordingToggle = (checked: boolean) => {
    setUseWindowRecording(checked);

    if (checked) {
      // Checkbox enabled - use window recording if a window is selected
      if (selectedWindow) {
        const window = activeWindows.find((w) => w.id === selectedWindow);
        if (window) {
          setRecordingSource({
            id: window.id,
            type: 'window',
          });
        }
      } else if (activeWindows.length > 0) {
        // Select first window if none selected
        setSelectedWindow(activeWindows[0].id);
        setRecordingSource({
          id: activeWindows[0].id,
          type: 'window',
        });
      }
    } else {
      // Checkbox disabled - default to screen recording
      setRecordingSource(null);
    }
  };

  const selectedDisplayName =
    displays.find((d) => d.id === selectedDisplay)?.name || 'Main Display';
  const selectedWindowName = useWindowRecording
    ? activeWindows.find((w) => w.id === selectedWindow)?.name || (activeWindows.length > 0 ? activeWindows[0].name : 'Select Window')
    : 'Entire screen';

  const handleStartRecording = async () => {
    try {
      // Determine the source to use
      let sourceToUse = recordingSource;

      if (!sourceToUse) {
        // No window selected - use the selected display for screen recording
        const selectedDisplayObj = displays.find((d) => d.id === selectedDisplay);

        if (!selectedDisplayObj || !selectedDisplayObj.screenSourceId) {
          console.error('[TRAY] No valid display selected');
          return;
        }

        sourceToUse = {
          id: selectedDisplayObj.screenSourceId,
          type: 'screen' as const,
        };
        setRecordingSource(sourceToUse);
      }

      console.log('[TRAY] Starting recording with source:', sourceToUse);

      // Create session
      const sessionId = await window.electron.ipcRenderer.invoke(
        'create-session',
        selectedTask ? 'tasked' : 'passive',
        selectedTask?.id,
      );

      if (!sessionId) {
        console.error('[TRAY] Failed to create session');
        return;
      }

      console.log('[TRAY] Session created:', sessionId);

      // Set recording state
      setIsRecording(true);
      setIsPaused(false);
      setElapsedTime(0);
      setCurrentSessionId(sessionId);

      // Notify main process
      window.electron.ipcRenderer.sendMessage('start-recording', sessionId);

      // Start 1/second capture interval
      startCaptureInterval(sessionId, sourceToUse);

      console.log('[TRAY] Recording started');
    } catch (error) {
      console.error('[TRAY] Failed to start recording:', error);
      setCurrentSessionId(null);
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      if (captureInterval.current) {
        clearInterval(captureInterval.current);
        captureInterval.current = null;
      }

      const sessionIdToOpen = currentSessionId;

      if (currentSessionId) {
        await window.electron.ipcRenderer.invoke(
          'update-session-duration',
          currentSessionId,
          elapsedTime,
        );
      }

      setIsRecording(false);
      setIsPaused(false);
      setElapsedTime(0);
      setStorage(0);
      setCurrentSessionId(null);
      lastCapturedWindowId.current = null;

      window.electron.ipcRenderer.sendMessage('stop-recording');

      // Open the editor with the completed recording
      if (sessionIdToOpen) {
        await window.electron.ipcRenderer.invoke('show-editor', sessionIdToOpen);
      }

      // Show the main window (if it exists) without creating a new one
      await window.electron.ipcRenderer.invoke('focus-main-window');
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (captureInterval.current) {
        clearInterval(captureInterval.current);
      }
    };
  }, []);

  // Add effect to log session ID changes
  useEffect(() => {
    console.log('Current session ID changed:', currentSessionId);
  }, [currentSessionId]);

  // Add effect to handle sensitive content detection
  useEffect(() => {
    const handleSensitiveContent = () => {
      if (isRecording) {
        if (captureInterval.current) {
          clearInterval(captureInterval.current);
          captureInterval.current = null;
        }
        setIsPaused(true);
      }
    };

    window.electron.ipcRenderer.on(
      'stop-recording-sensitive',
      handleSensitiveContent,
    );

    return () => {
      window.electron.ipcRenderer.removeAllListeners(
        'stop-recording-sensitive',
      );
    };
  }, [isRecording]);

  return (
    <div className={`w-full max-w-[305px] p-5 min-h-screen ${isDark ? 'bg-industrial-black-primary' : 'bg-white'}`}>
      {/* Header */}
      <div className="flex justify-between items-center gap-3 mb-4">
        {/* Mode Indicator */}
        <div className={`px-2 py-1 rounded-md border text-[9px] uppercase tracking-industrial-wide font-mono font-bold ${
          selectedTask
            ? isDark
              ? 'bg-industrial-orange/10 border-industrial-orange/30 text-industrial-orange'
              : 'bg-orange-50 border-orange-200 text-orange-600'
            : isDark
              ? 'bg-industrial-blue/10 border-industrial-blue/30 text-industrial-blue'
              : 'bg-blue-50 border-blue-200 text-blue-600'
        }`}>
          {selectedTask ? 'Task' : 'Passive'}
        </div>

        <div className="flex items-center gap-3">
          <LayoutDashboard className={`w-4 h-4 transition-colors cursor-pointer ${isDark ? 'text-industrial-white-tertiary hover:text-white' : 'text-gray-500 hover:text-gray-900'}`} strokeWidth={1.5} />
          <Bell className={`w-4 h-4 transition-colors cursor-pointer ${isDark ? 'text-industrial-white-tertiary hover:text-white' : 'text-gray-500 hover:text-gray-900'}`} strokeWidth={1.5} />
          <div className={`w-6 h-6 rounded-md overflow-hidden border ${isDark ? 'bg-industrial-black-secondary border-industrial-border-subtle' : 'bg-gray-100 border-gray-300'}`}>
            <img
              src={pfp}
              alt="avatar"
              className="object-cover rounded-md scale-150"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`border rounded-lg p-1 mb-4 w-full ${isDark ? 'bg-industrial-black-secondary border-industrial-border' : 'bg-gray-100 border-gray-300'}`}>
        <div className="flex gap-1">
          <button
            type="button"
            className={`flex-1 py-2 px-4 text-[10px] uppercase tracking-industrial-wide font-mono font-bold rounded-md transition-all ${
              activeTab === 'passive'
                ? isDark
                  ? 'bg-industrial-black-tertiary text-white border border-industrial-border'
                  : 'bg-white text-gray-900 border border-blue-200'
                : isDark
                  ? 'text-industrial-white-tertiary hover:text-industrial-white-secondary'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('passive')}
          >
            Recording
          </button>
          <button
            type="button"
            className={`flex-1 py-2 px-4 text-[10px] uppercase tracking-industrial-wide font-mono font-bold rounded-md transition-all ${
              activeTab === 'tasks'
                ? isDark
                  ? 'bg-industrial-black-tertiary text-white border border-industrial-border'
                  : 'bg-white text-gray-900 border border-blue-200'
                : isDark
                  ? 'text-industrial-white-tertiary hover:text-industrial-white-secondary'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('tasks')}
          >
            Task
          </button>
        </div>
      </div>

      {activeTab === 'passive' ? (
        <>
          {/* Display Section */}
          <div className="w-full mx-auto mb-4">
            <DropdownField
              label="Display"
              value={selectedDisplayName}
              icon={Monitor}
              options={displayOptions}
              onChange={handleDisplayChange}
            />
          </div>

          {/* Points Section */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className={`border rounded-lg p-3 relative overflow-hidden ${isDark ? 'bg-industrial-black-secondary border-industrial-border' : 'bg-gray-50 border-gray-300'}`}>
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-r ${isDark ? 'bg-industrial-orange' : 'bg-blue-500'}`} />
              <div className="flex items-baseline justify-center gap-1 mb-1">
                <span className={`text-2xl font-mono font-light leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>320</span>
                <span className={`text-[10px] uppercase tracking-industrial font-mono ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>pts</span>
              </div>
              <div className={`text-[8px] uppercase tracking-industrial-wide text-center font-mono ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                Session Earnings
              </div>
            </div>
            <div className={`border rounded-lg p-3 relative overflow-hidden ${isDark ? 'bg-industrial-black-secondary border-industrial-border' : 'bg-gray-50 border-gray-300'}`}>
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-r ${isDark ? 'bg-industrial-blue' : 'bg-green-500'}`} />
              <div className="flex items-baseline justify-center gap-1 mb-1">
                <span className={`text-2xl font-mono font-light leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>32</span>
                <span className={`text-[10px] uppercase tracking-industrial font-mono ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>pts</span>
              </div>
              <div className={`text-[8px] uppercase tracking-industrial-wide text-center font-mono ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                Hourly Rate
              </div>
            </div>
          </div>

          <div className={`my-4 border-t ${isDark ? 'border-industrial-border-subtle' : 'border-gray-200'}`} />

          {/* Active Window */}
          <div className="w-full mx-auto mb-4">
            <DropdownField
              label="Active Window"
              value={selectedWindowName}
              icon={Monitor}
              options={windowOptions}
              onChange={handleWindowChange}
              showCheckbox={true}
              checkboxChecked={useWindowRecording}
              onCheckboxChange={handleWindowRecordingToggle}
              disabled={!useWindowRecording}
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className={`border rounded-lg p-3 ${isDark ? 'bg-industrial-black-secondary border-industrial-border' : 'bg-gray-50 border-gray-300'}`}>
              <div className="flex items-baseline gap-1 justify-center mb-1">
                <span className={`text-xl font-mono font-light leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {formatTime(elapsedTime)}
                </span>
              </div>
              <div className={`text-[8px] uppercase tracking-industrial-wide text-center font-mono ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                Time Elapsed
              </div>
            </div>
            <div className={`border rounded-lg p-3 ${isDark ? 'bg-industrial-black-secondary border-industrial-border' : 'bg-gray-50 border-gray-300'}`}>
              <div className="flex items-baseline gap-1 justify-center mb-1">
                <span className={`text-xl font-mono font-light leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {storage.toFixed(1)}
                </span>
                <span className={`text-[10px] uppercase tracking-industrial font-mono ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>MB</span>
              </div>
              <div className={`text-[8px] uppercase tracking-industrial-wide text-center font-mono ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                Storage
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 w-full">
            {isRecording ? (
              <>
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className={`w-full h-[44px] rounded-lg text-[10px] uppercase tracking-industrial-wide font-mono font-bold transition-all border shadow-industrial hover-lift hover:shadow-industrial-lg ${
                    isDark
                      ? 'bg-industrial-red text-white border-industrial-red/20'
                      : 'bg-red-500 text-white border-red-600'
                  }`}
                >
                  Stop Recording
                </button>
                <button
                  type="button"
                  onClick={
                    isPaused ? handleResumeRecording : handlePauseRecording
                  }
                  className={`w-full h-[44px] rounded-lg text-[10px] uppercase tracking-industrial-wide font-mono font-bold transition-all border shadow-industrial hover-lift hover:shadow-industrial-lg ${
                    isPaused
                      ? isDark
                        ? 'bg-industrial-green text-black border-industrial-green/20'
                        : 'bg-green-500 text-white border-green-600'
                      : isDark
                        ? 'bg-industrial-yellow text-black border-industrial-yellow/20'
                        : 'bg-yellow-500 text-white border-yellow-600'
                  }`}
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleStartRecording}
                className={`w-full h-[44px] rounded-lg text-[10px] uppercase tracking-industrial-wide font-mono font-bold transition-all border shadow-industrial hover-lift hover:shadow-industrial-lg ${
                  isDark
                    ? 'bg-industrial-orange text-black border-industrial-orange/20'
                    : 'bg-blue-500 text-white border-blue-600'
                }`}
              >
                Start Recording
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="px-2">
          {activeTab === 'tasks' && selectedTask ? (
            <div className="">
              <div className="mb-4">
                <div className={`text-[9px] flex items-center gap-1 mb-2 font-mono uppercase tracking-industrial ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                  Task {selectedTask.id}{' '}
                  <span className={isDark ? 'text-industrial-blue' : 'text-blue-500'}>↗</span>
                </div>
                <h2 className={`text-lg font-mono font-light mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {selectedTask.title}
                </h2>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`flex items-center px-2 py-1 rounded border text-[9px] uppercase tracking-industrial font-mono ${isDark ? 'bg-industrial-black-tertiary border-industrial-border-subtle text-industrial-white-secondary' : 'bg-gray-100 border-gray-300 text-gray-700'}`}>
                  <Database className="w-3 h-3 mr-1" strokeWidth={1.5} />
                  {selectedTask.estEarnings} pts
                </span>

                <span className={`flex items-center px-2 py-1 rounded border text-[9px] uppercase tracking-industrial font-mono ${isDark ? 'bg-industrial-black-tertiary text-industrial-orange border-industrial-border-subtle' : 'bg-gray-100 text-orange-600 border-gray-300'}`}>
                  <Clock className="w-3 h-3 mr-1" strokeWidth={1.5} />
                  {selectedTask.duration}
                </span>

                <span className={`flex items-center px-2 py-1 rounded border text-[9px] uppercase tracking-industrial font-mono ${isDark ? 'bg-industrial-black-tertiary text-industrial-blue border-industrial-border-subtle' : 'bg-gray-100 text-blue-600 border-gray-300'}`}>
                  <Monitor className="w-3 h-3 mr-1" strokeWidth={1.5} />
                  {selectedTask.type}
                </span>

                <span className={`flex items-center px-2 py-1 rounded border text-[9px] uppercase tracking-industrial font-mono ${isDark ? 'bg-industrial-black-tertiary text-industrial-green border-industrial-border-subtle' : 'bg-gray-100 text-green-600 border-gray-300'}`}>
                  <LayoutGrid className="w-3 h-3 mr-1" strokeWidth={1.5} />
                  {selectedTask.category}
                </span>

                {selectedTask.completion && (
                  <span className={`flex items-center px-2 py-1 rounded border text-[9px] uppercase tracking-industrial font-mono ${isDark ? 'bg-industrial-black-tertiary text-industrial-red border-industrial-border-subtle' : 'bg-gray-100 text-red-600 border-gray-300'}`}>
                    <Target className="w-3 h-3 mr-1" strokeWidth={1.5} />
                    {selectedTask.completion}%
                  </span>
                )}
              </div>

              <div className="mb-6">
                <h3 className={`text-[11px] uppercase tracking-industrial-wide font-mono font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Task Description
                </h3>
                <ol className="list-decimal pl-4 space-y-2">
                  {selectedTask.description.map((step, i) => (
                    <li key={`step-${i}`} className={`text-[11px] font-mono ${isDark ? 'text-industrial-white-secondary' : 'text-gray-600'}`}>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedTask(null);
                  setActiveTab('passive');
                }}
                className={`w-full px-4 py-2 rounded-lg text-[10px] uppercase tracking-industrial-wide font-mono font-bold transition-all border ${isDark ? 'bg-industrial-black-tertiary text-industrial-white-secondary border-industrial-border hover:bg-industrial-black-primary hover:text-white' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 hover:text-gray-900'}`}
              >
                Clear Task / Back to Passive
              </button>
            </div>
          ) : (
            <div className={`text-center py-8 text-[10px] uppercase tracking-industrial font-mono ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
              No task selected
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Tray;
