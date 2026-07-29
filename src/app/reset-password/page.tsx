'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, Lock, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccess(false);

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      toast.error('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMsg(error.message);
        toast.error(error.message);
      } else {
        setSuccess(true);
        toast.success('Password updated successfully!');
        
        // Clear session state to enforce fresh login
        document.cookie = "garage_owner_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        sessionStorage.clear();
        localStorage.clear();
        
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('An unexpected network error occurred. Please check your connection.');
    } finally {
      setLoading(false);
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
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Set New Password</h1>
          <p className="mt-2 text-sm text-slate-500 font-medium">Enter your new secure password below</p>
        </div>

        {/* Messaging alerts */}
        {errorMsg && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 font-bold text-sm flex items-start gap-2 mb-6">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl border border-green-200 bg-green-50 text-green-800 font-bold text-sm flex items-start gap-2 mb-6">
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
            <span>Password updated! Redirecting to login...</span>
          </div>
        )}

        <form className="space-y-5" onSubmit={handlePasswordReset}>
          {/* New Password */}
          <div>
            <label htmlFor="pass" className="block text-sm font-semibold text-slate-700 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="pass"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-base"
                placeholder="New password (min 6 chars)"
                autoFocus
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirm" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="confirm"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-base"
                placeholder="Repeat new password"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || success}
              className="flex w-full justify-center items-center rounded-xl bg-blue-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 gap-2"
            >
              {loading && <RefreshCw className="h-5 w-5 animate-spin" />}
              {loading ? 'Updating Password...' : 'Save New Password'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
