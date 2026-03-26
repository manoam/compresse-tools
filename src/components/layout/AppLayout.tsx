import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Simple header until Module Federation is fixed */}
      <header className="h-12 shrink-0 border-b border-gray-200 bg-white flex items-center justify-between px-4">
        <span className="font-semibold text-gray-800">CompressTool</span>
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user.firstName} {user.lastName}</span>
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Déconnexion
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 min-w-0 overflow-y-auto p-3 md:p-5">
        <Outlet />
      </main>
    </div>
  );
}
