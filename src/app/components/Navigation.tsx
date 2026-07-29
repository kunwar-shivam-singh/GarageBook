'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Home, PlusCircle, Search, Settings, 
  FileText, LogOut, BookOpen, Clock, Wrench, Upload
} from 'lucide-react';

interface NavigationProps {
  garageName: string;
}

export default function Navigation({ garageName }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    }
  };

  const navItems = [
    { label: 'Dashboard', href: '/', icon: Home, showOnMobile: true, mobileLabel: 'Home' },
    { label: 'New Entry', href: '/entry/new', icon: PlusCircle, showOnMobile: true, mobileLabel: 'New Bill' },
    { label: 'Open Services', href: '/queue', icon: Wrench, showOnMobile: true, mobileLabel: 'Open Queue' },
    { label: 'Search', href: '/search', icon: Search, showOnMobile: true, mobileLabel: 'Search' },
    { label: 'Reports', href: '/reports', icon: BookOpen, showOnMobile: true, mobileLabel: 'Reports' },
    { label: 'Recent Bills', href: '/bills', icon: FileText, showOnMobile: false },
    { label: 'Follow-ups', href: '/followups', icon: Clock, showOnMobile: false },
    { label: 'Import Dues', href: '/imports', icon: Upload, showOnMobile: false },
    { label: 'Settings', href: '/settings', icon: Settings, showOnMobile: false },
  ];

  return (
    <>
      {/* 1. DESKTOP SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 fixed left-0 top-0 bottom-0 z-30 no-print">
        
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-2 flex-shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-slate-900 tracking-tight leading-none text-base">GarageBook</span>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5 max-w-[140px] truncate">
              {garageName}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50 active:bg-slate-100'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Settings & Logout */}
        <div className="p-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>

      </aside>

      {/* 2. MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-40 flex items-center justify-around px-2 no-print shadow-lg">
        {navItems.filter(item => item.showOnMobile).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-colors ${
                isActive 
                  ? 'text-blue-600 font-bold' 
                  : 'text-slate-400 active:bg-slate-50'
              }`}
            >
              <Icon className="h-6 w-6 flex-shrink-0" />
              <span className="text-[10px] mt-0.5 tracking-tight font-semibold">
                {item.mobileLabel || item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
