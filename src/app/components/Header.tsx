'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, LogOut, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  garageName?: string;
  showBackButton?: boolean;
  backDestination?: string;
}

export default function Header({ 
  garageName = 'GarageBook', 
  showBackButton = false, 
  backDestination = '/' 
}: HeaderProps) {
  const router = useRouter();

  const handleLogout = () => {
    // Clear session cookie
    document.cookie = "garage_owner_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.href = '/login';
  };

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50 no-print">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Left Side: Back button or Brand Logo */}
        <div className="flex items-center space-x-3">
          {showBackButton ? (
            <Link 
              href={backDestination}
              className="flex items-center justify-center h-10 w-10 rounded-xl hover:bg-slate-100 text-slate-700 active:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
          ) : (
            <Link 
              href="/"
              className="flex items-center space-x-2 text-blue-600 font-extrabold text-lg"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="hidden sm:inline text-slate-900 tracking-tight">GarageBook</span>
            </Link>
          )}

          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
          
          {/* Active Garage Name */}
          <span className="font-bold text-slate-800 text-base sm:text-lg max-w-[150px] sm:max-w-[250px] truncate">
            {garageName}
          </span>
        </div>

        {/* Right Side: Quick Action & Log Out */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleLogout}
            title="Log Out"
            className="flex items-center justify-center h-10 px-3 rounded-xl text-slate-500 hover:text-red-600 hover:bg-slate-50 active:bg-slate-100 font-medium text-sm gap-1.5"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>

      </div>
    </header>
  );
}
