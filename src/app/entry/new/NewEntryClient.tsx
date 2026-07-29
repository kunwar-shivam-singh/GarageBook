'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '../../components/Navigation';
import Header from '../../components/Header';
import { createBill, getActiveJobByVehicleNumber } from '../../actions';
import { 
  User, Bike, MessageSquare, CreditCard, ChevronRight, ChevronLeft, 
  Plus, Trash2, CheckCircle2, UserCheck, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface NewEntryClientProps {
  garageName: string;
}

const COMMON_COMPLAINTS = [
  "Brake not working",
  "Clutch hard",
  "Engine noise",
  "Oil leakage",
  "Battery issue",
  "General Service",
  "Chain Noise",
  "Headlight not working",
  "Horn not working",
  "Tyre puncture"
];

export default function NewEntryClient({ garageName }: NewEntryClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [activeJobAlert, setActiveJobAlert] = useState<{ id: string; vehicleNumber: string; jobStatus: string; mechanicName: string } | null>(null);

  // Step 1: Customer & Vehicle Info
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');

  // Step 2: Complaints Info
  const [complaints, setComplaints] = useState<string[]>([]);
  const [customComplaint, setCustomComplaint] = useState('');

  // Step 3: Advance Info
  const [hasAdvance, setHasAdvance] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'OTHER'>('UPI');

  // Input validation routines
  const validateStep1 = () => {
    // 10 digit phone check
    if (!/^\d{10}$/.test(phone)) {
      toast.error("Please enter a valid 10-digit numeric phone number.");
      return false;
    }
    if (name.trim().length < 3) {
      toast.error("Customer name must be at least 3 characters.");
      return false;
    }
    // Indian Registration regex MH12AB1234, DL3C1234
    const cleanVeh = vehicleNumber.replace(/\s+/g, '').replace(/-+/g, '').toUpperCase();
    const indRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$|^[A-Z]{2}[0-9]{6,8}$/;
    if (!indRegex.test(cleanVeh)) {
      toast.error("Invalid Indian registration number format (e.g. MH12AB1234).");
      return false;
    }
    if (!brand.trim()) {
      toast.error("Vehicle brand is required.");
      return false;
    }
    if (!model.trim()) {
      toast.error("Vehicle model is required.");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && complaints.length === 0) {
      if (!confirm("Proceed with zero registered complaints?")) return;
    }
    setStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setStep(prev => prev - 1);
  };

  // Complaint click toggles
  const handleToggleComplaint = (item: string) => {
    if (complaints.includes(item)) {
      setComplaints(prev => prev.filter(c => c !== item));
    } else {
      setComplaints(prev => [...prev, item]);
    }
  };

  // Add custom complaint tag
  const handleAddCustomComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customComplaint.trim();
    if (!clean) return;
    if (complaints.includes(clean)) {
      toast.warning("Complaint task already listed.");
      return;
    }
    setComplaints(prev => [...prev, clean]);
    setCustomComplaint('');
  };

  // Submit and create Queue Job Card
  const handleSubmitQueue = async () => {
    if (saving) return;
    setSaving(true);

    if (!validateStep1()) {
      setSaving(false);
      return;
    }

    const formattedVeh = vehicleNumber.replace(/\s+/g, '').replace(/-+/g, '').toUpperCase();

    // Check if vehicle has an active job in the queue
    try {
      const activeJob = await getActiveJobByVehicleNumber(formattedVeh);
      if (activeJob) {
        setActiveJobAlert(activeJob);
        setSaving(false);
        return;
      }
    } catch (err) {
      console.error("Failed to check active job:", err);
    }
    
    const payload = {
      customerPhone: phone.trim(),
      customerName: name.trim(),
      vehicleNumber: formattedVeh,
      vehicleBrand: brand.trim(),
      vehicleModel: model.trim(),
      date: new Date().toISOString(),
      labour: 0,
      notes: '',
      paymentStatus: 'PENDING' as const,
      items: [],
      services: [],
      jobStatus: 'Waiting' as const,
      workRequested: complaints.join(', '),
      advanceReceived: hasAdvance ? Number(advanceAmount) : 0,
      advances: hasAdvance ? [{ amount: Number(advanceAmount), paymentMode }] : [],
    };

    try {
      await createBill(payload);
      
      // Completely reset state to default
      setPhone('');
      setName('');
      setVehicleNumber('');
      setBrand('');
      setModel('');
      setComplaints([]);
      setCustomComplaint('');
      setHasAdvance(false);
      setAdvanceAmount('');
      setPaymentMode('UPI');
      setStep(1);

      toast.success("Vehicle added to workshop queue.");
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to place vehicle in workshop queue.");
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation garageName={garageName} />

      <div className="flex-1 md:pl-64 min-h-screen flex flex-col pb-20 md:pb-0">
        <Header garageName={garageName} showBackButton={true} backDestination="/" />

        <main className="max-w-2xl w-full mx-auto px-4 py-8 space-y-6">
          
          {/* Step Indicator Headers */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              <span>Intake Wizard</span>
              <span className="text-blue-600 font-extrabold">Step {step} of 4</span>
            </div>
            
            {/* Step Line Bars */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((num) => (
                <div 
                  key={num} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step >= num ? 'bg-blue-600' : 'bg-slate-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* STEP 1: CUSTOMER & VEHICLE */}
          {step === 1 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" /> Customer & Vehicle Info
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Customer Phone Number</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                    placeholder="Enter 10 digit number..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                    placeholder="Enter name..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Vehicle Registration Number</label>
                  <input
                    type="text"
                    required
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:border-blue-500 uppercase"
                    placeholder="e.g. MH12AB1234"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Brand</label>
                  <input
                    type="text"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Honda..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Model</label>
                  <input
                    type="text"
                    required
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Activa..."
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                >
                  Next: Complaints <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CUSTOMER COMPLAINTS */}
          {step === 2 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" /> Customer Complaints & Problems
              </h2>
              
              <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                Tap common complaint tags below, or type a custom one. Each selected complaint will register as a task checklist item for the mechanic.
              </p>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COMMON_COMPLAINTS.map((item) => {
                  const isSelected = complaints.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleToggleComplaint(item)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left flex justify-between items-center ${
                        isSelected 
                          ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm'
                          : 'bg-slate-55 hover:bg-slate-100 text-slate-650 border-slate-200'
                      }`}
                    >
                      <span>{item}</span>
                      {isSelected && <CheckCircle2 className="h-4.5 w-4.5 text-blue-600" />}
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Complaint */}
              <form onSubmit={handleAddCustomComplaint} className="flex gap-2 pt-3 border-t border-slate-100">
                <input
                  type="text"
                  value={customComplaint}
                  onChange={(e) => setCustomComplaint(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                  placeholder="Type other custom complaint task..."
                />
                <button
                  type="submit"
                  className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-4 text-xs font-extrabold flex items-center gap-1 active:scale-95"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </form>

              {/* Registered Complaints list */}
              {complaints.length > 0 && (
                <div className="space-y-2">
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Checklist Tasks ({complaints.length})</span>
                  <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    {complaints.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs font-bold text-slate-800 bg-white border border-slate-150 rounded-lg px-3 py-2">
                        <span>{idx + 1}. {item}</span>
                        <button type="button" onClick={() => handleToggleComplaint(item)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                >
                  Next: Advance <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ADVANCE RECEIVED */}
          {step === 3 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" /> Advance Received (Optional)
              </h2>

              <div className="flex items-center justify-between bg-slate-50 border border-slate-150 rounded-xl p-4">
                <div>
                  <span className="font-extrabold text-slate-800 text-sm block">Collect Advance Payment?</span>
                  <span className="text-[10px] text-slate-400 block font-bold">Check this if the customer is depositing a pre-payment.</span>
                </div>
                <input
                  type="checkbox"
                  checked={hasAdvance}
                  onChange={(e) => setHasAdvance(e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded border-slate-350 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {hasAdvance && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-3 duration-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Advance Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none"
                      placeholder="e.g. 500"
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
                </div>
              )}

              <div className="pt-4 flex justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                >
                  Next: Summary <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SUMMARY & CONFIRMATION */}
          {step === 4 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" /> Confirm Intake Summary
              </h2>

              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-4.5 space-y-3 font-semibold text-xs text-slate-700">
                  <div className="flex justify-between border-b border-slate-200/50 pb-2">
                    <span className="text-slate-400">Customer:</span>
                    <span className="font-bold text-slate-900">{name} ({phone})</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-2">
                    <span className="text-slate-400">Vehicle:</span>
                    <span className="font-bold text-slate-900 font-mono uppercase">{vehicleNumber} ({brand} {model})</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-2">
                    <span className="text-slate-400">Problems Listed:</span>
                    <span className="font-bold text-slate-900 text-right">{complaints.length > 0 ? complaints.join(', ') : 'None listed'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Advance Deposited:</span>
                    <span className="font-bold text-slate-900">
                      {hasAdvance && advanceAmount ? `₹${advanceAmount} via ${paymentMode}` : 'No advance'}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-2.5 text-xs text-blue-750 font-semibold leading-relaxed">
                  <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <p>No billing invoice is created at this step. The vehicle is registered and placed directly in the workshop queue. You can assign mechanics, track timer progress, and add parts/labour as work proceeds.</p>
                </div>
              </div>

              <div className="pt-4 flex justify-between border-t border-slate-100">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handlePrev}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSubmitQueue}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-3 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 disabled:opacity-50 flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                      Adding Vehicle...
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4.5 w-4.5" /> 🚗 Put Vehicle in Queue
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* DUPLICATE ACTIVE JOB ALERT DIALOG */}
      {activeJobAlert && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm relative p-6 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5.5 w-5.5 text-amber-500 flex-shrink-0" />
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Active Job Already Exists</h3>
                <p className="text-xs text-slate-500 mt-1">This vehicle currently has an unfinished work entry inside the workshop.</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4.5 border border-slate-150 text-xs font-bold text-slate-700 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Vehicle:</span>
                <span className="text-slate-900 font-mono uppercase">{activeJobAlert.vehicleNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-slate-900">{activeJobAlert.jobStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Assigned To:</span>
                <span className="text-slate-900">{activeJobAlert.mechanicName}</span>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button 
                type="button" 
                onClick={() => setActiveJobAlert(null)} 
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setActiveJobAlert(null);
                  router.push(`/bill/${activeJobAlert.id}`);
                }} 
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm hover:shadow active:scale-95 transition-all"
              >
                Open Existing Job
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
