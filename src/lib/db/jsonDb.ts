import fs from 'fs';
import path from 'path';
import { 
  GarageSettings, Customer, Vehicle, Bill, BillItem, PartSuggestion, 
  CreateBillInput, UpdateBillInput, Mechanic, Payment, Service, 
  ServiceSuggestion, Advance, JobTimer, Followup, ManualImport, ServiceJob,
  VehicleSuggestion, ComplaintSuggestion
} from './types';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

interface Schema {
  settings: Record<string, GarageSettings>;
  customers: (Customer & { garageId: string })[];
  vehicles: (Vehicle & { garageId: string })[];
  bills: (Bill & { garageId: string })[];
  billItems: (BillItem & { garageId: string })[];
  partSuggestions: (PartSuggestion & { garageId: string })[];
  mechanics: (Mechanic & { garageId: string })[];
  payments: (Payment & { garageId: string })[];
  services: (Service & { garageId: string })[];
  serviceSuggestions: (ServiceSuggestion & { garageId: string })[];
  advances: (Advance & { garageId: string })[];
  timers: (JobTimer & { garageId: string })[];
  followups: (Followup & { garageId: string })[];
  manualImports: (ManualImport & { garageId: string })[];
  serviceJobs: (ServiceJob & { garageId: string })[];
  vehicleSuggestions: (VehicleSuggestion & { garageId: string })[];
  complaintSuggestions: (ComplaintSuggestion & { garageId: string })[];
}

const DEFAULT_SETTINGS = (garageId: string): GarageSettings => ({
  name: 'My Motorcycle Garage',
  logo: '',
  ownerName: 'John Owner',
  phone: '9876543210',
  address: '123 Main Street, Garage Lane, Auto City',
  footerMessage: 'Thank you for choosing us! Keep riding safe.',
  warrantyNotes: '',
  whatsappNumber: '',
  socialMedia: '',
});

const MOCK_PART_NAMES = [
  { name: 'Brake Shoe Rear', price: 280 },
  { name: 'Brake Shoe Front', price: 260 },
  { name: 'Brake Wire / Cable', price: 120 },
  { name: 'Brake Oil Dot 4', price: 150 },
  { name: 'Front Disc Pad', price: 420 },
  { name: 'Rear Disc Pad', price: 380 },
  { name: 'Clutch Wire / Cable', price: 110 },
  { name: 'Clutch Plate Set', price: 650 },
  { name: 'Engine Oil 10W-30 (1L)', price: 380 },
  { name: 'Spark Plug NGK', price: 95 },
  { name: 'Air Filter Foam', price: 160 },
  { name: 'Oil Filter', price: 85 },
];

const MOCK_SERVICES = [
  { name: 'General Service', charge: 450 },
  { name: 'Brake Service', charge: 150 },
  { name: 'Clutch Work', charge: 350 },
  { name: 'Engine Tuning', charge: 600 },
  { name: 'Oil Change', charge: 80 },
  { name: 'Chain Lubrication & Adjustment', charge: 120 },
  { name: 'Wheel Alignment', charge: 250 },
];

function generateUuid(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function readDb(garageId: string = 'demo-garage-id'): Schema {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const data = seedInitialData(garageId);
    writeDb(data);
    return data;
  }

  try {
    const fileContent = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(fileContent);
    
    // Schema migrations for backward compatibility
    if (!parsed.mechanics) parsed.mechanics = [];
    if (!parsed.payments) parsed.payments = [];
    if (!parsed.services) parsed.services = [];
    if (!parsed.serviceSuggestions) parsed.serviceSuggestions = [];
    if (!parsed.advances) parsed.advances = [];
    if (!parsed.timers) parsed.timers = [];
    if (!parsed.followups) parsed.followups = [];
    if (!parsed.manualImports) parsed.manualImports = [];
    if (!parsed.serviceJobs) parsed.serviceJobs = [];
    
    return parsed;
  } catch (error) {
    console.error('Error reading json database, generating fallback', error);
    const data = seedInitialData(garageId);
    writeDb(data);
    return data;
  }
}

function writeDb(data: Schema): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Local Trigger Simulator
function recalculateBillTotalsLocal(db: Schema, billId: string | null | undefined, garageId: string) {
  if (!billId) return;

  const jobIdx = db.serviceJobs?.findIndex(j => j.id === billId && j.garageId === garageId);
  if (jobIdx !== undefined && jobIdx !== -1) {
    const job = db.serviceJobs[jobIdx];

    const parts = db.billItems.filter(item => item.jobId === billId && item.garageId === garageId);
    let partsTotal = 0;
    let partsDiscount = 0;

    parts.forEach(item => {
      const baseVal = Number(item.unitPrice || 0) * Number(item.quantity || 1);
      let discVal = 0;
      if (item.discountType === 'PERCENT') {
        const discPct = Number(item.discountValue || item.discountPercentage || 0);
        discVal = Math.round(baseVal * (discPct / 100));
        item.discountPercentage = discPct;
      } else if (item.discountType === 'FLAT') {
        discVal = Number(item.discountValue || 0);
        item.discountPercentage = baseVal > 0 ? Math.round((discVal / baseVal) * 100) : 0;
      } else {
        const discPct = Number(item.discountPercentage || 0);
        discVal = Math.round(baseVal * (discPct / 100));
        item.discountType = 'PERCENT';
        item.discountValue = discPct;
      }
      item.discountAmount = discVal;
      item.finalPrice = baseVal - discVal;
      item.price = item.finalPrice;
      partsTotal += baseVal;
      partsDiscount += discVal;
    });

    const services = db.services.filter(s => s.jobId === billId && s.garageId === garageId);
    let labourTotal = 0;
    let labourDiscount = 0;

    services.forEach(s => {
      const baseVal = Number(s.labourCharge || 0);
      let discVal = 0;
      if (s.discountType === 'PERCENT') {
        const discPct = Number(s.discountValue || 0);
        discVal = Math.round(baseVal * (discPct / 100));
      } else if (s.discountType === 'FLAT') {
        discVal = Number(s.discountValue || s.discount || 0);
      } else {
        discVal = Number(s.discount || 0);
        s.discountType = 'FLAT';
        s.discountValue = discVal;
      }
      s.discount = discVal;
      s.finalCharge = Math.max(0, baseVal - discVal);
      labourTotal += baseVal;
      labourDiscount += discVal;
    });

    const payments = db.payments.filter(p => p.jobId === billId && p.garageId === garageId);
    const advances = db.advances.filter(a => a.jobId === billId && a.garageId === garageId);
    const advancesSum = advances.reduce((sum, a) => sum + Number(a.amount), 0);
    const paymentsAdvSum = payments
      .filter(p => p.notes === 'Advance' || p.notes === 'Advance payment')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const advanceReceived = Math.max(advancesSum, paymentsAdvSum, Number(job.advanceReceived || 0));

    const postPaymentsTotal = payments
      .filter(p => p.notes !== 'Advance' && p.notes !== 'Advance payment')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalCollected = advanceReceived + postPaymentsTotal;

    job.partsTotal = partsTotal;
    job.partsDiscount = partsDiscount;
    job.labourTotal = labourTotal;
    job.labourDiscount = labourDiscount;
    job.advanceReceived = advanceReceived;
    job.receivedAmount = totalCollected;
    job.labour = Math.max(0, labourTotal - labourDiscount);

    const partsNet = partsTotal - partsDiscount;
    const labourNet = labourTotal - labourDiscount;
    const subtotal = partsNet + labourNet;

    let overallDiscountAmount = 0;
    if (job.overallDiscountType === 'PERCENT') {
      const discPct = Number(job.overallDiscountValue || 0);
      overallDiscountAmount = Math.round(subtotal * (discPct / 100));
    } else {
      overallDiscountAmount = Number(job.overallDiscountValue || job.overallDiscount || 0);
      job.overallDiscountType = 'FLAT';
      job.overallDiscountValue = overallDiscountAmount;
    }

    job.overallDiscount = overallDiscountAmount;
    const prevDue = Number(job.previousDueAdded || 0);
    job.total = Math.max(0, subtotal - overallDiscountAmount + prevDue);
    job.remainingAmount = Math.max(0, job.total - totalCollected);

    if (job.remainingAmount === 0 && job.total > 0) {
      job.paymentStatus = 'PAID';
    } else if (totalCollected > 0) {
      job.paymentStatus = 'PARTIAL';
    } else {
      job.paymentStatus = 'PENDING';
    }
    return;
  }

  const billIndex = db.bills.findIndex(b => b.id === billId && b.garageId === garageId);
  if (billIndex === -1) return;

  const bill = db.bills[billIndex];
  
  // 1. Sum Parts (billItems) and recalculate item-level discounts
  const parts = db.billItems.filter(item => item.billId === billId && item.garageId === garageId);
  let partsTotal = 0;
  let partsDiscount = 0;

  parts.forEach(item => {
    const baseVal = Number(item.unitPrice || 0) * Number(item.quantity || 1);
    let discVal = 0;
    
    if (item.discountType === 'PERCENT') {
      const discPct = Number(item.discountValue || item.discountPercentage || 0);
      discVal = Math.round(baseVal * (discPct / 100));
      item.discountPercentage = discPct;
    } else if (item.discountType === 'FLAT') {
      discVal = Number(item.discountValue || 0);
      item.discountPercentage = baseVal > 0 ? Math.round((discVal / baseVal) * 100) : 0;
    } else {
      // Backwards compatibility
      const discPct = Number(item.discountPercentage || 0);
      discVal = Math.round(baseVal * (discPct / 100));
      item.discountType = 'PERCENT';
      item.discountValue = discPct;
    }

    item.discountAmount = discVal;
    item.finalPrice = baseVal - discVal;
    item.price = item.finalPrice; // Backwards compatibility legacy field

    partsTotal += baseVal;
    partsDiscount += discVal;
  });

  // 2. Sum Labour (services) and recalculate service-level discounts
  const services = db.services.filter(s => s.billId === billId && s.garageId === garageId);
  let labourTotal = 0;
  let labourDiscount = 0;

  services.forEach(s => {
    const baseVal = Number(s.labourCharge || 0);
    let discVal = 0;

    if (s.discountType === 'PERCENT') {
      const discPct = Number(s.discountValue || 0);
      discVal = Math.round(baseVal * (discPct / 100));
    } else if (s.discountType === 'FLAT') {
      discVal = Number(s.discountValue || s.discount || 0);
    } else {
      // Backwards compatibility
      discVal = Number(s.discount || 0);
      s.discountType = 'FLAT';
      s.discountValue = discVal;
    }

    s.discount = discVal;
    s.finalCharge = Math.max(0, baseVal - discVal);
    
    labourTotal += baseVal;
    labourDiscount += discVal;
  });

  // 3. Sum Payments and Advances
  const payments = db.payments.filter(p => p.billId === billId && p.garageId === garageId);
  const advances = db.advances.filter(a => a.billId === billId && a.garageId === garageId);
  const advancesSum = advances.reduce((sum, a) => sum + Number(a.amount), 0);
  const paymentsAdvSum = payments
    .filter(p => p.notes === 'Advance' || p.notes === 'Advance payment')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const advanceReceived = Math.max(advancesSum, paymentsAdvSum, Number(bill.advanceReceived || 0));

  const postPaymentsTotal = payments
    .filter(p => p.notes !== 'Advance' && p.notes !== 'Advance payment')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalCollected = advanceReceived + postPaymentsTotal;

  bill.partsTotal = partsTotal;
  bill.partsDiscount = partsDiscount;
  bill.labourTotal = labourTotal;
  bill.labourDiscount = labourDiscount;
  bill.advanceReceived = advanceReceived;
  bill.receivedAmount = totalCollected;
  
  // Set simple legacy fields
  bill.labour = Math.max(0, labourTotal - labourDiscount);

  // 5. Calculate overall discount amount based on type
  const partsNet = partsTotal - partsDiscount;
  const labourNet = labourTotal - labourDiscount;
  const subtotal = partsNet + labourNet;
  
  let overallDiscountAmount = 0;
  if (bill.overallDiscountType === 'PERCENT') {
    const discPct = Number(bill.overallDiscountValue || 0);
    overallDiscountAmount = Math.round(subtotal * (discPct / 100));
  } else {
    overallDiscountAmount = Number(bill.overallDiscountValue || bill.overallDiscount || 0);
    bill.overallDiscountType = 'FLAT';
    bill.overallDiscountValue = overallDiscountAmount;
  }

  bill.overallDiscount = overallDiscountAmount;

  // Grand Total = Parts Net + Labour Net - Overall Discount + Previous Dues
  const prevDue = Number(bill.previousDueAdded || 0);
  bill.total = Math.max(0, subtotal - overallDiscountAmount + prevDue);
  bill.remainingAmount = Math.max(0, bill.total - totalCollected);

  if (bill.remainingAmount === 0 && bill.total > 0) {
    bill.paymentStatus = 'PAID';
  } else if (totalCollected > 0) {
    bill.paymentStatus = 'PARTIAL';
  } else {
    bill.paymentStatus = 'PENDING';
  }
}

