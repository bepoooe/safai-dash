'use client';

import { Menu, Bell, Search, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Left side - Menu button and search */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="hidden md:block">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search areas, staff, reports..."
                className="block w-80 rounded-xl border border-slate-300 bg-slate-50 py-2 pl-10 pr-3 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        </div>

        {/* Right side - Notifications and user menu */}
        <div className="flex items-center space-x-3">
          <a
            href="https://safai-citizen.vercel.app/"
            target="_blank"
            rel="noreferrer"
            aria-label="Open the citizen reporting platform"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 sm:text-sm"
          >
            <span>Safai-Citizen</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <div className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 lg:block">
            System Online
          </div>
          {/* Notifications */}
          <button className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User menu */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-semibold text-slate-800">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-500">{user?.email || 'user@example.com'}</p>
            </div>
            <button className="flex items-center space-x-2 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-400 shadow-sm transition hover:border-blue-200 hover:text-slate-600 hover:shadow">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600">
                <span className="text-sm font-medium text-white">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
