'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  X, 
  Home, 
  Users, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity,
  UserCheck,
  Globe
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Heatmap', href: '/dashboard/heatmap', icon: Activity },
  { name: 'Staff', href: '/dashboard/staff', icon: Users },
  { name: 'Citizens Reports', href: '/dashboard/citizens', icon: UserCheck },
];

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-[#241c15]/60 z-20 lg:hidden backdrop-blur-xs"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 bg-[#1e1712] text-[#e8ded2] shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 border-r border-[#33271f]
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${collapsed ? 'w-16' : 'w-64'}
      `}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-[#33271f]">
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-xl font-black text-[#faf6f0] truncate tracking-tight">SafaiSathi</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ba7861] truncate">Operations Panel</p>
            </div>
          )}
          <div className="flex items-center space-x-2 ml-auto flex-shrink-0">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden rounded-md p-2 text-[#9c8e7e] transition hover:bg-[#2d221b] hover:text-white lg:flex"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={onToggle}
              className="rounded-md p-2 text-[#9c8e7e] transition hover:bg-[#2d221b] hover:text-white lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="mt-6 px-3">
          <ul className="space-y-1.5">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => { if (isOpen) onToggle(); }}
                    className={`
                      group flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold transition duration-200
                      ${isActive
                        ? 'bg-[#964b28] text-white shadow-md'
                        : 'text-[#c7baa8] hover:bg-[#2d221b] hover:text-white'
                      }
                    `}
                  >
                    <item.icon
                      className={`
                        h-5 w-5 flex-shrink-0
                        ${isActive ? 'text-white' : 'text-[#8f7e6e] group-hover:text-[#e8ded2]'}
                      `}
                    />
                    {!collapsed && (
                      <span className="ml-3 truncate">{item.name}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Direct Landing Page Shortcut */}
          <div className="pt-4 mt-4 border-t border-[#33271f]">
            <Link
              href="/"
              onClick={() => { if (isOpen) onToggle(); }}
              className="group flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold transition duration-200 text-[#c7baa8] hover:bg-[#2d221b] hover:text-white"
            >
              <Globe className="h-5 w-5 flex-shrink-0 text-[#ba7861] group-hover:text-white" />
              {!collapsed && (
                <span className="ml-3 truncate">Landing Page</span>
              )}
            </Link>
          </div>
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-[#33271f] bg-[#17110d] p-3">
          <div className="flex items-center min-w-0">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#964b28]">
                <span className="text-sm font-bold text-white">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            </div>
            {!collapsed && (
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#faf6f0] truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-[#9c8e7e] truncate">{user?.email || 'user@example.com'}</p>
              </div>
            )}
            <button 
              onClick={logout}
              className="ml-2 flex-shrink-0 rounded-md p-2 text-[#9c8e7e] transition hover:bg-[#2d221b] hover:text-white"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
