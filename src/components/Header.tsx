'use client';

import { Menu, Bell, Search, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  
  return (
    <header className="sticky top-0 z-20 border-b border-[#e5dcce] bg-[#ffffff]/90 shadow-sm backdrop-blur">
      <div className="flex h-16 items-center justify-between px-3 sm:px-4 lg:px-6 gap-2">
        {/* Left side - Menu button and search */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={onMenuClick}
            className="flex-shrink-0 rounded-lg p-2 text-[#6b5c4e] transition hover:bg-[#f5ede2] hover:text-[#241c15] lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="hidden md:block">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-[#9c8e7e]" />
              </div>
              <input
                type="text"
                placeholder="Search areas, staff, reports..."
                className="block w-64 lg:w-80 rounded-xl border border-[#ded5c5] bg-[#fdfbf7] py-2 pl-10 pr-3 text-sm font-medium text-[#241c15] placeholder:text-[#9c8e7e] focus:border-[#964b28] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#964b28]/20"
              />
            </div>
          </div>
        </div>

        {/* Right side - Notifications and user menu */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          <a
            href="https://safai-citizen.vercel.app/"
            target="_blank"
            rel="noreferrer"
            aria-label="Open the citizen reporting platform"
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#964b28] px-2 py-1.5 sm:px-3 sm:py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#7e3e1f]"
          >
            <span className="hidden xs:inline sm:inline">Safai-Citizen</span>
            <span className="xs:hidden sm:hidden">App</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <div className="hidden lg:block rounded-full border border-[#ded4c5] bg-[#f5ede2] px-3 py-1 text-xs font-bold text-[#8a4220]">
            System Online
          </div>
          {/* Notifications */}
          <button className="relative rounded-lg p-2 text-[#6b5c4e] transition hover:bg-[#f5ede2] hover:text-[#241c15]" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-[#964b28] rounded-full"></span>
          </button>

          {/* User menu */}
          <div className="flex items-center gap-2">
            <div className="hidden md:block text-right">
              <p className="text-sm font-bold text-[#241c15] leading-tight">{user?.name || 'User'}</p>
              <p className="text-xs text-[#7a6a58] leading-tight truncate max-w-[120px]">{user?.email || 'user@example.com'}</p>
            </div>
            <button className="flex items-center rounded-xl border border-[#ded5c5] bg-white p-1.5 text-[#6b5c4e] shadow-sm transition hover:border-[#964b28] hover:text-[#241c15] hover:shadow" aria-label="User profile">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#964b28]">
                <span className="text-sm font-bold text-white">
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
