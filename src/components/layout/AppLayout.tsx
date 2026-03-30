import React, { Component, Suspense, useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, FileDown, Image, Shrink, Clock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { loadRemoteComponent } from '../../remoteLoader'

// Lazy-load remote components
const RemoteHeaderBar = React.lazy(() => loadRemoteComponent('./HeaderBar'))
const RemoteSidebar = React.lazy(() => loadRemoteComponent('./Sidebar'))

// Sidebar sections for this app
const SIDEBAR_SECTIONS = [
  {
    label: 'Compression',
    items: [
      { icon: Home, label: 'Accueil', path: '/' },
      { icon: FileDown, label: 'Compresser PDF', path: '/compress-pdf' },
      { icon: Image, label: 'Compresser Image', path: '/compress-image' },
      { icon: Clock, label: 'Historique', path: '/history' },
    ],
  },
]

// Placeholder matching header height
function HeaderFallback() {
  return <div className="h-12 shrink-0 border-b border-gray-200 bg-white" />
}

// Placeholder matching sidebar width
function SidebarFallback() {
  return <div className="w-[210px] shrink-0 bg-gray-800 h-full" />
}

// Error boundary that catches remote loading failures and renders a local fallback
interface RemoteErrorBoundaryProps {
  fallback: React.ReactNode
  children: React.ReactNode
}

interface RemoteErrorBoundaryState {
  hasError: boolean
}

class RemoteErrorBoundary extends Component<RemoteErrorBoundaryProps, RemoteErrorBoundaryState> {
  constructor(props: RemoteErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): RemoteErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

export default function AppLayout() {
  const { user, token, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('k_sidebar_collapsed') === '1'
    } catch {
      return false
    }
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('k_sidebar_collapsed', sidebarCollapsed ? '1' : '0')
    } catch {
      // ignore
    }
  }, [sidebarCollapsed])

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Map auth user to remote header user shape
  const headerUser = user
    ? {
        firstName: user.firstName || user.fullName?.split(' ')[0] || '',
        lastName: user.lastName || user.fullName?.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
        username: user.username || '',
      }
    : null

  const handleNavigate = (path: string) => {
    navigate(path)
  }

  // Local fallback header
  const localTopbar = (
    <header className="h-12 shrink-0 border-b border-gray-200 bg-white flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <Shrink className="h-5 w-5 text-primary-600" />
        <span className="font-semibold text-gray-800">CompressTool</span>
      </div>
      {user && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user.firstName} {user.lastName}</span>
          <button onClick={logout} className="text-sm text-red-600 hover:text-red-800">
            Déconnexion
          </button>
        </div>
      )}
    </header>
  )

  // Local fallback sidebar
  const localSidebar = (
    <div className="w-[210px] shrink-0 bg-gray-800 h-full p-3 text-white text-sm">
      <div className="space-y-1">
        {SIDEBAR_SECTIONS[0].items.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg transition ${
              location.pathname === item.path ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header — remote with local fallback */}
      <RemoteErrorBoundary fallback={localTopbar}>
        <Suspense fallback={<HeaderFallback />}>
          <RemoteHeaderBar
            user={headerUser}
            token={token}
            platformUrl="https://plateform.konitys.fr"
            apiBase="https://plateform-gateway.konitys.fr"
            onLogout={logout}
            currentAppName="CompressTool"
            onNavigate={handleNavigate}
          />
        </Suspense>
      </RemoteErrorBoundary>

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar — remote with local fallback */}
        <div className="hidden md:block">
          <RemoteErrorBoundary fallback={localSidebar}>
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

        {/* Mobile sidebar overlay */}
        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/30 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed left-0 top-12 z-40 h-[calc(100vh-48px)] md:hidden">
              <RemoteErrorBoundary fallback={localSidebar}>
                <Suspense fallback={<SidebarFallback />}>
                  <RemoteSidebar
                    sections={SIDEBAR_SECTIONS}
                    activePath={location.pathname}
                    onNavigate={handleNavigate}
                    collapsed={false}
                    onCollapse={() => setMobileMenuOpen(false)}
                    onHelpClick={() => {}}
                  />
                </Suspense>
              </RemoteErrorBoundary>
            </div>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto p-3 md:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
