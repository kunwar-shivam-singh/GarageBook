'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, Mail, ArrowLeft, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccess(false);

    const cleanEmail = email.trim().toLowerCase();
    
    // Explicit client-side validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address (e.g. owner@garage.com).');
      toast.error('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setErrorMsg(error.message);
        toast.error(error.message);
      } else {
        setSuccess(true);
        toast.success('Password recovery link sent successfully!');
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
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Forgot Password</h1>
          <p className="mt-2 text-sm text-slate-500 font-medium">Send password recovery link to your email</p>
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
            <span>Check your inbox for the password reset link!</span>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleResetRequest}>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
              Email Address
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
                placeholder="owner@garage.com"
                autoFocus
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center items-center rounded-xl bg-blue-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 gap-2"
            >
              {loading && <RefreshCw className="h-5 w-5 animate-spin" />}
              {loading ? 'Sending Link...' : 'Send Recovery Link'}
            </button>

            <Link
              href="/login"
              className="flex w-full justify-center items-center gap-1.5 px-4 py-3 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 rounded-xl text-slate-700 font-semibold text-sm transition-colors mt-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Login</span>
            </Link>
          </div>
        </form>

      </div>
    </div>
  );
}
