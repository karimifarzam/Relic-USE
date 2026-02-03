import { useState, useEffect } from 'react';
import {
  MemoryRouter as Router,
  Routes,
  Route,
  Outlet,
} from 'react-router-dom';
import Tray from './components/Tray';
import './styles/global.css';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './components/Board/Dashboard';
import Analytics from './components/Analytics/Analytics';
import Tasklist from './components/Tasklist/Tasklist';
import Editor from './components/Editor/Editor';
import Notifications from './components/Notifications/Notifications';
import SignIn from './components/Auth/SignIn';
import SignUp from './components/Auth/SignUp';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  const { isDark } = useTheme();

  useEffect(() => {
    window.electron.ipcRenderer.invoke('ui:set-scaling-enabled', true);
    return () => {
      window.electron.ipcRenderer.invoke('ui:set-scaling-enabled', false);
    };
  }, []);

  return (
    <>
      <header className={`titlebar ${isDark ? 'bg-black border-b border-[#1a1a1a]' : 'titlebar-light bg-white border-b border-gray-200'}`}></header>
      <div className={`flex relative h-screen overflow-hidden ${isDark ? 'bg-industrial-black-primary' : 'bg-white'}`}>
        <Sidebar />
        <main className="flex-1 pt-[38px] px-8 overflow-auto hide-scrollbar show-scrollbar-on-hover">
          <div className="w-full pb-8">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </>
  );
};

export default function App() {
  const [isTrayWindow, setIsTrayWindow] = useState(false);

  useEffect(() => {
    // Use the exposed utility method instead of direct URL parsing
    // @ts-ignore (window.electron is injected via preload)
    setIsTrayWindow(window.electron.windowUtils.isTrayWindow());
  }, []);

  const handleStartPassiveMode = () => {
    // @ts-ignore (window.electron is injected via preload)
    window.electron.ipcRenderer.invoke('open-tray-window');
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Auth routes - public */}
            {!isTrayWindow && (
              <>
                <Route path="/sign-in" element={<SignIn />} />
                <Route path="/sign-up" element={<SignUp />} />
              </>
            )}

            {/* Protected routes */}
            <Route
              path="*"
              element={
                isTrayWindow ? (
                  <Tray onStartEarning={handleStartPassiveMode} />
                ) : (
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/tasks" element={<Tasklist />} />
                        <Route path="/editor" element={<Editor />} />
                        <Route path="/notifications" element={<Notifications />} />
                        {/* <Route path="/tutorials" element={<div>Tutorials</div>} /> */}
                        <Route path="/settings" element={<div>Settings</div>} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                )
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
