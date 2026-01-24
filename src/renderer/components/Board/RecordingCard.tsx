import React from 'react';
import { useNavigate } from 'react-router-dom';
import deleteIcon from '../../../../assets/icons/delete.svg';
import pointsIcon from '../../../../assets/icons/points.svg';
import { useTheme } from '../../contexts/ThemeContext';

interface RecordingCardProps {
  title: string;
  date: string;
  points: number;
  duration: string;
  type: string;
  thumbnail: string;
  sessionId: number;
  onDelete?: () => void;
  approvalState?: 'draft' | 'submitted' | 'approved' | 'rejected';
}

function RecordingCard({
  title,
  date,
  points,
  duration,
  type,
  thumbnail,
  sessionId,
  onDelete,
  approvalState = 'draft',
}: RecordingCardProps) {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const isSubmitted = approvalState !== 'draft';

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    const confirmed = await window.electron.ipcRenderer.invoke(
      'show-delete-confirmation',
      {
        title: 'Delete Recording',
        message: 'Are you sure you want to delete this recording?',
      },
    );

    if (confirmed && onDelete) {
      onDelete();
    }
  };

  const handleClick = async () => {
    // Prevent opening submitted recordings
    if (isSubmitted) return;

    // Navigate to editor with session ID
    await window.electron.ipcRenderer.invoke('show-editor', sessionId);
    navigate('/editor');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={isSubmitted ? -1 : 0}
      className={`rounded-lg transition-all group overflow-hidden ${isSubmitted ? 'cursor-default opacity-75' : 'cursor-pointer hover-lift'} ${isDark ? 'shadow-industrial bg-industrial-black-secondary border border-industrial-border' : 'bg-white border border-gray-200'} ${!isSubmitted && (isDark ? 'hover:border-industrial-border' : 'hover:border-gray-300 hover:bg-gray-50')}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className={`relative w-full aspect-[16/10] overflow-hidden ${isDark ? 'bg-black' : 'bg-gray-100'}`}>
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-contain opacity-90"
        />
        <div className={`absolute bottom-2 right-2 px-2 py-1 rounded text-[10px] font-mono tracking-industrial ${isDark ? 'bg-black/90 text-white border border-industrial-border-subtle' : 'bg-white/90 text-gray-900 border border-gray-300'}`}>
          {duration}
        </div>
        <button
          className={`absolute top-2 right-2 p-1.5 rounded border transition-colors ${isDark ? 'bg-black/90 border-industrial-border-subtle hover:bg-industrial-red' : 'bg-white/90 border-gray-300 hover:bg-red-500'}`}
          type="button"
          onClick={handleDelete}
          aria-label="Delete recording"
        >
          <img src={deleteIcon} alt="" className={`w-3.5 h-3.5 ${isDark ? 'invert brightness-0' : ''}`} />
        </button>
      </div>
      <div className={`p-3 border-t ${isDark ? 'border-industrial-border-subtle' : 'border-gray-200'}`}>
        <h4 className={`text-[11px] font-mono mb-2 line-clamp-1 tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h4>
        <div className={`flex items-center gap-2 text-[9px] ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
          <div className="flex items-center gap-1">
            <img src={pointsIcon} alt="" className="w-2.5 h-2.5 opacity-40" />
            <span className="font-mono uppercase tracking-industrial">{points} PTS</span>
          </div>
          <div className={`w-1 h-1 rounded-full ${isDark ? 'bg-industrial-white-tertiary' : 'bg-gray-400'}`} />
          <div className="flex items-center">
            <span className="font-mono">{date}</span>
          </div>
          <div className="flex items-center ml-auto">
            <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-industrial-wide font-mono ${isDark ? 'bg-industrial-black-tertiary border border-industrial-border-subtle' : 'bg-gray-100 border border-gray-300 text-gray-700'}`}>
              {type === 'tasked' ? 'Task' : 'Passive'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecordingCard;
