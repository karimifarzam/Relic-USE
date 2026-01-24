interface StatsPanelProps {
  cursorInfo: { x: number; y: number; displayId: number };
  windowInfo: any;
  isCapturing: boolean;
}

export const StatsPanel = ({
  cursorInfo,
  windowInfo,
  isCapturing,
}: StatsPanelProps) => {
  return (
    <div className="stats-panel">
      <div className="stat-card">
        <h3>Current Window</h3>
        <div className="stat-value">
          {windowInfo ? (
            <>
              Process: {windowInfo.processName}
              <br />
              Title: {windowInfo.title}
            </>
          ) : (
            'No active window'
          )}
        </div>
      </div>

      <div className="stat-card">
        <h3>Cursor Position</h3>
        <div className="stat-value">
          X: {cursorInfo.x}, Y: {cursorInfo.y}
          <br />
          Display: {cursorInfo.displayId}
        </div>
      </div>

      <div className="stat-card">
        <h3>Tracking Status</h3>
        <div
          className="stat-value"
          style={{ color: isCapturing ? '#4CAF50' : '#666' }}
        >
          {isCapturing ? 'Active' : 'Inactive'}
        </div>
      </div>
    </div>
  );
};
