import React from 'react';
import { useNavigate } from 'react-router-dom';
import deleteIcon from '../../../../assets/icons/delete.svg';
import { useTheme } from '../../contexts/ThemeContext';

interface RecordingCardProps {
  title: string;
  date: string;
  type: string;
  thumbnail: string;
  sessionId: number;
  onDelete?: () => void;
  approvalState?: 'draft' | 'submitted' | 'approved' | 'rejected';
  footerAction?: React.ReactNode;
}

function RecordingCard({
  title,
  date,
  type,
  thumbnail,
  sessionId,
  onDelete,
  approvalState = 'draft',
  footerAction,
}: RecordingCardProps) {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const isSubmitted = approvalState !== 'draft';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    onDelete?.();
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
        <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-industrial-wide font-mono ${isDark ? 'bg-black/90 border border-industrial-border-subtle text-white' : 'bg-white/90 border border-gray-300 text-gray-700'}`}>
          {type === 'tasked' ? 'Task' : 'Passive'}
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
      <div className={`p-2.5 border-t ${isDark ? 'border-industrial-border-subtle' : 'border-gray-200'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className={`text-[11px] font-mono mb-1 line-clamp-1 tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h4>
          </div>
          <span />
        </div>
        <div className="mt-1 flex items-end justify-between">
          <span className={`text-[9px] font-mono ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
            {date}
          </span>
          {footerAction ? <div className="flex justify-end pointer-events-auto">{footerAction}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default RecordingCard;
