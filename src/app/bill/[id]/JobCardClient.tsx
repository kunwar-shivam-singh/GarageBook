'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '../../components/Navigation';
import Header from '../../components/Header';
import { Bill, GarageSettings, Mechanic, PartSuggestion, ServiceSuggestion, BillItem, Service } from '@/lib/db/types';
import { jobStore } from '@/lib/store';
import { 
  Play, Pause, CheckCircle, Clock, Plus, Trash2, Edit2, Check, X,
  AlertTriangle, CreditCard, ChevronRight, User, Bike, MessageSquare, Save, Share2, Printer, Wrench
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  updateBill, 
  logTimerAction,
  addPaymentToBill, 
  getPartSuggestions, 
  getServiceSuggestions,
  getMechanics,
  getBillById
} from '../../actions';

interface JobCardClientProps {
  bill: Bill;
  settings: GarageSettings;
}

export default function JobCardClient({ bill: initialBill, settings }: JobCardClientProps) {
  const router = useRouter();
  
  // Use global state as source of truth
  useEffect(() => {
    jobStore.set(initialBill as any);
  }, [initialBill]);

  const getBillSnapshot = React.useCallback(
    () => jobStore.get(initialBill.id) || initialBill,
    [initialBill]
  );

  const bill: Bill = useSyncExternalStore(
    jobStore.subscribe,
    getBillSnapshot,
    getBillSnapshot
  ) as Bill;

  const setBill = (updatedBill: Bill | ((prev: Bill) => Bill)) => {
    if (typeof updatedBill === 'function') {
      const newBill = updatedBill(bill);
      jobStore.set(newBill as any);
    } else {
      jobStore.set(updatedBill as any);
    }
  };

  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [saving, setSaving] = useState(false);


  // Suggestions and Mechanics database stores
  const [partSuggestions, setPartSuggestions] = useState<PartSuggestion[]>([]);
  const [serviceSuggestions, setServiceSuggestions] = useState<ServiceSuggestion[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);

  // Modals state
  const [activeModal, setActiveModal] = useState<'add_part' | 'add_labour' | null>(null);

  // Add Part Form state
  const [partName, setPartName] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [partPrice, setPartPrice] = useState('');
  const [partDiscountPercent, setPartDiscountPercent] = useState('0');
  const [filteredPartSuggestions, setFilteredPartSuggestions] = useState<PartSuggestion[]>([]);
  const [showPartSuggestions, setShowPartSuggestions] = useState(false);

  // Add Labour Form state
  const [serviceName, setServiceName] = useState('');
  const [serviceCharge, setServiceCharge] = useState('');
  const [serviceDiscount, setServiceDiscount] = useState('0');
  const [serviceMechId, setServiceMechId] = useState('');
  const [filteredServiceSuggestions, setFilteredServiceSuggestions] = useState<ServiceSuggestion[]>([]);
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);

  // Billing and Payment Form state (Ready for Delivery mode)
  const [paymentAmount, setPaymentAmount] = useState(String(initialBill.remainingAmount));
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CREDIT' | 'OTHER'>('UPI');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [expectedClearanceDate, setExpectedClearanceDate] = useState('');
  const [overallDiscountVal, setOverallDiscountVal] = useState(String(initialBill.overallDiscount || 0));
  const [showLabourPromptModal, setShowLabourPromptModal] = useState(false);

  // Run timer ticking interval every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch suggestions and mechanics on load (with cache layer)
  useEffect(() => {
    const getCached = <T,>(key: string): T | null => {
      if (typeof window === 'undefined') return null;
      const cached = sessionStorage.getItem(key);
      if (!cached) return null;
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          return parsed.data as T;
        }
      } catch (e) {
        return null;
      }
      return null;
    };

    const setCached = (key: string, data: any) => {
      if (typeof window === 'undefined') return;
      sessionStorage.setItem(key, JSON.stringify({
        timestamp: Date.now(),
        data
      }));
    };

    const cachedParts = getCached<PartSuggestion[]>('gb_cache_parts');
    if (cachedParts) {
      setPartSuggestions(cachedParts);
    } else {
      getPartSuggestions('').then(data => { 
        if (data) {
          setPartSuggestions(data); 
          setCached('gb_cache_parts', data);
        }
      });
    }

    const cachedServices = getCached<ServiceSuggestion[]>('gb_cache_services');
    if (cachedServices) {
      setServiceSuggestions(cachedServices);
    } else {
      getServiceSuggestions('').then(data => { 
        if (data) {
          setServiceSuggestions(data); 
          setCached('gb_cache_services', data);
        }
      });
    }

    const cachedMechs = getCached<Mechanic[]>('gb_cache_mechanics');
    if (cachedMechs) {
      setMechanics(cachedMechs);
    } else {
      getMechanics().then(data => { 
        if (data) {
          setMechanics(data); 
          setCached('gb_cache_mechanics', data);
        }
      });
    }
  }, []);

  const [complaintStatuses, setComplaintStatuses] = useState<Record<number, 'Pending' | 'In Progress' | 'Completed'>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stats: Record<number, 'Pending' | 'In Progress' | 'Completed'> = {};
      complaintsList.forEach((_, idx) => {
        const val = localStorage.getItem(`gb_comp_${bill.id}_${idx}`) as any;
        stats[idx] = val || 'Pending';
      });
      setComplaintStatuses(stats);
    }
  }, [bill.id, bill.workRequested]);

  const handleUpdateComplaintStatus = (idx: number, status: 'Pending' | 'In Progress' | 'Completed') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`gb_comp_${bill.id}_${idx}`, status);
      setComplaintStatuses(prev => ({ ...prev, [idx]: status }));
      toast.success(`Task "${complaintsList[idx]}" marked as ${status}`);
    }
  };

  // Autocomplete filters
  useEffect(() => {
    const trimmed = partName.trim().toLowerCase();
    if (!trimmed) {
      setFilteredPartSuggestions([]);
      return;
    }
    setFilteredPartSuggestions(
      partSuggestions.filter(p => p.name.toLowerCase().includes(trimmed))
    );
  }, [partName, partSuggestions]);

  useEffect(() => {
    const trimmed = serviceName.trim().toLowerCase();
    if (!trimmed) {
      setFilteredServiceSuggestions([]);
      return;
    }
    setFilteredServiceSuggestions(
      serviceSuggestions.filter(s => s.name.toLowerCase().includes(trimmed))
    );
  }, [serviceName, serviceSuggestions]);

  // Recalculate working timer displays
  const getTimerDisplay = () => {
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

    return format(workingSecs);
  };

  // Trigger Save Updates helper
  const saveBillUpdates = async (updatedFields: Partial<Bill>) => {
    const merged = { ...bill, ...updatedFields };

    const partsSubtotal = (merged.items || []).reduce((sum, item) => sum + (item.finalPrice || 0), 0);
    const servicesSubtotal = (merged.services || []).reduce((sum, s) => sum + (s.finalCharge || 0), 0);
    const subtotal = partsSubtotal + servicesSubtotal;

    // Use customized overall discount or default
    const discount = Number(overallDiscountVal) || merged.overallDiscount || 0;
    const total = Math.max(0, subtotal - discount);

    const advance = merged.advanceReceived || 0;
    const paymentsTotal = (merged.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const remainingAmount = Math.max(0, total - advance - paymentsTotal);

    let paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' = 'PENDING';
    if (remainingAmount === 0) {
      paymentStatus = 'PAID';
    } else if (remainingAmount < total) {
      paymentStatus = 'PARTIAL';
    }

    const payload = {
      date: merged.date,
      labour: servicesSubtotal,
      notes: merged.notes || '',
      paymentStatus,
      items: (merged.items || []).map(i => ({
        name: i.name,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        discountPercentage: Number(i.discountPercentage || 0),
        discountAmount: Number(i.discountAmount || 0),
        finalPrice: Number(i.finalPrice)
      })),
      services: (merged.services || []).map(s => ({
        name: s.name,
        mechanicId: s.mechanicId || null,
        labourCharge: Number(s.labourCharge),
        discount: Number(s.discount || 0),
        finalCharge: Number(s.finalCharge),
        mechanicType: s.mechanicType || 'Salary',
        commissionRate: Number(s.commissionRate || 0),
        workingTime: Number(s.workingTime || 0),
        startTime: s.startTime || null,
        endTime: s.endTime || null
      })),
      mechanicId: merged.mechanicId || null,
      mechanicName: merged.mechanic?.name || null,
      jobStatus: merged.jobStatus,
      expectedPaymentDate: merged.expectedPaymentDate || null,
      overallDiscount: discount,
      overallDiscountValue: discount,
      serviceNotes: merged.serviceNotes || '',
      showServiceNotes: merged.showServiceNotes || false,
    };

    try {
      const saved = await updateBill(bill.id, payload);
      setBill(saved);
      setPaymentAmount(String(saved.remainingAmount));
      return saved;
    } catch (err) {
      console.error(err);
      toast.error('Failed to update job card information.');
      throw err;
    }
  };

  // Timer Buttons Action
  const executeTimerAction = async (action: 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE') => {
    const previousBill = { ...bill };
    try {
      setSaving(true);
      
      // Calculate optimistic state
      const nextStatus = action === 'START' || action === 'RESUME' 
        ? 'Working' 
        : (action === 'PAUSE' ? 'Waiting for Parts' : 'Completed');
      
      let nextTimerState = bill.timerState;
      if (action === 'START' || action === 'RESUME') nextTimerState = 'RUNNING';
      if (action === 'PAUSE') nextTimerState = 'PAUSED';
      if (action === 'COMPLETE') nextTimerState = 'COMPLETED';

      // 1. Optimistic UI update immediately (0ms delay)
      setBill(prev => ({ ...prev, jobStatus: nextStatus as any, timerState: nextTimerState as any }));

      // 2. Server DB update
      const updated = await logTimerAction(bill.id, action);
      
      // 3. Re-sync exactly with server return
      if (updated) {
        setBill(prev => ({ ...prev, ...updated, jobStatus: updated.jobStatus as any }));
      }
      
      toast.success(`Timer action "${action}" registered.`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gb-data-changed'));
      }
    } catch (err) {
      console.error(err);
      setBill(previousBill); // Rollback on failure
      toast.error('Failed to update timer state.');
    } finally {
      setSaving(false);
    }
  };

  const handleTimerAction = async (action: 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE') => {
    if ((action === 'START' || action === 'RESUME' || action === 'COMPLETE') && !bill.mechanicId) {
      toast.error('Please assign a mechanic first before starting or completing work.');
      return;
    }

    if (action === 'COMPLETE') {
      const hasLabour = (bill.services && bill.services.length > 0) || (bill.labour && Number(bill.labour) > 0);
      if (!hasLabour) {
        setShowLabourPromptModal(true);
        return;
      }
    }

    await executeTimerAction(action);
  };

  // Add Part Modal Saver
  const handleAddPartSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partName.trim()) return;
    const qty = Number(partQty) || 1;
    const uPrice = Number(partPrice) || 0;
    const dPercent = Number(partDiscountPercent) || 0;

    if (uPrice < 0) {
      toast.error("Spare part unit price cannot be negative.");
      return;
    }
    if (qty <= 0) {
      toast.error("Spare part quantity must be greater than zero.");
      return;
    }
    if (dPercent < 0 || dPercent > 100) {
      toast.error("Discount percentage must be between 0% and 100%.");
      return;
    }

    const dAmount = (qty * uPrice) * (dPercent / 100);
    const fPrice = (qty * uPrice) - dAmount;

    const newItem = {
      id: 'item_' + Math.random().toString(36).substring(2, 9),
      billId: bill.id,
      name: partName.trim(),
      price: uPrice,
      quantity: qty,
      unitPrice: uPrice,
      discountPercentage: dPercent,
      discountAmount: dAmount,
      finalPrice: fPrice
    };

    const currentItems = bill.items || [];
    await saveBillUpdates({
      items: [...currentItems, newItem]
    });

    setPartName('');
    setPartQty('1');
    setPartPrice('');
    setPartDiscountPercent('0');
    setActiveModal(null);
    toast.success('Spare part appended to job card.');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gb-data-changed'));
    }
  };

  // Add Labour Modal Saver
  const handleAddLabourSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) return;
    const charge = Number(serviceCharge) || 0;
    const disc = Number(serviceDiscount) || 0;

    if (charge < 0) {
      toast.error("Labour charge cannot be negative.");
      return;
    }
    if (disc < 0) {
      toast.error("Labour discount cannot be negative.");
      return;
    }
    if (disc > charge) {
      toast.error("Labour discount amount cannot exceed the charge.");
      return;
    }

    const fCharge = charge - disc;

    const selectedMech = mechanics.find(m => m.id === serviceMechId);

    const newService = {
      id: 'serv_' + Math.random().toString(36).substring(2, 9),
      billId: bill.id,
      name: serviceName.trim(),
      labourCharge: charge,
      discount: disc,
      finalCharge: fCharge,
      mechanicId: serviceMechId || null,
      mechanicType: selectedMech ? selectedMech.workType : 'Salary',
      commissionRate: selectedMech ? selectedMech.commissionRate : 0,
      workingTime: 0
    };

    const currentServices = bill.services || [];
    await saveBillUpdates({
      services: [...currentServices, newService]
    });

    setServiceName('');
    setServiceCharge('');
    setServiceDiscount('0');
    setServiceMechId('');
    setActiveModal(null);
    toast.success('Service task appended to job card.');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gb-data-changed'));
    }
  };

  // Remove item/service from card
  const handleRemovePart = async (id: string) => {
    const current = bill.items || [];
    await saveBillUpdates({
      items: current.filter(i => i.id !== id)
    });
    toast.info('Item removed.');
  };

  const handleRemoveService = async (id: string) => {
    const current = bill.services || [];
    await saveBillUpdates({
      services: current.filter(s => s.id !== id)
    });
    toast.info('Service removed.');
  };

  // Deliver Vehicle and Finalize Billing Invoice
  const handleDeliverInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(paymentAmount);
    if (amount < 0) {
      toast.error("Received payment amount cannot be negative.");
      return;
    }

    const discountVal = Number(overallDiscountVal) || 0;
    if (discountVal < 0) {
      toast.error("Overall discount cannot be negative.");
      return;
    }

    const itemsSubtotal = (bill.items || []).reduce((sum, item) => sum + (item.finalPrice || 0), 0);
    const servicesSubtotal = (bill.services || []).reduce((sum, s) => sum + (s.finalCharge || 0), 0);
    const subtotal = itemsSubtotal + servicesSubtotal;
    
    if (discountVal > subtotal) {
      toast.error("Overall discount cannot exceed the subtotal invoice amount.");
      return;
    }

    const finalTotal = Math.max(0, subtotal - discountVal);
    const remainingToCollect = Math.max(0, finalTotal - (bill.advanceReceived || 0));

    if (amount > remainingToCollect) {
      toast.error(`Received payment amount (₹${amount}) cannot exceed the remaining balance to collect (₹${remainingToCollect}).`);
      return;
    }

    // Check dues
    const pendingDues = Math.max(0, remainingToCollect - amount);
    if (pendingDues > 0 && !expectedClearanceDate) {
      toast.error("Please select an expected payment clearance date for outstanding dues.");
      return;
    }

    try {
      setSaving(true);
      
      // 1. Set status to Delivered and expected payment date (converts service_job to bill)
      const saved = await saveBillUpdates({
        jobStatus: 'Delivered',
        expectedPaymentDate: expectedClearanceDate || null
      });

      const targetBillId = saved?.id || bill.id;

      // 2. Record payment transaction against the generated bill
      if (amount > 0 && targetBillId) {
        await addPaymentToBill(
          targetBillId,
          paymentMode,
          amount,
          paymentNotes || 'Final delivery payment'
        );
      }

      toast.success('Invoice finalized and vehicle delivered!');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gb-data-changed'));
      }
      if (saved && saved.id !== bill.id) {
        router.push(`/bill/${saved.id}`);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      console.error('DELIVER EXCEPTION:', err);
      const msg = err?.message || err?.details || err?.hint || 'Unknown error occurred.';
      const code = err?.code || 'NO_CODE';
      toast.error(`Failed to deliver vehicle. [${code}] ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const complaintsList = bill.workRequested ? bill.workRequested.split(',').map(s => s.trim()).filter(Boolean) : [];
  const checkedInTime = new Date(bill.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const checkedInDate = new Date(bill.date).toLocaleDateString('en-GB');

  // Check if we are in Billing mode or active Mechanic mode
  const isBillingMode = bill.jobStatus === 'Ready for Delivery' || bill.jobStatus === 'Completed' || bill.jobStatus === 'Delivered';

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation garageName={settings.name} />

      <div className="flex-1 md:pl-64 min-h-screen flex flex-col pb-20 md:pb-0">
        <Header garageName={settings.name} title="Job Card" showBackButton={true} backDestination="/" />

        <main className="max-w-3xl w-full mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-6">
          
          {/* Header Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Workshop Job Card</span>
              <h1 className="text-xl font-black text-slate-900 font-mono uppercase tracking-wide mt-0.5">{bill.vehicle?.vehicleNumber}</h1>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                {bill.customer?.name} ({bill.customer?.phone}) • {bill.vehicle?.brand} {bill.vehicle?.model}
              </p>
            </div>
            
            <div className="flex flex-col items-start sm:items-end gap-1.5">
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold uppercase border border-blue-150">
                {bill.jobStatus}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">In: {checkedInDate} at {checkedInTime}</span>
            </div>
          </div>

          {/* 1. CUSTOMER COMPLAINTS / TASKS CHECKLIST */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <MessageSquare className="h-4.5 w-4.5 text-blue-600" /> Customer Complaints checklist ({Object.values(complaintStatuses).filter(s => s === 'Completed').length} / {complaintsList.length} Completed)
              </h3>
              {complaintsList.length > 0 && (
                <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-150">
                  {Math.round((Object.values(complaintStatuses).filter(s => s === 'Completed').length / complaintsList.length) * 100)}% Done
                </div>
              )}
            </div>

            {complaintsList.length === 0 ? (
              <p className="text-xs text-slate-450 italic font-semibold">No complaints reported on check-in.</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                {complaintsList.map((complaint, idx) => (
                  <li key={idx} className="bg-slate-50 border border-slate-150 rounded-xl p-3 flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-extrabold text-[10px]">
                        {idx + 1}
                      </div>
                      <span className={complaintStatuses[idx] === 'Completed' ? 'line-through text-slate-400 font-semibold' : 'text-slate-800 font-semibold'}>
                        {complaint}
                      </span>
                    </div>

                    <select
                      value={complaintStatuses[idx] || 'Pending'}
                      onChange={(e: any) => handleUpdateComplaintStatus(idx, e.target.value)}
                      className={`text-[10px] font-bold rounded-lg border px-2 py-1 cursor-pointer focus:outline-none ${
                        complaintStatuses[idx] === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                        complaintStatuses[idx] === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse' :
                        'bg-slate-100 text-slate-650 border-slate-200'
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 2. TIMERS & OPERATIONS ACTIONS (Only in active mechanic mode) */}
          {!isBillingMode && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div className="text-center sm:text-left space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Service Timer Working Hours</span>
                <div className="text-3xl font-black text-slate-900 font-mono tracking-wider">{getTimerDisplay()}</div>
                <span className="text-[10px] text-slate-400 font-semibold block">Timer State: {bill.timerState} | Assigned: {bill.mechanic?.name || 'Unassigned'}</span>
              </div>

              <div className="flex gap-2 justify-center sm:justify-end">
                {bill.timerState !== 'RUNNING' ? (
                  <button 
                    type="button" 
                    onClick={() => handleTimerAction(bill.timerState === 'PAUSED' ? 'RESUME' : 'START')}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-3 text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Play className="h-4 w-4" /> Start Work
                  </button>
                ) : (
                  <>
                    <button 
                      type="button" 
                      onClick={() => handleTimerAction('PAUSE')}
                      className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-5 py-3 text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <Pause className="h-4 w-4" /> Pause
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleTimerAction('COMPLETE')}
                      className="bg-success hover:bg-success-hover text-white rounded-xl px-5 py-3 text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <Check className="h-4 w-4" /> Complete Work
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 3. PARTS & LABOUR LISTS CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Wrench className="h-4.5 w-4.5 text-blue-600" /> Work Items (Parts & Labour)
              </h3>
              {!isBillingMode && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => setActiveModal('add_part')} className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 border border-blue-150">
                    <Plus className="h-3.5 w-3.5" /> + Part
                  </button>
                  <button type="button" onClick={() => setActiveModal('add_labour')} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 border border-indigo-150">
                    <Plus className="h-3.5 w-3.5" /> + Labour
                  </button>
                </div>
              )}
            </div>

            {/* List Table */}
            <div className="space-y-4">
              {/* Parts */}
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Parts List</span>
                {(bill.items || []).length === 0 ? (
                  <p className="text-xs text-slate-400 font-semibold italic pl-1">No parts added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {(bill.items || []).map((item) => (
                      <div key={item.id} className="flex justify-between items-center bg-slate-50 rounded-xl p-3 border border-slate-200">
                        <div>
                          <span className="font-bold text-slate-800 text-xs block">{item.name}</span>
                          <span className="text-[10px] text-slate-450 font-bold">Qty: {item.quantity} • Unit Price: ₹{item.unitPrice} • Discount: {item.discountPercentage}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-900 text-xs">₹{item.finalPrice}</span>
                          {!isBillingMode && (
                            <button type="button" onClick={() => handleRemovePart(item.id)} className="h-7 w-7 rounded bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 flex items-center justify-center"><Trash2 className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Labour */}
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Labour & Services</span>
                {(bill.services || []).length === 0 ? (
                  <p className="text-xs text-slate-400 font-semibold italic pl-1">No services added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {(bill.services || []).map((serv) => (
                      <div key={serv.id} className="flex justify-between items-center bg-slate-50 rounded-xl p-3 border border-slate-200">
                        <div>
                          <span className="font-bold text-slate-800 text-xs block">{serv.name}</span>
                          <span className="text-[10px] text-slate-450 font-bold">Rate: ₹{serv.labourCharge} • Discount: ₹{serv.discount}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-900 text-xs">₹{serv.finalCharge}</span>
                          {!isBillingMode && (
                            <button type="button" onClick={() => handleRemoveService(serv.id)} className="h-7 w-7 rounded bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 flex items-center justify-center"><Trash2 className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total Summary */}
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs font-black">
                <span className="text-slate-500 uppercase tracking-wider">Current Bill Total:</span>
                <span className="font-mono text-base text-slate-900">₹{bill.total}</span>
              </div>
            </div>
          </div>

          {/* 4. BILLING & INVOICE GENERATION SECTION (Only active when in 'Ready for Delivery' mode) */}
          {isBillingMode && (
            <form onSubmit={handleDeliverInvoiceSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-2">
                <CreditCard className="h-4.5 w-4.5 text-blue-600" /> Finalize Billing Invoice
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Overall Discount (₹)</label>
                  <input
                    type="number"
                    value={overallDiscountVal}
                    onChange={(e) => setOverallDiscountVal(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold"
                    placeholder="Enter flat discount..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Advance Received Previously</label>
                  <input
                    type="text"
                    disabled
                    value={`₹${bill.advanceReceived}`}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Payment Choice Selection */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-500">Invoice Payment Status Choice</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const sub = (bill.items || []).reduce((sum, item) => sum + (item.finalPrice || 0), 0) + (bill.services || []).reduce((sum, s) => sum + (s.finalCharge || 0), 0);
                      const disc = Number(overallDiscountVal) || 0;
                      const tot = Math.max(0, sub - disc);
                      const rem = Math.max(0, tot - (bill.advanceReceived || 0));
                      setPaymentAmount(String(rem));
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      Number(paymentAmount) > 0 && Number(paymentAmount) === Math.max(0, (((bill.items || []).reduce((sum, item) => sum + (item.finalPrice || 0), 0) + (bill.services || []).reduce((sum, s) => sum + (s.finalCharge || 0), 0)) - (Number(overallDiscountVal) || 0)) - (bill.advanceReceived || 0))
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount('')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      Number(paymentAmount) > 0 && Number(paymentAmount) < Math.max(0, (((bill.items || []).reduce((sum, item) => sum + (item.finalPrice || 0), 0) + (bill.services || []).reduce((sum, s) => sum + (s.finalCharge || 0), 0)) - (Number(overallDiscountVal) || 0)) - (bill.advanceReceived || 0))
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Partial Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount('0')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      paymentAmount === '0'
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Unpaid
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Received Payment Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e: any) => setPaymentMode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold focus:outline-none"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card Swipe</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Clearance Expected Date (if dues remain)</label>
                  <input
                    type="date"
                    value={expectedClearanceDate}
                    onChange={(e) => setExpectedClearanceDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Invoice Notes / Remarks</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Delivered vehicle in perfect condition"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                />
              </div>

              {/* Dynamic Recalculated Ledger values */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-2.5 text-xs font-bold text-slate-700 shadow-inner">
                <div className="flex justify-between">
                  <span className="text-slate-400">Services Subtotal:</span>
                  <span className="font-mono text-slate-900">₹{(bill.items || []).reduce((sum, item) => sum + (item.finalPrice || 0), 0) + (bill.services || []).reduce((sum, s) => sum + (s.finalCharge || 0), 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Overall Discount:</span>
                  <span className="font-mono text-red-600">-₹{Number(overallDiscountVal) || 0}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/50 pt-2.5">
                  <span className="text-slate-400 text-sm">Invoice Grand Total:</span>
                  <span className="font-mono text-sm text-slate-950 font-black">₹{Math.max(0, ((bill.items || []).reduce((sum, item) => sum + (item.finalPrice || 0), 0) + (bill.services || []).reduce((sum, s) => sum + (s.finalCharge || 0), 0)) - (Number(overallDiscountVal) || 0))}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/50 pt-2.5 text-red-700">
                  <span className="text-slate-400">Outstanding Balance Dues:</span>
                  <span className="font-mono text-sm font-black">
                    ₹{Math.max(0, Math.max(0, ((bill.items || []).reduce((sum, item) => sum + (item.finalPrice || 0), 0) + (bill.services || []).reduce((sum, s) => sum + (s.finalCharge || 0), 0)) - (Number(overallDiscountVal) || 0)) - (bill.advanceReceived || 0) - (Number(paymentAmount) || 0))}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-success hover:bg-success-hover text-white font-extrabold py-3.5 rounded-xl text-xs active:scale-95 shadow-md flex items-center justify-center gap-1.5"
              >
                <Save className="h-4.5 w-4.5" /> Deliver Vehicle & Generate Invoice
              </button>
            </form>
          )}

        </main>
      </div>

      {/* OVERLAY MODAL FORM INLINE DRAWER */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-150">
            
            <div className="border-b border-slate-100 p-5 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-black text-slate-900 text-sm">
                  {activeModal === 'add_part' ? 'Add Spare Part Item' : 'Add Labour Operation'}
                </h3>
                <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                  Job card id: {bill.invoiceNumber}
                </span>
              </div>
              <button onClick={() => setActiveModal(null)} className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 text-sm">
              
              {/* ADD PART FORM */}
              {activeModal === 'add_part' && (
                <form onSubmit={handleAddPartSave} className="space-y-4">
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Part Name</label>
                    <input
                      type="text"
                      required
                      value={partName}
                      onChange={(e) => { setPartName(e.target.value); setShowPartSuggestions(true); }}
                      onFocus={() => setShowPartSuggestions(true)}
                      className="w-full rounded-xl border border-slate-350 px-3 py-2 text-xs font-bold focus:outline-none"
                      placeholder="e.g. Spark Plug..."
                    />
                    
                    {/* Autocomplete Suggestions */}
                    {showPartSuggestions && filteredPartSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full bg-white border border-slate-200 rounded-xl mt-1 shadow-lg max-h-40 overflow-y-auto z-20">
                        {filteredPartSuggestions.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setPartName(p.name);
                              setPartPrice(p.price !== null ? String(p.price) : '');
                              setShowPartSuggestions(false);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-bold text-xs flex justify-between border-b border-slate-100 last:border-0"
                          >
                            <span>{p.name}</span>
                            <span className="text-slate-400">₹{p.price || 'N/A'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Qty</label>
                      <input
                        type="number"
                        required
                        value={partQty}
                        onChange={(e) => setPartQty(e.target.value)}
                        className="w-full rounded-xl border border-slate-350 px-3 py-2 text-xs font-bold text-center"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Unit Price (₹)</label>
                      <input
                        type="number"
                        required
                        value={partPrice}
                        onChange={(e) => setPartPrice(e.target.value)}
                        className="w-full rounded-xl border border-slate-350 px-3 py-2 text-xs font-bold"
                        placeholder="Price..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Discount %</label>
                    <input
                      type="number"
                      required
                      value={partDiscountPercent}
                      onChange={(e) => setPartDiscountPercent(e.target.value)}
                      className="w-full rounded-xl border border-slate-350 px-3 py-2 text-xs font-bold"
                    />
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center text-xs border border-slate-200">
                    <span className="font-bold text-slate-500">Calculated Total:</span>
                    <span className="font-black text-sm text-slate-900 font-mono">
                      ₹{Math.max(0, (Number(partQty) * (Number(partPrice) || 0)) * (1 - (Number(partDiscountPercent) || 0) / 100))}
                    </span>
                  </div>

                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 rounded-xl text-xs active:scale-95 shadow-sm transition-all">
                    Save Part
                  </button>
                </form>
              )}

              {/* ADD LABOUR FORM */}
              {activeModal === 'add_labour' && (
                <form onSubmit={handleAddLabourSave} className="space-y-4">
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Service Task</label>
                    <input
                      type="text"
                      required
                      value={serviceName}
                      onChange={(e) => { setServiceName(e.target.value); setShowServiceSuggestions(true); }}
                      onFocus={() => setShowServiceSuggestions(true)}
                      className="w-full rounded-xl border border-slate-350 px-3 py-2 text-xs font-bold focus:outline-none"
                      placeholder="e.g. Engine Tuning..."
                    />
                    
                    {/* Autocomplete Suggestions */}
                    {showServiceSuggestions && filteredServiceSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full bg-white border border-slate-200 rounded-xl mt-1 shadow-lg max-h-40 overflow-y-auto z-20">
                        {filteredServiceSuggestions.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setServiceName(s.name);
                              setServiceCharge(String(s.charge));
                              setShowServiceSuggestions(false);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-bold text-xs flex justify-between border-b border-slate-100 last:border-0"
                          >
                            <span>{s.name}</span>
                            <span className="text-slate-400">₹{s.charge}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Labour Charge (₹)</label>
                      <input
                        type="number"
                        required
                        value={serviceCharge}
                        onChange={(e) => setServiceCharge(e.target.value)}
                        className="w-full rounded-xl border border-slate-350 px-3 py-2 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Discount (₹)</label>
                      <input
                        type="number"
                        required
                        value={serviceDiscount}
                        onChange={(e) => setServiceDiscount(e.target.value)}
                        className="w-full rounded-xl border border-slate-350 px-3 py-2 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Assign Mechanic</label>
                    <select
                      value={serviceMechId}
                      onChange={(e) => setServiceMechId(e.target.value)}
                      className="w-full rounded-xl border border-slate-350 bg-white px-3 py-2 text-xs font-bold cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {mechanics.map((m) => (
                        <option key={m.id} value={m.id}>{m.name} ({m.workType})</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center text-xs border border-slate-200">
                    <span className="font-bold text-slate-500">Calculated Charge:</span>
                    <span className="font-black text-sm text-slate-900 font-mono">
                      ₹{Math.max(0, (Number(serviceCharge) || 0) - (Number(serviceDiscount) || 0))}
                    </span>
                  </div>

                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 rounded-xl text-xs active:scale-95 shadow-sm transition-all">
                    Save Labour
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      )}

      {/* LABOUR VALIDATION PROMPT MODAL */}
      {showLabourPromptModal && (
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
                  setShowLabourPromptModal(false);
                  setActiveModal('add_labour');
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all active:scale-95 text-center"
              >
                + Add Labour Charges
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowLabourPromptModal(false);
                  await executeTimerAction('COMPLETE');
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