function seedInitialData(garageId: string): Schema {
  const settings: Record<string, GarageSettings> = {
    [garageId]: DEFAULT_SETTINGS(garageId),
  };
  const customers: (Customer & { garageId: string })[] = [];
  const vehicles: (Vehicle & { garageId: string })[] = [];
  const bills: (Bill & { garageId: string })[] = [];
  const billItems: (BillItem & { garageId: string })[] = [];
  const mechanics: (Mechanic & { garageId: string })[] = [];
  const payments: (Payment & { garageId: string })[] = [];
  
  const services: (Service & { garageId: string })[] = [];
  const serviceSuggestions: (ServiceSuggestion & { garageId: string })[] = [];
  const advances: (Advance & { garageId: string })[] = [];
  const timers: (JobTimer & { garageId: string })[] = [];
  const followups: (Followup & { garageId: string })[] = [];
  const manualImports: (ManualImport & { garageId: string })[] = [];

  // Seed mechanics with salary/independent splits
  const mockMechanics = [
    { name: 'Ramesh', type: 'Salary' as const },
    { name: 'Suresh', type: 'Independent' as const },
    { name: 'Amit', type: 'Salary' as const },
    { name: 'Ajay', type: 'Independent' as const }
  ];
  
  mockMechanics.forEach((mech, i) => {
    mechanics.push({
      id: `mech_${i + 1}`,
      garageId,
      name: mech.name,
      createdAt: new Date().toISOString(),
      workType: mech.type,
      commissionRate: 0.00
    });
  });

  // Seed part suggestions
  const partSuggestions: (PartSuggestion & { garageId: string })[] = MOCK_PART_NAMES.map((part) => ({
    id: generateUuid(),
    garageId,
    name: part.name,
    price: part.price,
  }));

  // Seed service suggestions
  MOCK_SERVICES.forEach((s) => {
    serviceSuggestions.push({
      id: generateUuid(),
      garageId,
      name: s.name,
      charge: s.charge,
    });
  });

  // Create 10 customers
  const firstNames = ['Ramesh', 'Suresh', 'Amit', 'Vijay', 'Rahul', 'Anil', 'Sanjay', 'Rajesh', 'Sunil', 'Karan'];
  const lastNames = ['Kumar', 'Sharma', 'Singh', 'Patel', 'Verma', 'Gupta', 'Joshi', 'Mehta', 'Reddy', 'Nair'];
  const phones = ['9876543201', '9876543202', '9876543203', '9876543204', '9876543205', '9876543206', '9876543207', '9876543208', '9876543209', '9876543211'];

  for (let i = 0; i < 10; i++) {
    customers.push({
      id: `cust_${i + 1}`,
      garageId,
      name: `${firstNames[i]} ${lastNames[i]}`,
      phone: phones[i],
      createdAt: new Date(Date.now() - i * 5 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // Create 20 vehicles
  const brands = ['Honda', 'Hero', 'TVS', 'Royal Enfield', 'Yamaha', 'Bajaj', 'Suzuki'];
  const models: Record<string, string[]> = {
    'Honda': ['Activa 6G', 'Shine 125', 'Unicorn'],
    'Hero': ['Splendor Plus', 'Glamour'],
    'TVS': ['Jupiter', 'Apache RTR 160'],
    'Royal Enfield': ['Classic 350', 'Bullet 350'],
    'Yamaha': ['FZ-S V3', 'R15 V4'],
    'Bajaj': ['Pulsar 150', 'Platina 100'],
    'Suzuki': ['Access 125', 'Gixxer 150'],
  };

  const stateCodes = ['MH', 'DL', 'KA', 'HR', 'GJ', 'UP'];

  for (let i = 0; i < 20; i++) {
    const customerId = `cust_${(i % 10) + 1}`;
    const brand = brands[i % brands.length];
    const brandModels = models[brand];
    const model = brandModels[i % brandModels.length];
    
    const state = stateCodes[i % stateCodes.length];
    const series = String(12 + (i * 3));
    const randomChars = String.fromCharCode(65 + (i % 26)) + String.fromCharCode(65 + ((i + 3) % 26));
    const number = String(1000 + i * 47).substring(0, 4);
    const vehicleNumber = `${state}-${series}-${randomChars}-${number}`;

    vehicles.push({
      id: `veh_${i + 1}`,
      garageId,
      customerId,
      vehicleNumber,
      brand,
      model,
      createdAt: new Date(Date.now() - i * 3 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // Create 50 bills
  let billCounter = 1;
  const statuses: ('PAID' | 'PARTIAL' | 'PENDING')[] = [
    'PAID', 'PAID', 'PAID', 'PENDING', 'PAID', 
    'PAID', 'PARTIAL', 'PAID', 'PENDING', 'PAID'
  ];

  for (let i = 0; i < 50; i++) {
    const vehicle = vehicles[i % vehicles.length];
    const customer = customers.find(c => c.id === vehicle.customerId)!;
    const date = new Date(Date.now() - (50 - i) * 1.5 * 24 * 60 * 60 * 1000);
    const invoiceNumber = `GB-${1000 + billCounter}`;
    const paymentStatus = statuses[i % statuses.length];
    const billId = `bill_${1000 + billCounter}`;
    const mechanic = mechanics[i % mechanics.length];

    // Seed Parts Items
    const p1 = MOCK_PART_NAMES[(i * 3) % MOCK_PART_NAMES.length];
    const p2 = MOCK_PART_NAMES[(i * 7) % MOCK_PART_NAMES.length];

    billItems.push({
      id: `item_${generateUuid()}`,
      garageId,
      billId,
      name: p1.name,
      price: p1.price,
      quantity: 1,
      unitPrice: p1.price,
      discountPercentage: 0,
      discountAmount: 0,
      finalPrice: p1.price,
      discountType: 'PERCENT',
      discountValue: 0
    });

    billItems.push({
      id: `item_${generateUuid()}`,
      garageId,
      billId,
      name: p2.name,
      price: p2.price,
      quantity: 2,
      unitPrice: p2.price,
      discountPercentage: 10,
      discountAmount: Math.round(p2.price * 2 * 0.1),
      finalPrice: Math.round(p2.price * 2 * 0.9),
      discountType: 'PERCENT',
      discountValue: 10
    });

    // Seed Labour Service Item
    const s1 = MOCK_SERVICES[i % MOCK_SERVICES.length];
    services.push({
      id: `serv_${generateUuid()}`,
      garageId,
      billId,
      name: s1.name,
      mechanicId: mechanic.id,
      labourCharge: s1.charge,
      discount: 0,
      finalCharge: s1.charge,
      mechanicType: mechanic.workType,
      commissionRate: 0.00,
      workingTime: 0,
      startTime: null,
      endTime: null,
      discountType: 'FLAT',
      discountValue: 0
    });

    const partsTotal = p1.price + (p2.price * 2);
    const partsDiscount = Math.round(p2.price * 2 * 0.1);
    const labourTotal = s1.charge;
    const total = (partsTotal - partsDiscount) + labourTotal;

    let receivedAmount = 0;
    let expectedPaymentDate: string | null = null;
    let followupReminderDate: string | null = null;
    let paymentNotes: string | null = null;

    if (paymentStatus === 'PAID') {
      receivedAmount = total;
      payments.push({
        id: `pay_${generateUuid()}`,
        garageId,
        billId,
        paymentMethod: i % 2 === 0 ? 'UPI' : 'CASH',
        amount: total,
        paymentDate: date.toISOString(),
        notes: 'Full payment',
        createdAt: date.toISOString(),
      });
    } else if (paymentStatus === 'PARTIAL') {
      const half = Math.floor(total / 2);
      receivedAmount = half;
      payments.push({
        id: `pay_${generateUuid()}`,
        garageId,
        billId,
        paymentMethod: 'CASH',
        amount: half,
        paymentDate: date.toISOString(),
        notes: 'Deposit paid',
        createdAt: date.toISOString(),
      });
      expectedPaymentDate = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      followupReminderDate = new Date(date.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString();
      paymentNotes = 'Balance next week';
      followups.push({
        id: `fol_${generateUuid()}`,
        garageId,
        billId,
        followupDate: expectedPaymentDate,
        notes: paymentNotes,
        status: 'PENDING',
        createdAt: date.toISOString(),
      });
    } else {
      expectedPaymentDate = new Date(date.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
      followupReminderDate = new Date(date.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
      paymentNotes = 'Will clear on delivery';
      followups.push({
        id: `fol_${generateUuid()}`,
        garageId,
        billId,
        followupDate: expectedPaymentDate,
        notes: paymentNotes,
        status: 'PENDING',
        createdAt: date.toISOString(),
      });
    }

    const hoursMultiplier = (i % 3) + 1;
    const actualWorkingSeconds = hoursMultiplier * 3600;
    const isQueue = i >= 45;
    const jobStatus = isQueue 
      ? (i === 45 ? 'Waiting' : i === 46 ? 'Assigned' : i === 47 ? 'Work Started' : i === 48 ? 'Waiting for Parts' : 'Completed')
      : 'Delivered';

    bills.push({
      id: billId,
      garageId,
      vehicleId: vehicle.id,
      customerId: customer.id,
      invoiceNumber,
      date: date.toISOString(),
      labour: labourTotal,
      total,
      notes: i % 4 === 0 ? 'General service tuning' : 'Oil replacement and adjustments',
      paymentStatus,
      createdAt: date.toISOString(),
      mechanicId: mechanic.id,
      receivedAmount,
      remainingAmount: total - receivedAmount,
      expectedPaymentDate,
      followupReminderDate,
      paymentNotes,
      jobStatus,
      workRequested: 'Perform complete inspection and adjust breaks.',
      jobStartTime: isQueue && i < 48 ? null : new Date(date.getTime() - actualWorkingSeconds * 1000).toISOString(),
      jobEndTime: jobStatus === 'Completed' || jobStatus === 'Delivered' ? date.toISOString() : null,
      totalWorkingTime: actualWorkingSeconds + (i % 2 === 0 ? 600 : 0),
      pauseDuration: i % 2 === 0 ? 600 : 0,
      actualWorkingDuration: actualWorkingSeconds,
      timerState: jobStatus === 'Work Started' ? 'RUNNING' : (jobStatus === 'Waiting for Parts' ? 'PAUSED' : (jobStatus === 'Completed' || jobStatus === 'Delivered' ? 'COMPLETED' : 'STOPPED')),
      lastTimerActionAt: date.toISOString(),
      partsTotal,
      partsDiscount,
      labourTotal,
      labourDiscount: 0,
      overallDiscount: 0,
      advanceReceived: 0,
      previousDueAdded: 0,
      previousDueBillIds: [],
      overallDiscountType: 'FLAT',
      overallDiscountValue: 0
    });

    billCounter++;
  }

  return {
    settings,
    customers,
    vehicles,
    bills,
    billItems,
    partSuggestions,
    mechanics,
    payments,
    services,
    serviceSuggestions,
    advances,
    timers,
    followups,
    manualImports,
    serviceJobs: [],
    vehicleSuggestions: [],
    complaintSuggestions: [],
  };
}

export const jsonDb = {
  seedDemoData: async (garageId: string): Promise<boolean> => {
    const data = seedInitialData(garageId);
    writeDb(data);
    return true;
  },

  // Mechanics
  getMechanics: async (garageId: string): Promise<Mechanic[]> => {
    const db = readDb(garageId);
    return db.mechanics.filter(m => m.garageId === garageId);
  },

  createMechanic: async (garageId: string, name: string, workType: 'Salary' | 'Independent' = 'Salary', commissionRate: number = 0, salary: number = 0): Promise<Mechanic> => {
    const db = readDb(garageId);
    const cleanName = name.trim();
    const existing = db.mechanics.find(m => m.name.toLowerCase() === cleanName.toLowerCase() && m.garageId === garageId);
    if (existing) return existing;

    const newMech: Mechanic = {
      id: 'mech_' + generateUuid(),
      garageId,
      name: cleanName,
      createdAt: new Date().toISOString(),
      workType,
      commissionRate,
      salary
    };
    db.mechanics.push(newMech);
    writeDb(db);
    return newMech;
  },

  updateMechanic: async (garageId: string, id: string, name: string, workType?: 'Salary' | 'Independent', commissionRate?: number, salary?: number): Promise<Mechanic> => {
    const db = readDb(garageId);
    const idx = db.mechanics.findIndex(m => m.id === id && m.garageId === garageId);
    if (idx === -1) throw new Error('Mechanic not found');
    db.mechanics[idx].name = name.trim();
    if (workType) db.mechanics[idx].workType = workType;
    if (commissionRate !== undefined) db.mechanics[idx].commissionRate = commissionRate;
    if (salary !== undefined) db.mechanics[idx].salary = salary;
    writeDb(db);
    return db.mechanics[idx];
  },

  deleteMechanic: async (garageId: string, id: string): Promise<boolean> => {
    const db = readDb(garageId);
    db.mechanics = db.mechanics.filter(m => !(m.id === id && m.garageId === garageId));
    db.bills.forEach(b => {
      if (b.mechanicId === id && b.garageId === garageId) {
        b.mechanicId = null;
      }
    });
    writeDb(db);
    return true;
  },

  // Service Suggestions
  getServiceSuggestions: async (garageId: string, query?: string): Promise<ServiceSuggestion[]> => {
    const db = readDb(garageId);
    let list = db.serviceSuggestions.filter(s => s.garageId === garageId);
    if (query) {
      const q = query.toLowerCase().trim();
      list = list.filter(s => s.name.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  },

  addServiceSuggestion: async (garageId: string, name: string, charge: number = 0): Promise<ServiceSuggestion> => {
    const db = readDb(garageId);
    const cleanName = name.trim();
    const existing = db.serviceSuggestions.find(s => s.name.toLowerCase() === cleanName.toLowerCase() && s.garageId === garageId);
    if (existing) {
      existing.charge = charge;
      writeDb(db);
      return existing;
    }
    const newSug = {
      id: 'sug_' + generateUuid(),
      garageId,
      name: cleanName,
      charge,
    };
    db.serviceSuggestions.push(newSug);
    writeDb(db);
    return newSug;
  },

  // Payments
  getPaymentsForBill: async (garageId: string, billId: string): Promise<Payment[]> => {
    const db = readDb(garageId);
    return db.payments
      .filter(p => p.billId === billId && p.garageId === garageId)
      .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
  },

  addPayment: async (
    garageId: string, 
    billId: string, 
    paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CREDIT' | 'OTHER', 
    amount: number, 
    notes?: string | null, 
    paymentDate?: string
  ): Promise<Payment> => {
    const db = readDb(garageId);
    const bill = db.bills.find(b => b.id === billId && b.garageId === garageId);
    if (!bill) throw new Error('Bill not found');

    const newPayment: Payment = {
      id: 'pay_' + generateUuid(),
      garageId,
      billId,
      paymentMethod,
      amount: Number(amount),
      paymentDate: paymentDate || new Date().toISOString(),
      notes: notes || null,
      createdAt: new Date().toISOString(),
    };

    db.payments.push(newPayment);
    recalculateBillTotalsLocal(db, billId, garageId);
    writeDb(db);
    return newPayment;
  },

  deletePayment: async (garageId: string, id: string): Promise<boolean> => {
    const db = readDb(garageId);
    const payment = db.payments.find(p => p.id === id && p.garageId === garageId);
    if (!payment) return false;

    const billId = payment.billId;
    db.payments = db.payments.filter(p => !(p.id === id && p.garageId === garageId));
    recalculateBillTotalsLocal(db, billId, garageId);
    writeDb(db);
    return true;
  },

  // Job Timer Actions State Machine
  logTimerAction: async (garageId: string, billId: string, action: 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE'): Promise<Bill> => {
    const db = readDb(garageId);
    
    // Check if it is a Service Job
    const jobIdx = db.serviceJobs?.findIndex(j => j.id === billId && j.garageId === garageId);
    if (jobIdx !== undefined && jobIdx !== -1) {
      const job = db.serviceJobs[jobIdx];
      const timestamp = new Date().toISOString();

      db.timers.push({
        id: 'timer_' + generateUuid(),
        garageId,
        jobId: billId,
        action,
        timestamp,
      });

      const lastActionTime = job.lastTimerActionAt ? new Date(job.lastTimerActionAt).getTime() : new Date().getTime();
      const diffSeconds = Math.max(0, Math.floor((new Date(timestamp).getTime() - lastActionTime) / 1000));

      if (action === 'START') {
        job.timerState = 'RUNNING';
        job.jobStartTime = timestamp;
        job.jobStatus = 'Work Started';
        job.lastTimerActionAt = timestamp;
      } else if (action === 'PAUSE') {
        if (job.timerState === 'RUNNING') {
          job.actualWorkingDuration = (job.actualWorkingDuration || 0) + diffSeconds;
        }
        job.timerState = 'PAUSED';
        job.jobStatus = 'Waiting for Parts';
        job.lastTimerActionAt = timestamp;
      } else if (action === 'RESUME') {
        if (job.timerState === 'PAUSED') {
          job.pauseDuration = (job.pauseDuration || 0) + diffSeconds;
        }
        job.timerState = 'RUNNING';
        job.jobStatus = 'Work Started';
        job.lastTimerActionAt = timestamp;
      } else if (action === 'COMPLETE') {
        if (job.timerState === 'RUNNING') {
          job.actualWorkingDuration = (job.actualWorkingDuration || 0) + diffSeconds;
        } else if (job.timerState === 'PAUSED') {
          job.pauseDuration = (job.pauseDuration || 0) + diffSeconds;
        }
        job.timerState = 'COMPLETED';
        job.jobEndTime = timestamp;
        job.jobStatus = 'Completed';
        job.totalWorkingTime = (job.actualWorkingDuration || 0) + (job.pauseDuration || 0);
        job.lastTimerActionAt = timestamp;
      }

      db.services.filter(s => s.jobId === billId && s.garageId === garageId).forEach(s => {
        s.workingTime = job.actualWorkingDuration;
        s.startTime = job.jobStartTime;
        s.endTime = job.jobEndTime;
      });

      writeDb(db);
      return job as unknown as Bill;
    }

    const billIdx = db.bills.findIndex(b => b.id === billId && b.garageId === garageId);
    if (billIdx === -1) throw new Error('Bill not found');
    const bill = db.bills[billIdx];
    const timestamp = new Date().toISOString();

    db.timers.push({
      id: 'timer_' + generateUuid(),
      garageId,
      billId,
      action,
      timestamp,
    });

    const lastActionTime = bill.lastTimerActionAt ? new Date(bill.lastTimerActionAt).getTime() : new Date().getTime();
    const diffSeconds = Math.max(0, Math.floor((new Date(timestamp).getTime() - lastActionTime) / 1000));

    if (action === 'START') {
      bill.timerState = 'RUNNING';
      bill.jobStartTime = timestamp;
      bill.jobStatus = 'Work Started';
      bill.lastTimerActionAt = timestamp;
    } else if (action === 'PAUSE') {
      if (bill.timerState === 'RUNNING') {
        bill.actualWorkingDuration = (bill.actualWorkingDuration || 0) + diffSeconds;
      }
      bill.timerState = 'PAUSED';
      bill.jobStatus = 'Waiting for Parts';
      bill.lastTimerActionAt = timestamp;
    } else if (action === 'RESUME') {
      if (bill.timerState === 'PAUSED') {
        bill.pauseDuration = (bill.pauseDuration || 0) + diffSeconds;
      }
      bill.timerState = 'RUNNING';
      bill.jobStatus = 'Work Started';
      bill.lastTimerActionAt = timestamp;
    } else if (action === 'COMPLETE') {
      if (bill.timerState === 'RUNNING') {
        bill.actualWorkingDuration = (bill.actualWorkingDuration || 0) + diffSeconds;
      } else if (bill.timerState === 'PAUSED') {
        bill.pauseDuration = (bill.pauseDuration || 0) + diffSeconds;
      }
      bill.timerState = 'COMPLETED';
      bill.jobEndTime = timestamp;
      bill.jobStatus = 'Completed';
      bill.totalWorkingTime = (bill.actualWorkingDuration || 0) + (bill.pauseDuration || 0);
      bill.lastTimerActionAt = timestamp;
    }

    // Also update working times on services
    db.services.filter(s => s.billId === billId && s.garageId === garageId).forEach(s => {
      s.workingTime = bill.actualWorkingDuration;
      s.startTime = bill.jobStartTime;
      s.endTime = bill.jobEndTime;
    });

    writeDb(db);
    return bill;
  },

  // Manual Imports
  getManualImports: async (garageId: string, query?: string): Promise<ManualImport[]> => {
    const db = readDb(garageId);
    let list = db.manualImports.filter(m => m.garageId === garageId);
    if (query) {
      const q = query.toLowerCase().trim();
      list = list.filter(m => 
        m.customerName.toLowerCase().includes(q) || 
        m.phone.includes(q) || 
        m.vehicleNumber.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime());
  },

  createManualImport: async (garageId: string, input: any): Promise<ManualImport> => {
    const db = readDb(garageId);
    const newImp: ManualImport & { garageId: string } = {
      id: 'imp_' + generateUuid(),
      garageId,
      customerName: input.customerName.trim(),
      phone: input.phone.trim(),
      vehicleNumber: input.vehicleNumber.toUpperCase().trim(),
      billDate: input.billDate || new Date().toISOString(),
      amount: Number(input.amount),
      paidAmount: Number(input.paidAmount),
      pendingAmount: Number(input.pendingAmount),
      notes: input.notes?.trim() || null,
      createdAt: new Date().toISOString(),
    };
    db.manualImports.push(newImp);
    writeDb(db);
    return newImp;
  },

  // Garage Settings
  getGarageSettings: async (garageId: string): Promise<GarageSettings> => {
    const db = readDb(garageId);
    if (!db.settings[garageId]) {
      db.settings[garageId] = DEFAULT_SETTINGS(garageId);
      writeDb(db);
    }
    return db.settings[garageId];
  },

  updateGarageSettings: async (garageId: string, settings: GarageSettings): Promise<GarageSettings> => {
    const db = readDb(garageId);
    db.settings[garageId] = {
      ...DEFAULT_SETTINGS(garageId),
      ...settings,
    };
    writeDb(db);
    return db.settings[garageId];
  },

  // Customers
  getCustomers: async (garageId: string, query?: string): Promise<Customer[]> => {
    const db = readDb(garageId);
    let list = db.customers.filter(c => c.garageId === garageId);
    if (query) {
      const q = query.toLowerCase().trim();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  },

  getCustomerById: async (garageId: string, id: string): Promise<Customer | null> => {
    const db = readDb(garageId);
    return db.customers.find(c => c.id === id && c.garageId === garageId) || null;
  },

  getCustomerByPhone: async (garageId: string, phone: string): Promise<Customer | null> => {
    const db = readDb(garageId);
    return db.customers.find(c => c.phone === phone.trim() && c.garageId === garageId) || null;
  },

  getCustomerOutstandingDues: async (garageId: string, phone: string): Promise<{ totalDues: number; unpaidBills: any[]; followupDate?: string | null }> => {
    const db = readDb(garageId);
    const customer = db.customers.find(c => c.phone === phone.trim() && c.garageId === garageId);
    if (!customer) return { totalDues: 0, unpaidBills: [] };

    const unpaidBills = db.bills
      .filter(b => b.customerId === customer.id && b.paymentStatus !== 'PAID' && b.garageId === garageId)
      .map(b => ({
        id: b.id,
        invoiceNumber: b.invoiceNumber,
        date: b.date,
        remainingAmount: b.remainingAmount,
      }));

    const unpaidImports = db.manualImports
      .filter(m => m.phone === phone.trim() && m.pendingAmount > 0 && m.garageId === garageId)
      .map(m => ({
        id: m.id,
        invoiceNumber: `Imported (${new Date(m.billDate).toLocaleDateString('en-GB')})`,
        date: m.billDate,
        remainingAmount: m.pendingAmount,
        isImport: true,
      }));

    const customerBillIds = db.bills.filter(b => b.customerId === customer.id && b.garageId === garageId).map(b => b.id);
    const customerJobIds = (db.serviceJobs || []).filter(j => j.customerId === customer.id && j.garageId === garageId).map(j => j.id);

    const followup = (db.followups || [])
      .filter(f => {
        const isMatch = (f.billId && customerBillIds.includes(f.billId)) || 
                        (f.jobId && customerJobIds.includes(f.jobId));
        return isMatch && f.status === 'PENDING' && f.garageId === garageId;
      })
      .sort((a, b) => new Date(a.followupDate).getTime() - new Date(b.followupDate).getTime())[0];
    const followupDate = followup ? followup.followupDate : null;

    const allUnpaid = [...unpaidBills, ...unpaidImports];
    const totalDues = allUnpaid.reduce((sum, item) => sum + item.remainingAmount, 0);

    return {
      totalDues,
      unpaidBills: allUnpaid,
      followupDate,
    };
  },

  createCustomer: async (garageId: string, name: string, phone: string): Promise<Customer> => {
    const db = readDb(garageId);
    const cleanPhone = phone.trim();
    const existing = db.customers.find(c => c.phone === cleanPhone && c.garageId === garageId);
    if (existing) return existing;

    const newCustomer: Customer = {
      id: 'cust_' + generateUuid(),
      name: name.trim(),
      phone: cleanPhone,
      createdAt: new Date().toISOString(),
    };
    db.customers.push({ ...newCustomer, garageId });
    writeDb(db);
    return newCustomer;
  },

  // Vehicles
  getVehiclesByCustomerId: async (garageId: string, customerId: string): Promise<Vehicle[]> => {
    const db = readDb(garageId);
    return db.vehicles.filter(v => v.customerId === customerId && v.garageId === garageId);
  },

  getVehicleById: async (garageId: string, id: string): Promise<Vehicle | null> => {
    const db = readDb(garageId);
    return db.vehicles.find(v => v.id === id && v.garageId === garageId) || null;
  },

  createVehicle: async (garageId: string, customerId: string, vehicleNumber: string, brand: string, model: string): Promise<Vehicle> => {
    const db = readDb(garageId);
    const cleanNumber = vehicleNumber.toUpperCase().replace(/\s+/g, '-').trim();
    const existing = db.vehicles.find(v => v.vehicleNumber === cleanNumber && v.garageId === garageId);
    if (existing) return existing;

    const newVehicle: Vehicle = {
      id: 'veh_' + generateUuid(),
      customerId,
      vehicleNumber: cleanNumber,
      brand: brand.trim(),
      model: model.trim(),
      createdAt: new Date().toISOString(),
    };
    db.vehicles.push({ ...newVehicle, garageId });
    writeDb(db);
    return newVehicle;
  },

  // Part Suggestions
  getPartSuggestions: async (garageId: string, query?: string): Promise<PartSuggestion[]> => {
    const db = readDb(garageId);
    let list = db.partSuggestions.filter(p => p.garageId === garageId);
    if (query) {
      const q = query.toLowerCase().trim();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  },

  addPartSuggestion: async (garageId: string, name: string, price: number | null = null): Promise<PartSuggestion> => {
    const db = readDb(garageId);
    const cleanName = name.trim();
    const existing = db.partSuggestions.find(p => p.name.toLowerCase() === cleanName.toLowerCase() && p.garageId === garageId);
    if (existing) {
      if (price !== null) {
        existing.price = price;
        writeDb(db);
      }
      return existing;
    }

    const newPart: PartSuggestion = {
      id: 'part_' + generateUuid(),
      name: cleanName,
      price,
    };
    db.partSuggestions.push({ ...newPart, garageId });
    writeDb(db);
    return newPart;
  },

  // Bills Queries
  getBillsByVehicleId: async (garageId: string, vehicleId: string): Promise<Bill[]> => {
    const db = readDb(garageId);
    return db.bills
      .filter(b => b.vehicleId === vehicleId && b.garageId === garageId)
      .map(b => ({
        ...b,
        customer: db.customers.find(c => c.id === b.customerId),
        vehicle: db.vehicles.find(v => v.id === b.vehicleId),
        items: db.billItems.filter(item => item.billId === b.id),
        mechanic: db.mechanics.find(m => m.id === b.mechanicId),
        payments: db.payments.filter(p => p.billId === b.id),
        services: db.services.filter(s => s.billId === b.id).map(s => ({
          ...s,
          mechanic: db.mechanics.find(m => m.id === s.mechanicId)
        })),
        advances: db.advances.filter(a => a.billId === b.id),
        timers: db.timers.filter(t => t.billId === b.id),
        followups: db.followups.filter(f => f.billId === b.id),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getBillById: async (garageId: string, id: string): Promise<Bill | null> => {
    const db = readDb(garageId);
    
    // Check serviceJobs first
    const job = db.serviceJobs?.find(j => j.id === id && j.garageId === garageId);
    if (job) {
      return {
        ...job,
        invoiceNumber: '',
        customer: db.customers.find(c => c.id === job.customerId),
        vehicle: db.vehicles.find(v => v.id === job.vehicleId),
        items: db.billItems.filter(item => item.jobId === job.id),
        mechanic: db.mechanics.find(m => m.id === job.mechanicId),
        payments: db.payments.filter(p => p.jobId === job.id),
        services: db.services.filter(s => s.jobId === job.id).map(s => ({
          ...s,
          mechanic: db.mechanics.find(m => m.id === s.mechanicId)
        })),
        advances: db.advances.filter(a => a.jobId === job.id),
        timers: db.timers.filter(t => t.jobId === job.id),
        followups: db.followups.filter(f => f.jobId === job.id),
      } as unknown as Bill;
    }

    const bill = db.bills.find(b => b.id === id && b.garageId === garageId);
    if (!bill) return null;
    return {
      ...bill,
      customer: db.customers.find(c => c.id === bill.customerId),
      vehicle: db.vehicles.find(v => v.id === bill.vehicleId),
      items: db.billItems.filter(item => item.billId === bill.id),
      mechanic: db.mechanics.find(m => m.id === bill.mechanicId),
      payments: db.payments.filter(p => p.billId === bill.id),
      services: db.services.filter(s => s.billId === bill.id).map(s => ({
        ...s,
        mechanic: db.mechanics.find(m => m.id === s.mechanicId)
      })),
      advances: db.advances.filter(a => a.billId === bill.id),
      timers: db.timers.filter(t => t.billId === bill.id),
      followups: db.followups.filter(f => f.billId === bill.id),
    };
  },

  getRecentBills: async (garageId: string, limit: number = 20): Promise<Bill[]> => {
    const db = readDb(garageId);
    return db.bills
      .filter(b => b.garageId === garageId)
      .map(b => ({
        ...b,
        customer: db.customers.find(c => c.id === b.customerId),
        vehicle: db.vehicles.find(v => v.id === b.vehicleId),
        items: db.billItems.filter(item => item.billId === b.id),
        mechanic: db.mechanics.find(m => m.id === b.mechanicId),
        payments: db.payments.filter(p => p.billId === b.id),
        services: db.services.filter(s => s.billId === b.id).map(s => ({
          ...s,
          mechanic: db.mechanics.find(m => m.id === s.mechanicId)
        })),
        advances: db.advances.filter(a => a.billId === b.id),
        timers: db.timers.filter(t => t.billId === b.id),
        followups: db.followups.filter(f => f.billId === b.id),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  },

  createBill: async (garageId: string, input: CreateBillInput): Promise<Bill> => {
    const db = readDb(garageId);
    const { 
      customerId, customerName, customerPhone, 
      vehicleId, vehicleNumber, vehicleBrand, vehicleModel,
      date, labour, notes, paymentStatus, items: inputItems,
      mechanicId, mechanicName, payments: initialPayments,
      expectedPaymentDate, followupReminderDate, paymentNotes,
      jobStatus, workRequested, services: inputServices, advances: inputAdvances,
      overallDiscount, previousDueAdded, previousDueBillIds,
      overallDiscountType, overallDiscountValue,
      serviceNotes, showServiceNotes
    } = input;
    
    // 1. Resolve Customer
    let customer: Customer;
    if (customerId) {
      customer = db.customers.find(c => c.id === customerId && c.garageId === garageId)!;
    } else if (customerPhone && customerName) {
      const existing = db.customers.find(c => c.phone === customerPhone.trim() && c.garageId === garageId);
      if (existing) {
        customer = existing;
      } else {
        customer = {
          id: 'cust_' + generateUuid(),
          name: customerName.trim(),
          phone: customerPhone.trim(),
          createdAt: new Date().toISOString(),
        };
        db.customers.push({ ...customer, garageId });
      }
    } else {
      throw new Error('Customer information missing.');
    }

    // 2. Resolve Vehicle
    let vehicle: Vehicle;
    if (vehicleId) {
      vehicle = db.vehicles.find(v => v.id === vehicleId && v.garageId === garageId)!;
    } else if (vehicleNumber && vehicleBrand && vehicleModel) {
      const cleanNumber = vehicleNumber.toUpperCase().replace(/\s+/g, '-').trim();
      const existing = db.vehicles.find(v => v.vehicleNumber === cleanNumber && v.garageId === garageId);
      if (existing) {
        vehicle = existing;
      } else {
        vehicle = {
          id: 'veh_' + generateUuid(),
          customerId: customer.id,
          vehicleNumber: cleanNumber,
          brand: vehicleBrand.trim(),
          model: vehicleModel.trim(),
          createdAt: new Date().toISOString(),
        };
        db.vehicles.push({ ...vehicle, garageId });
      }
    } else {
      throw new Error('Vehicle information missing.');
    }

    // 2b. Prevent active queue duplicates
    const existingActiveBill = db.bills.find(b => 
      b.garageId === garageId && 
      b.vehicleId === vehicle.id && 
      b.jobStatus !== 'Delivered' && 
      b.jobStatus !== 'Cancelled'
    );

    if (existingActiveBill) {
      const activeInfo = await jsonDb.getBillById(garageId, existingActiveBill.id);
      if (activeInfo) return activeInfo;
    }

    // 3. Resolve General Mechanic
    let resolvedMechanicId: string | null = mechanicId || null;
    if (mechanicName && mechanicName.trim()) {
      const cleanName = mechanicName.trim();
      const existingMech = db.mechanics.find(m => m.name.toLowerCase() === cleanName.toLowerCase() && m.garageId === garageId);
      if (existingMech) {
        resolvedMechanicId = existingMech.id;
      } else {
        const newMech = {
          id: 'mech_' + generateUuid(),
          garageId,
          name: cleanName,
          createdAt: new Date().toISOString(),
          workType: 'Salary' as const,
          commissionRate: 0.00
        };
        db.mechanics.push(newMech);
        resolvedMechanicId = newMech.id;
      }
    }

    // 4. Generate Invoice Number
    const garageBills = db.bills.filter(b => b.garageId === garageId);
    const lastInvoiceNumber = garageBills.length > 0 
      ? Math.max(...garageBills.map(b => {
          const match = b.invoiceNumber.match(/GB-(\d+)/);
          return match ? parseInt(match[1]) : 1000;
        }))
      : 1000;
    const invoiceNumber = `GB-${lastInvoiceNumber + 1}`;
    const billId = 'bill_' + generateUuid();
    
    // 5. Insert Parts Items
    const items: BillItem[] = [];
    inputItems.forEach((item) => {
      const newItem: BillItem = {
        id: `item_${generateUuid()}`,
        billId,
        name: item.name.trim(),
        price: Number(item.finalPrice || item.unitPrice || 0),
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        discountPercentage: Number(item.discountPercentage || 0),
        discountAmount: Number(item.discountAmount || 0),
        finalPrice: Number(item.finalPrice || 0),
        discountType: item.discountType || 'PERCENT',
        discountValue: Number(item.discountValue || 0)
      };
      
      db.billItems.push({ ...newItem, garageId });
      items.push(newItem);

      // Auto-save suggestions
      const cleanPartName = item.name.trim();
      const existingPartSug = db.partSuggestions.find(p => p.name.toLowerCase() === cleanPartName.toLowerCase() && p.garageId === garageId);
      if (!existingPartSug) {
        db.partSuggestions.push({
          id: 'part_' + generateUuid(),
          garageId,
          name: cleanPartName,
          price: Number(item.unitPrice),
        });
      }
    });

    // 6. Insert Services (Labour Work)
    const billServices: Service[] = [];
    if (inputServices && inputServices.length > 0) {
      inputServices.forEach((s) => {
        let servMechId = s.mechanicId || null;
        let sWorkType = s.mechanicType || 'Salary';
        if (s.mechanicName && s.mechanicName.trim()) {
          const cleanMechName = s.mechanicName.trim();
          const existingMech = db.mechanics.find(m => m.name.toLowerCase() === cleanMechName.toLowerCase() && m.garageId === garageId);
          if (existingMech) {
            servMechId = existingMech.id;
            sWorkType = existingMech.workType;
          } else {
            const newMech = {
              id: 'mech_' + generateUuid(),
              garageId,
              name: cleanMechName,
              createdAt: new Date().toISOString(),
              workType: 'Salary' as const,
              commissionRate: 0.00
            };
            db.mechanics.push(newMech);
            servMechId = newMech.id;
            sWorkType = newMech.workType;
          }
        } else if (servMechId) {
          const m = db.mechanics.find(mech => mech.id === servMechId);
          if (m) sWorkType = m.workType;
        }

        const newService: Service = {
          id: `serv_${generateUuid()}`,
          billId,
          name: s.name.trim(),
          mechanicId: servMechId,
          labourCharge: Number(s.labourCharge || 0),
          discount: Number(s.discount || 0),
          finalCharge: Number(s.finalCharge || 0),
          mechanicType: sWorkType as any,
          commissionRate: Number(s.commissionRate || 0),
          workingTime: Number(s.workingTime || 0),
          startTime: s.startTime || null,
          endTime: s.endTime || null,
          discountType: s.discountType || 'FLAT',
          discountValue: Number(s.discountValue || 0)
        };

        db.services.push({ ...newService, garageId });
        billServices.push(newService);

        // Auto-save service suggestions
        const cleanServName = s.name.trim();
        const existingServSug = db.serviceSuggestions.find(sug => sug.name.toLowerCase() === cleanServName.toLowerCase() && sug.garageId === garageId);
        if (!existingServSug) {
          db.serviceSuggestions.push({
            id: 'sug_' + generateUuid(),
            garageId,
            name: cleanServName,
            charge: Number(s.labourCharge),
          });
        }
      });
    }

    // 7. Insert Advances
    if (inputAdvances && inputAdvances.length > 0) {
      inputAdvances.forEach(adv => {
        if (adv.amount > 0) {
          db.advances.push({
            id: `adv_${generateUuid()}`,
            garageId,
            billId,
            amount: Number(adv.amount),
            paymentMode: adv.paymentMode as any,
            createdAt: date || new Date().toISOString(),
          });

          // Automatically push to payments table as first entry in payment history
          db.payments.push({
            id: 'pay_' + generateUuid(),
            garageId,
            billId,
            paymentMethod: adv.paymentMode.toUpperCase() as any,
            amount: Number(adv.amount),
            paymentDate: date || new Date().toISOString(),
            notes: 'Advance',
            createdAt: new Date().toISOString(),
          });
        }
      });
    }

    // 8. Insert Payments
    if (initialPayments && initialPayments.length > 0) {
      initialPayments.forEach(p => {
        if (p.amount > 0) {
          db.payments.push({
            id: 'pay_' + generateUuid(),
            garageId,
            billId,
            paymentMethod: p.paymentMethod.toUpperCase() as any,
            amount: Number(p.amount),
            paymentDate: date || new Date().toISOString(),
            notes: p.notes || 'Initial payment',
            createdAt: new Date().toISOString(),
          });
        }
      });
    }

    // 9. Create followup if pending
    if (paymentStatus !== 'PAID' && expectedPaymentDate) {
      db.followups.push({
        id: `fol_${generateUuid()}`,
        garageId,
        billId,
        followupDate: expectedPaymentDate,
        notes: paymentNotes,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });
    }

    // 10. Mark merged previous dues as COMPLETED
    if (previousDueBillIds && previousDueBillIds.length > 0) {
      previousDueBillIds.forEach(id => {
        const targetBill = db.bills.find(b => b.id === id && b.garageId === garageId);
        if (targetBill) {
          db.payments.push({
            id: 'pay_' + generateUuid(),
            garageId,
            billId: id,
            paymentMethod: 'CREDIT',
            amount: targetBill.remainingAmount,
            paymentDate: new Date().toISOString(),
            notes: `Merged into invoice ${invoiceNumber}`,
            createdAt: new Date().toISOString(),
          });
          recalculateBillTotalsLocal(db, id, garageId);
        }

        const targetImp = db.manualImports.find(m => m.id === id && m.garageId === garageId);
        if (targetImp) {
          targetImp.paidAmount = targetImp.amount;
          targetImp.pendingAmount = 0;
          targetImp.notes = `Merged into invoice ${invoiceNumber}. ${targetImp.notes || ''}`;
        }

        db.followups
          .filter(f => f.billId === id && f.garageId === garageId)
          .forEach(f => f.status = 'COMPLETED');
      });
    }

    // 11. Save Bill record
    const newBill: Bill = {
      id: billId,
      vehicleId: vehicle.id,
      customerId: customer.id,
      invoiceNumber,
      date: date || new Date().toISOString(),
      labour: Number(labour),
      total: 0,
      notes: notes?.trim() || '',
      paymentStatus: paymentStatus,
      createdAt: new Date().toISOString(),
      mechanicId: resolvedMechanicId,
      receivedAmount: 0,
      remainingAmount: 0,
      expectedPaymentDate: expectedPaymentDate || null,
      followupReminderDate: followupReminderDate || null,
      paymentNotes: paymentNotes || null,
      jobStatus: jobStatus || 'Waiting',
      workRequested: workRequested || '',
      jobStartTime: null,
      jobEndTime: null,
      totalWorkingTime: 0,
      pauseDuration: 0,
      actualWorkingDuration: 0,
      timerState: 'STOPPED',
      lastTimerActionAt: null,
      partsTotal: 0,
      partsDiscount: 0,
      labourTotal: 0,
      labourDiscount: 0,
      overallDiscount: Number(overallDiscount || 0),
      advanceReceived: 0,
      previousDueAdded: Number(previousDueAdded || 0),
      previousDueBillIds: previousDueBillIds || [],
      overallDiscountType: overallDiscountType || 'FLAT',
      overallDiscountValue: Number(overallDiscountValue || 0),
      serviceNotes: serviceNotes || '',
      showServiceNotes: showServiceNotes !== undefined ? showServiceNotes : true
    };

    db.bills.push({ ...newBill, garageId });
    recalculateBillTotalsLocal(db, billId, garageId);
    writeDb(db);

    const savedBill = db.bills.find(b => b.id === billId)!;

    return {
      ...savedBill,
      customer,
      vehicle,
      items,
      mechanic: db.mechanics.find(m => m.id === savedBill.mechanicId),
      payments: db.payments.filter(p => p.billId === billId),
      services: db.services.filter(s => s.billId === billId),
      advances: db.advances.filter(a => a.billId === billId),
      timers: db.timers.filter(t => t.billId === billId),
      followups: db.followups.filter(f => f.billId === billId),
    };
  },

  updateBill: async (garageId: string, id: string, input: UpdateBillInput): Promise<Bill> => {
    const db = readDb(garageId);
    
    const isJob = db.serviceJobs?.some(j => j.id === id && j.garageId === garageId);
    if (isJob) {
      if (input.jobStatus === 'Delivered') {
        await jsonDb.updateServiceJob(garageId, id, input);
        return await jsonDb.generateBillFromJob(garageId, id);
      } else {
        return await jsonDb.updateServiceJob(garageId, id, input) as unknown as Bill;
      }
    }

    const billIdx = db.bills.findIndex(b => b.id === id && b.garageId === garageId);
    if (billIdx === -1) throw new Error('Bill not found.');
    const oldBill = db.bills[billIdx];

    const { 
      date, labour, notes, paymentStatus, items: inputItems,
      mechanicId, mechanicName, expectedPaymentDate, followupReminderDate, paymentNotes,
      jobStatus, workRequested, services: inputServices, advances: inputAdvances,
      overallDiscount, previousDueAdded, previousDueBillIds,
      overallDiscountType, overallDiscountValue,
      serviceNotes, showServiceNotes
    } = input;

    // Delete existing parts & services first
    db.billItems = db.billItems.filter(item => !(item.billId === id && item.garageId === garageId));
    db.services = db.services.filter(s => !(s.billId === id && s.garageId === garageId));
    db.advances = db.advances.filter(a => !(a.billId === id && a.garageId === garageId));
    db.followups = db.followups.filter(f => !(f.billId === id && f.garageId === garageId));

    // 1. Insert Parts
    const items: BillItem[] = [];
    inputItems.forEach((item) => {
      const newItem: BillItem = {
        id: `item_${generateUuid()}`,
        billId: id,
        name: item.name.trim(),
        price: Number(item.finalPrice || item.unitPrice || 0),
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        discountPercentage: Number(item.discountPercentage || 0),
        discountAmount: Number(item.discountAmount || 0),
        finalPrice: Number(item.finalPrice || 0),
        discountType: item.discountType || 'PERCENT',
        discountValue: Number(item.discountValue || 0)
      };
      db.billItems.push({ ...newItem, garageId });
      items.push(newItem);
    });

    // 2. Insert Services
    const billServices: Service[] = [];
    if (inputServices && inputServices.length > 0) {
      inputServices.forEach((s) => {
        let servMechId = s.mechanicId || null;
        let sWorkType = s.mechanicType || 'Salary';
        if (s.mechanicName && s.mechanicName.trim()) {
          const cleanMechName = s.mechanicName.trim();
          const existingMech = db.mechanics.find(m => m.name.toLowerCase() === cleanMechName.toLowerCase() && m.garageId === garageId);
          if (existingMech) {
            servMechId = existingMech.id;
            sWorkType = existingMech.workType;
          } else {
            const newMech = {
              id: 'mech_' + generateUuid(),
              garageId,
              name: cleanMechName,
              createdAt: new Date().toISOString(),
              workType: 'Salary' as const,
              commissionRate: 0.00
            };
            db.mechanics.push(newMech);
            servMechId = newMech.id;
            sWorkType = newMech.workType;
          }
        } else if (servMechId) {
          const m = db.mechanics.find(mech => mech.id === servMechId);
          if (m) sWorkType = m.workType;
        }

        const newService: Service = {
          id: `serv_${generateUuid()}`,
          billId: id,
          name: s.name.trim(),
          mechanicId: servMechId,
          labourCharge: Number(s.labourCharge || 0),
          discount: Number(s.discount || 0),
          finalCharge: Number(s.finalCharge || 0),
          mechanicType: sWorkType as any,
          commissionRate: Number(s.commissionRate || 0),
          workingTime: Number(s.workingTime || 0),
          startTime: s.startTime || null,
          endTime: s.endTime || null,
          discountType: s.discountType || 'FLAT',
          discountValue: Number(s.discountValue || 0)
        };

        db.services.push({ ...newService, garageId });
        billServices.push(newService);
      });
    }

    // 3. Insert Advances
    if (inputAdvances && inputAdvances.length > 0) {
      inputAdvances.forEach(adv => {
        if (adv.amount > 0) {
          db.advances.push({
            id: `adv_${generateUuid()}`,
            garageId,
            billId: id,
            amount: Number(adv.amount),
            paymentMode: adv.paymentMode as any,
            createdAt: date || new Date().toISOString(),
          });
        }
      });
    }

    // 4. Resolve Mechanic
    let resolvedMechanicId: string | null = mechanicId || null;
    if (mechanicName && mechanicName.trim()) {
      const cleanName = mechanicName.trim();
      const existingMech = db.mechanics.find(m => m.name.toLowerCase() === cleanName.toLowerCase() && m.garageId === garageId);
      if (existingMech) {
        resolvedMechanicId = existingMech.id;
      } else {
        const newMech = {
          id: 'mech_' + generateUuid(),
          garageId,
          name: cleanName,
          createdAt: new Date().toISOString(),
          workType: 'Salary' as const,
          commissionRate: 0.00
        };
        db.mechanics.push(newMech);
        resolvedMechanicId = newMech.id;
      }
    }

    // 5. Create followup if pending
    if (paymentStatus !== 'PAID' && expectedPaymentDate) {
      db.followups.push({
        id: `fol_${generateUuid()}`,
        garageId,
        billId: id,
        followupDate: expectedPaymentDate,
        notes: paymentNotes,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });
    }

    // Update fields
    const updatedBill: Bill = {
      ...oldBill,
      date: date,
      labour: Number(labour),
      notes: notes?.trim() || '',
      paymentStatus: paymentStatus,
      mechanicId: resolvedMechanicId,
      expectedPaymentDate: expectedPaymentDate || null,
      followupReminderDate: followupReminderDate || null,
      paymentNotes: paymentNotes || null,
      jobStatus: jobStatus || oldBill.jobStatus || 'Waiting',
      workRequested: workRequested || oldBill.workRequested || '',
      overallDiscount: Number(overallDiscount || 0),
      previousDueAdded: Number(previousDueAdded || 0),
      previousDueBillIds: previousDueBillIds || [],
      overallDiscountType: overallDiscountType || 'FLAT',
      overallDiscountValue: Number(overallDiscountValue || 0),
      serviceNotes: serviceNotes || '',
      showServiceNotes: showServiceNotes !== undefined ? showServiceNotes : true
    };

    db.bills[billIdx] = { ...updatedBill, garageId };
    recalculateBillTotalsLocal(db, id, garageId);
    writeDb(db);

    const savedBill = db.bills[billIdx];

    return {
      ...savedBill,
      customer: db.customers.find(c => c.id === savedBill.customerId),
      vehicle: db.vehicles.find(v => v.id === savedBill.vehicleId),
      items,
      mechanic: db.mechanics.find(m => m.id === savedBill.mechanicId),
      payments: db.payments.filter(p => p.billId === id),
      services: db.services.filter(s => s.billId === id),
      advances: db.advances.filter(a => a.billId === id),
      timers: db.timers.filter(t => t.billId === id),
      followups: db.followups.filter(f => f.billId === id),
    };
  },

  searchUniversal: async (garageId: string, query: string) => {
    const db = readDb(garageId);
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return [];

    const matchedMechanics = db.mechanics.filter(m =>
      m.garageId === garageId && m.name.toLowerCase().includes(cleanQuery)
    );

    const matchedBillItems = db.billItems.filter(item =>
      item.garageId === garageId && item.name.toLowerCase().includes(cleanQuery)
    );

    const matchedCustomers = db.customers.filter(c => 
      c.garageId === garageId &&
      (c.name.toLowerCase().includes(cleanQuery) || c.phone.includes(cleanQuery))
    );

    const matchedVehicles = db.vehicles.filter(v => 
      v.garageId === garageId &&
      (v.vehicleNumber.toLowerCase().includes(cleanQuery) ||
       v.brand.toLowerCase().includes(cleanQuery) ||
       v.model.toLowerCase().includes(cleanQuery))
    );

    const matchedCustomerIds = new Set<string>();
    matchedCustomers.forEach(c => matchedCustomerIds.add(c.id));
    matchedVehicles.forEach(v => matchedCustomerIds.add(v.customerId));

    const matchedInvoiceBills = db.bills.filter(b =>
      b.garageId === garageId && b.invoiceNumber.toLowerCase().includes(cleanQuery)
    );
    matchedInvoiceBills.forEach(b => matchedCustomerIds.add(b.customerId));
    
    matchedMechanics.forEach(mech => {
      db.bills
        .filter(b => b.mechanicId === mech.id && b.garageId === garageId)
        .forEach(b => matchedCustomerIds.add(b.customerId));
      db.serviceJobs
        ?.filter(j => j.mechanicId === mech.id && j.garageId === garageId)
        .forEach(j => matchedCustomerIds.add(j.customerId));
    });

    matchedBillItems.forEach(item => {
      const bill = db.bills.find(b => b.id === item.billId && b.garageId === garageId);
      if (bill) matchedCustomerIds.add(bill.customerId);
      const job = db.serviceJobs?.find(j => j.id === item.jobId && j.garageId === garageId);
      if (job) matchedCustomerIds.add(job.customerId);
    });

    const results = Array.from(matchedCustomerIds).map(cid => {
      const customer = db.customers.find(c => c.id === cid && c.garageId === garageId)!;
      const customerVehicles = db.vehicles.filter(v => v.customerId === cid && v.garageId === garageId);
      
      const customerBills = db.bills
        .filter(b => b.customerId === cid && b.garageId === garageId)
        .map(b => ({
          ...b,
          vehicle: customerVehicles.find(v => v.id === b.vehicleId),
          mechanic: db.mechanics.find(m => m.id === b.mechanicId),
          payments: db.payments.filter(p => p.billId === b.id),
        }));

      const customerJobs = (db.serviceJobs || [])
        .filter(j => j.customerId === cid && j.garageId === garageId)
        .map(j => ({
          ...j,
          invoiceNumber: '',
          vehicle: customerVehicles.find(v => v.id === j.vehicleId),
          mechanic: db.mechanics.find(m => m.id === j.mechanicId),
          payments: db.payments.filter(p => p.jobId === j.id),
        }));

      const combinedBills = [...customerJobs, ...customerBills]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        customer,
        vehicles: customerVehicles,
        bills: combinedBills as unknown as Bill[],
      };
    });

    return results;
  },

  updatePartSuggestion: async (garageId: string, id: string, name: string, price: number | null): Promise<PartSuggestion> => {
    const db = readDb(garageId);
    const idx = db.partSuggestions.findIndex(p => p.id === id && p.garageId === garageId);
    if (idx === -1) throw new Error('Part suggestion not found');
    db.partSuggestions[idx] = {
      ...db.partSuggestions[idx],
      name: name.trim(),
      price
    };
    writeDb(db);
    return db.partSuggestions[idx];
  },

  deletePartSuggestion: async (garageId: string, id: string): Promise<boolean> => {
    const db = readDb(garageId);
    db.partSuggestions = db.partSuggestions.filter(p => !(p.id === id && p.garageId === garageId));
    writeDb(db);
    return true;
  },

  updateServiceSuggestion: async (garageId: string, id: string, name: string, charge: number): Promise<ServiceSuggestion> => {
    const db = readDb(garageId);
    const idx = db.serviceSuggestions.findIndex(s => s.id === id && s.garageId === garageId);
    if (idx === -1) throw new Error('Service suggestion not found');
    db.serviceSuggestions[idx] = {
      ...db.serviceSuggestions[idx],
      name: name.trim(),
      charge
    };
    writeDb(db);
    return db.serviceSuggestions[idx];
  },

  deleteServiceSuggestion: async (garageId: string, id: string): Promise<boolean> => {
    const db = readDb(garageId);
    db.serviceSuggestions = db.serviceSuggestions.filter(s => !(s.id === id && s.garageId === garageId));
    writeDb(db);
    return true;
  },

  getServiceJobs: async (garageId: string): Promise<ServiceJob[]> => {
    const db = readDb(garageId);
    return (db.serviceJobs || [])
      .filter(j => j.garageId === garageId)
      .map(j => ({
        ...j,
        customer: db.customers.find(c => c.id === j.customerId),
        vehicle: db.vehicles.find(v => v.id === j.vehicleId),
        items: db.billItems.filter(item => item.jobId === j.id),
        mechanic: db.mechanics.find(m => m.id === j.mechanicId),
        payments: db.payments.filter(p => p.jobId === j.id),
        services: db.services.filter(s => s.jobId === j.id).map(s => ({
          ...s,
          mechanic: db.mechanics.find(m => m.id === s.mechanicId)
        })),
        advances: db.advances.filter(a => a.jobId === j.id),
        timers: db.timers.filter(t => t.jobId === j.id),
        followups: db.followups.filter(f => f.jobId === j.id),
      }));
  },

  getServiceJobById: async (garageId: string, id: string): Promise<ServiceJob | null> => {
    const db = readDb(garageId);
    const job = db.serviceJobs?.find(j => j.id === id && j.garageId === garageId);
    if (!job) return null;
    return {
      ...job,
      customer: db.customers.find(c => c.id === job.customerId),
      vehicle: db.vehicles.find(v => v.id === job.vehicleId),
      items: db.billItems.filter(item => item.jobId === job.id),
      mechanic: db.mechanics.find(m => m.id === job.mechanicId),
      payments: db.payments.filter(p => p.jobId === job.id),
      services: db.services.filter(s => s.jobId === job.id).map(s => ({
        ...s,
        mechanic: db.mechanics.find(m => m.id === s.mechanicId)
      })),
      advances: db.advances.filter(a => a.jobId === job.id),
      timers: db.timers.filter(t => t.jobId === job.id),
      followups: db.followups.filter(f => f.jobId === job.id),
    };
  },

  createServiceJob: async (garageId: string, input: CreateBillInput): Promise<ServiceJob> => {
    const db = readDb(garageId);
    const { 
      customerId, customerName, customerPhone, 
      vehicleId, vehicleNumber, vehicleBrand, vehicleModel,
      date, labour, notes, paymentStatus, items: inputItems,
      mechanicId, mechanicName, payments: initialPayments,
      expectedPaymentDate, followupReminderDate, paymentNotes,
      jobStatus, workRequested, services: inputServices, advances: inputAdvances,
      overallDiscount, previousDueAdded, previousDueBillIds,
      overallDiscountType, overallDiscountValue,
      serviceNotes, showServiceNotes
    } = input;
    
    let customer: Customer;
    if (customerId) {
      customer = db.customers.find(c => c.id === customerId && c.garageId === garageId)!;
    } else if (customerPhone && customerName) {
      const existing = db.customers.find(c => c.phone === customerPhone.trim() && c.garageId === garageId);
      if (existing) {
        customer = existing;
      } else {
        customer = {
          id: 'cust_' + generateUuid(),
          name: customerName.trim(),
          phone: customerPhone.trim(),
          createdAt: new Date().toISOString(),
        };
        db.customers.push({ ...customer, garageId });
      }
    } else {
      throw new Error('Customer information missing.');
    }

    let vehicle: Vehicle;
    if (vehicleId) {
      vehicle = db.vehicles.find(v => v.id === vehicleId && v.garageId === garageId)!;
    } else if (vehicleNumber && vehicleBrand && vehicleModel) {
      const cleanNumber = vehicleNumber.toUpperCase().replace(/\s+/g, '-').trim();
      const existing = db.vehicles.find(v => v.vehicleNumber === cleanNumber && v.garageId === garageId);
      if (existing) {
        vehicle = existing;
      } else {
        vehicle = {
          id: 'veh_' + generateUuid(),
          customerId: customer.id,
          vehicleNumber: cleanNumber,
          brand: vehicleBrand.trim(),
          model: vehicleModel.trim(),
          createdAt: new Date().toISOString(),
        };
        db.vehicles.push({ ...vehicle, garageId });
      }
    } else {
      throw new Error('Vehicle information missing.');
    }

    if (vehicle) {
      const cleanB = vehicle.brand.trim();
      const cleanM = vehicle.model.trim();
      if (!db.vehicleSuggestions) db.vehicleSuggestions = [];
      const hasSug = db.vehicleSuggestions.some(
        s => s.garageId === garageId && 
        s.brand.toLowerCase() === cleanB.toLowerCase() && 
        s.model.toLowerCase() === cleanM.toLowerCase()
      );
      if (!hasSug) {
        db.vehicleSuggestions.push({
          id: 'veh_sug_' + generateUuid(),
          garageId,
          brand: cleanB,
          model: cleanM
        });
      }
    }

    if (workRequested) {
      const complaints = workRequested.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (!db.complaintSuggestions) db.complaintSuggestions = [];
      complaints.forEach((comp: string) => {
        const hasSug = db.complaintSuggestions.some(
          s => s.garageId === garageId && 
          s.name.toLowerCase() === comp.toLowerCase()
        );
        if (!hasSug) {
          db.complaintSuggestions.push({
            id: 'comp_sug_' + generateUuid(),
            garageId,
            name: comp
          });
        }
      });
    }

    const existingActiveJob = db.serviceJobs?.find(j => 
      j.garageId === garageId && 
      j.vehicleId === vehicle.id && 
      j.jobStatus !== 'Delivered' && 
      j.jobStatus !== 'Cancelled'
    );
    if (existingActiveJob) {
      const activeInfo = await jsonDb.getServiceJobById(garageId, existingActiveJob.id);
      if (activeInfo) return activeInfo;
    }

    let resolvedMechanicId: string | null = mechanicId || null;
    if (mechanicName && mechanicName.trim()) {
      const cleanName = mechanicName.trim();
      const existingMech = db.mechanics.find(m => m.name.toLowerCase() === cleanName.toLowerCase() && m.garageId === garageId);
      if (existingMech) {
        resolvedMechanicId = existingMech.id;
      } else {
        const newMech = {
          id: 'mech_' + generateUuid(),
          garageId,
          name: cleanName,
          createdAt: new Date().toISOString(),
          workType: 'Salary' as const,
          commissionRate: 0.00
        };
        db.mechanics.push(newMech);
        resolvedMechanicId = newMech.id;
      }
    }

    const jobId = 'job_' + generateUuid();
    
    const items: BillItem[] = [];
    inputItems.forEach((item) => {
      const newItem: BillItem = {
        id: `item_${generateUuid()}`,
        jobId,
        name: item.name.trim(),
        price: Number(item.finalPrice || item.unitPrice || 0),
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        discountPercentage: Number(item.discountPercentage || 0),
        discountAmount: Number(item.discountAmount || 0),
        finalPrice: Number(item.finalPrice || 0),
        discountType: item.discountType || 'PERCENT',
        discountValue: Number(item.discountValue || 0)
      };
      db.billItems.push({ ...newItem, garageId });
      items.push(newItem);
    });

    const servicesList: Service[] = [];
    if (inputServices && inputServices.length > 0) {
      inputServices.forEach((s) => {
        let servMechId = s.mechanicId || null;
        let sWorkType = s.mechanicType || 'Salary';
        if (s.mechanicName && s.mechanicName.trim()) {
          const cleanMechName = s.mechanicName.trim();
          const existingMech = db.mechanics.find(m => m.name.toLowerCase() === cleanMechName.toLowerCase() && m.garageId === garageId);
          if (existingMech) {
            servMechId = existingMech.id;
            sWorkType = existingMech.workType;
          } else {
            const newMech = {
              id: 'mech_' + generateUuid(),
              garageId,
              name: cleanMechName,
              createdAt: new Date().toISOString(),
              workType: 'Salary' as const,
              commissionRate: 0.00
            };
            db.mechanics.push(newMech);
            servMechId = newMech.id;
            sWorkType = newMech.workType;
          }
        } else if (servMechId) {
          const m = db.mechanics.find(mech => mech.id === servMechId);
          if (m) sWorkType = m.workType;
        }

        const newService: Service = {
          id: `serv_${generateUuid()}`,
          jobId,
          name: s.name.trim(),
          mechanicId: servMechId,
          labourCharge: Number(s.labourCharge || 0),
          discount: Number(s.discount || 0),
          finalCharge: Number(s.finalCharge || 0),
          mechanicType: sWorkType as any,
          commissionRate: Number(s.commissionRate || 0),
          workingTime: Number(s.workingTime || 0),
          startTime: s.startTime || null,
          endTime: s.endTime || null,
          discountType: s.discountType || 'FLAT',
          discountValue: Number(s.discountValue || 0)
        };
        db.services.push({ ...newService, garageId });
        servicesList.push(newService);
      });
    }

    const paymentsList: Payment[] = [];
    if (initialPayments && initialPayments.length > 0) {
      initialPayments.forEach((p) => {
        if (p.amount > 0) {
          const newPayment: Payment = {
            id: `pay_${generateUuid()}`,
            garageId,
            jobId,
            paymentMethod: p.paymentMethod as any,
            amount: Number(p.amount),
            paymentDate: date || new Date().toISOString(),
            notes: p.notes,
            createdAt: new Date().toISOString(),
          };
          db.payments.push(newPayment);
          paymentsList.push(newPayment);
        }
      });
    }

    const advancesList: Advance[] = [];
    if (inputAdvances && inputAdvances.length > 0) {
      inputAdvances.forEach(adv => {
        if (adv.amount > 0) {
          const newAdvance: Advance = {
            id: `adv_${generateUuid()}`,
            jobId,
            amount: Number(adv.amount),
            paymentMode: adv.paymentMode as any,
            createdAt: date || new Date().toISOString(),
          };
          db.advances.push({ ...newAdvance, garageId });
          advancesList.push(newAdvance);
        }
      });
    }

    if (paymentStatus !== 'PAID' && expectedPaymentDate) {
      db.followups.push({
        id: `fol_${generateUuid()}`,
        garageId,
        jobId,
        followupDate: expectedPaymentDate,
        notes: paymentNotes,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });
    }

    let partsTotal = items.reduce((sum, item) => sum + (item.finalPrice || 0), 0);
    let partsDiscount = items.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
    let labourTotal = servicesList.reduce((sum, s) => sum + (s.finalCharge || 0), 0);
    let labourDiscount = servicesList.reduce((sum, s) => sum + (s.discount || 0), 0);
    let subtotal = partsTotal + labourTotal;
    let calculatedTotal = Math.max(0, subtotal - Number(overallDiscount || 0)) + Number(previousDueAdded || 0);
    let advSum = advancesList.reduce((sum, a) => sum + a.amount, 0);
    let paySum = paymentsList.reduce((sum, p) => sum + p.amount, 0);
    let recAmt = advSum + paySum;
    let remAmt = Math.max(0, calculatedTotal - recAmt);

    const newJob: ServiceJob = {
      id: jobId,
      vehicleId: vehicle.id,
      customerId: customer.id,
      date: date || new Date().toISOString(),
      labour: Number(labour || 0),
      total: calculatedTotal,
      notes: notes?.trim() || '',
      paymentStatus: paymentStatus || 'PENDING',
      createdAt: new Date().toISOString(),
      
      mechanicId: resolvedMechanicId,
      receivedAmount: recAmt,
      remainingAmount: remAmt,
      expectedPaymentDate: expectedPaymentDate || null,
      followupReminderDate: followupReminderDate || null,
      paymentNotes: paymentNotes || null,

      jobStatus: jobStatus || 'Waiting',
      workRequested: workRequested?.trim() || '',
      jobStartTime: null,
      jobEndTime: null,
      totalWorkingTime: 0,
      pauseDuration: 0,
      actualWorkingDuration: 0,
      timerState: 'STOPPED',
      lastTimerActionAt: null,

      partsTotal,
      partsDiscount,
      labourTotal,
      labourDiscount,
      overallDiscount: Number(overallDiscount || 0),
      advanceReceived: advSum,
      previousDueAdded: Number(previousDueAdded || 0),
      previousDueBillIds: previousDueBillIds || [],

      overallDiscountType: overallDiscountType || 'FLAT',
      overallDiscountValue: Number(overallDiscountValue || 0),
      serviceNotes: serviceNotes || '',
      showServiceNotes: showServiceNotes !== undefined ? showServiceNotes : true
    };

    if (!db.serviceJobs) db.serviceJobs = [];
    db.serviceJobs.push({ ...newJob, garageId });
    writeDb(db);

    return {
      ...newJob,
      customer,
      vehicle,
      items,
      services: servicesList,
      payments: paymentsList,
      advances: advancesList,
      timers: [],
      followups: []
    };
  },

  updateServiceJob: async (garageId: string, id: string, input: UpdateBillInput): Promise<ServiceJob> => {
    const db = readDb(garageId);
    const jobIdx = db.serviceJobs.findIndex(j => j.id === id && j.garageId === garageId);
    if (jobIdx === -1) throw new Error('Service Job not found.');
    const oldJob = db.serviceJobs[jobIdx];

    const { 
      date, labour, notes, paymentStatus, items: inputItems,
      mechanicId, mechanicName, expectedPaymentDate, followupReminderDate, paymentNotes,
      jobStatus, workRequested, services: inputServices, advances: inputAdvances,
      overallDiscount, previousDueAdded, previousDueBillIds,
      overallDiscountType, overallDiscountValue,
      serviceNotes, showServiceNotes
    } = input;

    db.billItems = db.billItems.filter(item => !(item.jobId === id && item.garageId === garageId));
    db.services = db.services.filter(s => !(s.jobId === id && s.garageId === garageId));
    db.advances = db.advances.filter(a => !(a.jobId === id && a.garageId === garageId));
    db.followups = db.followups.filter(f => !(f.jobId === id && f.garageId === garageId));

    const items: BillItem[] = [];
    if (inputItems) {
      inputItems.forEach((item) => {
        const newItem: BillItem = {
          id: `item_${generateUuid()}`,
          jobId: id,
          name: item.name.trim(),
          price: Number(item.finalPrice || item.unitPrice || 0),
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.unitPrice || 0),
          discountPercentage: Number(item.discountPercentage || 0),
          discountAmount: Number(item.discountAmount || 0),
          finalPrice: Number(item.finalPrice || 0),
          discountType: item.discountType || 'PERCENT',
          discountValue: Number(item.discountValue || 0)
        };
        db.billItems.push({ ...newItem, garageId });
        items.push(newItem);
      });
    }

    const servicesList: Service[] = [];
    if (inputServices && inputServices.length > 0) {
      inputServices.forEach((s) => {
        let servMechId = s.mechanicId || null;
        let sWorkType = s.mechanicType || 'Salary';
        if (s.mechanicName && s.mechanicName.trim()) {
          const cleanMechName = s.mechanicName.trim();
          const existingMech = db.mechanics.find(m => m.name.toLowerCase() === cleanMechName.toLowerCase() && m.garageId === garageId);
          if (existingMech) {
            servMechId = existingMech.id;
            sWorkType = existingMech.workType;
          } else {
            const newMech = {
              id: 'mech_' + generateUuid(),
              garageId,
              name: cleanMechName,
              createdAt: new Date().toISOString(),
              workType: 'Salary' as const,
              commissionRate: 0.00
            };
            db.mechanics.push(newMech);
            servMechId = newMech.id;
            sWorkType = newMech.workType;
          }
        } else if (servMechId) {
          const m = db.mechanics.find(mech => mech.id === servMechId);
          if (m) sWorkType = m.workType;
        }

        const newService: Service = {
          id: `serv_${generateUuid()}`,
          jobId: id,
          name: s.name.trim(),
          mechanicId: servMechId,
          labourCharge: Number(s.labourCharge || 0),
          discount: Number(s.discount || 0),
          finalCharge: Number(s.finalCharge || 0),
          mechanicType: sWorkType as any,
          commissionRate: Number(s.commissionRate || 0),
          workingTime: Number(s.workingTime || 0),
          startTime: s.startTime || null,
          endTime: s.endTime || null,
          discountType: s.discountType || 'FLAT',
          discountValue: Number(s.discountValue || 0)
        };
        db.services.push({ ...newService, garageId });
        servicesList.push(newService);
      });
    }

    if (inputAdvances && inputAdvances.length > 0) {
      inputAdvances.forEach(adv => {
        if (adv.amount > 0) {
          db.advances.push({
            id: `adv_${generateUuid()}`,
            garageId,
            jobId: id,
            amount: Number(adv.amount),
            paymentMode: adv.paymentMode as any,
            createdAt: date || new Date().toISOString(),
          });
        }
      });
    }

    let resolvedMechanicId: string | null = mechanicId || null;
    if (mechanicName && mechanicName.trim()) {
      const cleanName = mechanicName.trim();
      const existingMech = db.mechanics.find(m => m.name.toLowerCase() === cleanName.toLowerCase() && m.garageId === garageId);
      if (existingMech) {
        resolvedMechanicId = existingMech.id;
      } else {
        const newMech = {
          id: 'mech_' + generateUuid(),
          garageId,
          name: cleanName,
          createdAt: new Date().toISOString(),
          workType: 'Salary' as const,
          commissionRate: 0.00
        };
        db.mechanics.push(newMech);
        resolvedMechanicId = newMech.id;
      }
    }

    if (paymentStatus !== 'PAID' && expectedPaymentDate) {
      db.followups.push({
        id: `fol_${generateUuid()}`,
        garageId,
        jobId: id,
        followupDate: expectedPaymentDate,
        notes: paymentNotes,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });
    }

    let partsTotal = items.reduce((sum, item) => sum + (item.finalPrice || 0), 0);
    let partsDiscount = items.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
    let labourTotal = servicesList.reduce((sum, s) => sum + (s.finalCharge || 0), 0);
    let labourDiscount = servicesList.reduce((sum, s) => sum + (s.discount || 0), 0);
    let subtotal = partsTotal + labourTotal;
    let calculatedTotal = Math.max(0, subtotal - Number(overallDiscount || 0)) + Number(previousDueAdded || 0);
    
    let advSum = db.advances.filter(a => a.jobId === id && a.garageId === garageId).reduce((sum, a) => sum + a.amount, 0);
    let paySum = db.payments.filter(p => p.jobId === id && p.garageId === garageId).reduce((sum, p) => sum + p.amount, 0);
    let recAmt = advSum + paySum;
    let remAmt = Math.max(0, calculatedTotal - recAmt);

    const updatedJob: ServiceJob = {
      ...oldJob,
      date: date || oldJob.date,
      labour: Number(labour || oldJob.labour || 0),
      total: calculatedTotal,
      notes: notes?.trim() || oldJob.notes || '',
      paymentStatus: paymentStatus || oldJob.paymentStatus || 'PENDING',
      mechanicId: resolvedMechanicId,
      expectedPaymentDate: expectedPaymentDate || null,
      followupReminderDate: followupReminderDate || null,
      paymentNotes: paymentNotes || null,
      jobStatus: jobStatus || oldJob.jobStatus || 'Waiting',
      workRequested: workRequested || oldJob.workRequested || '',
      partsTotal,
      partsDiscount,
      labourTotal,
      labourDiscount,
      overallDiscount: Number(overallDiscount || 0),
      advanceReceived: advSum,
      receivedAmount: recAmt,
      remainingAmount: remAmt,
      previousDueAdded: Number(previousDueAdded || 0),
      previousDueBillIds: previousDueBillIds || [],
      overallDiscountType: overallDiscountType || 'FLAT',
      overallDiscountValue: Number(overallDiscountValue || 0),
      serviceNotes: serviceNotes || '',
      showServiceNotes: showServiceNotes !== undefined ? showServiceNotes : true
    };

    db.serviceJobs[jobIdx] = { ...updatedJob, garageId };
    writeDb(db);

    const saved = db.serviceJobs[jobIdx];
    return {
      ...saved,
      customer: db.customers.find(c => c.id === saved.customerId),
      vehicle: db.vehicles.find(v => v.id === saved.vehicleId),
      items,
      services: servicesList,
      payments: db.payments.filter(p => p.jobId === id),
      advances: db.advances.filter(a => a.jobId === id),
      timers: db.timers.filter(t => t.jobId === id),
      followups: db.followups.filter(f => f.jobId === id),
    };
  },

  generateBillFromJob: async (garageId: string, jobId: string): Promise<Bill> => {
    const db = readDb(garageId);
    const job = db.serviceJobs?.find(j => j.id === jobId && j.garageId === garageId);
    if (!job) throw new Error('Service Job not found.');

    const garageBills = db.bills.filter(b => b.garageId === garageId);
    const lastInvoiceNumber = garageBills.length > 0 
      ? Math.max(...garageBills.map(b => {
          const match = b.invoiceNumber.match(/GB-(\d+)/);
          return match ? parseInt(match[1]) : 1000;
        }))
      : 1000;
    const invoiceNumber = `GB-${lastInvoiceNumber + 1}`;
    const billId = 'bill_' + generateUuid();

    const newBill: Bill = {
      id: billId,
      vehicleId: job.vehicleId,
      customerId: job.customerId,
      invoiceNumber,
      date: new Date().toISOString(),
      labour: job.labour,
      total: job.total,
      notes: job.notes,
      paymentStatus: job.paymentStatus,
      createdAt: new Date().toISOString(),
      mechanicId: job.mechanicId,
      receivedAmount: job.receivedAmount,
      remainingAmount: job.remainingAmount,
      expectedPaymentDate: job.expectedPaymentDate,
      followupReminderDate: job.followupReminderDate,
      paymentNotes: job.paymentNotes,
      jobStatus: 'Delivered',
      workRequested: job.workRequested,
      jobStartTime: job.jobStartTime,
      jobEndTime: job.jobEndTime || new Date().toISOString(),
      totalWorkingTime: job.totalWorkingTime,
      pauseDuration: job.pauseDuration,
      actualWorkingDuration: job.actualWorkingDuration,
      timerState: 'COMPLETED',
      lastTimerActionAt: new Date().toISOString(),
      partsTotal: job.partsTotal,
      partsDiscount: job.partsDiscount,
      labourTotal: job.labourTotal,
      labourDiscount: job.labourDiscount,
      overallDiscount: job.overallDiscount,
      advanceReceived: job.advanceReceived,
      previousDueAdded: job.previousDueAdded,
      previousDueBillIds: job.previousDueBillIds,
      overallDiscountType: job.overallDiscountType,
      overallDiscountValue: job.overallDiscountValue,
      serviceNotes: job.serviceNotes,
      showServiceNotes: job.showServiceNotes
    };

    db.bills.push({ ...newBill, garageId });

    db.billItems.forEach(item => {
      if (item.jobId === jobId) {
        item.billId = billId;
      }
    });
    db.services.forEach(s => {
      if (s.jobId === jobId) {
        s.billId = billId;
      }
    });
    db.payments.forEach(p => {
      if (p.jobId === jobId) {
        p.billId = billId;
      }
    });
    db.advances.forEach(a => {
      if (a.jobId === jobId) {
        a.billId = billId;
      }
    });
    db.timers.forEach(t => {
      if (t.jobId === jobId) {
        t.billId = billId;
      }
    });
    db.followups.forEach(f => {
      if (f.jobId === jobId) {
        f.billId = billId;
      }
    });

    db.serviceJobs = db.serviceJobs.filter(j => j.id !== jobId);
    writeDb(db);

    return {
      ...newBill,
      customer: db.customers.find(c => c.id === newBill.customerId),
      vehicle: db.vehicles.find(v => v.id === newBill.vehicleId),
      items: db.billItems.filter(item => item.billId === billId),
      mechanic: db.mechanics.find(m => m.id === newBill.mechanicId),
      payments: db.payments.filter(p => p.billId === billId),
      services: db.services.filter(s => s.billId === billId).map(s => ({
        ...s,
        mechanic: db.mechanics.find(m => m.id === s.mechanicId)
      })),
      advances: db.advances.filter(a => a.billId === billId),
      timers: db.timers.filter(t => t.billId === billId),
      followups: db.followups.filter(f => f.billId === billId)
    };
  },

  getVehicleSuggestions: async (garageId: string): Promise<VehicleSuggestion[]> => {
    const db = readDb(garageId);
    return (db.vehicleSuggestions || []).filter(v => v.garageId === garageId);
  },

  getComplaintSuggestions: async (garageId: string): Promise<ComplaintSuggestion[]> => {
    const db = readDb(garageId);
    return (db.complaintSuggestions || []).filter(c => c.garageId === garageId);
  },

  learnVehicleSuggestion: async (garageId: string, brand: string, model: string): Promise<VehicleSuggestion> => {
    const db = readDb(garageId);
    if (!db.vehicleSuggestions) db.vehicleSuggestions = [];
    const cleanBrand = brand.trim();
    const cleanModel = model.trim();

    const existing = db.vehicleSuggestions.find(
      v => v.garageId === garageId && 
      v.brand.toLowerCase() === cleanBrand.toLowerCase() && 
      v.model.toLowerCase() === cleanModel.toLowerCase()
    );
    if (existing) return existing;

    const newSuggestion = {
      id: 'veh_sug_' + generateUuid(),
      garageId,
      brand: cleanBrand,
      model: cleanModel
    };
    db.vehicleSuggestions.push(newSuggestion);
    writeDb(db);
    return newSuggestion;
  },

  learnComplaintSuggestion: async (garageId: string, name: string): Promise<ComplaintSuggestion> => {
    const db = readDb(garageId);
    if (!db.complaintSuggestions) db.complaintSuggestions = [];
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Complaint name cannot be empty');

    const existing = db.complaintSuggestions.find(
      c => c.garageId === garageId && 
      c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) return existing;

    const newSuggestion = {
      id: 'comp_sug_' + generateUuid(),
      garageId,
      name: cleanName
    };
    db.complaintSuggestions.push(newSuggestion);
    writeDb(db);
    return newSuggestion;
  }
};
