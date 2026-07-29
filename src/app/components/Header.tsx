'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, ArrowLeft, Menu, Search } from 'lucide-react';
import { getLiveHeaderStats } from '@/app/actions';

interface HeaderProps {
  garageName?: string;
  title?: string;
  showBackButton?: boolean;
  backDestination?: string;
  showSearchIcon?: boolean;
}

export default function Header({ 
  garageName = 'GarageBook', 
  title = '',
  showBackButton = false, 
  backDestination = '/',
  showSearchIcon = false
}: HeaderProps) {
  const router = useRouter();

  // Live Statistics State
  const [stats, setStats] = useState({
    queue: 0,
    working: 0,
    waiting: 0,
    ready: 0,
    todaysJobs: 0,
    pendingBills: 0,
    todaysCollection: 0
  });

  const loadStats = useCallback(async () => {
    try {
      const data = await getLiveHeaderStats();
      if (data) {
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load header live stats:', err);
    }
  }, []);

  useEffect(() => {
    loadStats();
    
    // Refresh stats when custom events fire (real-time local triggers)
    window.addEventListener('gb-data-changed', loadStats);

    // Setup 10-second polling for background updates
    const interval = setInterval(loadStats, 10000);

    return () => {
      window.removeEventListener('gb-data-changed', loadStats);
      clearInterval(interval);
    };
  }, [loadStats]);

  // Context-aware prioritized default index helper
  const getContextIndex = useCallback(() => {
    if (stats.queue > 0) return 0; // Queue
    if (stats.working > 0) return 1; // Working
    if (stats.ready > 0) return 3; // Ready
    return 4; // Today's Jobs
  }, [stats]);

  // List of all 7 display metrics
  const metricsList = useMemo(() => [
    { text: `🚗 Queue: ${stats.queue}`, key: 'queue' },
    { text: `🔧 Working: ${stats.working}`, key: 'working' },
    { text: `⏳ Waiting: ${stats.waiting}`, key: 'waiting' },
    { text: `✅ Ready: ${stats.ready}`, key: 'ready' },
    { text: `📅 Today: ${stats.todaysJobs}`, key: 'todaysJobs' },
    { text: `💰 Pending: ₹${stats.pendingBills.toLocaleString()}`, key: 'pendingBills' },
    { text: `💵 Collection: ₹${stats.todaysCollection.toLocaleString()}`, key: 'todaysCollection' }
  ], [stats]);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const userInteractedRef = useRef<NodeJS.Timeout | null>(null);

  // Sync activeIndex with context-aware default unless user interacts
  useEffect(() => {
    if (userInteractedRef.current === null) {
      setActiveIndex(getContextIndex());
    }
  }, [stats, getContextIndex]);

  const handleCycle = () => {
    if (userInteractedRef.current) {
      clearTimeout(userInteractedRef.current);
    }

    const currentIdx = activeIndex ?? getContextIndex();
    const nextIdx = (currentIdx + 1) % metricsList.length;
    setActiveIndex(nextIdx);

    // After 5 seconds of inactivity, revert back to the priority context view
    userInteractedRef.current = setTimeout(() => {
      setActiveIndex(getContextIndex());
      userInteractedRef.current = null;
    }, 5000);
  };

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50 no-print h-14 md:h-16 flex items-center">
      <div className="max-w-4xl mx-auto px-4 w-full h-full flex items-center justify-between">
        
        {/* Left Side: Back button / Hamburger on Mobile; Brand Logo on Desktop */}
        <div className="flex items-center space-x-3 min-w-[40px] md:min-w-0">
          {showBackButton ? (
            <Link 
              href={backDestination}
              className="flex items-center justify-center h-10 w-10 rounded-xl hover:bg-slate-100 text-slate-700 active:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
          ) : (
            <>
              {/* Hamburger Menu on Mobile */}
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('gb-open-mobile-drawer'))}
                title="Open menu"
                className="flex md:hidden items-center justify-center h-10 w-10 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-800 active:bg-slate-100 transition-colors cursor-pointer"
              >
                <Menu className="h-6 w-6" />
              </button>

              <Link 
                href="/"
                className="hidden md:flex items-center space-x-2 text-blue-600 font-extrabold text-lg"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <BookOpen className="h-5 w-5" />
                </div>
                <span className="text-slate-900 tracking-tight">GarageBook</span>
              </Link>
            </>
          )}

          <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
          
          {/* Desktop Active Garage Name */}
          <span className="hidden md:inline font-bold text-slate-800 text-lg max-w-[250px] truncate">
            {garageName}
          </span>
        </div>

        {/* Mobile Center: Smart Live Status Header */}
        <div className="flex md:hidden flex-1 justify-center px-2">
          <button
            type="button"
            onClick={handleCycle}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 active:scale-95 transition-all cursor-pointer select-none max-w-[180px] truncate"
            title="Tap to cycle statistics"
          >
            <span key={activeIndex ?? 0} className="animate-in fade-in slide-in-from-bottom-1 duration-200">
              {metricsList[activeIndex ?? 0]?.text}
            </span>
          </button>
        </div>

        {/* Right Side: Quick Action & Search icon shortcut on mobile */}
        <div className="flex items-center space-x-2 flex-shrink-0 min-w-[40px] justify-end">
          {showSearchIcon && (
            <Link
              href="/search"
              className="flex md:hidden items-center justify-center h-10 w-10 rounded-xl text-slate-500 hover:text-slate-800 active:bg-slate-50 transition-colors cursor-pointer"
              title="Search Customer"
            >
              <Search className="h-5.5 w-5.5" />
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}
