'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, User, Lock, Mail, Store, ArrowLeft, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SignupPage() {
  const router = useRouter();

  // Form states
  const [ownerName, setOwnerName] = useState('');
  const [garageName, setGarageName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccess(false);

    const cleanEmail = email.trim().toLowerCase();

    // Validation checks
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address (e.g. owner@garage.com).');
      toast.error('Please enter a valid email address.');
      return;
    }
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
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            name: ownerName.trim(),
            garage_name: garageName.trim(),
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        toast.error(error.message);
      } else {
        // If auto-sign-in is active (session exists), redirect straight to dashboard
        if (data.session) {
          toast.success('Registration complete! Welcome to GarageBook.');
          router.push('/');
          router.refresh();
        } else {
          // If email confirmation is required by Supabase
          setSuccess(true);
          toast.success('Registration successful! Please check your email inbox.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('An unexpected error occurred. Please try again.');
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
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Register Garage</h1>
          <p className="mt-2 text-sm text-slate-500 font-medium">Create your digital register account</p>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 font-bold text-sm flex items-start gap-2 mb-6">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Global Success Banner */}
        {success && (
          <div className="p-4 rounded-xl border border-green-200 bg-green-50 text-green-800 font-bold text-sm flex items-start gap-2 mb-6">
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
            <span>Registration complete! Check your email to confirm your account before logging in.</span>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSignup}>
          
          {/* Owner Name */}
          <div>
            <label htmlFor="ownerName" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Owner Name
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="ownerName"
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-base"
                placeholder="Ramesh Patil"
                autoFocus
              />
            </div>
          </div>

          {/* Garage Name */}
          <div>
            <label htmlFor="garageName" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Garage Name
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Store className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="garageName"
                type="text"
                required
                value={garageName}
                onChange={(e) => setGarageName(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-base"
                placeholder="Speed Riders Garage"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-base"
                placeholder="name@garage.com"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="pass" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Password
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
                placeholder="Min 6 characters"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPass" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="confirmPass"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-base"
                placeholder="Repeat password"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading || success}
              className="flex w-full justify-center items-center rounded-xl bg-blue-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 gap-2"
            >
              {loading && <RefreshCw className="h-5 w-5 animate-spin" />}
              {loading ? 'Creating Account...' : 'Register Garage'}
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
