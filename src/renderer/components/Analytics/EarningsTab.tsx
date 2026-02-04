// EarningsTab.tsx
import { Text, BarChart } from '@tremor/react';
import { BarChart2, Users, Wallet, Copy, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';

interface Stat {
    title: string;
    value: string;
    change: string;
    positive: boolean;
    color: string;
  }

  interface PayoutItem {
    title: string;
    points: number;
  }

interface EarningsTabProps {
    statsCards: Stat[];
    earningsData: Array<{
      date: string;
      'Task Points': number;
      'Passive Points': number;
    }>;
    recentPayouts: PayoutItem[];
    statRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  }

  // Format large numbers in industry-standard manner
  const formatNumber = (value: string): string => {
    const num = parseFloat(value.replace(/,/g, ''));

    if (isNaN(num)) return value;

    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }

    return num.toFixed(0);
  };

  // Format number with commas for full display
  const formatFullNumber = (value: string): string => {
    const num = parseFloat(value.replace(/,/g, ''));
    if (isNaN(num)) return value;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const EarningsTab: React.FC<EarningsTabProps> = ({ statsCards, earningsData, recentPayouts, statRefs }) => {
    const { isDark } = useTheme();
    const { profile } = useAuth();
    const [copied, setCopied] = useState(false);

    const handleCopyReferralCode = () => {
      if (profile?.referral_code) {
        navigator.clipboard.writeText(profile.referral_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    };

    return (
    <>
      <div className="flex-1">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          {statsCards.map((stat, index) => (
            <div
              key={index}
              className={`relative rounded-lg p-4 overflow-hidden group hover-lift transition-all flex flex-col ${isDark ? 'bg-industrial-black-secondary border border-industrial-border' : 'bg-white border border-gray-200 shadow-industrial'}`}
            >
              <p className={`text-[9px] uppercase tracking-industrial-wide font-mono font-bold mb-3 h-[18px] flex items-center ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                {stat.title}
              </p>

              <div className="flex justify-center items-center mt-1 mb-4 flex-1">
                <div
                  ref={(el) => (statRefs.current[index] = el)}
                  className={`text-[28px] font-sans font-semibold tracking-tight relative group/tooltip ${isDark ? 'text-white' : 'text-gray-900'}`}
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

        {/* Chart Section */}
        <div className={`mt-5 rounded-lg p-5 shadow-industrial ${isDark ? 'border border-industrial-border bg-industrial-black-secondary' : 'border border-gray-200 bg-white'}`}>
          <div className="flex items-center mb-6">
            <div className="flex items-center gap-3">
              <BarChart2 className={`w-4 h-4 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`} strokeWidth={1.5} />
              <Text className={`text-[11px] uppercase tracking-industrial-wide font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Point Statistics
              </Text>
            </div>
          </div>

          <div className={`rounded-lg p-4 ${isDark ? 'bg-industrial-black-primary' : 'bg-gray-50'}`}>
            <style>
              {`
                .dark .earnings-chart-container ol li p {
                  color: white !important;
                }
                .earnings-chart-container ol li p {
                  color: #111827 !important;
                  font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace !important;
                  font-size: 9px !important;
                  text-transform: uppercase !important;
                  letter-spacing: 0.1em !important;
                  font-weight: 700 !important;
                }
              `}
            </style>
            <div className="earnings-chart-container">
              <BarChart
                data={earningsData}
                index="date"
                categories={['Task Points', 'Passive Points']}
                colors={['blue', 'orange']}
                valueFormatter={(number) => `${number}`}
                yAxisWidth={48}
                className="h-[380px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right column */}
      <div className="w-[320px] flex flex-col gap-6">
        {/* Referrals Card */}
        <div className={`rounded-lg p-4 shadow-industrial ${isDark ? 'bg-industrial-black-secondary border border-industrial-border' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center mb-4">
            <div className="flex items-center gap-2">
              <Users className={`w-4 h-4 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`} strokeWidth={1.5} />
              <Text className={`text-[11px] uppercase tracking-industrial-wide font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Referrals
              </Text>
            </div>
          </div>
          <div className="mb-3">
            <Text className={`text-[9px] uppercase tracking-industrial font-mono mb-2 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
              Your Referral Code
            </Text>
            <div className="flex items-center gap-2">
              <div className={`flex-1 px-3 py-2 rounded text-[11px] font-mono ${isDark ? 'bg-industrial-black-tertiary border border-industrial-border-subtle text-industrial-orange' : 'bg-gray-100 border border-gray-300 text-blue-600'}`}>
                {profile?.referral_code || 'Loading...'}
              </div>
              <button
                onClick={handleCopyReferralCode}
                className={`p-2 rounded transition-colors ${isDark ? 'bg-industrial-black-tertiary border border-industrial-border-subtle hover:border-industrial-orange text-industrial-white-secondary hover:text-industrial-orange' : 'bg-gray-100 border border-gray-300 hover:border-blue-500 text-gray-600 hover:text-blue-600'}`}
                title="Copy referral code"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Text className={`text-[9px] uppercase tracking-industrial font-mono ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
              Total Referrals:
            </Text>
            <span className={`text-[14px] font-mono font-light ${isDark ? 'text-white' : 'text-gray-900'}`}>{profile?.referral_count || 0}</span>
          </div>
        </div>

        {/* Recent Payouts Card */}
        <div className={`rounded-lg p-4 shadow-industrial ${isDark ? 'bg-industrial-black-secondary border border-industrial-border' : 'bg-white border border-gray-200'}`}>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className={`w-4 h-4 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`} strokeWidth={1.5} />
              <p className={`text-[11px] uppercase tracking-industrial-wide font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Recent Payouts
              </p>
            </div>
            <p className={`text-[9px] uppercase tracking-industrial font-mono ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
              84 tasks completed this week
            </p>
          </div>

          <div className={`flex justify-between items-center mb-3 pb-2 border-b ${isDark ? 'border-industrial-border-subtle' : 'border-gray-200'}`}>
            <p className={`text-[9px] uppercase tracking-industrial-wide font-mono ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
              Title
            </p>
            <p className={`text-[9px] uppercase tracking-industrial-wide font-mono ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
              Points
            </p>
          </div>

          <div className="space-y-2">
            {recentPayouts.map((payout, index) => (
              <div key={index} className={`flex justify-between items-center py-1.5 rounded px-2 transition-colors ${isDark ? 'hover:bg-industrial-black-tertiary' : 'hover:bg-gray-50'}`}>
                <p className={`text-[10px] font-mono truncate mr-2 ${isDark ? 'text-industrial-white-secondary' : 'text-gray-700'}`}>
                  {payout.title}
                </p>
                <p className="text-[10px] font-mono text-industrial-green whitespace-nowrap">
                  +{payout.points}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default EarningsTab;
