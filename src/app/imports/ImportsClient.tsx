'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Upload, Search, Calendar, User, Phone, Bike, 
  FileText, CheckCircle, Info, ChevronRight
} from 'lucide-react';
import { ManualImport } from '@/lib/db/types';
import { createManualImport } from '@/app/actions';
import { toast } from 'sonner';

interface ImportsClientProps {
  initialImports: ManualImport[];
  garageName: string;
}

export default function ImportsClient({ initialImports, garageName }: ImportsClientProps) {
  const router = useRouter();
  const [imports, setImports] = useState<ManualImport[]>(initialImports);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [billDate, setBillDate] = useState('');
  const [amount, setAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Computed Pending
  const pendingAmount = Math.max(0, Number(amount || 0) - Number(paidAmount || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !phone || !vehicleNumber || !amount || !billDate) {
      toast.error('Please fill in all required fields.');
      return;
    }
    if (phone.replace(/[^0-9]/g, '').length !== 10) {
      toast.error('Please enter a valid 10-digit phone number.');
      return;
    }

    setSubmitting(true);
    toast.loading('Logging imported invoice details...', { id: 'import-toast' });

    try {
      const input = {
        customerName: customerName.trim(),
        phone: phone.trim(),
        vehicleNumber: vehicleNumber.toUpperCase().trim(),
        billDate: new Date(billDate).toISOString(),
        amount: Number(amount),
        paidAmount: Number(paidAmount || 0),
        pendingAmount: pendingAmount,
        notes: notes.trim() || undefined
      };

      const res = await createManualImport(input);
      
      setImports(prev => [res, ...prev]);
      toast.success('Invoice logged successfully!', { id: 'import-toast' });
      
      // Reset Form
      setCustomerName('');
      setPhone('');
      setVehicleNumber('');
      setBillDate('');
      setAmount('');
      setPaidAmount('');
      setNotes('');
      
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save imported bill.', { id: 'import-toast' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredImports = imports.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      m.customerName.toLowerCase().includes(q) ||
      m.phone.includes(q) ||
      m.vehicleNumber.toLowerCase().includes(q) ||
      (m.notes && m.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. ENTRY PANEL */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <Upload className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">Log Old Paper Bill</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Customer Phone Number *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Phone className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="10-digit Phone"
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-slate-900 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Customer Name *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-slate-900 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Vehicle Registration Number *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Bike className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  required
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. MH-12-AB-1234"
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-slate-900 text-sm focus:border-blue-500 focus:outline-none font-mono tracking-wider"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Bill Date *</label>
                <input
                  type="date"
                  required
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Total Bill (₹) *</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 text-sm font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Amount Paid (₹)</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 text-sm font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Balance Due (₹)</label>
                <div className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-slate-500 text-sm font-mono font-black">
                  ₹{pendingAmount}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Remarks / Items Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Engine oil changed, brake adjustment"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-blue-500 focus:outline-none h-18 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold py-3 px-4 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {submitting ? 'Logging...' : '✓ Log Bill Details'}
            </button>

          </form>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-blue-900 font-extrabold text-xs uppercase tracking-wider">How dues merge works:</h4>
            <p className="text-blue-700 text-xs leading-relaxed font-semibold">
              If an imported bill has a balance due (unpaid amount), the system caches it. When that customer phone number is typed in the new bill form, it immediately flags the outstanding dues to merge!
            </p>
          </div>
        </div>

      </div>

      {/* 2. LEDGER LIST PANEL */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col min-h-[480px]">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Historical Bills Register</h2>
              <span className="text-xs text-slate-400 font-semibold">{filteredImports.length} Imported Records</span>
            </div>
            
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by customer, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-semibold"
              />
            </div>
          </div>

          {filteredImports.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
              <FileText className="h-10 w-10 text-slate-300" />
              <h4 className="text-slate-800 font-bold mt-3">No imported bills found</h4>
              <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">
                {searchQuery ? 'Adjust your search parameters.' : 'Log old invoices on the left panel to populate the historical ledger.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold">
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5">Customer & Phone</th>
                      <th className="py-2.5">Reg Number</th>
                      <th className="py-2.5 text-right">Bill Amt</th>
                      <th className="py-2.5 text-right">Paid</th>
                      <th className="py-2.5 text-right">Due Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {filteredImports.map((imp) => (
                      <tr key={imp.id} className="hover:bg-slate-50/50">
                        <td className="py-3 text-slate-400 whitespace-nowrap">
                          {new Date(imp.billDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3">
                          <div className="font-extrabold text-slate-800">{imp.customerName}</div>
                          <div className="text-[10px] text-slate-400">{imp.phone}</div>
                        </td>
                        <td className="py-3 font-mono font-bold uppercase">{imp.vehicleNumber}</td>
                        <td className="py-3 text-right font-mono text-slate-900">₹{imp.amount}</td>
                        <td className="py-3 text-right font-mono text-green-600">₹{imp.paidAmount}</td>
                        <td className="py-3 text-right font-mono">
                          {imp.pendingAmount > 0 ? (
                            <span className="text-red-600 font-extrabold">₹{imp.pendingAmount}</span>
                          ) : (
                            <span className="text-slate-400 font-bold flex items-center justify-end gap-1">
                              <CheckCircle className="h-3 w-3 text-green-500" /> Settled
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="block md:hidden space-y-3">
                {filteredImports.map((imp) => (
                  <div key={imp.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs text-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-bold">
                        {new Date(imp.billDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                      <span className="font-mono font-bold uppercase bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                        {imp.vehicleNumber}
                      </span>
                    </div>

                    <div>
                      <div className="font-extrabold text-slate-800 text-sm">{imp.customerName}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{imp.phone}</div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100 font-bold">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">Total</span>
                        <span>₹{imp.amount}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">Paid</span>
                        <span className="text-green-600">₹{imp.paidAmount}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">Balance</span>
                        <span>
                          {imp.pendingAmount > 0 ? (
                            <span className="text-red-600 font-extrabold">₹{imp.pendingAmount}</span>
                          ) : (
                            <span className="text-green-600 font-bold">Settled</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </div>

    </div>
  );
}
