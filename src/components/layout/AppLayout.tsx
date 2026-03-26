import React, { Suspense, useState, useEffect, Component } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { loadRemoteComponent } from '../../remoteLoader';
import { useAuth } from '../../context/AuthContext';

const RemoteHeaderBar = React.lazy(() => loadRemoteComponent('./HeaderBar'));
const RemoteSidebar = React.lazy(() => loadRemoteComponent('./Sidebar'));

function HeaderFallback() {
  return <div className="h-12 shrink-0 border-b border-gray-200 bg-white" />;
}
function SidebarFallback() {
  return <div className="w-[210px] shrink-0 bg-gray-50 h-full" />;
}

interface EBProps { fallback: React.ReactNode; children: React.ReactNode }
interface EBState { hasError: boolean }

class RemoteErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): EBState {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

const SIDEBAR_SECTIONS = [
  {
    label: 'CompressTool',
    items: [
      { label: 'Accueil', path: '/' },
      { label: 'Compresser PDF', path: '/compress-pdf' },
      { label: 'Compresser Image', path: '/compress-image' },
    ],
  },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('k_sidebar_collapsed') === '1'; }
    catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem('k_sidebar_collapsed', sidebarCollapsed ? '1' : '0'); }
    catch { /* ignore */ }
  }, [sidebarCollapsed]);

  const handleNavigate = (path: string) => navigate(path);

  const { user, logout } = useAuth();
  const headerUser = user;
  const handleLogout = logout;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <RemoteErrorBoundary fallback={<HeaderFallback />}>
        <Suspense fallback={<HeaderFallback />}>
          <RemoteHeaderBar
            user={headerUser}
            onLogout={handleLogout}
            currentAppName="CompressTool"
            onNavigate={handleNavigate}
          />
        </Suspense>
      </RemoteErrorBoundary>

      <div className="flex flex-1 min-h-0">
        <div className="hidden md:block">
          <RemoteErrorBoundary fallback={<SidebarFallback />}>
            <Suspense fallback={<SidebarFallback />}>
              <RemoteSidebar
                sections={SIDEBAR_SECTIONS}
                activePath={location.pathname}
                onNavigate={handleNavigate}
                collapsed={sidebarCollapsed}
                onCollapse={() => setSidebarCollapsed((v) => !v)}
                onHelpClick={() => {}}
              />
            </Suspense>
          </RemoteErrorBoundary>
        </div>

        <main className="flex-1 min-w-0 overflow-y-auto p-3 md:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
