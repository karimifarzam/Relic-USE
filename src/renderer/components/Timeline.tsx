interface TimelineProps {
  screenshots: Array<{
    dataUrl: string;
    timestamp: number;
    isSensitive: boolean;
  }>;
}

export const Timeline = ({ screenshots }: TimelineProps) => {
  return (
    <div className="timeline-section">
      <div className="timeline-header">
        <h2>Activity Timeline</h2>
        <div className="timeline-controls">
          <span>{screenshots.length} captures</span>
        </div>
      </div>

      <div className="timeline">
        {screenshots.map((screenshot, index) => (
          <div key={index} className="screenshot-card">
            {!screenshot.isSensitive ? (
              <img src={screenshot.dataUrl} alt="Screenshot" />
            ) : (
              <div className="protected-content">Protected Content</div>
            )}
            <div className="screenshot-info">
              <div className="screenshot-time">
                {new Date(screenshot.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
