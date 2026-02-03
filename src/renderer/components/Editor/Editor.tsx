/* @refresh reset */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import {
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Square,
  LayoutGrid,
  ZoomOut,
  ZoomIn,
  ArrowLeft,
  ArrowRight,
  Save,
  X,
  MessageSquare,
  Plus,
  CirclePlus,
  Pencil,
  Edit2,
  Send,
  Undo2,
} from 'lucide-react';
import myBoard from '../../../../assets/icons/myBoard.svg';

interface Screenshot {
  id: string;
  timestamp: string;
  imageUrl: string;
  label?: string;
  time?: number; // Time in seconds from the start
}

interface TimeRangeComment {
  id?: number;
  session_id: number;
  start_time: number;
  end_time: number;
  comment: string;
  created_at: string;
}

type UndoAction =
  | {
      type: 'recordingDeletion';
      screenshots: Screenshot[];
      pendingDeletions: number[];
      selectedIndices: number[];
      currentIndex: number;
    }
  | {
      type: 'commentDeletion';
      comment: TimeRangeComment;
      insertIndex: number;
    };

interface Recording {
  id?: number;
  session_id: number;
  timestamp: string;
  window_name: string;
  window_id: string;
  thumbnail: string;
  screenshot: string;
  type: 'passive' | 'tasked';
  label?: string;
}

interface ScreenshotEditorProps {
  screenshots: Screenshot[];
  onDeleteScreenshots: (indices: number[]) => void;
  onUpdateLabel: (index: number, label: string) => void;
  currentIndex: number;
  onCurrentIndexChange: (index: number) => void;
}

