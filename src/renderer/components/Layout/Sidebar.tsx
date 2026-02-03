import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LineChart,
  ListTodo,
  LayoutDashboard,
  Bell,
  Settings,
  HelpCircle,
  FileText,
  ChevronRight,
  LucideIcon,
  Edit3,
  Moon,
  Sun,
  LogOut,
  Award,
} from 'lucide-react';
import passiveModeIcon from '../../../../assets/icons/passive_mode.svg';
import logo from '../../../../assets/images/logo.png';
import pfp from '../../../../assets/images/pfp.png';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

// Define type for navigation items
interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

function Sidebar() {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { profile, signOut } = useAuth();

  const navItems: NavItem[] = [
    { icon: LineChart, label: 'Analytics', path: '/analytics' },
    { icon: ListTodo, label: 'Task List', path: '/tasks' },
    { icon: LayoutDashboard, label: 'My Board', path: '/' },
    { icon: Edit3, label: 'Editor', path: '/editor' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
  ];

  // Set initial active tab based on current path
  const getInitialActiveTab = () => {
    const currentPath = location.pathname;
    const matchingItem = navItems.find((item) => item.path === currentPath);
    return matchingItem ? matchingItem.label : 'My Board';
  };

  const [activeTab, setActiveTab] = useState(getInitialActiveTab());

  const handleStartPassiveMode = async () => {
    try {
      await window.electron.ipcRenderer.invoke('start-passive-mode');
    } catch (error) {
      console.error('Failed to start passive mode:', error);
    }
  };

  // Handle route changes
  useEffect(() => {
    const currentPath = location.pathname;
    const matchingItem = navItems.find((item) => item.path === currentPath);
    if (matchingItem) {
      setActiveTab(matchingItem.label);
    }
  }, [location.pathname]);

  return (
    <aside className={`w-[200px] pt-[38px] h-screen flex flex-col sticky top-0 overflow-hidden ${isDark ? 'bg-industrial-black-secondary border-r border-industrial-border-subtle' : 'bg-gray-50 border-r border-gray-200'}`}>
      {/* Logo */}
      <div className="flex items-center px-4 mb-12 gap-2 mt-4 ml-6">
        <img src={logo} className="h-8 w-auto object-contain" alt="Logo" />
        <span className={`text-2xl font-bold tracking-tight uppercase ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Relic
        </span>
      </div>

      {/* Navigation */}
      <nav className="space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.label;
          return (
            <Link
              to={item.path}
              key={item.label}
              onClick={() => setActiveTab(item.label)}
              className={`
                flex items-center px-3 py-2.5 rounded-lg
                transition-all duration-200 cursor-pointer relative
                group hover-lift
                ${isActive
                  ? isDark
                    ? 'bg-industrial-black-tertiary border border-industrial-border'
                    : 'bg-white border border-blue-200'
                  : isDark
                    ? 'border border-transparent hover:border-industrial-border-subtle'
                    : 'border border-transparent hover:border-gray-300'
                }
              `}
            >
              {/* Left accent bar for active state */}
              {isActive && (
                <div className={`absolute left-0 top-1 bottom-1 w-1 rounded-r ${isDark ? 'bg-industrial-orange' : 'bg-blue-500'}`} />
              )}

              <item.icon
                className={`w-4 h-4 mr-3 ${isActive ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-industrial-white-tertiary' : 'text-gray-500')}`}
                strokeWidth={1.5}
              />
              <span className={`
                text-[11px] uppercase tracking-industrial font-mono font-semibold
                ${isActive ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-industrial-white-secondary' : 'text-gray-600')}
              `}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className={`my-8 mx-4 border-t ${isDark ? 'border-industrial-border-subtle' : 'border-gray-200'}`} />

      {/* Start Passive Mode Button */}
      <button
        className={`mx-2 rounded-lg p-3 flex items-center border shadow-industrial hover-lift transition-all duration-200 hover:shadow-industrial-lg ${isDark ? 'bg-industrial-orange text-black border-industrial-orange/20' : 'bg-blue-500 text-white border-blue-600'}`}
        onClick={handleStartPassiveMode}
      >
        <div className={`w-7 h-7 rounded-md flex items-center justify-center mr-2.5 flex-shrink-0 ${isDark ? 'bg-black/10' : 'bg-white/20'}`}>
          <img
            src={passiveModeIcon}
            alt=""
            className="w-4 h-4 opacity-90"
            style={isDark ? {} : { filter: 'brightness(0) invert(1)' }}
          />
        </div>
        <div className="text-left">
          <p className={`text-[10px] uppercase tracking-industrial-wide font-mono font-bold mb-0.5 ${isDark ? 'text-black' : 'text-white'}`}>
            Start Passive
          </p>
          <p className={`text-[9px] leading-tight ${isDark ? 'text-black/70' : 'text-white/80'}`}>
            Earn while working
          </p>
        </div>
      </button>

      {/* Theme Toggle */}
      <div className="mt-auto px-2 mb-3">
        <button
          type="button"
          onClick={toggleTheme}
          className={`w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200 group ${isDark ? 'hover:bg-industrial-black-tertiary bg-industrial-black-primary border border-industrial-border-subtle' : 'hover:bg-gray-200 bg-white border border-gray-300'}`}
        >
          {isDark ? (
            <Sun className={`w-4 h-4 mr-2.5 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-600'}`} strokeWidth={1.5} />
          ) : (
            <Moon className={`w-4 h-4 mr-2.5 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-600'}`} strokeWidth={1.5} />
          )}
          <span className={`text-[10px] uppercase tracking-industrial font-mono font-semibold ${isDark ? 'text-industrial-white-tertiary group-hover:text-industrial-white-secondary' : 'text-gray-600 group-hover:text-gray-900'}`}>
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>
      </div>

      {/* Support Links */}
      <div className="px-2 mb-4">
        <Link
          to="#"
          className={`flex items-center px-3 py-2 rounded-lg transition-colors duration-200 group ${isDark ? 'hover:bg-industrial-black-tertiary' : 'hover:bg-gray-200'}`}
        >
          <HelpCircle className={`w-4 h-4 mr-2.5 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`} strokeWidth={1.5} />
          <span className={`text-[10px] uppercase tracking-industrial font-mono font-semibold ${isDark ? 'text-industrial-white-tertiary group-hover:text-industrial-white-secondary' : 'text-gray-600 group-hover:text-gray-900'}`}>
            Support
          </span>
        </Link>
        <Link
          to="#"
          className={`flex items-center px-3 py-2 rounded-lg transition-colors duration-200 group ${isDark ? 'hover:bg-industrial-black-tertiary' : 'hover:bg-gray-200'}`}
        >
          <FileText className={`w-4 h-4 mr-2.5 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`} strokeWidth={1.5} />
          <span className={`text-[10px] uppercase tracking-industrial font-mono font-semibold ${isDark ? 'text-industrial-white-tertiary group-hover:text-industrial-white-secondary' : 'text-gray-600 group-hover:text-gray-900'}`}>
            Docs
          </span>
        </Link>
      </div>

      {/* User Profile */}
      <div className={`px-2 py-3 border-t mb-2 ${isDark ? 'border-industrial-border-subtle' : 'border-gray-200'}`}>
        {/* User info */}
        <div className={`px-3 py-2 mb-2 rounded-lg ${isDark ? 'bg-industrial-black-tertiary border border-industrial-border' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center mb-2">
            <img src={pfp} alt="" className={`w-7 h-7 rounded-md mr-2.5 flex-shrink-0 border ${isDark ? 'border-industrial-border-subtle' : 'border-gray-300'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] font-mono font-bold uppercase tracking-wide truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {profile?.username || 'User'}
              </p>
            </div>
          </div>
          {/* Points display */}
          <div className={`flex items-center justify-between pt-2 border-t ${isDark ? 'border-industrial-border' : 'border-gray-200'}`}>
            <div className="flex items-center gap-1.5">
              <Award className={`w-3.5 h-3.5 ${isDark ? 'text-industrial-orange' : 'text-blue-500'}`} strokeWidth={1.5} />
              <span className={`text-[9px] font-mono uppercase tracking-wide ${isDark ? 'text-industrial-white-secondary' : 'text-gray-600'}`}>
                Points
              </span>
            </div>
            <span className={`text-[11px] font-mono font-bold ${isDark ? 'text-industrial-orange' : 'text-blue-600'}`}>
              {profile?.points_earned?.toLocaleString() || '0'}
            </span>
          </div>
        </div>

        {/* Sign out button */}
        <button
          type="button"
          onClick={signOut}
          className={`w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200 group ${isDark ? 'hover:bg-red-500/10 border border-transparent hover:border-red-500/30' : 'hover:bg-red-50 border border-transparent hover:border-red-200'}`}
        >
          <LogOut className={`w-4 h-4 mr-2.5 ${isDark ? 'text-red-400 group-hover:text-red-300' : 'text-red-600 group-hover:text-red-700'}`} strokeWidth={1.5} />
          <span className={`text-[10px] uppercase tracking-industrial font-mono font-semibold ${isDark ? 'text-red-400 group-hover:text-red-300' : 'text-red-600 group-hover:text-red-700'}`}>
            Sign Out
          </span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
