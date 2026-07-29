'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from './Navigation';
import Header from './Header';
import { 
  getCustomerByPhone, 
  getVehiclesByCustomer, 
  getPartSuggestions, 
  createBill, 
  updateBill,
  getMechanics,
  getServiceSuggestions,
  getCustomerOutstandingDues
} from '../actions';
import { Bill, Vehicle, PartSuggestion, Mechanic, Service, ServiceSuggestion } from '@/lib/db/types';
import { 
  User, Phone, Bike, Plus, Trash2, Save, Send, 
  AlertCircle, CheckCircle, HelpCircle, FileText, Loader2, Wrench, CreditCard, Calendar, ShieldAlert
} from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';

interface BillFormProps {
  bill?: Bill;
  preselectedCustomerId?: string;
  preselectedVehicleId?: string;
  garageName: string;
}

const billFormSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, 'Customer phone number must be exactly 10 digits and contain only numbers.'),
  customerName: z.string().min(3, 'Customer name must be at least 3 characters.').max(60, 'Customer name cannot exceed 60 characters.'),
  vehicleNumber: z.string().regex(/^[A-Z]{2}[ -]?\d{1,2}[ -]?[A-Z]{0,3}[ -]?\d{4}$/i, 'Vehicle number must be a valid Indian registration format (e.g. MH12AB1234 or MH-12-AB-1234).'),
  vehicleBrand: z.string().min(1, 'Vehicle Brand is required.'),
  vehicleModel: z.string().min(1, 'Vehicle Model is required.'),
  items: z.array(
    z.object({
      name: z.string().min(1, 'Part name cannot be empty.'),
      quantity: z.number().min(1, 'Quantity must be at least 1.'),
      unitPrice: z.number().min(0, 'Unit price cannot be negative.'),
      discountPercentage: z.number().min(0).max(100),
      discountAmount: z.number().min(0),
      finalPrice: z.number().min(0),
      discountType: z.enum(['FLAT', 'PERCENT']).optional(),
      discountValue: z.number().min(0).optional(),
    })
  ),
  services: z.array(
    z.object({
      name: z.string().min(1, 'Labour operation description/task name is required.'),
      mechanicId: z.string().min(1, 'Please assign a mechanic for every service task.'),
      labourCharge: z.number().min(0, 'Labour Charge cannot be negative.'),
      discount: z.number().min(0, 'Labour Discount cannot be negative.'),
      finalCharge: z.number().min(0),
      mechanicType: z.enum(['Salary', 'Independent']).optional(),
      commissionRate: z.number().min(0).optional(),
      workingTime: z.number().min(0).optional(),
      startTime: z.string().nullable().optional(),
      endTime: z.string().nullable().optional(),
      discountType: z.enum(['FLAT', 'PERCENT']).optional(),
      discountValue: z.number().min(0).optional(),
    })
  ).min(1, 'Please add at least one service item to the register.'),
});

