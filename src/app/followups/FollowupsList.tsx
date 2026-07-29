'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import Navigation from '../components/Navigation';
import Header from '../components/Header';
import { Bill } from '@/lib/db/types';
import { 
  Phone, MessageSquare, CheckCircle, Edit, Calendar, AlertCircle, Clock, Search, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { addPaymentToBill } from '../actions';

interface FollowupsListProps {
  initialBills: Bill[];
  garageName: string;
}

export default function FollowupsList({ initialBills, garageName }: FollowupsListProps) {
  const [bills, setBills] = useState<Bill[]>(initialBills);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleMarkPaid = async (billId: string, remainingAmount: number) => {
    if (!confirm(`Are you sure you want to mark this bill as fully PAID by CASH? Amount: ₹${remainingAmount}`)) {
      return;
    }
    
    toast.loading('Clearing invoice balance...', { id: 'clear-balance' });

    startTransition(async () => {
      try {
        await addPaymentToBill(billId, 'CASH', remainingAmount, 'Cleared via Followups Dashboard');
        // Update local state instantly
        setBills(prev => prev.filter(b => b.id !== billId));
        toast.success('Outstanding balance cleared!', { id: 'clear-balance' });
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to clear balance.', { id: 'clear-balance' });
      }
    });
  };

  const triggerWhatsAppReminder = (bill: Bill) => {
    const custName = bill.customer?.name || 'Customer';
    const vehNum = bill.vehicle?.vehicleNumber || 'Vehicle';
    const remaining = bill.remainingAmount;
    
    const text = `Hello ${custName}

Your vehicle ${vehNum} service bill is still pending.

Outstanding Amount: ₹${remaining}

Please visit the garage or contact us.

Thank you.`;

    const cleanPhone = bill.customer?.phone.replace(/[^0-9]/g, '') || '';
    const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('WhatsApp redirect opened!');
  };

  // Filter bills by search query
  const filteredBills = bills.filter(b => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      b.customer?.name.toLowerCase().includes(q) ||
      b.customer?.phone.includes(q) ||
      b.vehicle?.vehicleNumber.toLowerCase().includes(q) ||
      b.invoiceNumber.toLowerCase().includes(q)
    );
  });

  // Date constants for classification
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return dStart === todayStart;
  };

  const isTomorrow = (dateStr: string) => {
    const d = new Date(dateStr);
    const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return dStart === todayStart + oneDayMs;
  };

  const isBeforeToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return dStart < todayStart;
  };

  const isThisWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    // next 7 days, excluding today/tomorrow
    return dStart > todayStart + oneDayMs && dStart <= todayStart + 7 * oneDayMs;
  };

  // Classify pending bills
  const overdueBills = filteredBills.filter(b => b.expectedPaymentDate && isBeforeToday(b.expectedPaymentDate));
  const todaysFollowups = filteredBills.filter(b => b.followupReminderDate && isToday(b.followupReminderDate));
  const tomorrowsFollowups = filteredBills.filter(b => b.followupReminderDate && isTomorrow(b.followupReminderDate));
  const weeksFollowups = filteredBills.filter(b => b.followupReminderDate && isThisWeek(b.followupReminderDate));
  
  // Others have no set followups or future followups
  const otherPendingBills = filteredBills.filter(b => 
    !overdueBills.includes(b) && 
    !todaysFollowups.includes(b) && 
    !tomorrowsFollowups.includes(b) && 
    !weeksFollowups.includes(b)
  );

  // Group configurations for rendering
  const groups = [
    { title: '🔴 Overdue Payments', list: overdueBills, color: 'border-red-200 bg-red-50/20 text-red-800' },
    { title: '🟠 Today\'s Follow-ups', list: todaysFollowups, color: 'border-amber-200 bg-amber-50/20 text-amber-800' },
    { title: '🟡 Tomorrow\'s Follow-ups', list: tomorrowsFollowups, color: 'border-yellow-200 bg-yellow-50/10 text-yellow-800' },
    { title: '🔵 This Week\'s Follow-ups', list: weeksFollowups, color: 'border-blue-200 bg-blue-50/10 text-blue-800' },
    { title: '⚪ Other Outstanding Accounts', list: otherPendingBills, color: 'border-slate-200 bg-slate-50 text-slate-800' },
  ];

  // Helper to calculate days pending
  const getDaysPending = (dateStr: string) => {
    const diffTime = Math.abs(Date.now() - new Date(dateStr).getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation garageName={garageName} />

      <div className="flex-1 md:pl-64 min-h-screen flex flex-col pb-20 md:pb-0">
        <Header garageName={garageName} title="Follow-ups" showBackButton={true} backDestination="/" />

        <main className="max-w-2xl w-full mx-auto px-4 py-4 md:py-8">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Payments & Follow-ups</h1>
              <p className="text-slate-500 font-medium mt-1">Track outstanding balances, set reminders, and contact customers</p>
            </div>
          </div>

          {/* Universal search bar */}
          <div className="relative mb-6">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4.5 w-4.5 text-slate-400" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer, phone, registration no..."
              className="w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-base"
            />
          </div>

          {/* Render Groups */}
          <div className="space-y-8">
            {groups.map((group, gIdx) => {
              if (group.list.length === 0) return null;
              
              return (
                <div key={gIdx} className="space-y-3">
                  <div className={`border rounded-xl px-4 py-2 text-sm font-extrabold tracking-wide ${group.color}`}>
                    {group.title} ({group.list.length})
                  </div>

                  <div className="space-y-3">
                    {group.list.map((bill) => {
                      const days = getDaysPending(bill.date);
                      return (
                        <div key={bill.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                          
                          {/* Top row */}
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <div className="font-extrabold text-slate-900 text-base">{bill.customer?.name}</div>
                              <div className="text-slate-500 font-semibold text-xs mt-0.5">Phone: {bill.customer?.phone}</div>
                              
                              <div className="flex items-center gap-2 mt-2">
                                <span className="bg-slate-100 font-mono font-bold border border-slate-200 px-1.5 py-0.2 rounded text-[11px] text-slate-800">
                                  {bill.vehicle?.vehicleNumber}
                                </span>
                                <span className="text-xs text-slate-500 font-semibold">
                                  {bill.vehicle?.brand} {bill.vehicle?.model}
                                </span>
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">Outstanding</span>
                              <div className="text-xl font-black text-red-600 font-mono">
                                ₹{bill.remainingAmount}
                              </div>
                              <span className="text-[10px] text-slate-400 block font-semibold">
                                Bill total: ₹{bill.total} (Days: {days})
                              </span>
                            </div>
                          </div>

                          {/* expected date details */}
                          {(bill.expectedPaymentDate || bill.paymentNotes) && (
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                              {bill.expectedPaymentDate && (
                                <div>
                                  Expected On:{' '}
                                  <span className="font-bold">
                                    {new Date(bill.expectedPaymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                              )}
                              {bill.paymentNotes && (
                                <div className="italic text-slate-500">Note: {bill.paymentNotes}</div>
                              )}
                            </div>
                          )}

                          {/* Buttons row */}
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                            
                            <a
                              href={`tel:${bill.customer?.phone}`}
                              className="flex-1 min-w-[70px] inline-flex items-center justify-center gap-1 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all"
                            >
                              <Phone className="h-3.5 w-3.5" /> Call
                            </a>

                            <button
                              onClick={() => triggerWhatsAppReminder(bill)}
                              className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold transition-all"
                            >
                              <MessageSquare className="h-3.5 w-3.5" /> Send WhatsApp
                            </button>

                            <button
                              onClick={() => handleMarkPaid(bill.id, bill.remainingAmount)}
                              className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1 py-2 bg-success hover:bg-success-hover text-white rounded-xl text-xs font-bold transition-all"
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Mark Paid
                            </button>

                            <Link
                              href={`/bill/${bill.id}/edit`}
                              className="inline-flex items-center justify-center h-8.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Link>

                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Empty State */}
            {filteredBills.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-700">All balances fully paid!</h3>
                <p className="text-slate-400 text-sm mt-1">There are no outstanding customer follow-ups or pending collections at this time.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
