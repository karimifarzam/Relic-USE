import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import logo from '../../../../assets/images/logo.png';

export default function SignIn() {
  const navigate = useNavigate();
  const { signIn, isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Auth screens should not be auto-scaled.
    window.electron.ipcRenderer.invoke('ui:set-scaling-enabled', false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('> ERROR: ALL FIELDS REQUIRED');
      setIsLoading(false);
      return;
    }

    const result = await signIn(email, password);

    if (result.success) {
      navigate('/');
    } else {
      setError(`> ERROR: ${result.error?.toUpperCase() || 'AUTHENTICATION FAILED'}`);
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center relative overflow-hidden ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
      {/* Draggable titlebar region */}
      <div
        className="fixed top-0 left-0 right-0 h-12 z-50"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div className={`absolute inset-0 ${isDark ? 'bg-[linear-gradient(transparent_50%,rgba(255,149,0,0.03)_50%),linear-gradient(90deg,transparent_50%,rgba(255,149,0,0.03)_50%)]' : 'bg-[linear-gradient(transparent_50%,rgba(0,122,255,0.03)_50%),linear-gradient(90deg,transparent_50%,rgba(0,122,255,0.03)_50%)]'} bg-[size:40px_40px]`}></div>
      </div>

      {/* Scan line effect */}
      <div className={`absolute inset-0 pointer-events-none ${isDark ? 'opacity-5' : 'opacity-3'}`}>
        <div className={`h-[2px] w-full absolute animate-scan ${isDark ? 'bg-gradient-to-r from-transparent via-industrial-orange to-transparent' : 'bg-gradient-to-r from-transparent via-blue-500 to-transparent'}`}></div>
      </div>

      {/* Main container */}
      <div className={`w-full max-w-md mx-4 relative z-10 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Terminal header */}
        <div className={`mb-8 font-mono ${mounted ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500 delay-300`}>
          <div className={`text-xs uppercase tracking-[0.3em] mb-2 ${isDark ? 'text-industrial-orange' : 'text-blue-600'}`}>
            [ SYSTEM AUTHENTICATION ]
          </div>
          <h1 className={`text-3xl font-bold tracking-tight flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <img src={logo} className="h-8 w-auto object-contain" alt="Relic Logo" />
            RELIC
          </h1>
          <div className={`text-xs mt-2 ${isDark ? 'text-industrial-white-secondary' : 'text-gray-600'}`}>
            {'>'} ENTER CREDENTIALS TO PROCEED
            <span className="inline-block w-2 h-3 ml-1 animate-blink" style={{ backgroundColor: isDark ? '#ff9500' : '#007aff' }}></span>
          </div>
        </div>

        {/* Auth card */}
        <div className={`rounded-lg relative overflow-hidden ${mounted ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500 delay-500`}>
          {/* Glowing border effect */}
          <div className={`absolute inset-0 rounded-lg ${isDark ? 'bg-gradient-to-br from-industrial-orange/20 via-transparent to-industrial-orange/10' : 'bg-gradient-to-br from-blue-500/20 via-transparent to-blue-500/10'} blur-xl`}></div>

          <div className={`relative backdrop-blur-sm p-8 ${isDark ? 'bg-industrial-black-secondary/80 border border-industrial-border' : 'bg-white/80 border border-gray-300'} rounded-lg`}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email field */}
              <div className="space-y-2">
                <label className={`block text-[10px] uppercase tracking-[0.2em] font-mono font-bold ${isDark ? 'text-industrial-orange' : 'text-blue-600'}`}>
                  [ EMAIL ]
                </label>
                <div className="relative group">
                  <div className={`absolute inset-0 rounded transition-all ${isDark ? 'bg-industrial-orange/0 group-focus-within:bg-industrial-orange/5' : 'bg-blue-500/0 group-focus-within:bg-blue-500/5'}`}></div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className={`relative w-full px-4 py-3 font-mono text-sm bg-transparent transition-all outline-none ${
                      isDark
                        ? 'text-white border border-industrial-border focus:border-industrial-orange placeholder:text-industrial-white-tertiary'
                        : 'text-gray-900 border border-gray-300 focus:border-blue-500 placeholder:text-gray-400'
                    } rounded disabled:opacity-50`}
                    placeholder="user@domain.com"
                  />
                  <div className={`absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full animate-pulse opacity-0 group-focus-within:opacity-100 transition-opacity ${isDark ? 'bg-industrial-orange' : 'bg-blue-500'}`}></div>
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label className={`block text-[10px] uppercase tracking-[0.2em] font-mono font-bold ${isDark ? 'text-industrial-orange' : 'text-blue-600'}`}>
                  [ PASSWORD ]
                </label>
                <div className="relative group">
                  <div className={`absolute inset-0 rounded transition-all ${isDark ? 'bg-industrial-orange/0 group-focus-within:bg-industrial-orange/5' : 'bg-blue-500/0 group-focus-within:bg-blue-500/5'}`}></div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className={`relative w-full px-4 py-3 pr-12 font-mono text-sm bg-transparent transition-all outline-none ${
                      isDark
                        ? 'text-white border border-industrial-border focus:border-industrial-orange placeholder:text-industrial-white-tertiary'
                        : 'text-gray-900 border border-gray-300 focus:border-blue-500 placeholder:text-gray-400'
                    } rounded disabled:opacity-50`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono uppercase tracking-wider ${
                      isDark ? 'text-industrial-white-tertiary hover:text-industrial-orange' : 'text-gray-500 hover:text-blue-600'
                    } transition-colors`}
                  >
                    {showPassword ? '[HIDE]' : '[SHOW]'}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className={`p-3 rounded font-mono text-xs ${isDark ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                  {error}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-6 font-mono text-xs uppercase tracking-[0.2em] font-bold rounded relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                  isDark
                    ? 'bg-industrial-orange text-black hover:bg-industrial-orange/90 border border-industrial-orange/50'
                    : 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-700'
                }`}
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'bg-gradient-to-r from-transparent via-white/10 to-transparent' : 'bg-gradient-to-r from-transparent via-white/20 to-transparent'} animate-shimmer`}></div>
                <span className="relative z-10">
                  {isLoading ? '[ AUTHENTICATING... ]' : '[ ENTER ]'}
                </span>
              </button>

              {/* Forgot password link */}
              <div className="text-center">
                <button
                  type="button"
                  className={`text-[10px] font-mono uppercase tracking-wider ${
                    isDark ? 'text-industrial-white-tertiary hover:text-industrial-orange' : 'text-gray-500 hover:text-blue-600'
                  } transition-colors`}
                >
                  {'>'} FORGOT PASSWORD?
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sign up link */}
        <div className={`mt-6 text-center font-mono text-xs ${isDark ? 'text-industrial-white-secondary' : 'text-gray-600'} ${mounted ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500 delay-700`}>
          <span>NO ACCOUNT? </span>
          <Link
            to="/sign-up"
            className={`uppercase tracking-wider font-bold ${isDark ? 'text-industrial-orange hover:text-industrial-orange/80' : 'text-blue-600 hover:text-blue-700'} transition-colors`}
          >
            [ CREATE NEW ]
          </Link>
        </div>

        {/* Theme toggle */}
        <div className={`mt-6 flex justify-center ${mounted ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500 delay-900`}>
          <button
            type="button"
            onClick={toggleTheme}
            className={`px-3 py-1.5 rounded border text-[9px] uppercase tracking-industrial-wide font-mono font-bold transition-all hover-lift ${isDark ? 'bg-industrial-black-tertiary border-industrial-border text-industrial-white-secondary hover:text-white hover:border-industrial-orange' : 'bg-gray-100 border-gray-300 text-gray-600 hover:text-gray-900 hover:border-blue-500'}`}
            aria-label="Toggle theme"
          >
            {isDark ? '☀ LIGHT MODE' : '◐ DARK MODE'}
          </button>
        </div>

        {/* System info footer */}
        <div className={`mt-4 text-center font-mono text-[9px] ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-400'} ${mounted ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500 delay-1000`}>
          <div className="flex items-center justify-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-industrial-green' : 'bg-green-500'} animate-pulse`}></div>
            <span>SYSTEM STATUS: ONLINE</span>
          </div>
          <div className="mt-1 opacity-60">
            SECURE CONNECTION ESTABLISHED
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        .animate-scan {
          animation: scan 8s linear infinite;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 1s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        /* Custom scrollbar styling for dark theme */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: ${isDark ? '#0a0a0a' : '#f3f4f6'};
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
          background: ${isDark ? '#2a2a2a' : '#d1d5db'};
          border-radius: 4px;
          transition: background 0.2s ease;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? 'rgba(255, 149, 0, 0.3)' : '#9ca3af'};
          ${isDark ? 'box-shadow: 0 0 4px rgba(255, 149, 0, 0.2);' : ''}
        }

        /* Firefox scrollbar */
        * {
          scrollbar-width: thin;
          scrollbar-color: ${isDark ? '#2a2a2a #0a0a0a' : '#d1d5db #f3f4f6'};
        }
      `}</style>
    </div>
  );
}
