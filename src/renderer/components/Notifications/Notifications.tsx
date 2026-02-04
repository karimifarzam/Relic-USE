import { useState } from 'react';
import { ChevronRight, Bell, Check, X, Info, AlertTriangle, Zap } from 'lucide-react';
import myBoard from '../../../../assets/icons/myBoard.svg';
import { useTheme } from '../../contexts/ThemeContext';

type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'reward';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

// Mock data - replace with actual data source
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'reward',
    title: 'Session Approved',
    message: 'Your passive session from Aug 9 has been approved. 240 points added.',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    read: false,
  },
  {
    id: '2',
    type: 'success',
    title: 'Task Completed',
    message: 'Successfully submitted "Organize downloads folder" task.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false,
  },
  {
    id: '3',
    type: 'warning',
    title: 'Review Required',
    message: 'Your session from Aug 8 needs additional screenshots for approval.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    read: true,
  },
  {
    id: '4',
    type: 'info',
    title: 'New Task Available',
    message: 'High-value task "Browser extension testing" is now available.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    read: true,
  },
  {
    id: '5',
    type: 'error',
    title: 'Session Rejected',
    message: 'Session from Aug 7 was rejected. Insufficient activity detected.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    read: true,
  },
  {
    id: '6',
    type: 'reward',
    title: 'Milestone Reached',
    message: 'Congratulations! You\'ve earned 1,000 total points.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    read: true,
  },
];

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return Check;
    case 'error':
      return X;
    case 'warning':
      return AlertTriangle;
    case 'reward':
      return Zap;
    default:
      return Info;
  }
};

const getNotificationColor = (type: NotificationType): string => {
  switch (type) {
    case 'success':
      return '#34c759';
    case 'error':
      return '#ff3b30';
    case 'warning':
      return '#ffcc00';
    case 'reward':
      return '#ff9500';
    default:
      return '#007aff';
  }
};

const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { isDark } = useTheme();

  const filteredNotifications = notifications.filter(
    (n) => filter === 'all' || !n.read
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  return (
    <main className={`min-h-0 ${isDark ? 'bg-industrial-black-primary' : 'bg-white'}`}>
      <div className="py-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <h1 className={`text-2xl font-mono font-light tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              NOTIFICATIONS
            </h1>
            {unreadCount > 0 && (
              <div className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-industrial-wide font-mono font-bold ${isDark ? 'bg-industrial-orange text-black' : 'bg-blue-500 text-white'}`}>
                {unreadCount} New
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {/* Filter Toggle */}
            <div className={`rounded-lg p-1 w-auto ${isDark ? 'bg-industrial-black-secondary border border-industrial-border' : 'bg-gray-100 border border-gray-300'}`}>
              <div className="flex gap-1">
                {['all', 'unread'].map((tab) => (
                  <button
                    type="button"
                    key={tab}
                    className={`py-2 px-4 text-[10px] uppercase tracking-industrial-wide font-mono font-bold rounded-md transition-all focus:outline-none active:scale-95 ${
                      filter === tab
                        ? isDark
                          ? 'bg-industrial-black-tertiary text-white border border-industrial-border'
                          : 'bg-white text-gray-900 border border-gray-300'
                        : isDark
                          ? 'text-industrial-white-tertiary hover:text-industrial-white-secondary border border-transparent'
                          : 'text-gray-600 hover:text-gray-900 border border-transparent'
                    }`}
                    onClick={() => setFilter(tab as 'all' | 'unread')}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            {notifications.length > 0 && (
              <>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-industrial-wide font-mono font-bold transition-all hover-lift ${isDark ? 'bg-industrial-black-secondary border border-industrial-border text-industrial-white-secondary hover:text-white hover:border-industrial-border' : 'bg-white border border-gray-300 text-gray-700 hover:text-gray-900 hover:border-gray-400'}`}
                  >
                    Mark All Read
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClearAll}
                  className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-industrial-wide font-mono font-bold transition-all hover-lift hover:text-industrial-red ${isDark ? 'bg-industrial-black-secondary border border-industrial-border text-industrial-white-secondary hover:border-industrial-red/30' : 'bg-white border border-gray-300 text-gray-700 hover:border-red-300'}`}
                >
                  Clear All
                </button>
              </>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className={`rounded-lg p-12 text-center ${isDark ? 'bg-industrial-black-secondary border border-industrial-border-subtle' : 'bg-gray-50 border border-gray-200'}`}>
              <Bell
                className={`w-12 h-12 mx-auto mb-4 opacity-30 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-400'}`}
                strokeWidth={1.5}
              />
              <p className={`text-sm font-mono ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                {filter === 'unread'
                  ? 'No unread notifications'
                  : 'No notifications yet'}
              </p>
              <p className={`text-xs font-mono mt-2 opacity-60 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                You're all caught up
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const color = getNotificationColor(notification.type);

              return (
                <div
                  key={notification.id}
                  className={`border rounded-lg p-4 transition-all hover-lift group relative overflow-hidden ${
                    isDark
                      ? `bg-industrial-black-secondary ${notification.read ? 'border-industrial-border-subtle opacity-75' : 'border-industrial-border'}`
                      : `bg-white ${notification.read ? 'border-gray-200 opacity-75' : 'border-gray-300'}`
                  }`}
                >
                  {/* Accent bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l"
                    style={{
                      backgroundColor: color,
                    }}
                  />

                  <div className="flex items-start gap-4 ml-3">
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border"
                      style={{
                        backgroundColor: `${color}1A`,
                        borderColor: `${color}33`,
                      }}
                    >
                      <Icon
                        className="w-5 h-5"
                        strokeWidth={1.5}
                        style={{ color }}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className={`text-sm font-mono font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {notification.title}
                          </h3>
                          <p className={`text-xs font-mono leading-relaxed ${isDark ? 'text-industrial-white-secondary' : 'text-gray-600'}`}>
                            {notification.message}
                          </p>
                        </div>

                        {/* Timestamp & Read Toggle */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`text-[10px] uppercase tracking-industrial font-mono font-semibold ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                            {formatTimestamp(notification.timestamp)}
                          </span>
                          {!notification.read && (
                            <button
                              type="button"
                              onClick={() => handleMarkAsRead(notification.id)}
                              className={`w-2 h-2 rounded-full transition-colors ${isDark ? 'bg-industrial-orange hover:bg-industrial-orange/80' : 'bg-blue-500 hover:bg-blue-600'}`}
                              title="Mark as read"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}

export default Notifications;