const ScreenshotTimeline: React.FC<{
  screenshots: Screenshot[];
  selectedIndices: number[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onSelectionChange: (indices: number[]) => void;
  isDark: boolean;
}> = function ScreenshotTimeline({
  screenshots,
  selectedIndices,
  currentIndex,
  onSelect,
  onSelectionChange,
  isDark,
}) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [hasMoved, setHasMoved] = useState(false);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  const formatTimeForTimeline = (screenshot: Screenshot, index: number) => {
    // Use the time property if available, otherwise calculate based on index
    const timeInSeconds = screenshot.time ?? index;
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    e.preventDefault();

    // Handle shift-click for range selection
    if (e.shiftKey && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      const rangeSelection = Array.from(
        { length: end - start + 1 },
        (_, i) => start + i,
      );
      onSelectionChange(rangeSelection);
      onSelect(index);
      return;
    }

    setIsDragging(true);
    setDragStart(index);
    setHasMoved(false);
    setLastClickedIndex(index);
    onSelect(index);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || dragStart === null || !timelineRef.current) return;

      setHasMoved(true);
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const { width } = rect;
      const screenshotWidth = width / screenshots.length;
      const dragIndex = Math.min(
        Math.max(0, Math.floor(x / screenshotWidth)),
        screenshots.length - 1,
      );

      const start = Math.min(dragStart, dragIndex);
      const end = Math.max(dragStart, dragIndex);
      const newSelection = Array.from(
        { length: end - start + 1 },
        (_, i) => start + i,
      );
      onSelectionChange(newSelection);
    },
    [isDragging, dragStart, screenshots.length, onSelectionChange],
  );

  const handleMouseUp = () => {
    // If we didn't move (just a click), select the single screenshot
    if (!hasMoved && dragStart !== null) {
      onSelectionChange([dragStart]);
    }
    setIsDragging(false);
    setDragStart(null);
    setHasMoved(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [isDragging, handleMouseMove]);

  return (
    <div
      ref={timelineRef}
      className="relative h-24 cursor-pointer select-none"
      role="grid"
      aria-label="Screenshot timeline"
    >
      <div className="absolute inset-0 flex">
        {screenshots.map((screenshot, index) => (
          <div
            key={screenshot.id}
            role="gridcell"
            tabIndex={0}
            aria-selected={selectedIndices.includes(index)}
            aria-label={`Screenshot ${index + 1} taken at ${screenshot.timestamp}`}
            className={`h-full flex-1 border-2 transition-all relative ${
              selectedIndices.includes(index)
                ? isDark
                  ? 'border-industrial-orange opacity-100'
                  : 'border-blue-500 opacity-100'
                : 'border-transparent opacity-50'
            } ${currentIndex === index ? isDark ? 'ring-2 ring-industrial-orange' : 'ring-2 ring-blue-500' : ''}`}
            style={{
              backgroundImage: `url(${screenshot.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            onMouseDown={(e) => handleMouseDown(e, index)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();

                // Handle shift+Enter/Space for range selection
                if (e.shiftKey && lastClickedIndex !== null) {
                  const start = Math.min(lastClickedIndex, index);
                  const end = Math.max(lastClickedIndex, index);
                  const rangeSelection = Array.from(
                    { length: end - start + 1 },
                    (_, i) => start + i,
                  );
                  onSelectionChange(rangeSelection);
                } else {
                  onSelectionChange([index]);
                  setLastClickedIndex(index);
                }
                onSelect(index);
              }
            }}
          >
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm px-1 py-0.5">
              <span className="text-[9px] font-mono font-bold text-white tracking-tight">
                {formatTimeForTimeline(screenshot, index)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CommentIndicatorTimeline: React.FC<{
  comments: TimeRangeComment[];
  screenshots: Screenshot[];
  isDark: boolean;
  onCommentClick?: (comment: TimeRangeComment) => void;
}> = function CommentIndicatorTimeline({ comments, screenshots, isDark, onCommentClick }) {
  const [hoveredComment, setHoveredComment] = useState<TimeRangeComment | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  if (screenshots.length === 0) return null;

  const handleMouseEnter = (comment: TimeRangeComment, e: React.MouseEvent) => {
    setHoveredComment(comment);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top });
  };

  const handleMouseLeave = () => {
    setHoveredComment(null);
    setTooltipPosition(null);
  };

  const handleClick = (comment: TimeRangeComment) => {
    if (onCommentClick) {
      onCommentClick(comment);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Find screenshot indices that fall within the comment time range
  const getScreenshotIndices = (startTime: number, endTime: number) => {
    let startIndex = 0;
    let endIndex = screenshots.length - 1;

    // Find the first screenshot that starts at or after startTime
    for (let i = 0; i < screenshots.length; i++) {
      const screenshotTime = screenshots[i].time ?? i;
      if (screenshotTime >= startTime) {
        startIndex = i;
        break;
      }
    }

    // Find the last screenshot that starts at or before endTime
    for (let i = screenshots.length - 1; i >= 0; i--) {
      const screenshotTime = screenshots[i].time ?? i;
      if (screenshotTime <= endTime) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  };

  return (
    <>
      <div className={`relative h-6 border-t ${isDark ? 'bg-industrial-black-secondary border-industrial-border-subtle' : 'bg-gray-50 border-gray-200'}`}>
        {comments.map((comment) => {
          const { startIndex, endIndex } = getScreenshotIndices(comment.start_time, comment.end_time);

          // Calculate position based on screenshot indices
          const totalScreenshots = screenshots.length;
          const startPercent = (startIndex / totalScreenshots) * 100;
          const endPercent = ((endIndex + 1) / totalScreenshots) * 100;
          const width = endPercent - startPercent;

          return (
            <div
              key={comment.id}
              className={`absolute top-1 h-4 rounded-sm cursor-pointer transition-all ${
                isDark
                  ? 'bg-industrial-orange/70 hover:bg-industrial-orange border border-industrial-orange'
                  : 'bg-blue-400/70 hover:bg-blue-500 border border-blue-500'
              }`}
              style={{
                left: `${startPercent}%`,
                width: `${width}%`,
              }}
              onClick={() => handleClick(comment)}
              onMouseEnter={(e) => handleMouseEnter(comment, e)}
              onMouseLeave={handleMouseLeave}
              role="button"
              tabIndex={0}
              aria-label={`Comment from ${formatTime(comment.start_time)} to ${formatTime(comment.end_time)}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClick(comment);
                }
              }}
            />
          );
        })}
      </div>

      {/* Tooltip */}
      {hoveredComment && tooltipPosition && (
        <div
          className={`fixed z-50 px-3 py-2 rounded-lg shadow-lg max-w-xs pointer-events-none ${
            isDark
              ? 'bg-industrial-black-tertiary border border-industrial-border text-white'
              : 'bg-white border border-gray-300 text-gray-900'
          }`}
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y - 10}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className={`text-[9px] uppercase tracking-industrial font-mono mb-1 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
            {formatTime(hoveredComment.start_time)} - {formatTime(hoveredComment.end_time)}
          </div>
          <div className="text-[11px] font-mono leading-tight line-clamp-3">
            {hoveredComment.comment}
          </div>
        </div>
      )}
    </>
  );
};

const CommentSidebar: React.FC<{
  comments: TimeRangeComment[];
  onAddComment: (startTime: number, endTime: number, comment: string) => void;
  onDeleteComment: (commentId: string) => void;
  onUpdateComment: (commentId: number, startTime: number, endTime: number, comment: string) => void;
  commentToEdit?: number | null;
  currentTime?: number;
  endTime?: number;
  isDark: boolean;
  footer?: React.ReactNode;
}> = ({ comments, onAddComment, onDeleteComment, onUpdateComment, commentToEdit, currentTime = 0, endTime, isDark, footer }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState('');
  const [editComment, setEditComment] = useState('');
  const [timeRange, setTimeRange] = useState<{ start: number; end: number }>({
    start: currentTime,
    end: endTime ?? currentTime + 30,
  });
  const [editTimeRange, setEditTimeRange] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });

  // Update time range when currentTime or endTime changes and we're not actively editing
  useEffect(() => {
    if (!isAdding && currentTime !== undefined) {
      setTimeRange({
        start: currentTime,
        end: endTime ?? currentTime + 30,
      });
    }
  }, [currentTime, endTime, isAdding]);

  // Handle external edit requests from timeline clicks
  useEffect(() => {
    if (commentToEdit !== null && commentToEdit !== undefined) {
      const comment = comments.find(c => c.id === commentToEdit);
      if (comment) {
        setEditingId(comment.id!);
        setEditComment(comment.comment);
        setEditTimeRange({
          start: comment.start_time,
          end: comment.end_time,
        });
      }
    }
  }, [commentToEdit, comments]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAddComment = () => {
    if (newComment.trim() && timeRange.start <= timeRange.end) {
      onAddComment(timeRange.start, timeRange.end, newComment.trim());
      setNewComment('');
      setIsAdding(false);
    }
  };

  const handleStartEdit = (comment: TimeRangeComment) => {
    setEditingId(comment.id!);
    setEditComment(comment.comment);
    setEditTimeRange({
      start: comment.start_time,
      end: comment.end_time,
    });
  };

  const handleSaveEdit = async () => {
    if (editingId && editComment.trim() && editTimeRange.start <= editTimeRange.end) {
      await onUpdateComment(editingId, editTimeRange.start, editTimeRange.end, editComment.trim());
      setEditingId(null);
      setEditComment('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditComment('');
  };

  return (
    <div className={`w-[400px] rounded-lg p-4 shadow-industrial flex flex-col max-h-[600px] ${isDark ? 'bg-industrial-black-secondary border border-industrial-border' : 'bg-white border border-gray-200'}`}>
      <div className="mb-4 flex-shrink-0">
        <div className={`rounded px-3 py-2 ${isDark ? 'bg-industrial-orange/10 border border-industrial-orange/20' : 'bg-blue-50 border border-blue-200'}`}>
          <p className={`text-[10px] uppercase tracking-industrial-wide font-mono font-bold ${isDark ? 'text-industrial-orange' : 'text-blue-600'}`}>
            Session Notes
          </p>
          <p className={`text-xs font-mono mt-1 ${isDark ? 'text-industrial-white-secondary' : 'text-gray-600'}`}>
            Add comments for time ranges
          </p>
        </div>
      </div>

      {isAdding && (
        <div className={`mb-3 p-3 rounded-lg border flex-shrink-0 ${isDark ? 'bg-industrial-black-tertiary border-industrial-border' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Start"
              className={`flex-1 min-w-0 px-2 py-1.5 border rounded text-xs font-mono focus:outline-none transition-colors ${isDark ? 'bg-industrial-black-primary border-industrial-border-subtle text-white focus:border-industrial-orange' : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'}`}
              value={formatTime(timeRange.start)}
              onChange={(e) => {
                const [min, sec] = e.target.value.split(':').map(Number);
                if (!isNaN(min) && !isNaN(sec)) {
                  setTimeRange((prev) => ({ ...prev, start: min * 60 + sec }));
                }
              }}
            />
            <input
              type="text"
              placeholder="End"
              className={`flex-1 min-w-0 px-2 py-1.5 border rounded text-xs font-mono focus:outline-none transition-colors ${isDark ? 'bg-industrial-black-primary border-industrial-border-subtle text-white focus:border-industrial-orange' : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'}`}
              value={formatTime(timeRange.end)}
              onChange={(e) => {
                const [min, sec] = e.target.value.split(':').map(Number);
                if (!isNaN(min) && !isNaN(sec)) {
                  setTimeRange((prev) => ({ ...prev, end: min * 60 + sec }));
                }
              }}
            />
          </div>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add your comment..."
            className={`w-full px-2 py-1.5 border rounded mb-2 text-xs font-mono resize-none focus:outline-none transition-colors ${isDark ? 'bg-industrial-black-primary border-industrial-border-subtle text-white focus:border-industrial-orange' : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'}`}
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-industrial-wide font-mono font-bold border rounded hover-lift transition-all ${isDark ? 'text-industrial-white-secondary hover:text-white bg-industrial-black-primary border-industrial-border-subtle' : 'text-gray-600 hover:text-gray-900 bg-gray-100 border-gray-300'}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddComment}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-industrial-wide font-mono font-bold border rounded hover-lift transition-all shadow-industrial-sm ${isDark ? 'text-black bg-industrial-orange border-industrial-orange/20' : 'text-white bg-blue-500 border-blue-600'}`}
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div className="overflow-y-auto space-y-3 min-h-0 max-h-[400px] hide-scrollbar show-scrollbar-on-hover">
        {comments.map((comment) => (
          <div key={comment.id} className="relative">
            {editingId === comment.id ? (
              /* Edit Mode */
              <div className={`p-3 rounded-lg border ${isDark ? 'bg-industrial-black-tertiary border-industrial-border' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Start"
                    className={`flex-1 min-w-0 px-2 py-1.5 border rounded text-xs font-mono focus:outline-none transition-colors ${isDark ? 'bg-industrial-black-primary border-industrial-border-subtle text-white focus:border-industrial-orange' : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'}`}
                    value={formatTime(editTimeRange.start)}
                    onChange={(e) => {
                      const [min, sec] = e.target.value.split(':').map(Number);
                      if (!isNaN(min) && !isNaN(sec)) {
                        setEditTimeRange((prev) => ({ ...prev, start: min * 60 + sec }));
                      }
                    }}
                  />
                  <input
                    type="text"
                    placeholder="End"
                    className={`flex-1 min-w-0 px-2 py-1.5 border rounded text-xs font-mono focus:outline-none transition-colors ${isDark ? 'bg-industrial-black-primary border-industrial-border-subtle text-white focus:border-industrial-orange' : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'}`}
                    value={formatTime(editTimeRange.end)}
                    onChange={(e) => {
                      const [min, sec] = e.target.value.split(':').map(Number);
                      if (!isNaN(min) && !isNaN(sec)) {
                        setEditTimeRange((prev) => ({ ...prev, end: min * 60 + sec }));
                      }
                    }}
                  />
                </div>
                <textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  placeholder="Edit your comment..."
                  className={`w-full px-2 py-1.5 border rounded mb-2 text-xs font-mono resize-none focus:outline-none transition-colors ${isDark ? 'bg-industrial-black-primary border-industrial-border-subtle text-white focus:border-industrial-orange' : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'}`}
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className={`px-3 py-1.5 text-[10px] uppercase tracking-industrial-wide font-mono font-bold border rounded hover-lift transition-all ${isDark ? 'text-industrial-white-secondary hover:text-white bg-industrial-black-primary border-industrial-border-subtle' : 'text-gray-600 hover:text-gray-900 bg-gray-100 border-gray-300'}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className={`px-3 py-1.5 text-[10px] uppercase tracking-industrial-wide font-mono font-bold border rounded hover-lift transition-all shadow-industrial-sm ${isDark ? 'text-black bg-industrial-orange border-industrial-orange/20' : 'text-white bg-blue-500 border-blue-600'}`}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[9px] uppercase tracking-industrial font-mono font-bold py-1 px-2 rounded ${isDark ? 'bg-industrial-black-tertiary text-industrial-white-tertiary' : 'bg-gray-100 text-gray-600'}`}>
                    {`${formatTime(comment.start_time)} — ${formatTime(comment.end_time)}`}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-industrial-black-tertiary' : 'hover:bg-gray-100'}`}
                      onClick={() => handleStartEdit(comment)}
                    >
                      <Edit2 className={`w-3.5 h-3.5 transition-colors ${isDark ? 'text-industrial-white-tertiary hover:text-industrial-orange' : 'text-gray-500 hover:text-blue-600'}`} />
                    </button>
                    <button
                      type="button"
                      className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-industrial-black-tertiary' : 'hover:bg-gray-100'}`}
                      onClick={() => onDeleteComment(String(comment.id))}
                    >
                      <Trash2 className={`w-3.5 h-3.5 transition-colors ${isDark ? 'text-industrial-white-tertiary hover:text-industrial-red' : 'text-gray-500 hover:text-red-600'}`} />
                    </button>
                  </div>
                </div>
                <div className={`rounded-lg border p-3 ${isDark ? 'border-industrial-border-subtle bg-industrial-black-tertiary' : 'border-gray-200 bg-gray-50'}`}>
                  <p className={`text-xs font-mono leading-relaxed ${isDark ? 'text-industrial-white-secondary' : 'text-gray-700'}`}>
                    {comment.comment}
                  </p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {!isAdding && (
        <button
          type="button"
          className={`mt-3 px-3 py-2.5 text-xs font-mono relative flex items-center justify-between rounded-lg cursor-pointer border transition-all hover-lift flex-shrink-0 ${isDark ? 'border-industrial-border bg-industrial-black-tertiary hover:border-industrial-orange/30' : 'border-gray-300 bg-gray-50 hover:border-blue-400'}`}
          onClick={() => setIsAdding(true)}
        >
          <span className={isDark ? 'text-industrial-white-secondary' : 'text-gray-700'}>
            Add comment at current time
          </span>
          <CirclePlus className={`w-4 h-4 ${isDark ? 'text-industrial-orange' : 'text-blue-500'}`} />
        </button>
      )}

      {footer ? <div className="mt-3 flex justify-end gap-2 flex-shrink-0">{footer}</div> : null}
    </div>
  );
};

export const ScreenshotEditor: React.FC<ScreenshotEditorProps & { isDark: boolean }> =
  function ScreenshotEditor({
    screenshots,
    onDeleteScreenshots,
    onUpdateLabel,
    currentIndex,
    onCurrentIndexChange,
    isDark,
  }) {
    const [zoomLevel, setZoomLevel] = useState(50);
    const [editingLabel, setEditingLabel] = useState(false);
    const [currentLabel, setCurrentLabel] = useState('');
    const labelInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (screenshots.length > 0 && screenshots[currentIndex]?.label !== undefined) {
        setCurrentLabel(screenshots[currentIndex].label || '');
      }
    }, [currentIndex, screenshots]);

    const handleSelect = (index: number) => {
      onCurrentIndexChange(index);
      setEditingLabel(false);
    };

    const handleLabelClick = () => {
      setEditingLabel(true);
      setTimeout(() => {
        labelInputRef.current?.focus();
      }, 0);
    };

    const handleLabelSubmit = () => {
      setEditingLabel(false);
      onUpdateLabel(currentIndex, currentLabel);
    };

    const handleLabelKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleLabelSubmit();
      } else if (e.key === 'Escape') {
        setEditingLabel(false);
        setCurrentLabel(screenshots[currentIndex]?.label || '');
      }
    };

    const handlePrevious = () => {
      onCurrentIndexChange(Math.max(0, currentIndex - 1));
    };

    const handleNext = () => {
      onCurrentIndexChange(Math.min(screenshots.length - 1, currentIndex + 1));
    };

    return (
      <div className={`relative aspect-video bg-black rounded-lg overflow-hidden border shadow-industrial ${isDark ? 'border-industrial-border' : 'border-gray-300'}`}>
        {screenshots.length > 0 && screenshots[currentIndex] && (
          <>
            <img
              src={screenshots[currentIndex].imageUrl}
              alt={`Screenshot ${currentIndex + 1}`}
              className="w-full h-full object-contain"
              style={{
                transform: `scale(${zoomLevel / 50})`,
                transformOrigin: 'center',
                transition: 'transform 0.2s ease-out',
              }}
            />


          </>
        )}

        {/* Navigation Overlay */}
        <div className="absolute inset-x-0 bottom-0 flex justify-between items-center p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className={`p-2 border rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed hover-lift ${isDark ? 'bg-industrial-black-secondary hover:bg-industrial-black-tertiary border-industrial-border' : 'bg-gray-100 hover:bg-gray-200 border-gray-300'}`}
          >
            <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-white' : 'text-black'}`} strokeWidth={1.5} />
          </button>
          <span className={`text-[10px] uppercase tracking-industrial-wide font-mono font-bold text-white px-4 py-2 rounded-lg border ${isDark ? 'bg-industrial-black-secondary border-industrial-border' : 'bg-gray-800 border-gray-700'}`}>
            {currentIndex + 1} / {screenshots.length}
          </span>
          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex === screenshots.length - 1}
            className={`p-2 border rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed hover-lift ${isDark ? 'bg-industrial-black-secondary hover:bg-industrial-black-tertiary border-industrial-border' : 'bg-gray-100 hover:bg-gray-200 border-gray-300'}`}
          >
            <ArrowRight className={`w-5 h-5 ${isDark ? 'text-white' : 'text-black'}`} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    );
  };

