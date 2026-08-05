'use client';

import React, { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Navigation from './Navigation';
import Header from './Header';
import { Bill, GarageSettings, Mechanic, PartSuggestion, ServiceSuggestion, Payment } from '@/lib/db/types';
import { jobStore } from '@/lib/store';
import { 
  Plus, Search, Wrench, Package, Briefcase, CreditCard, 
  Calendar, Bell, Database, Shield, HelpCircle, Info, 
  ChevronDown, ChevronUp, TrendingUp, CheckCircle, Clock, 
  ArrowUpRight, FileText, AlertTriangle, UserPlus, Receipt,
  Check, X
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  updateBill, 
  addPaymentToBill, 
  getPartSuggestions, 
  getServiceSuggestions,
  getMechanics,
  getBillById,
  logTimerAction
} from '../actions';

interface DashboardClientProps {
  initialBills: Bill[];
  settings: GarageSettings;
}

export default function DashboardClient({ initialBills, settings }: DashboardClientProps) {
  // Use global state as source of truth
  useEffect(() => {
    jobStore.setMultiple(initialBills as any);
  }, [initialBills]);

  const allJobs = useSyncExternalStore(
    jobStore.subscribe,
    jobStore.getAll,
    jobStore.getAll
  );

  const bills = useMemo(() => {
    return allJobs as Bill[];
  }, [allJobs]);

  const setBills = (newBills: Bill[] | ((prev: Bill[]) => Bill[])) => {
    if (typeof newBills === 'function') {
      const updated = newBills(bills);
      jobStore.setMultiple(updated as any);
    } else {
      jobStore.setMultiple(newBills as any);
    }
  };
  const [priorities, setPriorities] = useState<Record<string, string>>({});
  const [dashboardFilter, setDashboardFilter] = useState<'All' | 'Today' | 'Waiting' | 'Working' | 'Completed' | 'PendingDelivery' | 'PendingPayment'>('All');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const prios: Record<string, string> = {};
      bills.forEach(b => {
        const val = localStorage.getItem(`gb_priority_${b.id}`);
        if (val) prios[b.id] = val;
      });
      setPriorities(prios);
    }
  }, [bills]);

  // Collapsible section toggles
  const [completedCollapsed, setCompletedCollapsed] = useState(true);
  const [pendingPaymentsCollapsed, setPendingPaymentsCollapsed] = useState(true);

  // Suggestions and Mechanics database stores
  const [partSuggestions, setPartSuggestions] = useState<PartSuggestion[]>([]);
  const [serviceSuggestions, setServiceSuggestions] = useState<ServiceSuggestion[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);

  // Inline Modals State
  const [activeModal, setActiveModal] = useState<{
    type: 'add_part' | 'add_labour' | 'receive_payment';
    bill: Bill;
  } | null>(null);

  // Assign Mechanic popup states
  const [assigningBill, setAssigningBill] = useState<Bill | null>(null);
  const [selectedMechanicId, setSelectedMechanicId] = useState('');
  const [estimatedPriority, setEstimatedPriority] = useState<'Low' | 'Normal' | 'High'>('Normal');
  const [startNow, setStartNow] = useState(true);

  // Form states for inline actions
  const [partName, setPartName] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [partPrice, setPartPrice] = useState('');
  const [partDiscountPercent, setPartDiscountPercent] = useState('0');
  const [filteredPartSuggestions, setFilteredPartSuggestions] = useState<PartSuggestion[]>([]);
  const [showPartSuggestions, setShowPartSuggestions] = useState(false);

  const [serviceName, setServiceName] = useState('');
  const [serviceCharge, setServiceCharge] = useState('');
  const [serviceDiscount, setServiceDiscount] = useState('0');
  const [serviceMechId, setServiceMechId] = useState('');
  const [filteredServiceSuggestions, setFilteredServiceSuggestions] = useState<ServiceSuggestion[]>([]);
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CREDIT' | 'OTHER'>('UPI');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [expectedClearanceDate, setExpectedClearanceDate] = useState('');

  // Delivery Expected Date check state
  const [showClearanceModal, setShowClearanceModal] = useState<{ bill: Bill } | null>(null);
  const [showLabourPromptModal, setShowLabourPromptModal] = useState<{ bill: Bill } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deliveryClearanceDate, setDeliveryClearanceDate] = useState('');

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

  // Filter parts suggestions autocomplete list
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

  // Filter services suggestions autocomplete list
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

  // Date check helpers
  const isSameDay = (dateStr1: string, date2: Date) => {
    const d1 = new Date(dateStr1);
    return d1.getDate() === date2.getDate() &&
           d1.getMonth() === date2.getMonth() &&
           d1.getFullYear() === date2.getFullYear();
  };

  // 1. TOP SUMMARY METRICS
  const today = new Date();
  
  const metrics = useMemo(() => {
    // 1. Today's checked-in vehicles (any status)
    const todayVehiclesList = bills.filter(b => isSameDay(b.date, today));
    const todayVehicles = todayVehiclesList.length;
    
    // 2. Waiting Jobs (In workshop queue waiting for mechanic assignment)
    const waitingJobsList = bills.filter(b => !b.invoiceNumber && ((b.jobStatus as string) === 'Waiting' || !(b.jobStatus as string)) && (b.jobStatus as string) !== 'Cancelled');
    const waitingJobsCount = waitingJobsList.length;

    // 3. Working Jobs (Active jobs currently Assigned or Working)
    const workingJobsList = bills.filter(b => !b.invoiceNumber && ((b.jobStatus as string) === 'Working' || (b.jobStatus as string) === 'Assigned' || (b.jobStatus as string) === 'Work Started' || (b.jobStatus as string) === 'Waiting for Parts'));
    const workingJobsCount = workingJobsList.length;

    // 4. Completed Today (Ready for Delivery, Completed or Delivered today)
    const completedTodayList = bills.filter(b => 
      ((b.jobStatus as string) === 'Completed' || 
       (b.jobStatus as string) === 'Ready for Delivery' || 
       (b.jobStatus as string) === 'Delivered') && 
      isSameDay(b.date, today)
    );
    const completedTodayCount = completedTodayList.length;

    // 5. Pending Deliveries (Bill generated, but not yet Delivered)
    const pendingDeliveriesList = bills.filter(b => b.invoiceNumber && (b.jobStatus as string) !== 'Delivered' && (b.jobStatus as string) !== 'Cancelled');
    const pendingDeliveriesCount = pendingDeliveriesList.length;

    // 6. Pending Payments (Bill generated already and has unpaid balance)
    const pendingPaymentsList = bills.filter(b => b.invoiceNumber && b.remainingAmount > 0 && (b.jobStatus as string) !== 'Cancelled');
    const pendingPaymentsCount = pendingPaymentsList.length;

    // Open Jobs (all active service cards in workshop without invoice number)
    const openJobsList = bills.filter(b => !b.invoiceNumber && !['Delivered', 'Cancelled', 'Archived'].includes(b.jobStatus as string));

    return {
      todayVehiclesList,
      todayVehicles,
      waitingJobsList,
      waitingJobsCount,
      workingJobsList,
      workingJobsCount,
      completedTodayList,
      completedTodayCount,
      pendingDeliveriesList,
      pendingDeliveriesCount,
      pendingPaymentsList,
      pendingPaymentsCount,
      openJobsList
    };
  }, [bills]);

  const {
    todayVehicles,
    waitingJobsCount,
    workingJobsCount,
    completedTodayCount,
    pendingDeliveriesCount,
    pendingPaymentsCount
  } = metrics;

  // 2. SORTED ACTIVE WORKSHOP SERVICE QUEUE
  const getStatusPriority = (status?: string) => {
    switch (status) {
      case 'Working': return 1;
      case 'Assigned': return 2;
      case 'Waiting': return 3;
      case 'Ready for Delivery': return 4;
      default: return 3;
    }
  };

  const filteredDisplayList = useMemo(() => {
    let list: Bill[] = [];
    switch (dashboardFilter) {
      case 'Today':
        list = metrics.todayVehiclesList;
        break;
      case 'Waiting':
        list = metrics.waitingJobsList;
        break;
      case 'Working':
        list = metrics.workingJobsList;
        break;
      case 'Completed':
        list = metrics.completedTodayList;
        break;
      case 'PendingDelivery':
        list = metrics.pendingDeliveriesList;
        break;
      case 'PendingPayment':
        list = metrics.pendingPaymentsList;
        break;
      default:
        // Default to showing Open Jobs (all active service cards)
        list = metrics.openJobsList;
        break;
    }
    return [...list].sort((a, b) => {
      if (a.invoiceNumber && !b.invoiceNumber) return 1;
      if (!a.invoiceNumber && b.invoiceNumber) return -1;
      return getStatusPriority(a.jobStatus) - getStatusPriority(b.jobStatus);
    });
  }, [dashboardFilter, metrics]);

  // Recalculate bill aggregates and save via server action
  const recalculateAndSave = async (bill: Bill, updatedFields: Partial<Bill>) => {
    const merged = { ...bill, ...updatedFields };

    const partsSubtotal = (merged.items || []).reduce((sum, item) => sum + (item.finalPrice || 0), 0);
    const servicesSubtotal = (merged.services || []).reduce((sum, s) => sum + (s.finalCharge || 0), 0);
    const subtotal = partsSubtotal + servicesSubtotal;

    const discount = merged.overallDiscount || 0;
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
      serviceNotes: merged.serviceNotes || '',
      showServiceNotes: merged.showServiceNotes || false,
    };

    try {
      const saved = await updateBill(bill.id, payload);
      setBills(prev => prev.map(b => b.id === bill.id ? { ...b, ...saved, id: saved.id } : b));
      toast.success('Workshop operational job card updated!');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gb-data-changed'));
      }
      return saved;
    } catch (err) {
      console.error(err);
      toast.error('Failed to update job card fields.');
      throw err;
    }
  };

  // Complete Job Execution with Optimistic UI Update
  const executeCompleteJob = async (bill: Bill) => {
    const previousBills = [...bills];
    setUpdatingId(bill.id);
    // Optimistic UI update immediately (0ms delay)
    setBills(prev => prev.map(b => b.id === bill.id ? { ...b, jobStatus: 'Ready for Delivery' } : b));

    try {
      await recalculateAndSave(bill, { jobStatus: 'Ready for Delivery' });
    } catch (err) {
      // Rollback on failure
      setBills(previousBills);
      toast.error('Failed to complete job.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCompleteJob = async (bill: Bill) => {
    const hasLabour = (bill.services && bill.services.length > 0) || (bill.labour && Number(bill.labour) > 0);
    if (!hasLabour) {
      setShowLabourPromptModal({ bill });
      return;
    }
    await executeCompleteJob(bill);
  };

  // Deliver Vehicle Validation Trigger with Optimistic Update
  const handleDeliverVehicle = async (bill: Bill) => {
    if (bill.remainingAmount > 0 && !bill.expectedPaymentDate) {
      setShowClearanceModal({ bill });
      return;
    }
    const previousBills = [...bills];
    setUpdatingId(bill.id);
    setBills(prev => prev.map(b => b.id === bill.id ? { ...b, jobStatus: 'Delivered' } : b));

    try {
      await recalculateAndSave(bill, { jobStatus: 'Delivered' });
    } catch (err) {
      setBills(previousBills);
      toast.error('Failed to deliver vehicle.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Save Delivery Clearance Date
  const handleSaveDeliveryClearance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showClearanceModal) return;
    const { bill } = showClearanceModal;
    const previousBills = [...bills];
    try {
      setUpdatingId(bill.id);
      setBills(prev => prev.map(b => b.id === bill.id ? { ...b, jobStatus: 'Delivered', expectedPaymentDate: deliveryClearanceDate } : b));
      await recalculateAndSave(bill, { 
        jobStatus: 'Delivered', 
        expectedPaymentDate: deliveryClearanceDate 
      });
      setShowClearanceModal(null);
      setDeliveryClearanceDate('');
    } catch (err: any) {
      console.error('DASHBOARD DELIVER EXCEPTION:', err);
      const msg = err?.message || err?.details || err?.hint || 'Unknown error occurred.';
      const code = err?.code || 'NO_CODE';
      setBills(previousBills);
      toast.error(`Failed to deliver vehicle. [${code}] ${msg}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Form submission triggers for Add Part
  const handleAddPartSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModal || !partName.trim()) return;
    const qty = Number(partQty) || 1;
    const uPrice = Number(partPrice) || 0;
    const dPercent = Number(partDiscountPercent) || 0;
    const dAmount = (qty * uPrice) * (dPercent / 100);
    const fPrice = (qty * uPrice) - dAmount;

    const newItem = {
      id: 'item_' + Math.random().toString(36).substring(2, 9),
      billId: activeModal.bill.id,
      name: partName.trim(),
      price: uPrice,
      quantity: qty,
      unitPrice: uPrice,
      discountPercentage: dPercent,
      discountAmount: dAmount,
      finalPrice: fPrice
    };

    const currentItems = activeModal.bill.items || [];
    await recalculateAndSave(activeModal.bill, {
      items: [...currentItems, newItem]
    });

    // Reset and close
    setPartName('');
    setPartQty('1');
    setPartPrice('');
    setPartDiscountPercent('0');
    setActiveModal(null);
  };

  // Form submission triggers for Add Labour
  const handleAddLabourSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModal || !serviceName.trim()) return;
    const charge = Number(serviceCharge) || 0;
    const disc = Number(serviceDiscount) || 0;
    const fCharge = charge - disc;

    const selectedMech = mechanics.find(m => m.id === serviceMechId);

    const newService = {
      id: 'serv_' + Math.random().toString(36).substring(2, 9),
      billId: activeModal.bill.id,
      name: serviceName.trim(),
      labourCharge: charge,
      discount: disc,
      finalCharge: fCharge,
      mechanicId: serviceMechId || null,
      mechanicType: selectedMech ? selectedMech.workType : 'Salary',
      commissionRate: selectedMech ? selectedMech.commissionRate : 0,
      workingTime: 0
    };

    const currentServices = activeModal.bill.services || [];
    await recalculateAndSave(activeModal.bill, {
      services: [...currentServices, newService]
    });

    // Reset and close
    setServiceName('');
    setServiceCharge('');
    setServiceDiscount('0');
    setServiceMechId('');
    setActiveModal(null);
  };

  // Form submission triggers for Receive Payment
  const handleReceivePaymentSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModal) return;
    const amount = Number(paymentAmount);
    if (amount <= 0) {
      toast.error('Payment amount must be greater than zero.');
      return;
    }
    if (amount > activeModal.bill.remainingAmount) {
      toast.error(`Received amount cannot exceed remaining dues of ₹${activeModal.bill.remainingAmount}`);
      return;
    }

    try {
      await addPaymentToBill(
        activeModal.bill.id, 
        paymentMode, 
        amount, 
        paymentNotes || 'Partial collection'
      );
      
      if (expectedClearanceDate) {
        await recalculateAndSave(activeModal.bill, {
          expectedPaymentDate: expectedClearanceDate
        });
      }

      // Re-fetch updated bill details
      const updated = await getBillById(activeModal.bill.id);
      if (updated) {
        setBills(prev => prev.map(b => b.id === activeModal.bill.id ? updated : b));
      }
      
      toast.success('Payment recorded successfully.');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gb-data-changed'));
      }
      setPaymentAmount('');
      setPaymentNotes('');
      setExpectedClearanceDate('');
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to log payment transaction.');
    }
  };

  const handleAssignMechanic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningBill) return;
    const selectedMech = mechanics.find(m => m.id === selectedMechanicId);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`gb_priority_${assigningBill.id}`, estimatedPriority);
        setPriorities(prev => ({ ...prev, [assigningBill.id]: estimatedPriority }));
      }

      await recalculateAndSave(assigningBill, {
        mechanicId: selectedMechanicId || null,
        mechanic: selectedMech || null,
        jobStatus: startNow ? 'Working' : 'Assigned'
      });

      if (startNow) {
        await logTimerAction(assigningBill.id, 'START');
      }

      // Re-fetch updated bill details
      const freshBill = await getBillById(assigningBill.id);
      if (freshBill) {
        setBills(prev => prev.map(b => b.id === assigningBill.id ? freshBill : b));
      }

      toast.success('Mechanic assigned successfully!');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gb-data-changed'));
      }
      setAssigningBill(null);
      setSelectedMechanicId('');
      setEstimatedPriority('Normal');
      setStartNow(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to assign mechanic.');
    }
  };

  // Collapsible list calculations
  const completedTodayBills = useMemo(() => {
    return bills.filter(b => 
      ((b.jobStatus as string) === 'Ready for Delivery' || 
       (b.jobStatus as string) === 'Completed' || 
       (b.jobStatus as string) === 'Work Completed' || 
       (b.jobStatus as string) === 'Delivered') && 
      isSameDay(b.date, today)
    );
  }, [bills]);

  const pendingPaymentsBills = useMemo(() => {
    return bills.filter(b => b.remainingAmount > 0 && (b.jobStatus as string) !== 'Cancelled');
  }, [bills]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Working':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">Working</span>;
      case 'Assigned':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">Assigned</span>;
      case 'Ready for Delivery':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 uppercase tracking-wider">Ready</span>;
      case 'Delivered':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-800 text-white uppercase tracking-wider">Delivered</span>;
      case 'Cancelled':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 uppercase tracking-wider">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">Waiting</span>;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation garageName={settings.name} />

      <div className="flex-1 md:pl-64 min-h-screen flex flex-col pb-20 md:pb-0">
        <Header garageName={settings.name} title="Dashboard" showSearchIcon={true} />

        <main className="max-w-7xl w-full mx-auto px-4 py-4 md:py-8 space-y-5 md:space-y-8">
          
          {/* 1. TOP COMPACT SUMMARY CARDS (NO REVENUE GRAPH OR FINANCIAL VALUES) */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
            <button
              type="button"
              onClick={() => setDashboardFilter(dashboardFilter === 'Today' ? 'All' : 'Today')}
              className={`bg-white border rounded-2xl p-4 shadow-sm text-center transition-all active:scale-95 hover:border-blue-300 ${
                dashboardFilter === 'Today' ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/10' : 'border-slate-200'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Today&apos;s Vehicles</span>
              <span className="text-xl font-black text-slate-900 font-mono">{todayVehicles}</span>
            </button>

            <button
              type="button"
              onClick={() => setDashboardFilter(dashboardFilter === 'Waiting' ? 'All' : 'Waiting')}
              className={`bg-white border rounded-2xl p-4 shadow-sm text-center transition-all active:scale-95 hover:border-amber-300 ${
                dashboardFilter === 'Waiting' ? 'border-amber-500 ring-2 ring-amber-100 bg-amber-50/10' : 'border-slate-200'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Waiting</span>
              <span className="text-xl font-black text-amber-600 font-mono">{waitingJobsCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setDashboardFilter(dashboardFilter === 'Working' ? 'All' : 'Working')}
              className={`bg-white border rounded-2xl p-4 shadow-sm text-center transition-all active:scale-95 hover:border-amber-300 ${
                dashboardFilter === 'Working' ? 'border-amber-500 ring-2 ring-amber-100 bg-amber-50/10' : 'border-slate-200'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Working Jobs</span>
              <span className="text-xl font-black text-amber-600 font-mono">{workingJobsCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setDashboardFilter(dashboardFilter === 'Completed' ? 'All' : 'Completed')}
              className={`bg-white border rounded-2xl p-4 shadow-sm text-center transition-all active:scale-95 hover:border-green-300 ${
                dashboardFilter === 'Completed' ? 'border-green-500 ring-2 ring-green-100 bg-green-50/10' : 'border-slate-200'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Completed Today</span>
              <span className="text-xl font-black text-green-700 font-mono">{completedTodayCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setDashboardFilter(dashboardFilter === 'PendingDelivery' ? 'All' : 'PendingDelivery')}
              className={`bg-white border rounded-2xl p-4 shadow-sm text-center transition-all active:scale-95 hover:border-blue-300 ${
                dashboardFilter === 'PendingDelivery' ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/10' : 'border-slate-200'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Pending Deliveries</span>
              <span className="text-xl font-black text-blue-600 font-mono">{pendingDeliveriesCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setDashboardFilter(dashboardFilter === 'PendingPayment' ? 'All' : 'PendingPayment')}
              className={`bg-white border rounded-2xl p-4 shadow-sm text-center transition-all active:scale-95 hover:border-red-300 ${
                dashboardFilter === 'PendingPayment' ? 'border-red-500 ring-2 ring-red-100 bg-red-50/10' : 'border-slate-200'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Pending Payments</span>
              <span className="text-xl font-black text-red-600 font-mono">{pendingPaymentsCount}</span>
            </button>
          </div>

          {/* 2. RESPONSIBLE LAYOUT STRUCTURE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="open-queue">
            
            {/* Left: Open Queue list (takes 5 columns on desktop) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                  <Clock className="h-5 w-5 text-blue-600" /> {
                    dashboardFilter === 'Today' ? `Today's Vehicles (${filteredDisplayList.length})` :
                    dashboardFilter === 'Waiting' ? `Waiting Queue (${filteredDisplayList.length})` :
                    dashboardFilter === 'Working' ? `Working Repair Jobs (${filteredDisplayList.length})` :
                    dashboardFilter === 'Completed' ? `Completed Today (${filteredDisplayList.length})` :
                    dashboardFilter === 'PendingDelivery' ? `Pending Deliveries (${filteredDisplayList.length})` :
                    dashboardFilter === 'PendingPayment' ? `Pending Payments (${filteredDisplayList.length})` :
                    `Active Workshop Queue (${filteredDisplayList.length})`
                  }
                </h2>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Sorted Priority</span>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {filteredDisplayList.length === 0 ? (
                  <div className="text-center bg-white border border-slate-200 rounded-2xl p-10 text-slate-450 italic font-semibold text-xs shadow-sm">
                    No matching vehicles found.
                  </div>
                ) : (
                  filteredDisplayList.map((bill) => (
                    <div key={bill.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3.5 relative hover:border-slate-350 transition-all">
                      
                      {/* Badge and Vehicle Number */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-base font-black text-slate-950 font-mono tracking-wide">{bill.vehicle?.vehicleNumber}</span>
                          <span className="block text-xs font-bold text-slate-400 mt-0.5">{bill.customer?.name} ({bill.customer?.phone})</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getStatusBadge(bill.jobStatus)}
                          {priorities[bill.id] && (
                            <span className={`text-[9px] px-1 py-0.5 rounded font-black uppercase ${
                              priorities[bill.id] === 'High' ? 'bg-red-50 text-red-700' :
                              priorities[bill.id] === 'Low' ? 'bg-slate-100 text-slate-600' :
                              'bg-blue-50 text-blue-700'
                            }`}>
                              {priorities[bill.id]} Priority
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Brand, Model, Time Received & Advance */}
                      <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-700 bg-slate-50 rounded-xl p-3.5 border border-slate-150">
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-extrabold mb-0.5">Brand & Model</span>
                          <span>{bill.vehicle?.brand} {bill.vehicle?.model}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-extrabold mb-0.5">Mechanic</span>
                          <span>{bill.mechanic?.name || 'Unassigned'}</span>
                        </div>
                        <div className="border-t border-slate-200/50 pt-2 col-span-2 grid grid-cols-2">
                          <div>
                            <span className="text-[9px] text-slate-400 block uppercase font-extrabold mb-0.5">Received In</span>
                            <span>{new Date(bill.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block uppercase font-extrabold mb-0.5">Advance</span>
                            <span className="text-emerald-700 font-extrabold">₹{bill.advanceReceived || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Complaints Checklist */}
                      {bill.workRequested ? (
                        <div className="space-y-1 bg-slate-50/50 rounded-xl p-3 border border-slate-150/70">
                          <span className="text-[9px] text-slate-400 block uppercase font-extrabold mb-1">Reported Problems:</span>
                          <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 font-semibold pl-1">
                            {bill.workRequested.split(',').map(s => s.trim()).filter(Boolean).map((comp, idx) => (
                              <li key={idx}>{comp}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {/* Actions row */}
                      <div className="flex justify-between items-center pt-2.5 border-t border-slate-150">
                        <div className="flex gap-2">
                          <button 
                            type="button" 
                            onClick={() => {
                              setSelectedMechanicId(bill.mechanicId || '');
                              setEstimatedPriority((typeof window !== 'undefined' ? localStorage.getItem(`gb_priority_${bill.id}`) as any : 'Normal') || 'Normal');
                              setAssigningBill(bill);
                            }} 
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs px-3.5 py-2 rounded-xl font-bold border border-blue-150 transition-all active:scale-95"
                          >
                            Assign Mechanic
                          </button>
                          
                          <Link 
                            href={`/bill/${bill.id}`} 
                            className="bg-slate-100 hover:bg-slate-250 text-slate-750 text-xs px-3.5 py-2 rounded-xl font-bold transition-all active:scale-95"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Centre: Working Jobs list (takes 4 columns on desktop) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="h-5 w-5 text-amber-500 animate-pulse" /> Live Working Bay ({workingJobsCount})
                </h2>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {bills.filter(b => b.jobStatus === 'Working').length === 0 ? (
                  <div className="text-center bg-white border border-slate-200 rounded-2xl p-8 text-slate-400 italic text-xs font-semibold">
                    No vehicles currently in active service bay.
                  </div>
                ) : (
                  bills.filter(b => b.jobStatus === 'Working').map((bill) => (
                    <div key={bill.id} className="bg-amber-50/40 border border-amber-200 rounded-2xl p-4 space-y-2 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-slate-900 font-mono text-sm">{bill.vehicle?.vehicleNumber}</span>
                        <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-amber-100">Working</span>
                      </div>
                      <p className="text-xs font-bold text-slate-500">{bill.customer?.name} • {bill.vehicle?.brand} {bill.vehicle?.model}</p>
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-500 pt-1.5 border-t border-amber-100">
                        <span>Mech: {bill.mechanic?.name || 'Unassigned'}</span>
                        <button type="button" onClick={() => handleCompleteJob(bill)} className="text-xs font-bold text-green-700 hover:underline">Complete</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: Collapsible panels and details (takes 3 columns on desktop) */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* 1. COMPLETED TODAY COLLAPSIBLE */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCompletedCollapsed(!completedCollapsed)}
                  className="w-full flex items-center justify-between p-5 bg-white border-b border-slate-100 hover:bg-slate-50 font-black text-sm text-slate-900"
                >
                  <span className="flex items-center gap-1.5"><CheckCircle className="h-4.5 w-4.5 text-success" /> Completed Today ({completedTodayBills.length})</span>
                  {completedCollapsed ? <ChevronDown className="h-4.5 w-4.5" /> : <ChevronUp className="h-4.5 w-4.5" />}
                </button>

                {!completedCollapsed && (
                  <div className="p-4 space-y-3.5 max-h-[300px] overflow-y-auto">
                    {completedTodayBills.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center font-bold">No jobs completed today yet.</p>
                    ) : (
                      completedTodayBills.map((bill) => (
                        <div key={bill.id} className="border-b border-slate-100 pb-2.5 last:border-0 space-y-1">
                          <div className="flex justify-between font-extrabold text-xs">
                            <span className="font-mono text-slate-900">{bill.vehicle?.vehicleNumber}</span>
                            <span className={bill.remainingAmount === 0 ? 'text-success' : 'text-amber-600'}>
                              {bill.remainingAmount === 0 ? 'PAID' : `DUE ₹${bill.remainingAmount}`}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold">
                            {bill.customer?.name} • {bill.mechanic?.name || 'Owner'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 2. PENDING PAYMENTS COLLAPSIBLE */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPendingPaymentsCollapsed(!pendingPaymentsCollapsed)}
                  className="w-full flex items-center justify-between p-5 bg-white border-b border-slate-100 hover:bg-slate-50 font-black text-sm text-slate-900"
                >
                  <span className="flex items-center gap-1.5"><AlertTriangle className="h-4.5 w-4.5 text-red-500" /> Pending Payments ({pendingPaymentsBills.length})</span>
                  {pendingPaymentsCollapsed ? <ChevronDown className="h-4.5 w-4.5" /> : <ChevronUp className="h-4.5 w-4.5" />}
                </button>

                {!pendingPaymentsCollapsed && (
                  <div className="p-4 space-y-3 max-h-[350px] overflow-y-auto">
                    {pendingPaymentsBills.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center font-bold">No outstanding payments ledger.</p>
                    ) : (
                      pendingPaymentsBills.map((bill) => (
                        <div key={bill.id} className="border-b border-slate-100 pb-3 last:border-0 space-y-2">
                          <div className="flex justify-between font-bold text-xs items-center">
                            <span className="font-mono text-slate-900">{bill.vehicle?.vehicleNumber}</span>
                            <span className="text-red-600 font-mono font-extrabold">₹{bill.remainingAmount}</span>
                          </div>
                          
                          <div className="text-[10px] text-slate-400 font-semibold">
                            {bill.customer?.name} • Dues: {bill.expectedPaymentDate ? `Clear on ${bill.expectedPaymentDate}` : 'No date set'}
                          </div>

                          <div className="flex gap-1.5 pt-1 text-[10px] font-bold">
                            <button type="button" onClick={() => {
                              setActiveModal({ type: 'receive_payment', bill });
                              setPaymentAmount(String(bill.remainingAmount));
                            }} className="bg-green-50 text-green-700 hover:bg-green-100 px-2 py-1 rounded">Collect</button>
                            
                            <Link href={`/bill/${bill.id}`} className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-2 py-1 rounded">View Bill</Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

            </div>

          </div>

        </main>
      </div>

      {/* OVERLAY MODAL DRAWERS */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-150">
            
            <div className="border-b border-slate-100 p-5 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-black text-slate-900 text-sm">
                  {activeModal.type === 'add_part' && 'Add Spare Part Item'}
                  {activeModal.type === 'add_labour' && 'Add Labour Operation'}
                  {activeModal.type === 'receive_payment' && 'Record Payment Received'}
                </h3>
                <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                  Vehicle: {activeModal.bill.vehicle?.vehicleNumber} ({activeModal.bill.customer?.name})
                </span>
              </div>
              <button onClick={() => setActiveModal(null)} className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 text-sm">
              
              {/* ADD PART FORM */}
              {activeModal.type === 'add_part' && (
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
                      placeholder="e.g. Brake Shoe..."
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
              {activeModal.type === 'add_labour' && (
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
                      placeholder="e.g. Chain Lubing..."
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

              {/* RECEIVE PAYMENT FORM */}
              {activeModal.type === 'receive_payment' && (
                <form onSubmit={handleReceivePaymentSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-3 text-xs border border-slate-200 font-semibold">
                    <div>
                      <span className="text-slate-400 block">Total Due:</span>
                      <span className="font-mono text-slate-900 font-bold">₹{activeModal.bill.total}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Dues Remaining:</span>
                      <span className="font-mono text-red-600 font-black">₹{activeModal.bill.remainingAmount}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Received Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full rounded-xl border border-slate-350 px-3 py-2 text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Payment Mode</label>
                      <select
                        value={paymentMode}
                        onChange={(e: any) => setPaymentMode(e.target.value)}
                        className="w-full rounded-xl border border-slate-350 bg-white px-2 py-2 text-xs font-bold cursor-pointer"
                      >
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI / QR Code</option>
                        <option value="CARD">Card Swipe</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Expected Clearance Date</label>
                      <input
                        type="date"
                        value={expectedClearanceDate}
                        onChange={(e) => setExpectedClearanceDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-350 px-2 py-2 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Payment Remarks</label>
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="e.g. Collected balance"
                      className="w-full rounded-xl border border-slate-350 px-3 py-2 text-xs"
                    />
                  </div>

                  <button type="submit" className="w-full bg-success hover:bg-success-hover text-white font-extrabold py-3 rounded-xl text-xs active:scale-95 shadow-sm transition-all">
                    Record Payment Received
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      )}

      {/* CLEARANCE EXPECTED DATE MODAL ON VEHICLE DELIVERY */}
      {showClearanceModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm relative p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 mb-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Outstanding Balance Alert
            </h3>
            
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              This vehicle has an outstanding balance of <strong className="text-slate-900">₹{showClearanceModal.bill.remainingAmount}</strong>. You must select an expected payment clearance date before setting status to Delivered.
            </p>

            <form onSubmit={handleSaveDeliveryClearance} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Expected Follow-up Payment Date</label>
                <input
                  type="date"
                  required
                  value={deliveryClearanceDate}
                  onChange={(e) => setDeliveryClearanceDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-350 px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowClearanceModal(null)} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-extrabold shadow-sm">
                  Save & Deliver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN MECHANIC MODAL POPUP */}
      {assigningBill && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm relative p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Assign Mechanic & Priority</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase font-mono mt-0.5">{assigningBill.vehicle?.vehicleNumber}</p>
              </div>
              <button onClick={() => setAssigningBill(null)} className="h-6 w-6 rounded text-slate-400 hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleAssignMechanic} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Select Mechanic</label>
                <select
                  required
                  value={selectedMechanicId}
                  onChange={(e) => setSelectedMechanicId(e.target.value)}
                  className="w-full rounded-xl border border-slate-350 bg-white px-3 py-2 text-xs font-bold cursor-pointer"
                >
                  <option value="">Choose Mechanic...</option>
                  {mechanics.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.workType})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Estimated Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Low', 'Normal', 'High'] as const).map((pri) => (
                    <button
                      key={pri}
                      type="button"
                      onClick={() => setEstimatedPriority(pri)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        estimatedPriority === pri 
                          ? 'bg-blue-50 text-blue-750 border-blue-300 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-650 border-slate-200'
                      }`}
                    >
                      {pri}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-50 border border-slate-150 rounded-xl p-3.5">
                <div>
                  <span className="font-bold text-slate-800 text-xs block">Start Now?</span>
                  <span className="text-[9px] text-slate-400 block font-semibold">Toggles status to Working and starts job timer.</span>
                </div>
                <input
                  type="checkbox"
                  checked={startNow}
                  onChange={(e) => setStartNow(e.target.checked)}
                  className="h-4.5 w-4.5 text-blue-600 rounded border-slate-350 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setAssigningBill(null)} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-705 rounded-lg text-xs font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-extrabold shadow-sm">
                  Assign
                </button>
              </div>
            </form>
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
                  const target = showLabourPromptModal.bill;
                  setShowLabourPromptModal(null);
                  setActiveModal({ bill: target, type: 'add_labour' });
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all active:scale-95 text-center"
              >
                + Add Labour Charges
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = showLabourPromptModal.bill;
                  setShowLabourPromptModal(null);
                  await executeCompleteJob(target);
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
