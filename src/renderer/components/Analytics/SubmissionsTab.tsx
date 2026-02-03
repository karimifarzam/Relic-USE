// SubmissionsTab.tsx
import { CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface Stat {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  color: string;
}

interface Submission {
  id: number;
  title: string;
  date: string;
  status: 'approved' | 'rejected' | 'pending';
  points: number;
  type: 'Task' | 'Passive';
}

interface SubmissionsTabProps {
  submissionStats: Stat[];
  submissions: Submission[];
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

const SubmissionsTab: React.FC<SubmissionsTabProps> = ({
  submissionStats,
  submissions,
  statRefs,
}) => {
  const { isDark } = useTheme();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-industrial-green" strokeWidth={1.5} />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-industrial-red" strokeWidth={1.5} />;
      case 'pending':
        return <Clock className={`w-4 h-4 ${isDark ? 'text-industrial-orange' : 'text-orange-500'}`} strokeWidth={1.5} />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-industrial-green';
      case 'rejected':
        return 'text-industrial-red';
      case 'pending':
        return isDark ? 'text-industrial-orange' : 'text-orange-500';
      default:
        return isDark ? 'text-industrial-white-secondary' : 'text-gray-600';
    }
  };

  return (
    <>
      <div className="flex-1">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {submissionStats.map((stat, index) => (
            <div
              key={index}
              className={`relative rounded-lg p-4 overflow-hidden group hover-lift transition-all flex flex-col ${isDark ? 'bg-industrial-black-secondary border border-industrial-border' : 'bg-white border border-gray-200'}`}
            >
              <p className={`text-[9px] uppercase tracking-industrial-wide font-mono font-bold mb-3 h-[18px] flex items-center ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                {stat.title}
              </p>

              <div className="flex justify-center items-center mt-1 mb-4 flex-1">
                <div
                  ref={(el) => (statRefs.current[`submission-${index}`] = el)}
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

        {/* Submissions List */}
        <div className={`rounded-lg p-6 shadow-industrial ${isDark ? 'border border-industrial-border bg-industrial-black-secondary' : 'border border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileText className={`w-4 h-4 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`} strokeWidth={1.5} />
              <p className={`text-[11px] uppercase tracking-industrial-wide font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Submissions
              </p>
            </div>
          </div>

          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-2 hide-scrollbar show-scrollbar-on-hover">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className={`flex items-center justify-between p-4 rounded-lg transition-colors ${isDark ? 'bg-industrial-black-primary hover:bg-industrial-black-tertiary' : 'bg-gray-50 hover:bg-gray-100'}`}
              >
                <div className="flex items-center gap-4 flex-1">
                  {getStatusIcon(submission.status)}
                  <div className="flex-1">
                    <p className={`text-[11px] font-mono mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {submission.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                        {submission.date}
                      </span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${isDark ? 'bg-industrial-black-tertiary border-industrial-border-subtle text-industrial-white-secondary' : 'bg-gray-100 border-gray-300 text-gray-700'}`}>
                        {submission.type}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-mono font-bold ${getStatusColor(submission.status)}`}>
                    {getStatusText(submission.status)}
                  </span>
                  <span className="text-[11px] font-mono text-industrial-green">
                    +{submission.points} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default SubmissionsTab;
