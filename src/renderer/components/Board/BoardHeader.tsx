import { useTheme } from '../../contexts/ThemeContext';

const BoardHeader = () => {
    const { isDark } = useTheme();

    return (
        <div className='py-6'>
            <h1 className={`text-2xl font-mono font-light tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>MY BOARD</h1>
        </div>
    );
};

export default BoardHeader;