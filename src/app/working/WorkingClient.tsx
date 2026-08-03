'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Play, Pause, CheckCircle2, Plus, 
  Wrench, User, CreditCard, ChevronRight,
  TrendingUp, Clock, AlertTriangle, Eye, Trash2,
  Share2, FileText
} from 'lucide-react';
import Navigation from '../components/Navigation';
import Header from '../components/Header';
import { Bill, Mechanic, PartSuggestion, ServiceSuggestion } from '@/lib/db/types';
import { 
  updateBill, 
  logTimerAction,
  getPartSuggestions,
  getServiceSuggestions
} from '../actions';

interface WorkingClientProps {
  initialJobs: Bill[];
  settings: { name: string };
  mechanics: Mechanic[];
}

const JobStopwatch = ({ bill }: { bill: Bill }) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    let interval: any = null;
    if (bill.timerState === 'RUNNING') {
      interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [bill.timerState]);

  let workingSecs = Number(bill.actualWorkingDuration || 0);
  if (bill.timerState === 'RUNNING' && bill.lastTimerActionAt) {
    const elapsed = Math.floor((currentTime - new Date(bill.lastTimerActionAt).getTime()) / 1000);
    workingSecs += Math.max(0, elapsed);
  }

  const format = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="text-sm font-black font-mono tracking-wider text-slate-800 bg-slate-100 rounded-xl px-3 py-1.5 border border-slate-200 inline-flex items-center gap-1">
      <Clock className="h-4 w-4 text-blue-600 animate-spin" style={{ animationDuration: '3s' }} /> {format(workingSecs)}
    </div>
  );
};