function Editor() {
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [originalScreenshots, setOriginalScreenshots] = useState<Screenshot[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingDeletions, setPendingDeletions] = useState<number[]>([]);
  const [comments, setComments] = useState<TimeRangeComment[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(0);
  // Controls the per-clip width in the timeline (smaller = more clips visible).
  const [timelineZoom, setTimelineZoom] = useState(50);
  const [commentToEdit, setCommentToEdit] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingClip, setIsDeletingClip] = useState(false);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const baseMinTimelineZoom = 25;
  const computedMinTimelineZoom =
    screenshots.length > 0 && timelineViewportWidth > 0
      ? Math.ceil(timelineViewportWidth / screenshots.length)
      : baseMinTimelineZoom;
  // Prevent zooming out so far that the timeline becomes narrower than the viewport (which creates a right-side gutter).
  const minTimelineZoom = Math.max(baseMinTimelineZoom, computedMinTimelineZoom);
  const maxTimelineZoom = Math.max(200, minTimelineZoom + 200);

  useEffect(() => {
    // Keep track of the available timeline viewport width so we can clamp zoom-out appropriately.
    const el = timelineScrollRef.current;
    if (!el) return undefined;

    const update = () => setTimelineViewportWidth(el.clientWidth);
    update();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => update());
      observer.observe(el);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    // If the viewport grows or screenshot count shrinks, clamp up so we never show blank space.
    setTimelineZoom((z) => (z < minTimelineZoom ? minTimelineZoom : z));
  }, [minTimelineZoom]);

  useEffect(() => {
    // Listen for load-editor events from the main process
    const loadEditorListener = window.electron?.ipcRenderer?.on?.(
      'load-editor',
      async (data: unknown) => {
        const { sessionId, recordings } = data as {
          sessionId: number;
          recordings: Recording[];
        };

        setCurrentSessionId(sessionId);
        // Convert recordings to screenshots format
        const convertedScreenshots = recordings.map((recording, index) => ({
          id: String(recording.id),
          timestamp: recording.timestamp,
          imageUrl: recording.screenshot,
          label: recording.label,
          time: index, // Use index as time in seconds
        }));
        setScreenshots(convertedScreenshots);
        setOriginalScreenshots(convertedScreenshots);
        setPendingDeletions([]);
        setHasUnsavedChanges(false);
        setSelectedIndices([]);
        setUndoStack([]);

        // Load comments
        try {
          const sessionComments = await window.electron?.ipcRenderer?.invoke?.(
            'get-session-comments',
            sessionId,
          ) as TimeRangeComment[];
          setComments(sessionComments || []);
        } catch (error) {
          console.error('Failed to load comments:', error);
          window.electron?.ipcRenderer?.sendMessage?.('show-error-notification', {
            title: 'Error',
            message: 'Failed to load comments',
          });
        }
      },
    );

    return () => {
      loadEditorListener?.();
    };
  }, []);

  // Load draft recordings on mount
  useEffect(() => {
    const loadDraftRecordings = async () => {
      if (screenshots.length > 0) return; // Already loaded

      try {
        if (window.electron?.ipcRenderer?.invoke) {
          // Try to get draft recordings
          const draftSessions = await window.electron.ipcRenderer.invoke('get-sessions') as Array<{
            id: number;
            approval_state: 'draft' | 'submitted' | 'approved' | 'rejected';
            session_status: 'passive' | 'tasked';
          }>;

          // Find the first draft session
          const draftSession = draftSessions?.find((session) => session.approval_state === 'draft');

          if (draftSession?.id) {
            // Load the draft session's recordings
            const recordings = await window.electron.ipcRenderer.invoke(
              'get-session-recordings',
              draftSession.id
            ) as Recording[];

            if (recordings && recordings.length > 0) {
              setCurrentSessionId(draftSession.id);
              const convertedScreenshots = recordings.map((recording, index) => ({
                id: String(recording.id),
                timestamp: recording.timestamp,
                imageUrl: recording.screenshot,
                label: recording.label,
                time: index, // Use index as time in seconds
              }));
              setScreenshots(convertedScreenshots);
              setOriginalScreenshots(convertedScreenshots);
              setPendingDeletions([]);
              setHasUnsavedChanges(false);
              setSelectedIndices([]);
              setUndoStack([]);

              // Load comments for the draft session
              try {
                const sessionComments = await window.electron.ipcRenderer.invoke(
                  'get-session-comments',
                  draftSession.id,
                ) as TimeRangeComment[];
                setComments(sessionComments || []);
              } catch (error) {
                console.error('Failed to load draft comments:', error);
              }
              return;
            }
          }
        }

        // If no draft found or in browser, load demo screenshots
        const demoScreenshots: Screenshot[] = [
          {
            id: '1',
            timestamp: '2023-01-01 10:00:00',
            imageUrl: 'https://picsum.photos/800/600?random=1',
            label: 'Home Screen',
            time: 0,
          },
          {
            id: '2',
            timestamp: '2023-01-01 10:01:30',
            imageUrl: 'https://picsum.photos/800/600?random=2',
            label: 'Settings Menu',
            time: 1,
          },
          {
            id: '3',
            timestamp: '2023-01-01 10:03:15',
            imageUrl: 'https://picsum.photos/800/600?random=3',
            label: 'User Profile',
            time: 2,
          }
        ];
        setScreenshots(demoScreenshots);
        setOriginalScreenshots(demoScreenshots);
      } catch (error) {
        console.error('Failed to load draft recordings:', error);
      }
    };

    loadDraftRecordings();
  }, []);

  const handleDeleteScreenshots = async (indices: number[]) => {
    if (!currentSessionId) return;

    // Add to pending deletions - filter out invalid indices
    const newPendingDeletions = indices
      .filter((index) => index >= 0 && index < screenshots.length && screenshots[index])
      .map((index) => Number(screenshots[index].id));
    if (newPendingDeletions.length === 0) return;

    setUndoStack((prev) => [
      ...prev,
      {
        type: 'recordingDeletion',
        screenshots: [...screenshots],
        pendingDeletions: [...pendingDeletions],
        selectedIndices: [...selectedIndices],
        currentIndex,
      },
    ]);
    setPendingDeletions((prev) => [...prev, ...newPendingDeletions]);

    // Update UI
    const newScreenshots = screenshots.filter((_, index) => !indices.includes(index));
    setScreenshots(newScreenshots);

    // Adjust current index if it's out of bounds
    if (currentIndex >= newScreenshots.length && newScreenshots.length > 0) {
      setCurrentIndex(newScreenshots.length - 1);
    } else if (newScreenshots.length === 0) {
      setCurrentIndex(0);
    }

    setHasUnsavedChanges(true);
  };

  const handleUpdateLabel = async (index: number, label: string) => {
    if (index < 0 || index >= screenshots.length) return;

    const recordingId = Number(screenshots[index].id);
    try {
      if (window.electron?.ipcRenderer?.invoke) {
        const result = await window.electron.ipcRenderer.invoke(
          'update-recording-label' as const,
          {
            recordingId,
            label,
          },
        );

        if (result) {
          // Update local state
          setScreenshots((prev) =>
            prev.map((s, i) => (i === index ? { ...s, label } : s)),
          );
        }
      } else {
        // For demo without electron
        setScreenshots((prev) =>
          prev.map((s, i) => (i === index ? { ...s, label } : s)),
        );
      }
    } catch (error) {
      console.error('Failed to update label:', error);
      if (window.electron?.ipcRenderer?.sendMessage) {
        window.electron.ipcRenderer.sendMessage('show-error-notification', {
          title: 'Error',
          message: 'Failed to update label',
        });
      }
    }
  };

  const handleSelectAll = () => {
    setSelectedIndices(
      Array.from({ length: screenshots.length }, (_, i) => i),
    );
  };

  const handleClearSelection = () => {
    setSelectedIndices([]);
  };

  const handleSelect = (index: number) => {
    setCurrentIndex(index);
  };

  const handleSelectionChange = (indices: number[]) => {
    setSelectedIndices(indices);
  };

  const handleSave = async (): Promise<boolean> => {
    if (!currentSessionId) return false;

    try {
      // Delete all recordings in parallel using Promise.all
      if (window.electron?.ipcRenderer?.invoke) {
        const deletePromises = pendingDeletions.map((recordingId) =>
          window.electron.ipcRenderer.invoke('delete-recording', {
            sessionId: currentSessionId,
            recordingId,
          }),
        );

        await Promise.all(deletePromises);
      }

      // Clear pending changes
      setPendingDeletions([]);
      setHasUnsavedChanges(false);
      setOriginalScreenshots(screenshots);
      // After persisting deletions, we can no longer undo them.
      setUndoStack((prev) => prev.filter((a) => a.type === 'commentDeletion'));

      // Show success message
      window.electron?.ipcRenderer?.sendMessage?.('show-success-notification', {
        title: 'Success',
        message: 'Changes saved successfully',
      });

      return true;
    } catch (error) {
      console.error('Failed to save changes:', error);
      // Show error message
      window.electron?.ipcRenderer?.sendMessage?.('show-error-notification', {
        title: 'Error',
        message: 'Failed to save changes',
      });
      return false;
    }
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) return;

    const action = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    if (action.type === 'recordingDeletion') {
      setScreenshots(action.screenshots);
      setPendingDeletions(action.pendingDeletions);
      setSelectedIndices(action.selectedIndices);
      setCurrentIndex(action.currentIndex);
      setHasUnsavedChanges(action.pendingDeletions.length > 0);
      return;
    }

    // Comment deletion undo: recreate the comment in the DB and reinsert in the UI.
    try {
      const commentToRestore: TimeRangeComment = {
        session_id: action.comment.session_id,
        start_time: action.comment.start_time,
        end_time: action.comment.end_time,
        comment: action.comment.comment,
        created_at: action.comment.created_at,
      };

      if (window.electron?.ipcRenderer?.invoke) {
        const newId = (await window.electron.ipcRenderer.invoke(
          'create-comment',
          {
            ...commentToRestore,
            id: Date.now(), // temporary UI id; DB returns the real id
          },
        )) as number;

        setComments((prev) => {
          const next = [...prev];
          const insertAt = Math.min(Math.max(action.insertIndex, 0), next.length);
          next.splice(insertAt, 0, { ...commentToRestore, id: newId });
          return next;
        });
      } else {
        // Demo mode: just reinsert locally
        setComments((prev) => {
          const next = [...prev];
          const insertAt = Math.min(Math.max(action.insertIndex, 0), next.length);
          next.splice(insertAt, 0, { ...commentToRestore, id: Date.now() });
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to undo comment deletion:', error);
      window.electron?.ipcRenderer?.sendMessage?.('show-error-notification', {
        title: 'Error',
        message: 'Failed to undo deletion',
      });
    }
  };

  const handleDeleteClip = async () => {
    if (!currentSessionId || isDeletingClip) return;

    try {
      setIsDeletingClip(true);

      let confirmed = false;
      if (window.electron?.ipcRenderer?.invoke) {
        confirmed = (await window.electron.ipcRenderer.invoke(
          'show-delete-confirmation',
          {
            title: 'Delete Clip',
            message:
              'This will permanently delete this clip and all associated recordings. Continue?',
          },
        )) as boolean;
      } else {
        confirmed = window.confirm(
          'This will permanently delete this clip and all associated recordings. Continue?',
        );
      }

      if (!confirmed) return;

      if (window.electron?.ipcRenderer?.invoke) {
        await window.electron.ipcRenderer.invoke('delete-session', currentSessionId);
      }

      // Reset local state and return to dashboard
      setScreenshots([]);
      setOriginalScreenshots([]);
      setPendingDeletions([]);
      setHasUnsavedChanges(false);
      setComments([]);
      setCurrentSessionId(null);
      setSelectedIndices([]);
      setUndoStack([]);

      window.electron?.ipcRenderer?.sendMessage?.('show-success-notification', {
        title: 'Deleted',
        message: 'Clip deleted successfully',
      });

      navigate('/');
    } catch (error) {
      console.error('Failed to delete clip:', error);
      window.electron?.ipcRenderer?.sendMessage?.('show-error-notification', {
        title: 'Error',
        message: 'Failed to delete clip',
      });
    } finally {
      setIsDeletingClip(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentSessionId || isSubmitting) return;

    try {
      setIsSubmitting(true);

      // If there are pending deletions, save them before submitting.
      if (pendingDeletions.length > 0) {
        const saved = await handleSave();
        if (!saved) return;
      }

      const result = await window.electron?.ipcRenderer?.invoke?.(
        'submit-session',
        currentSessionId,
      );

      if (result?.success) {
        window.electron?.ipcRenderer?.sendMessage?.('show-success-notification', {
          title: 'Submitted',
          message: `Session submitted successfully! +${result.pointsEarned || 0} points earned`,
        });
        navigate('/');
      } else {
        window.electron?.ipcRenderer?.sendMessage?.('show-error-notification', {
          title: 'Error',
          message: result?.error || 'Failed to submit session',
        });
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      window.electron?.ipcRenderer?.sendMessage?.('show-error-notification', {
        title: 'Error',
        message: error?.message || 'Failed to submit session',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      // Show confirmation dialog
      if (window.electron?.ipcRenderer?.invoke) {
        window.electron.ipcRenderer
          .invoke('show-delete-confirmation', {
            title: 'Unsaved Changes',
            message: 'You have unsaved changes. Do you want to discard them?',
          })
          .then((value: unknown) => {
            const confirmed = Boolean(value);
            if (confirmed) {
              navigate('/');
            }
            return confirmed;
          })
          .catch((error) => {
            console.error('Error showing confirmation dialog:', error);
            return false;
          });
      } else {
        // Fallback for browser environment
        const confirmed = window.confirm(
          'You have unsaved changes. Do you want to discard them?',
        );
        if (confirmed) {
          navigate('/');
        }
      }
    } else {
      navigate('/');
    }
  };

  const handleAddComment = async (startTime: number, endTime: number, comment: string) => {
    if (!currentSessionId) {
      // Use a default session ID for demo if none is provided
      setCurrentSessionId(1);
    }

    const sessionId = currentSessionId || 1;

    const newComment: TimeRangeComment = {
      id: Date.now(), // Temporary ID for UI
      session_id: sessionId,
      start_time: startTime,
      end_time: endTime,
      comment,
      created_at: new Date().toISOString(),
    };

    try {
      if (window.electron?.ipcRenderer?.invoke) {
        const commentId = await window.electron.ipcRenderer.invoke(
          'create-comment',
          newComment,
        ) as number;
        setComments(prev => [...prev, { ...newComment, id: commentId }]);
      } else {
        // For demo purposes
        const commentId = Date.now();
        setComments(prev => [...prev, { ...newComment, id: commentId }]);
      }
    } catch (error) {
      console.error('Failed to create comment:', error);
      if (window.electron?.ipcRenderer?.sendMessage) {
        window.electron.ipcRenderer.sendMessage('show-error-notification', {
          title: 'Error',
          message: 'Failed to create comment',
        });
      }
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const numericId = Number(commentId);
      const deleteIndex = comments.findIndex((c) => c.id === numericId);
      const commentToDelete = deleteIndex >= 0 ? comments[deleteIndex] : undefined;

      if (window.electron?.ipcRenderer?.invoke) {
        await window.electron.ipcRenderer.invoke(
          'delete-comment',
          numericId,
        );
      }

      // Update state regardless of API call
      setComments(prev => prev.filter(c => c.id !== numericId));

      if (commentToDelete) {
        setUndoStack((prev) => [
          ...prev,
          { type: 'commentDeletion', comment: commentToDelete, insertIndex: deleteIndex },
        ]);
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      if (window.electron?.ipcRenderer?.sendMessage) {
        window.electron.ipcRenderer.sendMessage('show-error-notification', {
          title: 'Error',
          message: 'Failed to delete comment',
        });
      }
    }
  };

  const handleUpdateComment = async (commentId: number, startTime: number, endTime: number, comment: string) => {
    try {
      if (window.electron?.ipcRenderer?.invoke) {
        await window.electron.ipcRenderer.invoke(
          'update-comment',
          commentId,
          {
            start_time: startTime,
            end_time: endTime,
            comment,
          },
        );
      }

      // Update state
      setComments(prev => prev.map(c =>
        c.id === commentId
          ? { ...c, start_time: startTime, end_time: endTime, comment }
          : c
      ));
    } catch (error) {
      console.error('Failed to update comment:', error);
      if (window.electron?.ipcRenderer?.sendMessage) {
        window.electron.ipcRenderer.sendMessage('show-error-notification', {
          title: 'Error',
          message: 'Failed to update comment',
        });
      }
    }
  };

  const handleCommentTimelineClick = (comment: TimeRangeComment) => {
    if (comment.id !== undefined) {
      setCommentToEdit(comment.id);
      // Reset after a short delay to allow re-clicking the same comment
      setTimeout(() => setCommentToEdit(null), 100);
    }
  };

  return (
    <main className={`min-h-screen ${isDark ? 'bg-industrial-black-primary' : 'bg-white'}`}>
      <div className="py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4 sm:self-start sm:pt-1">
            <h1 className={`text-2xl font-mono font-light tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              EDITOR
            </h1>
          </div>
          <div className="flex gap-2 min-h-[38px] items-center">
            <button
              type="button"
              onClick={handleDeleteClip}
              disabled={!currentSessionId || isDeletingClip}
              className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-industrial-wide font-mono font-bold transition-all hover-lift disabled:opacity-50 disabled:cursor-not-allowed hover:text-industrial-red ${
                isDark
                  ? 'bg-industrial-black-secondary border border-industrial-border text-industrial-white-secondary hover:border-industrial-red/30'
                  : 'bg-white border border-gray-300 text-gray-700 hover:border-red-300'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 inline mr-1.5" strokeWidth={1.5} />
              Delete
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!currentSessionId || isSubmitting}
              className={`px-4 py-2 text-[10px] uppercase tracking-industrial-wide font-mono font-bold rounded-lg hover-lift transition-all shadow-industrial-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark
                  ? 'text-black bg-industrial-orange hover:bg-industrial-orange/90 border border-industrial-orange/20'
                  : 'text-white bg-blue-500 hover:bg-blue-600 border border-blue-600'
              }`}
            >
              <Send className="w-3.5 h-3.5 inline mr-1.5" strokeWidth={1.5} />
              Submit
            </button>
          </div>
        </div>

        <div className="flex gap-6 mb-6">
          {/* Screenshot Editor Section */}
          <div className="flex-1">
            <ScreenshotEditor
              screenshots={screenshots}
              onDeleteScreenshots={handleDeleteScreenshots}
              onUpdateLabel={handleUpdateLabel}
              currentIndex={currentIndex}
              onCurrentIndexChange={handleSelect}
              isDark={isDark}
            />
          </div>

          {/* Comment Sidebar */}
          <CommentSidebar
            comments={comments}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
            onUpdateComment={handleUpdateComment}
            commentToEdit={commentToEdit}
            currentTime={
              selectedIndices.length > 0
                ? screenshots[Math.min(...selectedIndices)]?.time ?? Math.min(...selectedIndices)
                : screenshots[currentIndex]?.time ?? currentIndex
            }
            endTime={
              selectedIndices.length > 1
                ? screenshots[Math.max(...selectedIndices)]?.time ?? Math.max(...selectedIndices)
                : screenshots[currentIndex + 1]?.time ?? (screenshots[currentIndex]?.time ?? currentIndex) + 1
            }
            isDark={isDark}
            footer={
              <>
                <button
                  type="button"
                  onClick={() => void handleUndo()}
                  disabled={undoStack.length === 0}
                  className={`px-4 py-2 text-[10px] uppercase tracking-industrial-wide font-mono font-bold rounded-lg hover-lift transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark
                      ? 'text-industrial-white-secondary hover:text-white bg-industrial-black-secondary border border-industrial-border'
                      : 'text-gray-600 hover:text-gray-900 bg-gray-100 border border-gray-300'
                  }`}
                >
                  <Undo2 className="w-3.5 h-3.5 inline mr-1.5" strokeWidth={1.5} />
                  Undo
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={pendingDeletions.length === 0 || !currentSessionId}
                  className={`px-4 py-2 text-[10px] uppercase tracking-industrial-wide font-mono font-bold rounded-lg hover-lift transition-all shadow-industrial-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark
                      ? 'text-black bg-industrial-orange hover:bg-industrial-orange/90 border border-industrial-orange/20'
                      : 'text-white bg-blue-500 hover:bg-blue-600 border border-blue-600'
                  }`}
                  title={pendingDeletions.length > 0 ? 'Save pending deletions' : 'No pending deletions'}
                >
                  <Save className="w-3.5 h-3.5 inline mr-1.5" strokeWidth={1.5} />
                  Save Changes
                </button>
              </>
            }
          />
        </div>

        {/* Timeline Controls */}
        <div className={`border rounded-lg ${isDark ? 'border-industrial-border bg-industrial-black-secondary' : 'border-gray-200 bg-white'}`}>
          <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-industrial-border-subtle' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`px-3 py-2 text-[10px] uppercase tracking-industrial-wide font-mono font-bold border rounded-lg transition-all hover-lift disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? 'text-industrial-white-secondary hover:text-white hover:bg-industrial-black-tertiary border-industrial-border-subtle' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-gray-300'}`}
                onClick={() => handleDeleteScreenshots(selectedIndices)}
                disabled={selectedIndices.length === 0}
              >
                <Trash2 className="w-3.5 h-3.5 inline mr-1.5" strokeWidth={1.5} />
                Delete
              </button>

              <button
                type="button"
                className={`px-3 py-2 text-[10px] uppercase tracking-industrial-wide font-mono font-bold border rounded-lg transition-all hover-lift ${isDark ? 'text-industrial-white-secondary hover:text-white hover:bg-industrial-black-tertiary border-industrial-border-subtle' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-gray-300'}`}
                onClick={handleSelectAll}
              >
                <LayoutGrid className="w-3.5 h-3.5 inline mr-1.5" strokeWidth={1.5} />
                Select All
              </button>

              <button
                type="button"
                className={`px-3 py-2 text-[10px] uppercase tracking-industrial-wide font-mono font-bold border rounded-lg transition-all hover-lift disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? 'text-industrial-white-secondary hover:text-white hover:bg-industrial-black-tertiary border-industrial-border-subtle' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-gray-300'}`}
                onClick={handleClearSelection}
                disabled={selectedIndices.length === 0}
              >
                Clear
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span className={`text-[10px] uppercase tracking-industrial-wide font-mono font-bold ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                Zoom
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTimelineZoom((v) => Math.max(minTimelineZoom, v - 10))}
                  className={`p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? 'hover:bg-industrial-black-tertiary' : 'hover:bg-gray-100'}`}
                  aria-label="Zoom out timeline"
                  disabled={timelineZoom <= minTimelineZoom}
                >
                  <ZoomOut className={`w-4 h-4 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`} strokeWidth={1.5} />
                </button>
                <input
                  type="range"
                  min={minTimelineZoom}
                  max={maxTimelineZoom}
                  value={timelineZoom}
                  onChange={(e) => setTimelineZoom(Number(e.target.value))}
                  className={`w-32 h-1 rounded-full appearance-none border [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border ${isDark ? 'bg-industrial-black-tertiary border-industrial-border-subtle [&::-webkit-slider-thumb]:bg-industrial-orange [&::-webkit-slider-thumb]:border-industrial-orange/20' : 'bg-gray-200 border-gray-300 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-blue-600'}`}
                  aria-label="Zoom level"
                />
                <button
                  type="button"
                  onClick={() => setTimelineZoom((v) => Math.min(maxTimelineZoom, v + 10))}
                  className={`p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? 'hover:bg-industrial-black-tertiary' : 'hover:bg-gray-100'}`}
                  aria-label="Zoom in timeline"
                  disabled={timelineZoom >= maxTimelineZoom}
                >
                  <ZoomIn className={`w-4 h-4 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>

          <div className="relative">
            <div
              ref={timelineScrollRef}
              className={`relative overflow-x-auto hide-scrollbar show-scrollbar-on-hover border ${
                isDark
                  ? 'bg-industrial-black-tertiary border-industrial-border-subtle'
                  : 'bg-gray-100 border-gray-300'
              }`}
            >
              <div
                className="relative"
                style={{
                  width:
                    screenshots.length > 0 ? screenshots.length * timelineZoom : '100%',
                }}
              >
                <ScreenshotTimeline
                  screenshots={screenshots}
                  selectedIndices={selectedIndices}
                  currentIndex={currentIndex}
                  onSelect={handleSelect}
                  onSelectionChange={handleSelectionChange}
                  isDark={isDark}
                />
                <CommentIndicatorTimeline
                  comments={comments}
                  screenshots={screenshots}
                  isDark={isDark}
                  onCommentClick={handleCommentTimelineClick}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Editor;
