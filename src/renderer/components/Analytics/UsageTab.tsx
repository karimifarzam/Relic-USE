// UsageTab.tsx
import { AreaChart, DonutChart } from '@tremor/react';
import { Calendar, ChartLine, ChartPie } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface Stat {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  color: string;
}

interface UsageTabProps {
  usageStats: Stat[];
  timelineData: Array<{
    date: string;
    usage: number;
  }>;
  taskDistributionData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  statRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
}

// Format large numbers in industry-standard manner
const formatNumber = (value: string): string => {
  // Handle percentage values
  if (value.includes('%')) {
    return value;
  }

  const num = parseFloat(value.replace(/,/g, ''));

  if (isNaN(num)) return value;

  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }

  // Show one decimal place for numbers less than 1000
  return num.toFixed(1);
};

// Format number with commas for full display
const formatFullNumber = (value: string): string => {
  // Handle percentage values
  if (value.includes('%')) {
    return value;
  }

  const num = parseFloat(value.replace(/,/g, ''));
  if (isNaN(num)) return value;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const UsageTab: React.FC<UsageTabProps> = ({
  usageStats,
  timelineData,
  taskDistributionData,
  statRefs,
}) => {
  const [activeTab, setActiveTab] = useState('tasks');
  const { isDark } = useTheme();

  return (
    <>
      <div className="flex-1 max-w-[700px]">
        {/* Usage Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {usageStats.map((stat, index) => (
            <div
              key={`usage-stat-${stat.title}`}
              className={`relative rounded-lg p-4 overflow-hidden group hover-lift transition-all flex flex-col ${isDark ? 'bg-industrial-black-secondary border border-industrial-border' : 'bg-white border border-gray-200'}`}
            >
              <p className={`text-[9px] uppercase tracking-industrial-wide font-mono font-bold mb-3 h-[36px] flex items-center justify-center text-center leading-tight ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                {stat.title}
              </p>

              <div className="flex justify-center items-center mt-1 mb-4 flex-1">
                <div
                  ref={(el) => (statRefs.current[`usage-${index}`] = el)}
                  className={`text-2xl font-mono font-light relative group/tooltip ${isDark ? 'text-white' : 'text-gray-900'}`}
                  title={formatFullNumber(stat.value)}
                >
                  {formatNumber(stat.value)}

                  {/* Tooltip */}
                  <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded text-[11px] font-mono whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none shadow-industrial-lg z-10 ${isDark ? 'bg-industrial-black-tertiary border border-industrial-border text-white' : 'bg-gray-800 text-white'}`}>
                    {formatFullNumber(stat.value)}
                    <div className={`absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 border-r border-b rotate-45 ${isDark ? 'bg-industrial-black-tertiary border-industrial-border' : 'bg-gray-800'}`}></div>
                  </div>
                </div>
              </div>

              <p className={`text-[9px] text-center font-mono tracking-industrial h-[14px] flex items-center justify-center ${
                stat.positive ? 'text-industrial-green' : 'text-industrial-red'
              }`}>
                {stat.change}
              </p>
            </div>
          ))}
        </div>

        {/* Usage Graph */}
        <div className={`mt-6 rounded-lg p-6 shadow-industrial ${isDark ? 'border border-industrial-border bg-industrial-black-secondary' : 'border border-gray-200 bg-white'}`}>
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <ChartLine className={`w-4 h-4 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`} strokeWidth={1.5} />
              <p className={`text-[11px] uppercase tracking-industrial-wide font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Usage Graph
              </p>
            </div>

            <p className={`text-[9px] uppercase tracking-industrial font-mono ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
              Time spent recording
            </p>

            <div className={`rounded-lg p-1 ${isDark ? 'bg-industrial-black-primary border border-industrial-border-subtle' : 'bg-gray-100 border border-gray-300'}`}>
              <div className="flex gap-1">
                {['tasks', 'passive'].map((tab) => (
                  <button
                    key={tab}
                    className={`py-1.5 px-3 text-[9px] uppercase tracking-industrial-wide font-mono font-bold rounded-md transition-all ${
                      activeTab === tab
                        ? isDark
                          ? 'bg-industrial-black-tertiary text-white'
                          : 'bg-white text-gray-900 border border-gray-300'
                        : isDark
                          ? 'text-industrial-white-tertiary hover:text-industrial-white-secondary'
                          : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={`rounded-lg p-4 ${isDark ? 'bg-industrial-black-primary' : 'bg-gray-50'}`}>
            <AreaChart
              data={timelineData}
              index="date"
              categories={['usage']}
              colors={['blue']}
              valueFormatter={(number) => `${number}h`}
              className="h-64"
              curveType="natural"
              showGridLines={false}
              showXAxis={true}
              showYAxis={true}
              yAxisWidth={48}
              showGradient={true}
            />
          </div>
        </div>
      </div>

      {/* Right Column - Activity Map and Task Distribution */}
      <div className="max-w-[500px] flex flex-col gap-6">
        {/* Activity Map */}
        <div className={`rounded-lg p-6 shadow-industrial ${isDark ? 'bg-industrial-black-secondary border border-industrial-border' : 'bg-white border border-gray-200'}`}>
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Calendar className={`w-4 h-4 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`} strokeWidth={1.5} />
              <p className={`text-[11px] uppercase tracking-industrial-wide font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Activity Map
              </p>
            </div>

            <div className={`rounded-lg p-1 ${isDark ? 'bg-industrial-black-primary border border-industrial-border-subtle' : 'bg-gray-100 border border-gray-300'}`}>
              <div className="flex gap-1">
                {['tasks', 'passive'].map((tab) => (
                  <button
                    key={tab}
                    className={`py-1.5 px-3 text-[9px] uppercase tracking-industrial-wide font-mono font-bold rounded-md transition-all ${
                      activeTab === tab
                        ? isDark
                          ? 'bg-industrial-black-tertiary text-white'
                          : 'bg-white text-gray-900 border border-gray-300'
                        : isDark
                          ? 'text-industrial-white-tertiary hover:text-industrial-white-secondary'
                          : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col w-full">
            {/* Month Labels */}
            <div className="grid gap-1 mb-2">
              {['Aug', 'Sep', 'Oct', 'Nov'].map((month, index) => (
                <div
                  key={month}
                  className={`text-[9px] uppercase tracking-industrial-wide font-mono col-span-4 text-center ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}
                  style={{ gridColumnStart: index * 4 + 2 }}
                >
                  {month}
                </div>
              ))}
            </div>

            {/* Activity Grid */}
            <div className="grid grid-cols-19 gap-0.5">
              {Array.from({ length: 19 * 7 }).map((_, i) => {
                const intensity = Math.floor(Math.random() * 4);
                const bgColor = isDark
                  ? {
                      0: 'bg-industrial-black-primary',
                      1: 'bg-industrial-blue/20',
                      2: 'bg-industrial-blue/50',
                      3: 'bg-industrial-blue',
                    }[intensity]
                  : {
                      0: 'bg-gray-100',
                      1: 'bg-blue-200',
                      2: 'bg-blue-400',
                      3: 'bg-blue-600',
                    }[intensity];

                return (
                  <div
                    key={i}
                    className={`w-[18px] h-[18px] rounded border ${isDark ? 'border-industrial-border-subtle' : 'border-gray-300'} ${bgColor}`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Task Distribution */}
        <div className={`rounded-lg p-6 shadow-industrial ${isDark ? 'bg-industrial-black-secondary border border-industrial-border' : 'bg-white border border-gray-200'}`}>
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <ChartPie className={`w-4 h-4 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`} strokeWidth={1.5} />
              <p className={`text-[11px] uppercase tracking-industrial-wide font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Task Distribution
              </p>
            </div>

            <p className={`text-[9px] uppercase tracking-industrial font-mono ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
              Nov 1 - Nov 28
            </p>
          </div>

          <div className={`flex gap-6 rounded-lg p-6 overflow-visible ${isDark ? 'border border-industrial-border-subtle bg-industrial-black-primary' : 'border border-gray-300 bg-gray-50'}`}>
            {/* Left side - Title and Legend */}
            <div className="flex-1">
              <div className={`mb-6 text-[14px] font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Web Based Tasks up by <span className="font-bold text-industrial-green">30%</span>
              </div>

              <div className="space-y-2">
                {taskDistributionData.map((task) => (
                  <div key={task.name} className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded border ${isDark ? 'border-industrial-border-subtle' : 'border-gray-300'}`}
                      style={{
                        backgroundColor: task.color,
                      }}
                    />
                    <span className={`text-[10px] uppercase tracking-industrial font-mono ${isDark ? 'text-industrial-white-secondary' : 'text-gray-700'}`}>
                      {task.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side - Donut Chart */}
            <div className="relative w-[200px] overflow-visible">
              <DonutChart
                data={taskDistributionData}
                category="value"
                index="name"
                valueFormatter={(number) => `${number}`}
                showLabel={false}
                colors={taskDistributionData.map((task) => task.color)}
                className="h-[240px]"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UsageTab;
