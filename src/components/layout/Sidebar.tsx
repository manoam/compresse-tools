import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FileDown, Image, Home, X, Shrink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  {
    name: 'Accueil',
    href: '/',
    icon: Home,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-100',
  },
  {
    name: 'Compresser PDF',
    href: '/compress-pdf',
    icon: FileDown,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-100',
  },
  {
    name: 'Compresser Image',
    href: '/compress-image',
    icon: Image,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-100',
  },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();

  const displayName = user?.fullName || user?.username || 'Utilisateur';
  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : displayName.substring(0, 2).toUpperCase();

  useEffect(() => {
    onClose();
  }, [location.pathname]);

  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 shadow-md">
            <Shrink className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">CompressTool</h1>
            <p className="text-xs text-gray-500">Compression de fichiers</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.iconBg}`}>
                <item.icon className={`h-4 w-4 ${item.iconColor}`} />
              </div>
              {item.name}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User info */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
            {initials}
          </div>
          <div className="flex-1 truncate">
            <p className="text-sm font-medium text-gray-900">{displayName}</p>
            <p className="truncate text-xs text-gray-500">{user?.email || ''}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
