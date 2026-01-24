import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Monitor } from 'lucide-react';
import Button from './Button';
import DashboardWindow from './DashboardWindow';

interface DisplayInfo {
  id: string;
  name: string;
  resolution: string;
}

function TrayOld() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [cursorInfo, setCursorInfo] = useState({ x: 0, y: 0, displayId: 0 });
  const [windowInfo, setWindowInfo] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  // Add tracking functionality
  const handleStopCapture = useCallback((temporary = false) => {
    setIsCapturing(false);
    window.electron.ipcRenderer.sendMessage('set-recording-status', false);
  }, []);

  const handleStartCapture = useCallback(async () => {
    try {
      const currentWindowInfo = await window.electron.ipcRenderer.invoke(
        'get-current-window-info',
      );
      const isSensitive = await window.electron.ipcRenderer.invoke(
        'check-sensitive-content',
        currentWindowInfo.activeWindow,
      );

      if (isSensitive) {
        console.log('Cannot start capture: Protected content detected');
        return;
      }

      setIsCapturing(true);
      window.electron.ipcRenderer.sendMessage('set-recording-status', true);
    } catch (error) {
      console.error('Start capture error:', error);
    }
  }, []);

  // Add cursor and window tracking
  useEffect(() => {
    const handleCursorMove = (data: any) => {
      setCursorInfo({
        x: data.position.x,
        y: data.position.y,
        displayId: data.display.id,
      });
      setWindowInfo(data.activeWindow);
    };

    const handleSensitiveContent = () => {
      if (isCapturing) {
        handleStopCapture(true);
      }
    };

    window.electron.ipcRenderer.on('cursor-moved', handleCursorMove);
    window.electron.ipcRenderer.on(
      'stop-recording-sensitive',
      handleSensitiveContent,
    );

    return () => {
      window.electron.ipcRenderer.removeAllListeners('cursor-moved');
      window.electron.ipcRenderer.removeAllListeners(
        'stop-recording-sensitive',
      );
    };
  }, [isCapturing, handleStopCapture]);

  // Add timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCapturing) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isCapturing]);

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')} mins`;
  };

  const openMainApp = () => {
    setIsDashboardOpen(true);
  };

  const handleDashboardClose = () => {
    setIsDashboardOpen(false);
  };

  // Add effect to fetch displays
  useEffect(() => {
    const fetchDisplays = async () => {
      try {
        const displayInfo =
          await window.electron.ipcRenderer.invoke('get-displays');
        setDisplays(displayInfo);
      } catch (error) {
        console.error('Error fetching displays:', error);
      }
    };

    fetchDisplays();
  }, []);

  return (
    <div className="max-w-md mx-auto bg-white p-6 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2" />

        <div className="flex items-center space-x-4">
          <div className="text-xl font-semibold">00</div>
          <Bell className="w-5 h-5" />
          <div className="w-8 h-8 rounded-full bg-gray-200" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mb-8 bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          className="flex-1 py-2 px-4 rounded-lg bg-white font-medium shadow-sm"
        >
          Passive
        </button>
        <button type="button" className="flex-1 py-2 px-4 text-gray-500">
          Tasks
        </button>
      </div>

      {/* Display Section */}
      <div className="mb-6">
        <div className="text-gray-600 mb-2">Display</div>
        <div className="w-full flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center">
            <Monitor className="w-5 h-5 mr-2" />
            <span>
              {displays.find((d) => d.id === cursorInfo.displayId.toString())
                ?.name || 'Unknown Display'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-50 p-4 rounded-[15px] shadow-md">
          <div className="text-3xl font-bold mb-1">320 pts</div>
          <div className="text-gray-600">Earnings this session</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-[15px] shadow-md">
          <div className="text-3xl font-bold mb-1">32 pts</div>
          <div className="text-gray-600">Estimated Hourly Rate</div>
        </div>
      </div>

      {/* Active Window - Updated to use real data */}
      <div className="mb-6">
        <div className="text-gray-600 mb-2">Active Window</div>
        <div className="w-full flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center">
            <Monitor className="w-5 h-5 mr-2" />
            <span>{windowInfo ? windowInfo.title : 'No active window'}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid - Updated with real data */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-50 p-4 rounded-[15px] shadow-md">
          <div className="text-3xl font-bold mb-1">
            {cursorInfo.x}, {cursorInfo.y}
          </div>
          <div className="text-gray-600">Cursor Position</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-[15px] shadow-md">
          <div className="text-3xl font-bold mb-1">{cursorInfo.displayId}</div>
          <div className="text-gray-600">Display ID</div>
        </div>
      </div>

      {/* Bottom Stats - Updated with real time */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <div className="text-3xl font-bold mb-1">
            {formatTime(elapsedTime)}
          </div>
          <div className="text-gray-600">Time Elapsed</div>
        </div>
        <div>
          <div className="text-3xl font-bold mb-1">
            {isCapturing ? 'Active' : 'Inactive'}
          </div>
          <div className="text-gray-600">Status</div>
        </div>
      </div>

      {/* Add this button before the main action button */}
      <div className="mb-4">
        <button
          type="button"
          onClick={openMainApp}
          className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-lg font-medium"
        >
          Open Dashboard
        </button>
      </div>

      {/* Action Button */}
      <Button onClick={isCapturing ? handleStopCapture : handleStartCapture}>
        {isCapturing ? 'Stop Tracking' : 'Start Tracking'}
      </Button>

      <DashboardWindow
        isOpen={isDashboardOpen}
        onClose={handleDashboardClose}
      />
    </div>
  );
}

export default TrayOld;

/* Rectangle 175 */
