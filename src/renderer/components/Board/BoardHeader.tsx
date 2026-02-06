import { useTheme } from '../../contexts/ThemeContext';

export type BoardViewMode = 'preview' | 'list';

interface BoardHeaderProps {
    viewMode: BoardViewMode;
    onViewModeChange: (mode: BoardViewMode) => void;
}

const BoardHeader = ({ viewMode, onViewModeChange }: BoardHeaderProps) => {
    const { isDark } = useTheme();

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4 sm:self-start sm:pt-1">
                <h1 className={`text-2xl font-mono font-light tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <span className="inline-flex items-baseline gap-1.5">
                        <span>MY</span>
                        <span>BOARD</span>
                    </span>
                </h1>
            </div>
            <div className="flex gap-2 min-h-[38px] items-center">
                <div
                    className={`rounded-lg p-1 w-auto border ${
                        isDark
                            ? 'bg-industrial-black-secondary border-industrial-border'
                            : 'bg-gray-100 border-gray-300'
                    }`}
                >
                    <div className="flex gap-1">
                        {(['preview', 'list'] as const).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => onViewModeChange(mode)}
                                aria-pressed={viewMode === mode}
                                className={`py-2 px-4 text-[10px] uppercase tracking-industrial-wide font-mono font-bold rounded-md transition-all focus:outline-none active:scale-95 ${
                                    viewMode === mode
                                        ? isDark
                                            ? 'bg-industrial-black-tertiary text-white border border-industrial-border'
                                            : 'bg-white text-gray-900 border border-gray-300'
                                        : isDark
                                            ? 'text-industrial-white-tertiary hover:text-industrial-white-secondary border border-transparent'
                                            : 'text-gray-600 hover:text-gray-900 border border-transparent'
                                }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BoardHeader;
