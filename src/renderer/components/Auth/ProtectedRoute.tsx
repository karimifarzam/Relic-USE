import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { isDark } = useTheme();

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-industrial-black-primary' : 'bg-white'}`}>
        <div className="text-center font-mono">
          <div className={`text-xs uppercase tracking-[0.3em] mb-4 ${isDark ? 'text-industrial-orange' : 'text-blue-600'}`}>
            [ SYSTEM_INITIALIZING ]
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-industrial-orange' : 'bg-blue-500'}`}></div>
            <div className={`w-2 h-2 rounded-full animate-pulse delay-75 ${isDark ? 'bg-industrial-orange' : 'bg-blue-500'}`}></div>
            <div className={`w-2 h-2 rounded-full animate-pulse delay-150 ${isDark ? 'bg-industrial-orange' : 'bg-blue-500'}`}></div>
          </div>
          <div className={`text-[10px] mt-4 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
            AUTHENTICATING_
            <span className="inline-block w-2 h-3 ml-1 animate-blink" style={{ backgroundColor: isDark ? '#ff9500' : '#007aff' }}></span>
          </div>
        </div>

        <style>{`
          .delay-75 {
            animation-delay: 150ms;
          }
          .delay-150 {
            animation-delay: 300ms;
          }
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
          .animate-blink {
            animation: blink 1s infinite;
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
}
