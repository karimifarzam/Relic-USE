// Analytics.tsx
import { ChevronRight } from 'lucide-react';
import { useState, useRef } from 'react';
import myBoard from '../../../../assets/icons/myBoard.svg';
import EarningsTab from './EarningsTab';
import SubmissionsTab from './SubmissionsTab';
import { useTheme } from '../../contexts/ThemeContext';

const statsCards = [
  {
    title: 'Total Points',
    value: '1,654.40',
    change: '+20.1% from last month',
    positive: true,
    color: '#80F0FF',
  },
  {
    title: "Today's Points",
    value: '494.40',
    change: '-15% below daily average',
    positive: false,
    color: '#80F0FF',
  },
  {
    title: 'Average Task Points',
    value: '41.42',
    change: '+5% from last month',
    positive: true,
    color: '#80F0FF',
  },
  {
    title: 'Passive Hourly Points (Avg)',
    value: '21.42',
    change: '+53% from last month',
    positive: true,
    color: '#FD80FFCC',
  },
];

function Analytics() {
  const [activeTab, setActiveTab] = useState('points');
  const statRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const { isDark } = useTheme();

  const earningsData = [
    { date: 'Jul 29', 'Task Points': 34.4, 'Passive Points': 0 },
    { date: 'Jul 30', 'Task Points': 60.3, 'Passive Points': 32.1 },
    { date: 'Jul 31', 'Task Points': 54.3, 'Passive Points': 0 },
    { date: 'Aug 1', 'Task Points': 34.4, 'Passive Points': 0 },
    { date: 'Aug 2', 'Task Points': 60.3, 'Passive Points': 0 },
    { date: 'Aug 3', 'Task Points': 54.3, 'Passive Points': 0 },
    { date: 'Aug 4', 'Task Points': 34.4, 'Passive Points': 0 },
    { date: 'Aug 5', 'Task Points': 60.3, 'Passive Points': 0 },
    { date: 'Aug 6', 'Task Points': 54.3, 'Passive Points': 0 },
    { date: 'Aug 7', 'Task Points': 32.1, 'Passive Points': 0 },
    { date: 'Aug 8', 'Task Points': 54.3, 'Passive Points': 0 },
    { date: 'Aug 9', 'Task Points': 54.3, 'Passive Points': 0 },
  ];

  const recentPayouts = [
    { title: 'Changing system settings', points: 240 },
    { title: 'Install Chrome extension', points: 130 },
    { title: 'Organize downloads folder', points: 300 },
    { title: 'Change desktop wallpaper', points: 80 },
    { title: 'Backup important files', points: 140 },
    { title: 'Run virus scan', points: 90 },
    { title: 'Clear browser cache', points: 240 },
    { title: 'Do something random', points: 180 },
  ];

  const submissionStats = [
    {
      title: 'Total Submissions',
      value: '142',
      change: '+12 from last month',
      positive: true,
      color: '#80F0FF',
    },
    {
      title: 'Approved',
      value: '121',
      change: '+8.5% approval rate',
      positive: true,
      color: '#80F0FF',
    },
    {
      title: 'Pending Review',
      value: '8',
      change: 'Avg 2 day review time',
      positive: true,
      color: '#80F0FF',
    },
    {
      title: 'Rejected',
      value: '13',
      change: '-3 from last month',
      positive: true,
      color: '#FD80FFCC',
    },
  ];

  const submissions = [
    { id: 1, title: 'Recording - Session #127', date: 'Nov 15, 2025', status: 'approved' as const, points: 240, type: 'Task' as const },
    { id: 2, title: 'Recording - Session #126', date: 'Nov 15, 2025', status: 'approved' as const, points: 180, type: 'Passive' as const },
    { id: 3, title: 'Recording - Session #125', date: 'Nov 14, 2025', status: 'pending' as const, points: 300, type: 'Task' as const },
    { id: 4, title: 'Recording - Session #124', date: 'Nov 14, 2025', status: 'approved' as const, points: 130, type: 'Task' as const },
    { id: 5, title: 'Recording - Session #123', date: 'Nov 13, 2025', status: 'rejected' as const, points: 0, type: 'Passive' as const },
    { id: 6, title: 'Recording - Session #122', date: 'Nov 13, 2025', status: 'approved' as const, points: 220, type: 'Task' as const },
    { id: 7, title: 'Recording - Session #121', date: 'Nov 12, 2025', status: 'pending' as const, points: 160, type: 'Passive' as const },
    { id: 8, title: 'Recording - Session #120', date: 'Nov 12, 2025', status: 'approved' as const, points: 195, type: 'Task' as const },
  ];

  return (
    <main className={`min-h-0 ${isDark ? 'bg-industrial-black-primary' : 'bg-white'}`}>
      <div className="py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4 sm:self-start sm:pt-1">
            <h1 className={`text-2xl font-mono font-light tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              ANALYTICS
            </h1>
          </div>

          <div className="flex gap-2">
            <div className={`rounded-lg p-1 w-auto ${isDark ? 'bg-industrial-black-secondary border border-industrial-border' : 'bg-gray-100 border border-gray-300'}`}>
            <div className="flex gap-1">
              {['points', 'submissions'].map((tab) => (
                <button
                  type="button"
                  key={tab}
                  aria-current={activeTab === tab ? 'page' : undefined}
                  className={`py-2 px-4 text-[10px] uppercase tracking-industrial-wide font-mono font-bold rounded-md transition-all focus:outline-none active:scale-95 ${
                    activeTab === tab
                      ? isDark
                        ? 'bg-industrial-black-tertiary text-white border border-industrial-border'
                        : 'bg-white text-gray-900 border border-gray-300'
                      : isDark
                        ? 'text-industrial-white-tertiary hover:text-industrial-white-secondary border border-transparent'
                        : 'text-gray-600 hover:text-gray-900 border border-transparent'
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {activeTab === 'points' && (
            <EarningsTab
              statsCards={statsCards}
              earningsData={earningsData}
              recentPayouts={recentPayouts}
              statRefs={statRefs}
            />
          )}
          {activeTab === 'submissions' && (
            <SubmissionsTab
              submissionStats={submissionStats}
              submissions={submissions}
              statRefs={statRefs}
            />
          )}
        </div>
      </div>
    </main>
  );
}

export default Analytics;
