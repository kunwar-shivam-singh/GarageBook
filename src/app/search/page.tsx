'use client';

import React, { useState, useEffect, useRef } from 'react';
import Navigation from '../components/Navigation';
import Header from '../components/Header';
import Link from 'next/link';
import { getSettings, searchUniversal } from '../actions';
import { Search, User, Bike, FileText, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const searchCache: Record<string, any[]> = {};

export default function SearchPage() {
  const [garageName, setGarageName] = useState('GarageBook');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load garage settings for header
  useEffect(() => {
    getSettings().then((data) => {
      if (data) setGarageName(data.name);
    });
  }, []);

  // Focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Run search query (with debounce and local cache)
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      const trimmed = query.trim().toLowerCase();
      if (!trimmed) {
        setResults([]);
        setSearching(false);
        return;
      }

      // Check memory cache first
      if (searchCache[trimmed]) {
        setResults(searchCache[trimmed]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const searchData = await searchUniversal(trimmed);
        const fetchedResults = searchData || [];
        searchCache[trimmed] = fetchedResults;
        setResults(fetchedResults);
      } catch (err) {
        console.error('Search error:', err);
        toast.error('Search failed. Check connection.');
      } finally {
        setSearching(false);
      }
    }, 150);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar Navigation */}
      <Navigation garageName={garageName} />

      {/* Main Content Pane */}
      <div className="flex-1 md:pl-64 min-h-screen flex flex-col pb-20 md:pb-0">
        
        {/* Header */}
        <Header garageName={garageName} showBackButton={true} backDestination="/" />

        <main className="max-w-2xl w-full mx-auto px-4 py-8">
          
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Search Customer</h1>
            <p className="text-slate-500 font-medium mt-1">Search by Customer Name, Phone, or Vehicle Number</p>
          </div>

          {/* Search Bar */}
          <div className="relative mb-8">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Search className="h-6 w-6 text-slate-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="block w-full rounded-2xl border border-slate-300 pl-12 pr-4 py-4 text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-lg shadow-sm"
              placeholder="Type customer name, phone, or vehicle number..."
            />
            {searching && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <RefreshCw className="h-5 w-5 text-slate-400 animate-spin" />
              </div>
            )}
          </div>

          {/* Results List */}
          <div className="space-y-4">
            {query.trim() === '' ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
                <Search className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700">Start typing to search</h3>
                <p className="text-slate-400 text-sm mt-1">We will show matching results instantly</p>
              </div>
            ) : results.length === 0 && !searching ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
                <AlertNoResults query={query} />
              </div>
            ) : (
              results.map((result, index) => (
                <Link
                  key={index}
                  href={`/customer/${result.customer.id}`}
                  className="block bg-white border border-slate-200 hover:border-blue-400 active:bg-slate-50 rounded-2xl p-5 shadow-sm transition-colors text-left"
                >
                  <div className="flex justify-between items-start">
                    
                    <div className="space-y-3 flex-1">
                      
                      {/* Customer Profile */}
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{result.customer.name}</h3>
                          <p className="text-sm font-semibold text-slate-500">{result.customer.phone}</p>
                        </div>
                      </div>

                      {/* Vehicles Info */}
                      <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                        {result.vehicles.length > 0 ? (
                          result.vehicles.map((v: any, vIdx: number) => (
                            <div 
                              key={vIdx}
                              className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold border border-slate-200"
                            >
                              <Bike className="h-3 w-3" />
                              <span>{v.brand} {v.model} ({v.vehicleNumber})</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs font-semibold text-slate-400 italic">No vehicles added</span>
                        )}
                      </div>

                      {/* Bills Info */}
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span>{result.bills.length} Service Invoice{result.bills.length !== 1 ? 's' : ''}</span>
                      </div>

                    </div>

                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-400 self-center flex-shrink-0">
                      <ArrowRight className="h-5 w-5" />
                    </div>

                  </div>
                </Link>
              ))
            )}
          </div>

        </main>
      </div>
    </div>
  );
}

function AlertNoResults({ query }: { query: string }) {
  return (
    <>
      <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-slate-800">No matching customer found</h3>
      <p className="text-slate-500 text-sm mt-1">We couldn&apos;t find any records for &ldquo;{query}&rdquo;</p>
      <div className="mt-4">
        <Link 
          href="/entry/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm animate-none"
        >
          Create New Customer Entry
        </Link>
      </div>
    </>
  );
}
