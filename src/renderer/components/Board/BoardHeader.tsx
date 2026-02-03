import { useTheme } from '../../contexts/ThemeContext';

const BoardHeader = () => {
    const { isDark } = useTheme();

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4 sm:self-start sm:pt-1">
                <h1 className={`text-2xl font-mono font-light tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>MY BOARD</h1>
            </div>
            <div className="flex gap-2 min-h-[38px] items-center">
            </div>
        </div>
    );
};

export default BoardHeader;