export default function WorkingClient({ initialJobs, settings, mechanics }: WorkingClientProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Bill[]>(() => 
    initialJobs.filter(j => 
      !j.invoiceNumber && 
      ((j.jobStatus as string) === 'Working' || (j.jobStatus as string) === 'Assigned' || j.timerState === 'RUNNING' || j.timerState === 'PAUSED')
    )
  );

  // Modals state
  const [activePartJob, setActivePartJob] = useState<Bill | null>(null);
  const [activeLabourJob, setActiveLabourJob] = useState<Bill | null>(null);

  // Form states for Add Part
  const [partName, setPartName] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [partPrice, setPartPrice] = useState('');
  const [partDiscountPercent, setPartDiscountPercent] = useState('0');
  const [partSuggestions, setPartSuggestions] = useState<PartSuggestion[]>([]);

  // Form states for Add Labour
  const [serviceName, setServiceName] = useState('');
  const [serviceCharge, setServiceCharge] = useState('');
  const [serviceDiscount, setServiceDiscount] = useState('0');
  const [serviceMechId, setServiceMechId] = useState('');
  const [serviceSuggestions, setServiceSuggestions] = useState<ServiceSuggestion[]>([]);

  // Fetch part suggestions when user types
  useEffect(() => {
    const trimmed = partName.trim();
    if (trimmed.length < 2) {
      setPartSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const sugs = await getPartSuggestions(trimmed);
        setPartSuggestions(sugs || []);
      } catch (err) {
        console.error(err);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [partName]);

  // Fetch service suggestions when user types
  useEffect(() => {
    const trimmed = serviceName.trim();
    if (trimmed.length < 2) {
      setServiceSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const sugs = await getServiceSuggestions(trimmed);
        setServiceSuggestions(sugs || []);
      } catch (err) {
        console.error(err);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [serviceName]);

  // Labour validation modal state
  const [showLabourPromptJob, setShowLabourPromptJob] = useState<Bill | null>(null);

  const handleToggleTimer = async (job: Bill) => {
    const action = job.timerState === 'RUNNING' ? 'PAUSE' : (job.timerState === 'PAUSED' ? 'RESUME' : 'START');
    try {
      const updated = await logTimerAction(job.id, action);
      setJobs(prev => prev.map(j => j.id === job.id ? updated : j));
      toast.success(`Timer action "${action}" registered.`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to change timer state.');
    }
  };

  const executeEndJob = async (job: Bill) => {
    const previousJobs = [...jobs];
    // Optimistic UI removal immediately (0ms delay)
    setJobs(prev => prev.filter(j => j.id !== job.id));

    try {
      if (job.timerState === 'RUNNING' || job.timerState === 'PAUSED') {
        await logTimerAction(job.id, 'COMPLETE');
      }

      await updateBill(job.id, {
        jobStatus: 'Completed'
      } as any);

      toast.success('Job ended successfully! Card moved to Awaiting Bill Generation.');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gb-data-changed'));
      }
    } catch (err) {
      console.error(err);
      setJobs(previousJobs);
      toast.error('Failed to end service job.');
    }
  };

  const handleEndJob = async (job: Bill) => {
    const hasLabour = (job.services && job.services.length > 0) || (job.labour && Number(job.labour) > 0);
    if (!hasLabour) {
      setShowLabourPromptJob(job);
      return;
    }
    if (!confirm('Are you sure you want to stop the timer and complete this service job?')) return;
    await executeEndJob(job);
  };

  const handleSavePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartJob || !partName.trim()) return;

    const qty = Number(partQty) || 1;
    const price = Number(partPrice) || 0;
    const disc = Number(partDiscountPercent) || 0;

    const discAmt = (qty * price) * (disc / 100);
    const finalPrice = (qty * price) - discAmt;

    const newItem = {
      id: 'item_' + Math.random().toString(36).substring(2, 9),
      billId: activePartJob.id,
      name: partName.trim(),
      price: price,
      quantity: qty,
      unitPrice: price,
      discountPercentage: disc,
      discountAmount: discAmt,
      finalPrice: finalPrice
    };

    try {
      const currentItems = activePartJob.items || [];
      const updated = await updateBill(activePartJob.id, {
        items: [...currentItems, newItem]
      } as any);

      setJobs(prev => prev.map(j => j.id === activePartJob.id ? updated : j));
      setPartName('');
      setPartQty('1');
      setPartPrice('');
      setPartDiscountPercent('0');
      setActivePartJob(null);
      toast.success('Spare part added to job card.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save spare part.');
    }
  };

  const handleSaveLabour = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLabourJob || !serviceName.trim()) return;

    const charge = Number(serviceCharge) || 0;
    const disc = Number(serviceDiscount) || 0;
    const finalCharge = charge - disc;

    const selectedMech = mechanics.find(m => m.id === serviceMechId);

    const newService = {
      id: 'serv_' + Math.random().toString(36).substring(2, 9),
      billId: activeLabourJob.id,
      name: serviceName.trim(),
      labourCharge: charge,
      discount: disc,
      finalCharge: finalCharge,
      mechanicId: serviceMechId || null,
      mechanicType: selectedMech ? selectedMech.workType : 'Salary',
      commissionRate: selectedMech ? selectedMech.commissionRate : 0,
      workingTime: 0
    };

    try {
      const currentServices = activeLabourJob.services || [];
      const updated = await updateBill(activeLabourJob.id, {
        services: [...currentServices, newService]
      } as any);

      setJobs(prev => prev.map(j => j.id === activeLabourJob.id ? updated : j));
      setServiceName('');
      setServiceCharge('');
      setServiceDiscount('0');
      setServiceMechId('');
      setActiveLabourJob(null);
      toast.success('Labour task added to job card.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save service task.');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation garageName={settings.name} />

      <div className="flex-1 md:pl-64 min-h-screen flex flex-col pb-20 md:pb-0">
        <Header garageName={settings.name} title="Working Jobs Roster" showSearchIcon={true} />

        <main className="max-w-7xl w-full mx-auto px-4 py-4 md:py-8 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-amber-500 animate-pulse" /> Live Working Jobs Roster
              </h2>
              <p className="text-xs text-slate-400 font-bold mt-1">Manage active mechanic shop floor timers, spare parts sheets and service tasks in real-time.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.length === 0 ? (
              <div className="col-span-full text-center bg-white border border-slate-200 rounded-2xl p-16 text-slate-450 italic font-semibold text-sm shadow-sm">
                No active repair cards currently on the shop floor.
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="bg-white border border-slate-200 hover:border-slate-350 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4 transition-all">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-base font-black text-slate-950 font-mono tracking-wide uppercase">{job.vehicle?.vehicleNumber}</span>
                        <span className="block text-xs font-bold text-slate-400 mt-0.5">{job.customer?.name} ({job.customer?.phone})</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase border ${
                        job.timerState === 'RUNNING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        job.timerState === 'PAUSED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-slate-100 text-slate-650 border-slate-200'
                      }`}>
                        {job.timerState === 'RUNNING' ? 'Working' : job.timerState === 'PAUSED' ? 'Paused' : 'Assigned'}
                      </span>
                    </div>

                    {/* Brand & Mechanic */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-650 bg-slate-50 border border-slate-150 rounded-xl p-3">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold mb-0.5">Brand & Model</span>
                        <span>{job.vehicle?.brand} {job.vehicle?.model}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold mb-0.5">Lead Mechanic</span>
                        <span>{job.mechanic?.name || 'Unassigned'}</span>
                      </div>
                    </div>

                    {/* Stopwatch Timer */}
                    <div className="flex justify-between items-center bg-slate-50 border border-slate-150 rounded-xl p-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Started At</span>
                        <span className="text-xs font-bold text-slate-800">
                          {job.jobStartTime 
                            ? new Date(job.jobStartTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) 
                            : new Date(job.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Elapsed Time</span>
                        <JobStopwatch bill={job} />
                      </div>
                    </div>

                    {/* Current Parts */}
                    <div className="space-y-1 bg-slate-50/50 border border-slate-150 rounded-xl p-3 text-xs">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Spare Parts Added ({job.items?.length || 0})</span>
                      {job.items && job.items.length > 0 ? (
                        <div className="space-y-1 font-bold text-slate-700 max-h-24 overflow-y-auto pr-1">
                          {job.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between text-slate-800 py-0.5">
                              <span>{it.name} (x{it.quantity})</span>
                              <span>₹{it.finalPrice}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No parts added yet.</span>
                      )}
                    </div>

                    {/* Current Labour */}
                    <div className="space-y-1 bg-slate-50/50 border border-slate-150 rounded-xl p-3 text-xs">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Labour Services ({job.services?.length || 0})</span>
                      {job.services && job.services.length > 0 ? (
                        <div className="space-y-1 font-bold text-slate-700 max-h-24 overflow-y-auto pr-1">
                          {job.services.map((ser, idx) => (
                            <div key={idx} className="flex justify-between text-slate-800 py-0.5">
                              <span>{ser.name}</span>
                              <span>₹{ser.finalCharge}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No labour added yet.</span>
                      )}
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setActivePartJob(job)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] py-2 rounded-xl font-bold border border-blue-150 active:scale-95 transition-all flex items-center justify-center gap-0.5"
                      >
                        <Plus className="h-3.5 w-3.5" /> + Parts
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveLabourJob(job)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] py-2 rounded-xl font-bold border border-indigo-150 active:scale-95 transition-all flex items-center justify-center gap-0.5"
                      >
                        <Plus className="h-3.5 w-3.5" /> + Labour
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleTimer(job)}
                        className={`text-[10px] py-2 rounded-xl font-bold border active:scale-95 transition-all flex items-center justify-center gap-1 ${
                          job.timerState === 'RUNNING'
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                            : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
                        }`}
                      >
                        {job.timerState === 'RUNNING' ? (
                          <>
                            <Pause className="h-3.5 w-3.5" /> Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5" /> Play
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold">
                      <Link
                        href={`/customer/${job.customerId}`}
                        className="text-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1 border border-slate-200"
                      >
                        <User className="h-3.5 w-3.5" /> Customer
                      </Link>
                      
                      <button
                        type="button"
                        onClick={() => {
                          const text = `GarageBook Job Card Update for ${job.vehicle?.vehicleNumber} (${job.customer?.name}). Status: ${job.jobStatus}.`;
                          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        className="text-center py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1 border border-emerald-200"
                      >
                        <Share2 className="h-3.5 w-3.5" /> Share
                      </button>

                      {((job.jobStatus as string) === 'Completed' || (job.jobStatus as string) === 'Work Completed' || job.timerState === 'COMPLETED') ? (
                        <Link
                          href={`/bill/${job.id}`}
                          className="text-center py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1 shadow-sm"
                        >
                          <FileText className="h-3.5 w-3.5" /> Bill
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleEndJob(job)}
                          className="py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> End Job
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* ADD PART MODAL */}
      {activePartJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-black text-slate-900">Add Spare Part to {activePartJob.vehicle?.vehicleNumber}</h3>
            
            <form onSubmit={handleSavePart} className="space-y-3">
              <div className="relative">
                <label className="block text-xs font-bold text-slate-500 mb-1">Part Name</label>
                <input
                  type="text"
                  required
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="Search/type part name..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-semibold focus:outline-none"
                />
                {partSuggestions.length > 0 && (
                  <div className="absolute z-40 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                    {partSuggestions.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={() => {
                          setPartName(s.name);
                          if (s.price) setPartPrice(String(s.price));
                          setPartSuggestions([]);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-[11px] font-bold text-slate-800 border-b border-slate-100 last:border-0"
                      >
                        {s.name} {s.price ? `(₹${s.price})` : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={partQty}
                    onChange={(e) => setPartQty(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Unit Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={partPrice}
                    onChange={(e) => setPartPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Discount (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={partDiscountPercent}
                  onChange={(e) => setPartDiscountPercent(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 text-xs font-black">
                <button
                  type="button"
                  onClick={() => setActivePartJob(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all active:scale-95"
                >
                  Save Part
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD LABOUR MODAL */}
      {activeLabourJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-black text-slate-900">Add Labour Service to {activeLabourJob.vehicle?.vehicleNumber}</h3>

            <form onSubmit={handleSaveLabour} className="space-y-3">
              <div className="relative">
                <label className="block text-xs font-bold text-slate-500 mb-1">Service Task Name</label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Search/type task name..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-semibold focus:outline-none"
                />
                {serviceSuggestions.length > 0 && (
                  <div className="absolute z-40 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                    {serviceSuggestions.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={() => {
                          setServiceName(s.name);
                          setServiceCharge(String(s.charge));
                          setServiceSuggestions([]);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-[11px] font-bold text-slate-800 border-b border-slate-100 last:border-0"
                      >
                        {s.name} (₹{s.charge})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Charge (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={serviceCharge}
                    onChange={(e) => setServiceCharge(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={serviceDiscount}
                    onChange={(e) => setServiceDiscount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Assign Mechanic</label>
                <select
                  value={serviceMechId}
                  onChange={(e) => setServiceMechId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold focus:outline-none"
                >
                  <option value="">Unassigned / Owner</option>
                  {mechanics.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.workType})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-3 text-xs font-black">
                <button
                  type="button"
                  onClick={() => setActiveLabourJob(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all active:scale-95"
                >
                  Save Labour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LABOUR VALIDATION PROMPT MODAL */}
      {showLabourPromptJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="h-10 w-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">No Labour Entered</h3>
                <p className="text-xs text-slate-500 font-semibold">No labour charges have been entered for this vehicle.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 border border-slate-150 rounded-xl p-3">
              No labour services are registered on this job card. Would you like to add labour charges before ending work, or continue for a parts-only customer?
            </p>

            <div className="flex flex-col gap-2 pt-2 text-xs font-black">
              <button
                type="button"
                onClick={() => {
                  const target = showLabourPromptJob;
                  setShowLabourPromptJob(null);
                  setActiveLabourJob(target);
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all active:scale-95 text-center"
              >
                + Add Labour Charges
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = showLabourPromptJob;
                  setShowLabourPromptJob(null);
                  await executeEndJob(target);
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-all active:scale-95 text-center"
              >
                Continue Without Labour
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
