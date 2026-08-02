'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Play, Pause, CheckCircle, User, Phone, Clock, 
  Search, ShieldAlert, ExternalLink, ChevronRight, Wrench, DollarSign, Calendar
} from 'lucide-react';
import Navigation from '../components/Navigation';
import Header from '../components/Header';
import { Bill, Mechanic } from '@/lib/db/types';
import { logTimerAction, updateBill } from '@/app/actions';

interface QueueClientProps {
  initialQueue: Bill[];
  initialMechanics: Mechanic[];
  garageName: string;
}

export default function QueueClient({ initialQueue, initialMechanics, garageName }: QueueClientProps) {
  const router = useRouter();
  const [queue, setQueue] = useState<Bill[]>(initialQueue);
  const [mechanics] = useState<Mechanic[]>(initialMechanics);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Force re-render of active timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (billId: string, action: 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE') => {
    try {
      const bill = queue.find(b => b.id === billId);
      if (!bill) return;

      // Completed or Delivered cannot return to active timers
      if (bill.jobStatus === 'Completed' || bill.jobStatus === 'Delivered') {
        alert('Timer cannot be modified on completed or delivered jobs.');
        return;
      }

      // Starting, completing, or resuming requires an assigned mechanic
      if ((action === 'START' || action === 'RESUME' || action === 'COMPLETE') && !bill.mechanicId) {
        alert('Please assign a mechanic first before starting or completing work.');
        return;
      }

      setUpdatingId(billId);
      const updatedBill = await logTimerAction(billId, action);
      
      setQueue(prev => prev.map(b => b.id === billId ? { ...b, ...updatedBill } : b));
      router.refresh();
    } catch (error) {
      console.error('Timer action failed:', error);
      alert('Failed to log timer action. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMechanicChange = async (billId: string, mechanicId: string) => {
    try {
      const bill = queue.find(b => b.id === billId);
      if (!bill) return;

      // Completed or Delivered cannot return to waiting or assigned
      if (bill.jobStatus === 'Completed' || bill.jobStatus === 'Delivered') {
        alert('Completed or Delivered jobs cannot return to Assigned/Waiting status.');
        return;
      }

      setUpdatingId(billId);
      const selectedMech = mechanics.find(m => m.id === mechanicId);
      
      const updatedBill = await updateBill(billId, {
        date: bill.date,
        labour: bill.labour,
        notes: bill.notes,
        paymentStatus: bill.paymentStatus,
        items: (bill.items || []).map(i => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountPercentage: i.discountPercentage,
          discountAmount: i.discountAmount,
          finalPrice: i.finalPrice
        })),
        mechanicId: mechanicId || null,
        mechanicName: selectedMech ? selectedMech.name : null,
        expectedPaymentDate: bill.expectedPaymentDate,
        followupReminderDate: bill.followupReminderDate,
        paymentNotes: bill.paymentNotes,
        jobStatus: mechanicId ? 'Assigned' : 'Waiting',
        workRequested: bill.workRequested,
        services: (bill.services || []).map(s => ({
          name: s.name,
          mechanicId: s.mechanicId,
          labourCharge: s.labourCharge,
          discount: s.discount,
          finalCharge: s.finalCharge
        })),
        overallDiscount: bill.overallDiscount,
        previousDueAdded: bill.previousDueAdded,
        previousDueBillIds: bill.previousDueBillIds || []
      });

      setQueue(prev => prev.map(b => b.id === billId ? { ...b, ...updatedBill } : b));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gb-data-changed'));
      }
      router.refresh();
    } catch (error) {
      console.error('Failed to assign mechanic:', error);
      alert('Failed to assign mechanic.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeliver = async (billId: string) => {
    try {
      const bill = queue.find(b => b.id === billId);
      if (!bill) return;

      // Validate payment completion or expected payment date
      if (bill.remainingAmount > 0 && !bill.expectedPaymentDate) {
        alert('Delivery is blocked: Outstanding dues exist and no Expected Payment clearance Date is recorded.');
        return;
      }

      setUpdatingId(billId);
      const updatedBill = await updateBill(billId, {
        date: bill.date,
        labour: bill.labour,
        notes: bill.notes,
        paymentStatus: bill.paymentStatus,
        items: (bill.items || []).map(i => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountPercentage: i.discountPercentage,
          discountAmount: i.discountAmount,
          finalPrice: i.finalPrice
        })),
        mechanicId: bill.mechanicId,
        expectedPaymentDate: bill.expectedPaymentDate,
        followupReminderDate: bill.followupReminderDate,
        paymentNotes: bill.paymentNotes,
        jobStatus: 'Delivered',
        workRequested: bill.workRequested,
        services: (bill.services || []).map(s => ({
          name: s.name,
          mechanicId: s.mechanicId,
          labourCharge: s.labourCharge,
          discount: s.discount,
          finalCharge: s.finalCharge
        })),
        overallDiscount: bill.overallDiscount,
        previousDueAdded: bill.previousDueAdded,
        previousDueBillIds: bill.previousDueBillIds || []
      });

      setQueue(prev => prev.filter(b => b.id !== billId));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gb-data-changed'));
      }
      router.push(`/bill/${billId}`);
    } catch (error) {
      console.error('Failed to deliver vehicle:', error);
      alert('Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const getTimerDisplay = (bill: Bill) => {
    let workingSecs = Number(bill.actualWorkingDuration || 0);
    let pausedSecs = Number(bill.pauseDuration || 0);
    
    if (bill.timerState === 'RUNNING' && bill.lastTimerActionAt) {
      const elapsed = Math.floor((currentTime - new Date(bill.lastTimerActionAt).getTime()) / 1000);
      workingSecs += Math.max(0, elapsed);
    } else if (bill.timerState === 'PAUSED' && bill.lastTimerActionAt) {
      const elapsed = Math.floor((currentTime - new Date(bill.lastTimerActionAt).getTime()) / 1000);
      pausedSecs += Math.max(0, elapsed);
    }

    const format = (totalSecs: number) => {
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      return `${hrs > 0 ? `${hrs}h ` : ''}${mins}m ${secs}s`;
    };

    return {
      working: format(workingSecs),
      paused: format(pausedSecs),
      state: bill.timerState
    };
  };

  const getWaitingTimeDisplay = (bill: Bill) => {
    const created = new Date(bill.date || bill.createdAt).getTime();
    const diffSecs = Math.max(0, Math.floor((currentTime - created) / 1000));
    const hrs = Math.floor(diffSecs / 3600);
    const mins = Math.floor((diffSecs % 3600) / 60);
    if (hrs > 0) {
      return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins > 0 ? `${mins} m` : ''}`;
    }
    return `${Math.max(1, mins)} min`;
  };

  const filteredQueue = queue
    .filter(b => {
      if (filterStatus !== 'ALL' && b.jobStatus !== filterStatus) return false;
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const customerName = b.customer?.name.toLowerCase() || '';
        const phone = b.customer?.phone || '';
        const vNum = b.vehicle?.vehicleNumber.toLowerCase() || '';
        const model = b.vehicle?.model.toLowerCase() || '';
        const brand = b.vehicle?.brand.toLowerCase() || '';
        const mech = b.mechanic?.name.toLowerCase() || '';
        
        return customerName.includes(q) || phone.includes(q) || vNum.includes(q) || model.includes(q) || brand.includes(q) || mech.includes(q);
      }
      
      return true;
    })
    .sort((a, b) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime());

  const getStatusBadge = (status: string, bill?: Bill) => {
    switch (status) {
      case 'Waiting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3 text-amber-500" />
            Waiting ({bill ? getWaitingTimeDisplay(bill) : '0 min'})
          </span>
        );
      case 'Assigned':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">Assigned</span>;
      case 'Work Started':
      case 'Working':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Working
          </span>
        );
      case 'Waiting for Parts':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">Waiting for Parts</span>;
      case 'Completed':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">Completed</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation garageName={garageName} />

      <div className="flex-1 md:pl-64 min-h-screen flex flex-col pb-20 md:pb-0">
        <Header garageName={garageName} title="Open Queue" showBackButton={true} backDestination="/" showSearchIcon={true} />

        <main className="max-w-4xl w-full mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-6">
          
          {/* Header Panel */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Open Services Queue</h1>
              <p className="text-sm text-slate-500 mt-1">
                Track and manage active vehicles inside the workshop in real-time.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-center">
              <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-2">
                <span className="font-bold text-lg">{queue.length}</span>
                <span className="text-xs font-semibold uppercase tracking-wider">Active Jobs</span>
              </div>
            </div>
          </div>

          {/* Filters and Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
              <input
                type="text"
                placeholder="Search by customer, phone, vehicle, mechanic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { label: 'All', value: 'ALL' },
                { label: 'Waiting', value: 'Waiting' },
                { label: 'Assigned', value: 'Assigned' },
                { label: 'Working', value: 'Work Started' },
                { label: 'Parts Delay', value: 'Waiting for Parts' },
                { label: 'Completed', value: 'Completed' }
              ].map((btn) => (
                <button
                  key={btn.value}
                  onClick={() => setFilterStatus(btn.value)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border ${
                    filterStatus === btn.value
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/10'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Service Queue Cards Grid */}
          {filteredQueue.length === 0 ? (
            <div className="bg-white text-center py-16 px-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-slate-800 font-bold mt-4 text-lg">No vehicles in queue</h3>
              <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
                {searchQuery || filterStatus !== 'ALL' 
                  ? 'No matching results found for your filter criteria. Try expanding your search query.' 
                  : 'All vehicles have been delivered. Ready to receive new bikes in the workshop!'}
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP QUEUE CARDS (Only visible on Desktop, hidden on mobile) */}
              <div className="hidden md:grid md:grid-cols-1 lg:grid-cols-2 gap-5">
                {filteredQueue.map((bill) => {
                  const timer = getTimerDisplay(bill);
                  const isUpdating = updatingId === bill.id;
                  
                  return (
                    <div 
                      key={bill.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group"
                    >
                      {/* Top Card Info Bar */}
                      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Invoice: {bill.invoiceNumber}</span>
                          <h3 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                            {bill.customer?.name}
                            <button 
                              onClick={() => router.push(`/bill/${bill.id}`)}
                              className="text-slate-400 hover:text-blue-600 transition-colors inline-block animate-pulse"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>
                          </h3>
                          <div className="flex items-center gap-1 text-slate-500 font-medium text-xs">
                            <Phone className="h-3.5 w-3.5" />
                            <a href={`tel:${bill.customer?.phone}`} className="hover:underline hover:text-slate-900">{bill.customer?.phone}</a>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(bill.jobStatus, bill)}
                          <span className="text-[10px] text-slate-450 font-bold">In: {new Date(bill.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                          {bill.advanceReceived > 0 && (
                            <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-black border border-emerald-200">
                              Adv: ₹{bill.advanceReceived}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bike / Work Details */}
                      <div className="p-5 flex-1 space-y-4">
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">Vehicle Number</span>
                            <span className="font-extrabold text-sm text-slate-800 tracking-tight">{bill.vehicle?.vehicleNumber}</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">Model Spec</span>
                            <span className="font-bold text-sm text-slate-800">{bill.vehicle?.brand} {bill.vehicle?.model}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-400 block">Work Requested / Issues</span>
                          <p className="text-slate-700 text-sm leading-relaxed font-semibold bg-blue-50/20 px-3 py-2 rounded-xl border border-blue-500/10">
                            {bill.workRequested || 'General diagnostic service inspection requested.'}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                          <div className="space-y-1.5">
                            <label className="text-[9px] uppercase font-extrabold tracking-wider text-slate-400 block">Assigned Staff</label>
                            <div className="relative">
                              <select
                                disabled={isUpdating}
                                value={bill.mechanicId || ''}
                                onChange={(e) => handleMechanicChange(bill.id, e.target.value)}
                                className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 appearance-none cursor-pointer"
                              >
                                <option value="">-- Select Mechanic --</option>
                                {mechanics.map(m => (
                                  <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                              </select>
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-[10px]">▼</div>
                            </div>
                          </div>

                          <div className="space-y-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center">
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className="text-slate-500">Working:</span>
                              <span className={`font-mono text-xs ${bill.timerState === 'RUNNING' ? 'text-green-600 font-extrabold' : 'text-slate-700'}`}>
                                {timer.working}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className="text-slate-500">Paused:</span>
                              <span className={`font-mono text-xs ${bill.timerState === 'PAUSED' ? 'text-purple-600 font-extrabold' : 'text-slate-700'}`}>
                                {timer.paused}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Operations Footer Buttons */}
                      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {bill.timerState === 'STOPPED' && (
                            <button
                              disabled={isUpdating || !bill.mechanicId}
                              onClick={() => handleAction(bill.id, 'START')}
                              title={!bill.mechanicId ? 'Assign a mechanic first to start the timer' : 'Start working'}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              <Play className="h-3.5 w-3.5" />
                              <span>Start Timer</span>
                            </button>
                          )}

                          {bill.timerState === 'RUNNING' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleAction(bill.id, 'PAUSE')}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                            >
                              <Pause className="h-3.5 w-3.5" />
                              <span>Pause (Parts delay)</span>
                            </button>
                          )}

                          {bill.timerState === 'PAUSED' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleAction(bill.id, 'RESUME')}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-colors"
                            >
                              <Play className="h-3.5 w-3.5" />
                              <span>Resume</span>
                            </button>
                          )}

                          {(bill.timerState === 'RUNNING' || bill.timerState === 'PAUSED') && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleAction(bill.id, 'COMPLETE')}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>Complete Work</span>
                            </button>
                          )}
                        </div>

                        <div>
                          {bill.jobStatus === 'Completed' ? (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleDeliver(bill.id)}
                              className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-extrabold bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow shadow-blue-500/15 transition-all"
                            >
                              <span>Deliver & Collect Bill</span>
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          ) : (
                            <button 
                              onClick={() => router.push(`/bill/${bill.id}`)}
                              className="text-slate-500 hover:text-slate-800 text-xs font-bold flex items-center gap-1 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <span>View Invoice Details</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* MOBILE QUEUE CARDS (Only visible on Mobile viewports < 768px) */}
              <div className="block md:hidden space-y-4">
                {filteredQueue.map((bill) => {
                  const timer = getTimerDisplay(bill);
                  const isUpdating = updatingId === bill.id;
                  
                  return (
                    <div 
                      key={bill.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3 text-xs text-slate-800"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-bold uppercase bg-slate-100 border border-slate-250 px-2 py-0.5 rounded text-xs tracking-wider text-slate-900">
                          {bill.vehicle?.vehicleNumber}
                        </span>
                        {getStatusBadge(bill.jobStatus, bill)}
                      </div>

                      <div className="space-y-0.5">
                        <div className="font-extrabold text-sm text-slate-900 tracking-tight leading-snug">{bill.customer?.name}</div>
                        <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {bill.customer?.phone}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 py-2 border-t border-b border-slate-100 text-slate-600 font-semibold">
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">Mechanic Staff</span>
                          <span className="text-slate-800 font-bold">{bill.mechanic?.name || 'Unassigned'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">Working Duration</span>
                          <span className="font-mono text-slate-800 font-bold">{timer.working}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">Current Bill</span>
                          <span className="text-slate-950 font-black font-mono text-sm">₹{bill.total}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">Pending Amount</span>
                          <span className={`font-mono text-sm font-black ${bill.remainingAmount > 0 ? 'text-amber-500' : 'text-slate-500'}`}>
                            ₹{bill.remainingAmount}
                          </span>
                        </div>
                      </div>

                      {/* Stacked Mobile Action Touch-Targets */}
                      <div className="grid grid-cols-2 gap-2 pt-2.5">
                        <button
                          type="button"
                          onClick={() => router.push(`/bill/${bill.id}`)}
                          className="h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-extrabold text-xs transition-colors flex items-center justify-center gap-1 shadow-sm"
                        >
                          Open Job
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => router.push(`/bill/${bill.id}/edit?focus=parts`)}
                          className="h-12 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1"
                        >
                          Add Parts
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => router.push(`/bill/${bill.id}/edit?focus=services`)}
                          className="h-12 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1"
                        >
                          Add Labour
                        </button>
                        
                        <button
                          type="button"
                          disabled={isUpdating || bill.jobStatus === 'Completed' || bill.jobStatus === 'Delivered'}
                          onClick={() => handleAction(bill.id, 'COMPLETE')}
                          className="h-12 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 rounded-xl font-extrabold text-xs transition-colors flex items-center justify-center gap-1"
                        >
                          {bill.jobStatus === 'Completed' || bill.jobStatus === 'Delivered' ? '✓ Completed' : 'Complete Job'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
}