export default function BillForm({ 
  bill, 
  preselectedCustomerId, 
  preselectedVehicleId, 
  garageName 
}: BillFormProps) {
  const router = useRouter();
  const isEditMode = !!bill;

  // Search parameters focus routing
  const [focusParam, setFocusParam] = useState<string | null>(null);

  // 1. Customer State
  const [phone, setPhone] = useState(bill?.customer?.phone || '');
  const [customerName, setCustomerName] = useState(bill?.customer?.name || '');
  const [customerId, setCustomerId] = useState(bill?.customerId || '');
  const [customerLoaded, setCustomerLoaded] = useState(!!bill?.customerId);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  // Outstanding Dues Alert State
  const [duesInfo, setDuesInfo] = useState<{ totalDues: number; unpaidBills: any[] } | null>(null);
  const [applyPreviousDues, setApplyPreviousDues] = useState(false);

  // 2. Vehicle State
  const [vehiclesList, setVehiclesList] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(bill?.vehicleId || '');
  const [vehicleNumber, setVehicleNumber] = useState(bill?.vehicle?.vehicleNumber || '');
  const [vehicleBrand, setVehicleBrand] = useState(bill?.vehicle?.brand || '');
  const [vehicleModel, setVehicleModel] = useState(bill?.vehicle?.model || '');
  const [isNewVehicle, setIsNewVehicle] = useState(false);

  // 3. Bill Items State (Parts)
  interface LocalItem {
    tempId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    discountPercentage: number;
    discountAmount: number;
    finalPrice: number;
    discountType: 'FLAT' | 'PERCENT';
    discountValue: number;
  }
  const initialItems: LocalItem[] = bill?.items 
    ? bill.items.map(item => ({ 
        tempId: item.id, 
        name: item.name, 
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || Number(item.price) || 0,
        discountPercentage: item.discountPercentage || 0,
        discountAmount: item.discountAmount || 0,
        finalPrice: item.finalPrice || Number(item.price) || 0,
        discountType: item.discountType || 'PERCENT',
        discountValue: item.discountValue !== undefined ? item.discountValue : (item.discountPercentage || 0),
      }))
    : [];
  const [items, setItems] = useState<LocalItem[]>(initialItems);

  // 4. Autocomplete Suggestions (Parts)
  const [partInput, setPartInput] = useState('');
  const [allSuggestions, setAllSuggestions] = useState<PartSuggestion[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<PartSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const partInputRef = useRef<HTMLInputElement>(null);

  // Section references for scroll routing
  const partsSectionRef = useRef<HTMLDivElement>(null);
  const servicesSectionRef = useRef<HTMLDivElement>(null);

  // 5. Mechanics staff list
  const [mechanicsList, setMechanicsList] = useState<Mechanic[]>([]);
  const [selectedMechanicId, setSelectedMechanicId] = useState(bill?.mechanicId || '');

  // 6. Labour Services State
  interface LocalService {
    tempId: string;
    name: string;
    mechanicId: string;
    mechanicName: string;
    labourCharge: number;
    discount: number;
    finalCharge: number;
    discountType: 'FLAT' | 'PERCENT';
    discountValue: number;
    mechanicType: 'Salary' | 'Independent';
    commissionRate: number;
    workingTime: number;
    startTime?: string | null;
    endTime?: string | null;
  }
  const initialServices: LocalService[] = bill?.services
    ? bill.services.map(s => ({
        tempId: s.id,
        name: s.name,
        mechanicId: s.mechanicId || '',
        mechanicName: s.mechanic?.name || '',
        labourCharge: s.labourCharge,
        discount: s.discount,
        finalCharge: s.finalCharge,
        discountType: s.discountType || 'FLAT',
        discountValue: s.discountValue !== undefined ? s.discountValue : s.discount,
        mechanicType: s.mechanicType || 'Salary',
        commissionRate: s.commissionRate || 0,
        workingTime: s.workingTime || 0,
        startTime: s.startTime || null,
        endTime: s.endTime || null,
      }))
    : (bill?.labour ? [{
        tempId: 'default_labour',
        name: 'General Service Labour',
        mechanicId: bill.mechanicId || '',
        mechanicName: bill.mechanic?.name || '',
        labourCharge: bill.labour,
        discount: 0,
        finalCharge: bill.labour,
        discountType: 'FLAT' as const,
        discountValue: 0,
        mechanicType: bill.mechanic?.workType || 'Salary',
        commissionRate: bill.mechanic?.commissionRate || 0,
        workingTime: bill.actualWorkingDuration || 0,
        startTime: bill.jobStartTime || null,
        endTime: bill.jobEndTime || null,
      }] : []);
  const [services, setServices] = useState<LocalService[]>(initialServices);

  // Autocomplete Suggestions (Services)
  const [serviceInput, setServiceInput] = useState('');
  const [serviceSuggestions, setServiceSuggestions] = useState<ServiceSuggestion[]>([]);
  const [filteredServiceSuggestions, setFilteredServiceSuggestions] = useState<ServiceSuggestion[]>([]);
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);

  // 7. Overall Discount, Dues, Advances, Notes
  const [overallDiscountType, setOverallDiscountType] = useState<'FLAT' | 'PERCENT'>(bill?.overallDiscountType || 'FLAT');
  const [overallDiscountValue, setOverallDiscountValue] = useState<number>(bill?.overallDiscountValue || 0);
  const [notes, setNotes] = useState(bill?.notes || '');
  const [serviceNotes, setServiceNotes] = useState(bill?.serviceNotes || '');
  const [showServiceNotes, setShowServiceNotes] = useState(bill?.showServiceNotes !== undefined ? bill.showServiceNotes : true);

  // Advance Payments State
  const [advanceAmount, setAdvanceAmount] = useState<number>(bill?.advanceReceived || 0);
  const [advanceMode, setAdvanceMode] = useState<string>(bill?.advances?.[0]?.paymentMode || 'UPI');

  // 8. Payment splits state
  interface LocalPayment {
    tempId: string;
    method: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CREDIT' | 'OTHER';
    amount: number;
    notes: string;
  }
  const initialLocalPayments: LocalPayment[] = bill?.payments
    ? bill.payments.map(p => ({
        tempId: p.id,
        method: p.paymentMethod,
        amount: p.amount,
        notes: p.notes || '',
      }))
    : [];
  const [payments, setPayments] = useState<LocalPayment[]>(initialLocalPayments);

  // Quick Payment Selector mode
  const getInitialPaymentMode = () => {
    if (isEditMode && bill) {
      if (bill.paymentStatus === 'PAID') {
        const firstPay = bill.payments?.[0];
        if (firstPay?.paymentMethod === 'CASH') return 'FULL_CASH';
        if (firstPay?.paymentMethod === 'UPI') return 'FULL_UPI';
      }
      return 'CUSTOM';
    }
    return 'PENDING';
  };
  const [paymentMode, setPaymentMode] = useState<'FULL_CASH' | 'FULL_UPI' | 'PENDING' | 'CUSTOM'>(getInitialPaymentMode());

  // Follow-up dates
  const [expectedPaymentDate, setExpectedPaymentDate] = useState(bill?.expectedPaymentDate ? bill.expectedPaymentDate.split('T')[0] : '');
  const [followupReminderDate, setFollowupReminderDate] = useState(bill?.followupReminderDate ? bill.followupReminderDate.split('T')[0] : '');
  const [paymentNotes, setPaymentNotes] = useState(bill?.paymentNotes || '');

  // UI state
  const [saving, setSaving] = useState(false);

  // Resolve search query parameters safely
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const focus = params.get('focus');
      if (focus) {
        setFocusParam(focus);
      }
    }
  }, []);

  // Handle focus scrolling on load
  useEffect(() => {
    if (focusParam === 'parts') {
      setTimeout(() => {
        partsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        partInputRef.current?.focus();
        toast.info('Spare parts section highlighted.');
      }, 500);
    } else if (focusParam === 'services' || focusParam === 'labour') {
      setTimeout(() => {
        servicesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        toast.info('Labor services section highlighted.');
      }, 500);
    }
  }, [focusParam, mechanicsList]);

  // Load parts, service list, and mechanics
  useEffect(() => {
    getPartSuggestions('').then((data) => {
      if (data) setAllSuggestions(data);
    });
    getServiceSuggestions('').then((data) => {
      if (data) setServiceSuggestions(data);
    });
    getMechanics().then((data) => {
      if (data) setMechanicsList(data);
    });
  }, []);

  // Pre-load customer details from props
  useEffect(() => {
    if (!isEditMode && preselectedCustomerId) {
      setCustomerId(preselectedCustomerId);
      setCustomerLoaded(true);
      
      getVehiclesByCustomer(preselectedCustomerId).then((vList) => {
        setVehiclesList(vList);
        if (preselectedVehicleId) {
          setSelectedVehicleId(preselectedVehicleId);
          const v = vList.find(item => item.id === preselectedVehicleId);
          if (v) {
            setVehicleNumber(v.vehicleNumber);
            setVehicleBrand(v.brand);
            setVehicleModel(v.model);
          }
        } else if (vList.length === 0) {
          setIsNewVehicle(true);
        }
      });
    }
  }, [isEditMode, preselectedCustomerId, preselectedVehicleId]);

  // Load customer vehicles in edit mode
  useEffect(() => {
    if (isEditMode && bill?.customerId) {
      getVehiclesByCustomer(bill.customerId).then((vList) => {
        setVehiclesList(vList);
      });
      getCustomerOutstandingDues(phone).then((dues) => {
        if (dues && dues.totalDues > 0) {
          const filteredUnpaid = dues.unpaidBills.filter(b => b.id !== bill.id);
          const sumDues = filteredUnpaid.reduce((sum, item) => sum + item.remainingAmount, 0);
          if (sumDues > 0) {
            setDuesInfo({ totalDues: sumDues, unpaidBills: filteredUnpaid });
            setApplyPreviousDues(bill.previousDueAdded > 0);
          }
        }
      });
    }
  }, [isEditMode, bill, phone]);

  // Lookup customer details on phone digit completion
  useEffect(() => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10 && !customerLoaded) {
      setSearchingCustomer(true);
      getCustomerByPhone(cleanPhone).then((cust) => {
        if (cust) {
          setCustomerId(cust.id);
          setCustomerName(cust.name);
          setCustomerLoaded(true);
          getVehiclesByCustomer(cust.id).then((vList) => {
            setVehiclesList(vList);
            if (vList.length > 0) {
              setSelectedVehicleId(vList[0].id);
              setIsNewVehicle(false);
              const activeVeh = vList[0];
              setVehicleNumber(activeVeh.vehicleNumber);
              setVehicleBrand(activeVeh.brand);
              setVehicleModel(activeVeh.model);
            } else {
              setIsNewVehicle(true);
            }
          });
          toast.success(`Welcome back, ${cust.name}!`);

          getCustomerOutstandingDues(cleanPhone).then((dues) => {
            if (dues && dues.totalDues > 0) {
              setDuesInfo(dues);
            }
          });

        } else {
          setCustomerId('');
          setCustomerLoaded(false);
          setVehiclesList([]);
          setIsNewVehicle(true);
          setDuesInfo(null);
        }
        setSearchingCustomer(false);
      });
    }
  }, [phone, customerLoaded]);

  // Filter parts suggestions
  useEffect(() => {
    const trimmedInput = partInput.trim().toLowerCase();
    if (!trimmedInput) {
      setFilteredSuggestions([]);
      return;
    }
    const filtered = allSuggestions.filter((p) =>
      p.name.toLowerCase().includes(trimmedInput)
    );
    setFilteredSuggestions(filtered);
  }, [partInput, allSuggestions]);

  // Filter service suggestions
  useEffect(() => {
    const trimmed = serviceInput.trim().toLowerCase();
    if (!trimmed) {
      setFilteredServiceSuggestions([]);
      return;
    }
    setFilteredServiceSuggestions(
      serviceSuggestions.filter(s => s.name.toLowerCase().includes(trimmed))
    );
  }, [serviceInput, serviceSuggestions]);

  // Calculations
  const partsTotalBase = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const partsTotalDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0);
  const partsGrandTotal = partsTotalBase - partsTotalDiscount;

  const servicesTotalBase = services.reduce((sum, s) => sum + s.labourCharge, 0);
  const servicesTotalDiscount = services.reduce((sum, s) => sum + s.discount, 0);
  const servicesGrandTotal = servicesTotalBase - servicesTotalDiscount;

  const preCalculatedTotal = partsGrandTotal + servicesGrandTotal;
  
  const overallDiscountAmount = overallDiscountType === 'PERCENT'
    ? Math.round(preCalculatedTotal * (overallDiscountValue / 100))
    : overallDiscountValue;

  const addedPreviousDues = applyPreviousDues && duesInfo ? duesInfo.totalDues : 0;
  const grandTotal = Math.max(0, preCalculatedTotal - overallDiscountAmount + addedPreviousDues);

  // Sync payments automatically when using quick buttons
  useEffect(() => {
    if (isEditMode) return;
    if (paymentMode === 'FULL_CASH') {
      setPayments([{
        tempId: 'cash_init',
        method: 'CASH',
        amount: grandTotal,
        notes: 'Full cash payment',
      }]);
    } else if (paymentMode === 'FULL_UPI') {
      setPayments([{
        tempId: 'upi_init',
        method: 'UPI',
        amount: grandTotal,
        notes: 'Full UPI payment',
      }]);
    } else if (paymentMode === 'PENDING') {
      setPayments([]);
    }
  }, [paymentMode, grandTotal, isEditMode]);

  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) + Number(advanceAmount || 0);
  const remainingAmount = Math.max(0, grandTotal - totalPaid);
  const derivedStatus: 'PAID' | 'PARTIAL' | 'PENDING' = totalPaid >= grandTotal && grandTotal > 0
    ? 'PAID'
    : (totalPaid > 0 ? 'PARTIAL' : 'PENDING');

  // Parts List Actions
  const addPartRow = (name: string, price: number | null = null) => {
    if (!name.trim()) return;
    const cleanPrice = price !== null ? Math.round(price) : 0;
    const newItem: LocalItem = {
      tempId: 'temp_part_' + Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      quantity: 1,
      unitPrice: cleanPrice,
      discountPercentage: 0,
      discountAmount: 0,
      finalPrice: cleanPrice,
      discountType: 'PERCENT',
      discountValue: 0
    };
    setItems((prev) => [...prev, newItem]);
    setPartInput('');
    setShowSuggestions(false);
    if (partInputRef.current) partInputRef.current.focus();
  };

  const removePartRow = (tempId: string) => {
    setItems((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const updatePartField = (tempId: string, field: keyof LocalItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;
        const updated = { ...item, [field]: value };
        
        const qty = Number(updated.quantity || 1);
        const price = Number(updated.unitPrice || 0);
        const baseVal = qty * price;
        
        let discAmt = 0;
        if (updated.discountType === 'PERCENT') {
          const discPct = Number(updated.discountValue || 0);
          discAmt = Math.round(baseVal * (discPct / 100));
          updated.discountPercentage = discPct;
        } else if (updated.discountType === 'FLAT') {
          discAmt = Number(updated.discountValue || 0);
          updated.discountPercentage = baseVal > 0 ? Math.round((discAmt / baseVal) * 100) : 0;
        }

        updated.discountAmount = discAmt;
        updated.finalPrice = baseVal - discAmt;
        return updated;
      })
    );
  };

  // Services List Actions
  const addServiceRow = (name: string, charge: number = 0) => {
    if (!name.trim()) return;
    const firstMech = mechanicsList[0];
    const newItem: LocalService = {
      tempId: 'temp_serv_' + Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      mechanicId: firstMech ? firstMech.id : '',
      mechanicName: firstMech ? firstMech.name : '',
      labourCharge: charge,
      discount: 0,
      finalCharge: charge,
      discountType: 'FLAT',
      discountValue: 0,
      mechanicType: firstMech ? firstMech.workType : 'Salary',
      commissionRate: firstMech ? firstMech.commissionRate : 0,
      workingTime: 0,
    };
    setServices((prev) => [...prev, newItem]);
    setServiceInput('');
    setShowServiceSuggestions(false);
  };

  const removeServiceRow = (tempId: string) => {
    setServices((prev) => prev.filter((s) => s.tempId !== tempId));
  };

  const updateServiceField = (tempId: string, field: keyof LocalService, value: any) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.tempId !== tempId) return s;
        const updated = { ...s, [field]: value };
        
        if (field === 'mechanicId') {
          const selected = mechanicsList.find(m => m.id === value);
          updated.mechanicName = selected ? selected.name : '';
          updated.mechanicType = selected ? selected.workType : 'Salary';
          updated.commissionRate = selected ? selected.commissionRate : 0;
        }
        
        const charge = Number(updated.labourCharge || 0);
        let discVal = 0;
        if (updated.discountType === 'PERCENT') {
          const discPct = Number(updated.discountValue || 0);
          discVal = Math.round(charge * (discPct / 100));
        } else if (updated.discountType === 'FLAT') {
          discVal = Number(updated.discountValue || 0);
        }

        updated.discount = discVal;
        updated.finalCharge = Math.max(0, charge - discVal);
        return updated;
      })
    );
  };

  // Payment Splits Actions
  const addPaymentSplitRow = () => {
    const defaultAmount = remainingAmount > 0 ? remainingAmount : 0;
    setPayments((prev) => [
      ...prev,
      {
        tempId: 'pay_' + Math.random().toString(36).substring(2, 9),
        method: 'UPI',
        amount: defaultAmount,
        notes: 'Split payment',
      }
    ]);
  };

  const removePaymentRow = (tempId: string) => {
    setPayments((prev) => prev.filter(p => p.tempId !== tempId));
  };

  const updatePaymentField = (tempId: string, field: keyof LocalPayment, value: any) => {
    setPayments((prev) =>
      prev.map(p => (p.tempId === tempId ? { ...p, [field]: value } : p))
    );
  };

  const handleSave = async (sendOnWhatsApp = false) => {
    const payload = {
      phone,
      customerName,
      vehicleNumber,
      vehicleBrand,
      vehicleModel,
      items: items.map(item => ({ 
        name: item.name, 
        quantity: item.quantity, 
        unitPrice: item.unitPrice, 
        discountPercentage: item.discountPercentage,
        discountAmount: item.discountAmount,
        finalPrice: item.finalPrice,
        discountType: item.discountType,
        discountValue: item.discountValue,
      })),
      services: services.map(s => ({
        name: s.name,
        mechanicId: s.mechanicId || null,
        labourCharge: s.labourCharge,
        discount: s.discount,
        finalCharge: s.finalCharge,
        mechanicType: s.mechanicType,
        commissionRate: s.commissionRate,
        workingTime: s.workingTime,
        startTime: s.startTime,
        endTime: s.endTime,
        discountType: s.discountType,
        discountValue: s.discountValue,
      })),
    };

    const validationResult = billFormSchema.safeParse(payload);
    if (!validationResult.success) {
      const errorMsg = validationResult.error.issues[0].message;
      toast.error(errorMsg);
      return;
    }

    // Business validations:
    // 1. Discount amount cannot exceed item price
    for (const item of items) {
      const baseVal = item.unitPrice * item.quantity;
      if (item.discountType === 'FLAT' && item.discountValue > baseVal) {
        toast.error(`Discount for part "${item.name}" cannot exceed its price.`);
        return;
      }
    }
    // 2. Labour Discount cannot exceed labour charge
    for (const s of services) {
      if (s.discountType === 'FLAT' && s.discountValue > s.labourCharge) {
        toast.error(`Discount for service "${s.name}" cannot exceed the service charge.`);
        return;
      }
    }
    // 3. Advance Received cannot exceed total bill
    if (advanceAmount > grandTotal) {
      toast.error("Advance received amount cannot exceed the grand total bill.");
      return;
    }
    // 4. Overall Discount cannot exceed bill amount
    if (overallDiscountType === 'FLAT' && overallDiscountValue > preCalculatedTotal) {
      toast.error("Overall discount cannot exceed the pre-discount bill total.");
      return;
    }
    // 5. Negative totals
    if (grandTotal < 0) {
      toast.error("Grand total cannot be negative.");
      return;
    }

    // Validate that the bill is either fully paid OR has an expected clearance date selected
    if (derivedStatus !== 'PAID' && !expectedPaymentDate) {
      toast.error('Before saving a pending or partial bill, you must select an Expected Payment clearance Date.');
      return;
    }

    setSaving(true);
    toast.loading(isEditMode ? 'Updating bill details...' : 'Creating new bill...', { id: 'save-bill-toast' });

    try {
      const dbPayload = {
        customerId: customerLoaded ? customerId : undefined,
        customerName: customerLoaded ? undefined : customerName,
        customerPhone: customerLoaded ? undefined : phone,
        
        vehicleId: !isNewVehicle ? selectedVehicleId : undefined,
        vehicleNumber: isNewVehicle ? vehicleNumber : undefined,
        vehicleBrand: isNewVehicle ? vehicleBrand : undefined,
        vehicleModel: isNewVehicle ? vehicleModel : undefined,

        date: bill?.date || new Date().toISOString(),
        labour: servicesGrandTotal,
        notes,
        paymentStatus: derivedStatus,
        items: items.map(item => ({ 
          name: item.name, 
          quantity: item.quantity, 
          unitPrice: item.unitPrice, 
          discountPercentage: item.discountPercentage,
          discountAmount: item.discountAmount,
          finalPrice: item.finalPrice,
          discountType: item.discountType,
          discountValue: item.discountValue,
        })),

        mechanicId: services[0]?.mechanicId || selectedMechanicId || undefined,
        mechanicName: services[0]?.mechanicName || undefined,

        jobStatus: bill?.jobStatus || 'Waiting',
        workRequested: bill?.workRequested || notes || 'General diagnostic service inspection requested.',
        services: services.map(s => ({
          name: s.name,
          mechanicId: s.mechanicId || null,
          mechanicName: s.mechanicName || null,
          labourCharge: s.labourCharge,
          discount: s.discount,
          finalCharge: s.finalCharge,
          mechanicType: s.mechanicType,
          commissionRate: s.commissionRate,
          workingTime: s.workingTime,
          startTime: s.startTime,
          endTime: s.endTime,
          discountType: s.discountType,
          discountValue: s.discountValue,
        })),
        advances: advanceAmount > 0 ? [{ amount: advanceAmount, paymentMode: advanceMode }] : [],
        overallDiscount: overallDiscountAmount,
        previousDueAdded: addedPreviousDues,
        previousDueBillIds: applyPreviousDues && duesInfo ? duesInfo.unpaidBills.map(b => b.id) : [],

        overallDiscountType,
        overallDiscountValue,
        serviceNotes: serviceNotes?.trim() || '',
        showServiceNotes: showServiceNotes !== undefined ? showServiceNotes : true,

        payments: payments.map(p => ({ paymentMethod: p.method, amount: Number(p.amount), notes: p.notes })),
        expectedPaymentDate: (derivedStatus !== 'PAID' && expectedPaymentDate) ? new Date(expectedPaymentDate).toISOString() : null,
        followupReminderDate: (derivedStatus !== 'PAID' && followupReminderDate) ? new Date(followupReminderDate).toISOString() : null,
        paymentNotes: (derivedStatus !== 'PAID' && paymentNotes.trim()) ? paymentNotes.trim() : null,
      };

      let resultBill: Bill;
      if (isEditMode && bill) {
        resultBill = await updateBill(bill.id, dbPayload);
        toast.success('Bill updated successfully!', { id: 'save-bill-toast' });
      } else {
        resultBill = await createBill(dbPayload);
        toast.success('Bill created successfully!', { id: 'save-bill-toast' });
      }

      if (sendOnWhatsApp) {
        const vText = isNewVehicle 
          ? `${vehicleBrand} ${vehicleModel}` 
          : (vehiclesList.find(item => item.id === selectedVehicleId)?.brand + " " + vehiclesList.find(item => item.id === selectedVehicleId)?.model);
        const vNum = isNewVehicle ? vehicleNumber : vehiclesList.find(item => item.id === selectedVehicleId)?.vehicleNumber;
        
        let messageText = `Hi ${customerName}, here is your bill from ${garageName}.
Invoice No: ${resultBill.invoiceNumber}
Vehicle: ${vText} (${vNum})

Parts Details:
${items.map(item => `• ${item.name} (x${item.quantity}): ₹${item.finalPrice}`).join('\n')}

Labour/Services:
${services.map(s => `• ${s.name}: ₹${s.finalCharge}`).join('\n')}`;

        if (overallDiscountAmount > 0) {
          messageText += `\nOverall Discount Applied: -₹${overallDiscountAmount}`;
        }
        if (addedPreviousDues > 0) {
          messageText += `\nPrevious Unpaid Dues Added: +₹${addedPreviousDues}`;
        }

        messageText += `\nGrand Total: ₹${resultBill.total}
Payment Status: ${derivedStatus}`;

        if (derivedStatus === 'PARTIAL') {
          messageText += `\nReceived: ₹${resultBill.receivedAmount}\nRemaining Balance: ₹${resultBill.remainingAmount}`;
        } else if (derivedStatus === 'PENDING') {
          messageText += `\nOutstanding Balance: ₹${resultBill.total}`;
        }
        
        messageText += `\n\nThank you for choosing ${garageName}!`;
        
        const whatsappUrl = `https://wa.me/91${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(messageText)}`;
        window.open(whatsappUrl, '_blank');
      }

      setTimeout(() => {
        router.push(`/bill/${resultBill.id}`);
      }, 500);

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'An error occurred while saving the bill.', { id: 'save-bill-toast' });
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation garageName={garageName} />

      <div className="flex-1 md:pl-64 min-h-screen flex flex-col pb-20 md:pb-0">
        <Header 
          garageName={garageName} 
          showBackButton={true} 
          backDestination={isEditMode ? `/bill/${bill?.id}` : (preselectedCustomerId ? `/customer/${preselectedCustomerId}` : '/')} 
        />

        <main className="max-w-3xl w-full mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight break-words">
              {isEditMode ? `Edit Bill ${bill?.invoiceNumber}` : 'New Register Entry'}
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              Complete invoice details separating spare parts, labor operations, and payments.
            </p>
          </div>

          <div className="space-y-6">
            
            {/* ALERT: PREVIOUS DUES DETECTED */}
            {duesInfo && duesInfo.totalDues > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm flex items-start gap-4 animate-shake">
                <ShieldAlert className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-red-900 font-extrabold text-sm uppercase tracking-wider">Outstanding Dues Detected!</h3>
                  <p className="text-red-700 text-xs mt-1 leading-relaxed">
                    This customer has unpaid balance of <span className="font-black text-sm">₹{duesInfo.totalDues}</span> from previous bills. You can automatically merge these dues into the current invoice.
                  </p>
                  
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setApplyPreviousDues(!applyPreviousDues)}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all border bg-white border-red-300 text-red-700 hover:bg-red-105 active:bg-red-200"
                    >
                      {applyPreviousDues ? '✓ Outstanding Dues Added' : '+ Add Dues to Current Bill'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1: CUSTOMER DETAILS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                <User className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-800">1. Customer Details</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <Phone className="h-4.5 w-4.5 text-slate-400" />
                    </span>
                    <input
                      type="tel"
                      required
                      disabled={isEditMode || customerLoaded}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Enter 10-digit Phone"
                      className="w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-base font-bold"
                    />
                    {customerLoaded && !isEditMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerId('');
                          setCustomerLoaded(false);
                          setPhone('');
                          setCustomerName('');
                          setVehiclesList([]);
                          setIsNewVehicle(true);
                          setVehicleNumber('');
                          setVehicleBrand('');
                          setVehicleModel('');
                          setDuesInfo(null);
                          setApplyPreviousDues(false);
                        }}
                        className="absolute right-2 top-2 px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 border border-slate-300"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {searchingCustomer && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400 font-semibold">
                      <Loader2 className="h-3 w-3 animate-spin" /> Looking up phone number...
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Customer Name</label>
                  <input
                    type="text"
                    required
                    disabled={isEditMode || customerLoaded}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter Name"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-base font-semibold"
                  />
                </div>
              </div>
              
              {customerLoaded && (
                <div className="mt-3 bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex items-center gap-2">
                  <CheckCircle className="h-4.5 w-4.5 text-blue-600 flex-shrink-0" />
                  <span className="text-xs text-blue-800 font-bold break-words">Existing customer identified: {customerName}</span>
                </div>
              )}
            </div>

            {/* STEP 2: VEHICLE DETAILS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                <Bike className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-800">2. Vehicle Details</h2>
              </div>

              {vehiclesList.length > 0 && !isEditMode && (
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Select Vehicle</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {vehiclesList.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setSelectedVehicleId(v.id);
                          setIsNewVehicle(false);
                          setVehicleNumber(v.vehicleNumber);
                          setVehicleBrand(v.brand);
                          setVehicleModel(v.model);
                        }}
                        className={`p-3.5 border rounded-xl flex items-center justify-between text-left transition-colors font-semibold ${
                          selectedVehicleId === v.id && !isNewVehicle
                            ? 'border-blue-500 bg-blue-50/40 text-blue-700 font-bold'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="truncate">
                          <div className="text-sm truncate">{v.brand} {v.model}</div>
                          <div className="text-xs font-mono mt-0.5 text-slate-400">{v.vehicleNumber}</div>
                        </div>
                        {selectedVehicleId === v.id && !isNewVehicle && (
                          <CheckCircle className="h-4.5 w-4.5 text-blue-600 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                    
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewVehicle(true);
                        setSelectedVehicleId('');
                        setVehicleNumber('');
                        setVehicleBrand('');
                        setVehicleModel('');
                      }}
                      className={`p-3.5 border border-dashed rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${
                        isNewVehicle
                          ? 'border-blue-500 bg-blue-50/40 text-blue-700'
                          : 'border-slate-300 hover:border-slate-400 text-slate-600'
                      }`}
                    >
                      + Add New Vehicle
                    </button>
                  </div>
                </div>
              )}

              {/* Vehicle inputs */}
              {(isNewVehicle || isEditMode || vehiclesList.length === 0) && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Vehicle Number</label>
                      <input
                        type="text"
                        required
                        disabled={isEditMode}
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                        placeholder="e.g. MH-12-AB-1234"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-base font-mono uppercase tracking-wider font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Brand / Make</label>
                      <input
                        type="text"
                        required
                        disabled={isEditMode}
                        value={vehicleBrand}
                        onChange={(e) => setVehicleBrand(e.target.value)}
                        placeholder="e.g. Honda"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-base font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Model</label>
                      <input
                        type="text"
                        required
                        disabled={isEditMode}
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        placeholder="e.g. Activa 6G"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-base font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 3: SPARE PARTS */}
            <div 
              ref={partsSectionRef} 
              className={`bg-white border rounded-2xl p-6 shadow-sm transition-all duration-500 ${
                focusParam === 'parts' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                <Plus className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-800">3. Spare Parts Used</h2>
              </div>

              <div className="relative mb-5">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Search or Type Part Name</label>
                <div className="flex gap-2">
                  <input
                    ref={partInputRef}
                    type="text"
                    value={partInput}
                    onChange={(e) => {
                      setPartInput(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-base font-semibold"
                    placeholder="Type parts..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (partInput.trim()) addPartRow(partInput);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (partInput.trim()) addPartRow(partInput);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold px-4 py-2 rounded-xl text-sm whitespace-nowrap"
                  >
                    Add Part
                  </button>
                </div>

                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {filteredSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => addPartRow(suggestion.name, suggestion.price)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 active:bg-blue-100 font-bold text-slate-800 text-sm flex justify-between items-center"
                      >
                        <span className="truncate pr-4">{suggestion.name}</span>
                        {suggestion.price && <span className="text-xs text-slate-400 flex-shrink-0">₹{suggestion.price}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Items List */}
              {items.length > 0 && (
                <div className="space-y-4 mb-4">
                  {/* Desktop View (Table layout visible on medium/larger screens) */}
                  <div className="hidden md:block space-y-2">
                    <div className="flex border-b border-slate-100 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <div className="flex-1">Part Description</div>
                      <div className="w-14 text-center">Qty</div>
                      <div className="w-20 text-right pr-2">Price (₹)</div>
                      <div className="w-16 text-center">Type</div>
                      <div className="w-14 text-right pr-2">Value</div>
                      <div className="w-24 text-right pr-2">Total (₹)</div>
                      <div className="w-10"></div>
                    </div>

                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {items.map((item) => (
                        <div key={item.tempId} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updatePartField(item.tempId, 'name', e.target.value)}
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-slate-900 text-sm font-semibold focus:border-blue-500 focus:outline-none"
                          />
                          <input
                            type="number"
                            inputMode="numeric"
                            value={item.quantity || ''}
                            onChange={(e) => updatePartField(item.tempId, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-14 rounded-xl border border-slate-200 px-2 py-2 text-center text-slate-900 text-sm font-bold focus:border-blue-500 focus:outline-none"
                          />
                          <input
                            type="number"
                            inputMode="numeric"
                            value={item.unitPrice ?? ''}
                            onChange={(e) => updatePartField(item.tempId, 'unitPrice', parseInt(e.target.value) || 0)}
                            placeholder="Enter Price"
                            className="w-20 rounded-xl border border-slate-200 px-2 py-2 text-right font-mono font-bold text-slate-900 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          <select
                            value={item.discountType}
                            onChange={(e) => updatePartField(item.tempId, 'discountType', e.target.value)}
                            className="w-16 rounded-xl border border-slate-200 px-1 py-2 text-slate-900 text-xs font-bold focus:outline-none bg-white cursor-pointer"
                          >
                            <option value="PERCENT">% Pct</option>
                            <option value="FLAT">₹ Flat</option>
                          </select>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={item.discountValue ?? ''}
                            onChange={(e) => updatePartField(item.tempId, 'discountValue', parseInt(e.target.value) || 0)}
                            placeholder="Enter Amount"
                            className="w-14 rounded-xl border border-slate-200 px-2 py-2 text-right font-mono font-bold text-slate-900 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          <div className="w-24 text-right font-mono font-black text-slate-700 text-sm pr-2">
                            ₹{item.finalPrice}
                          </div>
                          <button
                            type="button"
                            onClick={() => removePartRow(item.tempId)}
                            className="h-9 w-9 flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 flex-shrink-0"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mobile View (Stacked card layout visible on mobile screen widths) */}
                  <div className="block md:hidden space-y-3">
                    {items.map((item) => (
                      <div key={item.tempId} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                        <div className="flex justify-between items-center gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updatePartField(item.tempId, 'name', e.target.value)}
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-900 text-sm font-semibold focus:border-blue-500 focus:outline-none"
                            placeholder="Part Description"
                          />
                          <button
                            type="button"
                            onClick={() => removePartRow(item.tempId)}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 flex-shrink-0"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Quantity</label>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={item.quantity || ''}
                              onChange={(e) => updatePartField(item.tempId, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full rounded-xl border border-slate-250 px-2 py-2 text-center text-slate-900 text-sm font-bold bg-white focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Unit Price (₹)</label>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={item.unitPrice ?? ''}
                              onChange={(e) => updatePartField(item.tempId, 'unitPrice', parseInt(e.target.value) || 0)}
                              placeholder="Enter Price"
                              className="w-full rounded-xl border border-slate-250 px-2 py-2 text-right font-mono font-bold text-slate-900 text-sm bg-white focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 items-end">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Disc Type</label>
                            <select
                              value={item.discountType}
                              onChange={(e) => updatePartField(item.tempId, 'discountType', e.target.value)}
                              className="w-full rounded-xl border border-slate-250 px-2 py-2 text-slate-900 text-xs font-bold bg-white focus:outline-none cursor-pointer"
                            >
                              <option value="PERCENT">% Pct</option>
                              <option value="FLAT">₹ Flat</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Value</label>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={item.discountValue ?? ''}
                              onChange={(e) => updatePartField(item.tempId, 'discountValue', parseInt(e.target.value) || 0)}
                              placeholder="Enter Amount"
                              className="w-full rounded-xl border border-slate-250 px-2 py-2 text-right font-mono font-bold text-slate-900 text-sm bg-white focus:outline-none"
                            />
                          </div>

                          <div className="text-right pb-2 font-bold">
                            <span className="text-[9px] text-slate-400 block uppercase">Total</span>
                            <span className="font-mono font-black text-slate-800 text-sm">₹{item.finalPrice}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* STEP 4: LABOUR SERVICES */}
            <div 
              ref={servicesSectionRef} 
              className={`bg-white border rounded-2xl p-6 shadow-sm transition-all duration-500 ${
                (focusParam === 'services' || focusParam === 'labour') ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                <Wrench className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-800">4. Labor & Services Performed</h2>
              </div>

              <div className="relative mb-5">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Search or Type Service Task Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={serviceInput}
                    onChange={(e) => {
                      setServiceInput(e.target.value);
                      setShowServiceSuggestions(true);
                    }}
                    onFocus={() => setShowServiceSuggestions(true)}
                    className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-base"
                    placeholder="Type task (e.g. general service tuning)..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (serviceInput.trim()) addServiceRow(serviceInput);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (serviceInput.trim()) addServiceRow(serviceInput);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold px-4 py-2 rounded-xl text-sm whitespace-nowrap"
                  >
                    Add Service
                  </button>
                </div>

                {showServiceSuggestions && filteredServiceSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {filteredServiceSuggestions.map((sug) => (
                      <button
                        key={sug.id}
                        type="button"
                        onClick={() => addServiceRow(sug.name, sug.charge)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 active:bg-blue-100 font-bold text-slate-800 text-sm flex justify-between items-center"
                      >
                        <span className="truncate pr-4">{sug.name}</span>
                        <span className="text-xs text-slate-400 flex-shrink-0">₹{sug.charge}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Service rows List */}
              {services.length > 0 && (
                <div className="space-y-4 mb-4">
                  {/* Desktop View (Table layout visible on medium/larger screens) */}
                  <div className="hidden md:block space-y-2">
                    <div className="flex border-b border-slate-100 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <div className="flex-1">Task Details</div>
                      <div className="w-20 text-right pr-2">Charge (₹)</div>
                      <div className="w-16 text-center">Type</div>
                      <div className="w-18 text-right pr-2">Value</div>
                      <div className="w-28 text-center">Staff Mechanic</div>
                      <div className="w-10"></div>
                    </div>

                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {services.map((s) => (
                        <div key={s.tempId} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={s.name}
                            onChange={(e) => updateServiceField(s.tempId, 'name', e.target.value)}
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-slate-900 text-sm font-semibold focus:border-blue-500 focus:outline-none"
                          />
                          <input
                            type="number"
                            inputMode="numeric"
                            value={s.labourCharge || ''}
                            onChange={(e) => updateServiceField(s.tempId, 'labourCharge', parseInt(e.target.value) || 0)}
                            placeholder="Enter Labour Charge"
                            className="w-20 rounded-xl border border-slate-200 px-2 py-2 text-right font-mono font-bold text-slate-900 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          <select
                            value={s.discountType}
                            onChange={(e) => updateServiceField(s.tempId, 'discountType', e.target.value)}
                            className="w-16 rounded-xl border border-slate-200 px-1 py-2 text-slate-900 text-xs font-bold focus:outline-none bg-white cursor-pointer"
                          >
                            <option value="FLAT">₹ Flat</option>
                            <option value="PERCENT">% Pct</option>
                          </select>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={s.discountValue ?? ''}
                            onChange={(e) => updateServiceField(s.tempId, 'discountValue', parseInt(e.target.value) || 0)}
                            placeholder="Enter Amount"
                            className="w-18 rounded-xl border border-slate-200 px-2 py-2 text-right font-mono font-bold text-slate-900 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          <select
                            value={s.mechanicId}
                            onChange={(e) => updateServiceField(s.tempId, 'mechanicId', e.target.value)}
                            className="w-28 rounded-xl border border-slate-200 px-2 py-2 text-slate-900 text-xs font-bold focus:border-blue-500 focus:outline-none bg-white cursor-pointer"
                          >
                            <option value="">-- Select --</option>
                            {mechanicsList.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.workType === 'Salary' ? 'Salary' : 'Indep'})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeServiceRow(s.tempId)}
                            className="h-9 w-9 flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 flex-shrink-0"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mobile View (Stacked card layout visible on mobile screens) */}
                  <div className="block md:hidden space-y-3">
                    {services.map((s) => (
                      <div key={s.tempId} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                        <div className="flex justify-between items-center gap-2">
                          <input
                            type="text"
                            value={s.name}
                            onChange={(e) => updateServiceField(s.tempId, 'name', e.target.value)}
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-900 text-sm font-semibold focus:border-blue-500 focus:outline-none"
                            placeholder="Labour service task details"
                          />
                          <button
                            type="button"
                            onClick={() => removeServiceRow(s.tempId)}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 flex-shrink-0"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Labour Charge (₹)</label>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={s.labourCharge || ''}
                              onChange={(e) => updateServiceField(s.tempId, 'labourCharge', parseInt(e.target.value) || 0)}
                              placeholder="Enter Labour Charge"
                              className="w-full rounded-xl border border-slate-250 px-2 py-2 text-right font-mono font-bold text-slate-900 text-sm bg-white focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Staff Mechanic</label>
                            <select
                              value={s.mechanicId}
                              onChange={(e) => updateServiceField(s.tempId, 'mechanicId', e.target.value)}
                              className="w-full rounded-xl border border-slate-250 px-2 py-2 text-slate-900 text-xs font-bold bg-white focus:outline-none cursor-pointer"
                            >
                              <option value="">-- Select --</option>
                              {mechanicsList.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.name} ({m.workType === 'Salary' ? 'Salary' : 'Indep'})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 items-end">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Disc Type</label>
                            <select
                              value={s.discountType}
                              onChange={(e) => updateServiceField(s.tempId, 'discountType', e.target.value)}
                              className="w-full rounded-xl border border-slate-250 px-2 py-2 text-slate-900 text-xs font-bold bg-white focus:outline-none cursor-pointer"
                            >
                              <option value="FLAT">₹ Flat</option>
                              <option value="PERCENT">% Pct</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Value</label>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={s.discountValue ?? ''}
                              onChange={(e) => updateServiceField(s.tempId, 'discountValue', parseInt(e.target.value) || 0)}
                              placeholder="Enter Amount"
                              className="w-full rounded-xl border border-slate-250 px-2 py-2 text-right font-mono font-bold text-slate-900 text-sm bg-white focus:outline-none"
                            />
                          </div>

                          <div className="text-right pb-2 font-bold">
                            <span className="text-[9px] text-slate-400 block uppercase">Total</span>
                            <span className="font-mono font-black text-slate-800 text-sm">₹{s.finalCharge}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* STEP 5: TOTAL CALCULATIONS SHEET */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Invoice Calculations Sheet</h3>
              
              <div className="space-y-2 text-slate-600 text-sm font-bold">
                <div className="flex justify-between items-center">
                  <span>Parts Total (after item discounts)</span>
                  <span className="font-mono text-slate-800">₹{partsGrandTotal}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Labour/Services Total (after discounts)</span>
                  <span className="font-mono text-slate-800">₹{servicesGrandTotal}</span>
                </div>
                
                {/* Overall Discount Input */}
                <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-100">
                  <span className="text-blue-600">Overall Bill Discount</span>
                  <div className="flex gap-2">
                    <select
                      value={overallDiscountType}
                      onChange={(e: any) => setOverallDiscountType(e.target.value)}
                      className="w-20 rounded-lg border border-slate-200 px-1 py-1 text-slate-900 text-xs font-bold focus:outline-none bg-white cursor-pointer"
                    >
                      <option value="FLAT">₹ Flat</option>
                      <option value="PERCENT">% Pct</option>
                    </select>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={overallDiscountValue || ''}
                      onChange={(e) => setOverallDiscountValue(parseInt(e.target.value) || 0)}
                      placeholder="Enter Amount"
                      className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Dues Merged (if toggled) */}
                {applyPreviousDues && duesInfo && (
                  <div className="flex justify-between items-center text-red-600">
                    <span>Merged Outstanding Balance</span>
                    <span className="font-mono">+₹{duesInfo.totalDues}</span>
                  </div>
                )}

                {/* Final Total Display */}
                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <span className="text-slate-900 font-extrabold text-base">Grand Total (payable)</span>
                  <span className="text-2xl font-black text-blue-600 font-mono">₹{grandTotal}</span>
                </div>
              </div>

              {/* Service notes input */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">Invoice Notes / Remarks</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Next service due after 3000kms."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none text-xs font-semibold"
                />
              </div>

              {/* Service notes printable area */}
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-500 mb-1">Service Notes (optional)</label>
                <textarea
                  value={serviceNotes}
                  onChange={(e) => setServiceNotes(e.target.value)}
                  placeholder="e.g. Customer requested urgent delivery. Replace chain next month. Engine noise observed."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none text-xs font-semibold resize-none"
                />
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showServiceNotes"
                    checked={showServiceNotes}
                    onChange={(e) => setShowServiceNotes(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="showServiceNotes" className="text-xs text-slate-600 font-bold select-none cursor-pointer">
                    Include Service Notes on Customer Bill / Receipt
                  </label>
                </div>
              </div>
            </div>

            {/* STEP 6: ADVANCE DEPOSITS & PAYMENT SETS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-800">5. Advances & Payment Register</h2>
              </div>

              {/* Advance payments input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 pb-4 border-b border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Advance Deposit Received (₹)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={advanceAmount || ''}
                    onChange={(e) => setAdvanceAmount(parseInt(e.target.value) || 0)}
                    placeholder="Enter Amount"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 focus:border-blue-500 focus:outline-none text-sm font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Advance Mode</label>
                  <select
                    value={advanceMode}
                    onChange={(e) => setAdvanceMode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none text-sm font-bold cursor-pointer"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card Swipe</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
              </div>

              {/* Quick Action buttons */}
              {!isEditMode && (
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-slate-500">Quick Invoice Payments Settlement</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { mode: 'FULL_UPI', label: '⚡ Paid UPI' },
                      { mode: 'FULL_CASH', label: '💵 Paid Cash' },
                      { mode: 'PENDING', label: '⏳ Unpaid/Credit' },
                      { mode: 'CUSTOM', label: '🛠️ Custom Splits' }
                    ].map((opt) => (
                      <button
                        key={opt.mode}
                        type="button"
                        onClick={() => setPaymentMode(opt.mode as any)}
                        className={`py-2.5 rounded-xl text-xs font-extrabold transition-all border ${
                          paymentMode === opt.mode
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm font-black'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Split Collections List (Rendered on CUSTOM or in Edit Mode) */}
              {(paymentMode === 'CUSTOM' || isEditMode) && (
                <div className="mt-5 space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Payment Collection Splits</span>
                    <button
                      type="button"
                      onClick={addPaymentSplitRow}
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl"
                    >
                      <Plus className="h-3 w-3" /> Add Split Row
                    </button>
                  </div>

                  {payments.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold italic py-2">No payment items added yet. Click add above to record collection.</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Desktop View (Table layout visible on medium/larger screens) */}
                      <div className="hidden md:block space-y-2">
                        {payments.map((p) => (
                          <div key={p.tempId} className="flex gap-2 items-center">
                            <select
                              value={p.method}
                              onChange={(e: any) => updatePaymentField(p.tempId, 'method', e.target.value)}
                              className="w-32 rounded-xl border border-slate-200 px-2 py-2 text-slate-900 text-xs font-bold focus:border-blue-500 focus:outline-none bg-white cursor-pointer"
                            >
                              <option value="UPI">⚡ UPI / QR</option>
                              <option value="CASH">💵 Cash</option>
                              <option value="CARD">💳 Card Swipe</option>
                              <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                              <option value="CREDIT">🤝 Credit</option>
                              <option value="OTHER">⚙️ Other</option>
                            </select>

                            <input
                              type="number"
                              inputMode="numeric"
                              value={p.amount || ''}
                              onChange={(e) => updatePaymentField(p.tempId, 'amount', parseInt(e.target.value) || 0)}
                              placeholder="Enter Amount"
                              className="w-28 rounded-xl border border-slate-200 px-2 py-2 text-right font-mono font-bold text-slate-900 text-sm focus:border-blue-500 focus:outline-none"
                            />

                            <input
                              type="text"
                              value={p.notes}
                              onChange={(e) => updatePaymentField(p.tempId, 'notes', e.target.value)}
                              placeholder="Receipt ID / Reference notes..."
                              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-slate-900 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                            />

                            <button
                              type="button"
                              onClick={() => removePaymentRow(p.tempId)}
                              className="h-9 w-9 flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 flex-shrink-0"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Mobile View (Stacked card layout visible on mobile screens) */}
                      <div className="block md:hidden space-y-3">
                        {payments.map((p) => (
                          <div key={p.tempId} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                            <div className="flex justify-between items-center gap-2">
                              <select
                                value={p.method}
                                onChange={(e: any) => updatePaymentField(p.tempId, 'method', e.target.value)}
                                className="flex-1 rounded-xl border border-slate-250 px-2 py-2.5 text-slate-900 text-xs font-bold bg-white focus:outline-none cursor-pointer"
                              >
                                <option value="UPI">⚡ UPI / QR</option>
                                <option value="CASH">💵 Cash</option>
                                <option value="CARD">💳 Card Swipe</option>
                                <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                                <option value="CREDIT">🤝 Credit</option>
                                <option value="OTHER">⚙️ Other</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => removePaymentRow(p.tempId)}
                                className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 flex-shrink-0"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Amount (₹)</label>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={p.amount || ''}
                                  onChange={(e) => updatePaymentField(p.tempId, 'amount', parseInt(e.target.value) || 0)}
                                  placeholder="Enter Amount"
                                  className="w-full rounded-xl border border-slate-250 px-2 py-2 text-right font-mono font-bold text-slate-950 text-sm bg-white focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Reference Note</label>
                                <input
                                  type="text"
                                  value={p.notes}
                                  onChange={(e) => updatePaymentField(p.tempId, 'notes', e.target.value)}
                                  placeholder="Receipt ID / Reference notes..."
                                  className="w-full rounded-xl border border-slate-250 px-3 py-2 text-slate-900 text-xs font-semibold bg-white focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary Variance check */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-500 flex flex-wrap gap-x-6 gap-y-2 justify-between">
                    <div>Total Payable: <span className="font-extrabold text-slate-800 font-mono">₹{grandTotal}</span></div>
                    <div>Recorded Collections: <span className="font-extrabold text-slate-800 font-mono text-green-700">₹{totalPaid}</span></div>
                    <div>Outstanding Balance: <span className={`font-black font-mono ${remainingAmount > 0 ? 'text-amber-500' : 'text-slate-500'}`}>₹{remainingAmount}</span></div>
                  </div>
                </div>
              )}

              {/* Expected balance payment date selector */}
              {derivedStatus !== 'PAID' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" /> Expected Payment Clearance Date
                    </label>
                    <input
                      type="date"
                      value={expectedPaymentDate}
                      onChange={(e) => setExpectedPaymentDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 focus:outline-none text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Follow-up Reminder Date</label>
                    <input
                      type="date"
                      value={followupReminderDate}
                      onChange={(e) => setFollowupReminderDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 focus:outline-none text-xs font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Expected Payment Remarks</label>
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="e.g. Customer will clear balance via GPay next Saturday."
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:outline-none text-xs font-medium"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ACTION SUBMIT BAR */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(false)}
                className="flex-1 bg-success hover:bg-success-hover text-white py-4 px-6 rounded-2xl text-base font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all focus:outline-none disabled:opacity-50"
              >
                <Save className="h-5 w-5" />
                {saving ? 'Saving...' : '✓ Save Invoice Details'}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-2xl text-base font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all focus:outline-none disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
                {saving ? 'Sending...' : 'Save & Share WhatsApp'}
              </button>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
