'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, Lock, Mail, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  
  // Check if Supabase is configured
  const isSupabaseConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-login checking (for fallback PIN mode only)
  useEffect(() => {
    if (!isSupabaseConfigured) {
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies.find(c => c.trim().startsWith('garage_owner_session='));
      if (sessionCookie && sessionCookie.split('=')[1] === 'true') {
        router.push('/');
      }
    }
  }, [isSupabaseConfigured, router]);

  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const cleanEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      toast.error('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      toast.error('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        setErrorMsg(error.message);
        toast.error(error.message);
      } else {
        toast.success('Logged in successfully!');
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasscodeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = passcode.trim();
    
    if (cleanPass === '1234' || cleanPass === 'admin') {
      document.cookie = "garage_owner_session=true; path=/; max-age=31536000; SameSite=Strict";
      toast.success('Logged in successfully (Demo PIN Mode)!');
      window.location.href = '/';
    } else {
      setErrorMsg('Invalid Passcode! Try 1234');
      toast.error('Invalid Passcode! Try 1234');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white mb-4">
            <BookOpen className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">GarageBook</h1>
          <p className="mt-2 text-sm text-slate-500 font-medium">Digital Register for Every Garage</p>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 font-bold text-sm flex items-start gap-2 mb-6">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isSupabaseConfigured ? (
          /* PRODUCTION SUPABASE LOGIN FORM */
          <form className="space-y-5" onSubmit={handleSupabaseLogin}>
            
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Owner Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-base"
                  placeholder="name@garage.com"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 active:text-blue-800"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-base"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Sign In Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center items-center rounded-xl bg-blue-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-center gap-2"
              >
                {loading && <RefreshCw className="h-5 w-5 animate-spin" />}
                {loading ? 'Signing In...' : 'Login to Register'}
              </button>
            </div>

            <div className="text-center text-sm text-slate-500 font-semibold mt-4">
              Don&apos;t have a garage registered?{' '}
              <Link href="/signup" className="text-blue-600 hover:text-blue-700 active:text-blue-800">
                Register here
              </Link>
            </div>
          </form>
        ) : (
          /* LOCAL DEMO PASSCODE FORM */
          <form className="space-y-6" onSubmit={handlePasscodeLogin}>
            
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4 text-xs text-amber-800 font-semibold leading-relaxed">
              Supabase credentials not configured in `.env.local`. Running in **Local Fallback Mode** with auto-seeding enabled.
            </div>

            <div>
              <label htmlFor="passcode" className="block text-sm font-semibold text-slate-700 mb-2">
                Demo Owner Passcode
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="passcode"
                  name="passcode"
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 pl-10 pr-3 py-3 text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-base"
                  placeholder="Enter passcode (Hint: 1234)"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center items-center rounded-xl bg-blue-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800"
              >
                Login to Demo
              </button>
            </div>

            <div className="text-center text-xs text-slate-400">
              Passcode for local testing is <span className="font-bold text-slate-500">1234</span>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
