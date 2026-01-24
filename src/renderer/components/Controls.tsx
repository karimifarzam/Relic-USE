interface ControlsProps {
  isCapturing: boolean;
  onStart: () => void;
  onStop: () => void;
}

export const Controls = ({ isCapturing, onStart, onStop }: ControlsProps) => {
  return (
    <div className="controls">
      <button onClick={onStart} disabled={isCapturing}>
        Start Tracking
      </button>
      <button onClick={onStop} disabled={!isCapturing}>
        Stop Tracking
      </button>
    </div>
  );
};
