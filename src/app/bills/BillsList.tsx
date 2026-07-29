'use client';

import React, { useState } from 'react';
import Navigation from '../components/Navigation';
import Header from '../components/Header';
import Link from 'next/link';
import { FileText, Calendar, User, Bike, Eye, Edit2, Info, DollarSign } from 'lucide-react';
import { Bill } from '@/lib/db/types';

interface BillsListProps {
  initialBills: Bill[];
  garageName: string;
}

export default function BillsList({ initialBills, garageName }: BillsListProps) {
  const [filter, setFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');

  // Filter bills
  const filteredBills = initialBills.filter((bill) => {
    if (filter === 'ALL') return true;
    return bill.paymentStatus === filter;
  });

  const paidCount = initialBills.filter(b => b.paymentStatus === 'PAID').length;
  const pendingCount = initialBills.filter(b => b.paymentStatus === 'PENDING').length;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar Navigation */}
      <Navigation garageName={garageName} />

      {/* Main Content Pane */}
      <div className="flex-1 md:pl-64 min-h-screen flex flex-col pb-20 md:pb-0">
        
        {/* Header */}
        <Header garageName={garageName} title="Bills History" showBackButton={true} backDestination="/" />

        <main className="max-w-2xl w-full mx-auto px-4 py-4 md:py-8">
          
          {/* Title Section */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Recent Bills</h1>
              <p className="text-slate-500 font-medium mt-1">Review, edit, and print recent invoices</p>
            </div>
            <Link
              href="/entry/new"
              className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-3 rounded-xl text-base font-bold shadow-sm self-start sm:self-center"
            >
              Create New Bill
            </Link>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 p-1.5 bg-slate-200/60 rounded-xl mb-6 font-bold text-sm">
            <button
              onClick={() => setFilter('ALL')}
              className={`flex-1 text-center py-2.5 rounded-lg transition-colors ${
                filter === 'ALL' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-950 active:bg-slate-300/40'
              }`}
            >
              All ({initialBills.length})
            </button>
            <button
              onClick={() => setFilter('PAID')}
              className={`flex-1 text-center py-2.5 rounded-lg transition-colors ${
                filter === 'PAID' 
                  ? 'bg-success text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-950 active:bg-slate-300/40'
              }`}
            >
              Paid ({paidCount})
            </button>
            <button
              onClick={() => setFilter('PENDING')}
              className={`flex-1 text-center py-2.5 rounded-lg transition-colors ${
                filter === 'PENDING' 
                  ? 'bg-amber-500 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-950 active:bg-slate-300/40'
              }`}
            >
              Pending ({pendingCount})
            </button>
          </div>

          {/* Bills list */}
          <div className="space-y-4">
            {filteredBills.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                <Info className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-base font-bold text-slate-700">No invoices match this filter</h3>
                <p className="text-slate-400 text-sm mt-1">Generate a new bill to populate this view</p>
              </div>
            ) : (
              filteredBills.map((bill, index) => (
                <div 
                  key={index}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-300"
                >
                  
                  {/* Bill Card Header */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-extrabold text-slate-900">{bill.invoiceNumber}</span>
                        <span className={`inline-block font-extrabold text-xs px-2 py-0.5 rounded-full ${
                          bill.paymentStatus === 'PAID' 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {bill.paymentStatus}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400 font-semibold">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(bill.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                    
                    {/* Price */}
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-400">Grand Total</span>
                      <div className="text-2xl font-black text-slate-900 flex items-center justify-end leading-none">
                        ₹{bill.total}
                      </div>
                    </div>
                  </div>

                  {/* Details Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-sm">
                    
                    {/* Customer Info */}
                    {bill.customer && (
                      <div className="flex items-center gap-2 text-slate-800">
                        <User className="h-4.5 w-4.5 text-slate-400" />
                        <div>
                          <span className="font-bold">{bill.customer.name}</span>
                          <span className="text-slate-400 mx-1.5">•</span>
                          <span className="font-semibold text-slate-500">{bill.customer.phone}</span>
                        </div>
                      </div>
                    )}

                    {/* Vehicle Info */}
                    {bill.vehicle && (
                      <div className="flex items-center gap-2 text-slate-800">
                        <Bike className="h-4.5 w-4.5 text-slate-400" />
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">{bill.vehicle.brand} {bill.vehicle.model}</span>
                          <span className="bg-slate-100 font-mono font-bold text-xs border border-slate-200 rounded px-1.5 py-0.5 text-slate-700">
                            {bill.vehicle.vehicleNumber}
                          </span>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <Link
                      href={`/bill/${bill.id}`}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center h-10 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm gap-1.5"
                    >
                      <Eye className="h-4 w-4" /> View Bill
                    </Link>
                    <Link
                      href={`/bill/${bill.id}/edit`}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center h-10 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm gap-1.5"
                    >
                      <Edit2 className="h-4 w-4" /> Edit
                    </Link>
                  </div>

                </div>
              ))
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
