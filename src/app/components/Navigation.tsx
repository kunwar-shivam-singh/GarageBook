'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Home, PlusCircle, Search, Settings, 
  FileText, LogOut, BookOpen, Clock, Wrench, Upload,
  X, Menu, HelpCircle, Info, Users, Play
} from 'lucide-react';

interface NavigationProps {
  garageName: string;
}

export default function Navigation({ garageName }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const drawerTouchStartX = React.useRef(0);

  const closeDrawer = () => {
    setMobileDrawerOpen(false);
    if (typeof window !== 'undefined' && window.history.state?.drawerOpen) {
      window.history.back();
    }
  };

  const handleDrawerNavigation = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileDrawerOpen(false);
    if (typeof window !== 'undefined' && window.history.state?.drawerOpen) {
      window.history.back();
      setTimeout(() => {
        router.push(href);
      }, 80);
    } else {
      router.push(href);
    }
  };

  const handleDrawerTouchStart = (e: React.TouchEvent) => {
    drawerTouchStartX.current = e.touches[0].clientX;
  };

  const handleDrawerTouchEnd = (e: React.TouchEvent) => {
    const diff = drawerTouchStartX.current - e.changedTouches[0].clientX;
    if (diff > 60) {
      closeDrawer();
    }
  };

  // Real-time synchronization across tabs and devices
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('gb_realtime_sync');
      bc.onmessage = (event) => {
        if (event.data === 'gb-data-changed') {
          router.refresh();
        }
      };
    }

    const handleCustomEvent = () => {
      if (bc) {
        try {
          bc.postMessage('gb-data-changed');
        } catch (e) {
          // Ignore closed channel errors
        }
      }
      router.refresh();
    };

    window.addEventListener('gb-data-changed', handleCustomEvent);
    return () => {
      window.removeEventListener('gb-data-changed', handleCustomEvent);
      if (bc) bc.close();
    };
  }, [router]);

  // 1. Swipe right from left edge to open the drawer
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;

      // Only horizontal swipes trigger it
      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 80 && touchStartX < 35) {
          setMobileDrawerOpen(true);
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);

    const handleOpenDrawer = () => setMobileDrawerOpen(true);
    window.addEventListener('gb-open-mobile-drawer', handleOpenDrawer);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('gb-open-mobile-drawer', handleOpenDrawer);
    };
  }, []);

  // 2. Intercept browser/Android back button to close drawer
  useEffect(() => {
    if (!mobileDrawerOpen) return;

    window.history.pushState({ drawerOpen: true }, '');

    const handlePopState = () => {
      setMobileDrawerOpen(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [mobileDrawerOpen]);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      try {
        const isSupabase = !!(
          process.env.NEXT_PUBLIC_SUPABASE_URL && 
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        if (isSupabase) {
          await supabase.auth.signOut();
        }
      } catch (err) {
        console.error(err);
      }
      
      document.cookie = "garage_owner_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      sessionStorage.clear();
      localStorage.clear();
      
      window.location.href = '/login';
    }
  };

  const navItems = [
    { label: 'Dashboard', href: '/', icon: Home, showOnMobile: true, mobileLabel: 'Home' },
    { label: 'New Entry', href: '/entry/new', icon: PlusCircle, showOnMobile: true, mobileLabel: 'New Bill' },
    { label: 'Working Jobs', href: '/working', icon: Play, showOnMobile: false },
    { label: 'Open Services', href: '/queue', icon: Wrench, showOnMobile: true, mobileLabel: 'Open Queue' },
    { label: 'Search', href: '/search', icon: Search, showOnMobile: true, mobileLabel: 'Search' },
    { label: 'Reports', href: '/reports', icon: BookOpen, showOnMobile: true, mobileLabel: 'Reports' },
    { label: 'Recent Bills', href: '/bills', icon: FileText, showOnMobile: false },
    { label: 'Follow-ups', href: '/followups', icon: Clock, showOnMobile: false },
    { label: 'Import Dues', href: '/imports', icon: Upload, showOnMobile: false },
    { label: 'Settings', href: '/settings', icon: Settings, showOnMobile: false },
  ];

  const drawerLinks = [
    { label: 'Dashboard', href: '/', icon: Home },
    { label: 'New Entry', href: '/entry/new', icon: PlusCircle },
    { label: 'Working Jobs', href: '/working', icon: Play },
    { label: 'Open Services', href: '/queue', icon: Wrench },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Reports', href: '/reports', icon: BookOpen },
    { label: 'Recent Bills', href: '/bills', icon: FileText },
    { label: 'Follow-ups', href: '/followups', icon: Clock },
    { label: 'Import Dues', href: '/imports', icon: Upload },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const isDrawerActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/entry') return pathname.startsWith('/entry');
    return pathname === href || pathname.startsWith(href);
  };

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

      {/* 3. MOBILE SLIDE-OUT DRAWER */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Overlay backdrop */}
          <div 
            onClick={closeDrawer}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
          />
          
          {/* Drawer Panel */}
          <div 
            onTouchStart={handleDrawerTouchStart}
            onTouchEnd={handleDrawerTouchEnd}
            className="relative flex flex-col w-64 max-w-xs bg-white h-full shadow-2xl z-50 animate-in slide-in-from-left duration-200"
          >
            
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <BookOpen className="h-4 w-4" />
                </div>
                <span className="font-extrabold text-slate-900 tracking-tight text-sm">GarageBook Menu</span>
              </div>
              <button 
                onClick={closeDrawer}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Menu Items */}
            <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
              {drawerLinks.map((item) => {
                const Icon = item.icon;
                const active = isDrawerActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleDrawerNavigation(e, item.href)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                      active 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-5 w-5 text-slate-400" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* About Button triggers modal dialog */}
              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  setAboutOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors text-left"
              >
                <Info className="h-5 w-5 text-slate-400" />
                <span>About</span>
              </button>
            </nav>

            {/* Logout at the bottom of the drawer */}
            <div className="p-4 border-t border-slate-100 flex-shrink-0 bg-slate-50">
              <button
                onClick={() => {
                  setMobileDrawerOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 rounded-xl py-3 text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <LogOut className="h-4.5 w-4.5" />
                <span>Logout</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 4. ABOUT DIALOG MODAL */}
      {aboutOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            onClick={() => setAboutOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
          />
          <div className="relative bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 z-10 animate-in zoom-in-95 duration-200 text-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mx-auto">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">GarageBook v1.0</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Digital Register for Garages</p>
            </div>
            <p className="text-slate-600 text-xs font-semibold leading-relaxed">
              Designed to help garage owners track intake sheets, manage work orders, and generate invoices with real-time stats updates.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setAboutOpen(false)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2.5 text-xs font-extrabold active:scale-95 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
