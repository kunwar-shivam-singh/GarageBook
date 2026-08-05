export interface GarageSettings {
  name: string;
  logo: string; // Base64 encoded logo image
  ownerName: string;
  phone: string;
  address: string;
  footerMessage: string;
  gstNumber?: string | null;
  warrantyNotes?: string | null;
  whatsappNumber?: string | null;
  socialMedia?: string | null;
  mechanicMode?: 'Owner Mode' | 'Salary' | 'Independent' | 'Mixed';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  customerId: string;
  vehicleNumber: string;
  brand: string;
  model: string;
  createdAt: string;
}

export interface BillItem {
  id: string;
  billId?: string | null;
  jobId?: string | null;
  name: string;
  price: number | null;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
  discountAmount: number;
  finalPrice: number;
  // v2.0 additional discount fields
  discountType?: 'FLAT' | 'PERCENT';
  discountValue?: number;
}

export interface Mechanic {
  id: string;
  garageId: string;
  name: string;
  createdAt: string;
  // v2.0 additions
  workType: 'Salary' | 'Independent';
  commissionRate: number;
  salary?: number | null;
}

export interface Payment {
  id: string;
  garageId: string;
  billId?: string | null;
  jobId?: string | null;
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CREDIT' | 'OTHER';
  amount: number;
  paymentDate: string;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface Service {
  id: string;
  billId?: string | null;
  jobId?: string | null;
  name: string;
  mechanicId?: string | null;
  labourCharge: number;
  discount: number;
  finalCharge: number;
  mechanic?: Mechanic | null;
  // v2.0 additions
  mechanicType: 'Salary' | 'Independent';
  commissionRate: number;
  workingTime: number; // in seconds
  startTime?: string | null;
  endTime?: string | null;
  discountType?: 'FLAT' | 'PERCENT';
  discountValue?: number;
}

export interface ServiceSuggestion {
  id: string;
  name: string;
  charge: number;
}

export interface Advance {
  id: string;
  billId?: string | null;
  jobId?: string | null;
  amount: number;
  paymentMode: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';
  createdAt: string;
}

export interface JobTimer {
  id: string;
  billId?: string | null;
  jobId?: string | null;
  action: 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE';
  timestamp: string;
}

export interface ManualImport {
  id: string;
  customerName: string;
  phone: string;
  vehicleNumber: string;
  billDate: string;
  amount: number;
  paidAmount: number;
  pendingAmount: number;
  notes?: string | null;
  createdAt: string;
}

export interface Followup {
  id: string;
  billId?: string | null;
  jobId?: string | null;
  followupDate: string;
  notes?: string | null;
  status: 'PENDING' | 'COMPLETED';
  createdAt: string;
}

export interface Bill {
  id: string;
  vehicleId: string;
  customerId: string;
  invoiceNumber: string;
  date: string;
  labour: number;
  total: number;
  notes: string;
  paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING';
  createdAt: string;
  
  // v1.1 additions
  mechanicId?: string | null;
  receivedAmount: number;
  remainingAmount: number;
  expectedPaymentDate?: string | null;
  followupReminderDate?: string | null;
  paymentNotes?: string | null;

  // v2.0 additions
  jobStatus: 'Waiting' | 'Assigned' | 'Working' | 'Ready for Delivery' | 'Delivered' | 'Cancelled' | 'Work Started' | 'Waiting for Parts' | 'Completed';
  workRequested: string;
  jobStartTime?: string | null;
  jobEndTime?: string | null;
  totalWorkingTime: number;
  pauseDuration: number;
  actualWorkingDuration: number;
  timerState: 'STOPPED' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  lastTimerActionAt?: string | null;

  partsTotal: number;
  partsDiscount: number;
  labourTotal: number;
  labourDiscount: number;
  overallDiscount: number;
  advanceReceived: number;
  previousDueAdded: number;
  previousDueBillIds?: string[] | null;

  // v2.0 multi-type discount values
  overallDiscountType: 'FLAT' | 'PERCENT';
  overallDiscountValue: number;

  // v2.3 branding service notes
  serviceNotes?: string | null;
  showServiceNotes?: boolean;

  // Relations
  customer?: Customer;
  vehicle?: Vehicle;
  items?: BillItem[];
  mechanic?: Mechanic | null;
  payments?: Payment[];
  services?: Service[];
  advances?: Advance[];
  timers?: JobTimer[];
  followups?: Followup[];
}

export interface ServiceJob {
  id: string;
  vehicleId: string;
  customerId: string;
  date: string;
  labour: number;
  total: number;
  notes: string;
  paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING';
  createdAt: string;
  
  // v1.1 additions
  mechanicId?: string | null;
  receivedAmount: number;
  remainingAmount: number;
  expectedPaymentDate?: string | null;
  followupReminderDate?: string | null;
  paymentNotes?: string | null;

  // v2.0 additions
  jobStatus: 'Waiting' | 'Assigned' | 'Working' | 'Ready for Delivery' | 'Delivered' | 'Cancelled' | 'Work Started' | 'Waiting for Parts' | 'Completed';
  workRequested: string;
  jobStartTime?: string | null;
  jobEndTime?: string | null;
  totalWorkingTime: number;
  pauseDuration: number;
  actualWorkingDuration: number;
  timerState: 'STOPPED' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  lastTimerActionAt?: string | null;

  partsTotal: number;
  partsDiscount: number;
  labourTotal: number;
  labourDiscount: number;
  overallDiscount: number;
  advanceReceived: number;
  previousDueAdded: number;
  previousDueBillIds?: string[] | null;

  // v2.0 multi-type discount values
  overallDiscountType: 'FLAT' | 'PERCENT';
  overallDiscountValue: number;

  // v2.3 branding service notes
  serviceNotes?: string | null;
  showServiceNotes?: boolean;

  // Relations
  customer?: Customer;
  vehicle?: Vehicle;
  items?: BillItem[];
  mechanic?: Mechanic | null;
  payments?: Payment[];
  services?: Service[];
  advances?: Advance[];
  timers?: JobTimer[];
  followups?: Followup[];
}

export interface PartSuggestion {
  id: string;
  name: string;
  price: number | null;
}

export interface VehicleSuggestion {
  id: string;
  brand: string;
  model: string;
}

export interface ComplaintSuggestion {
  id: string;
  name: string;
}

export interface CreateBillInput {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  vehicleId?: string;
  vehicleNumber?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  
  date: string;
  labour: number;
  notes: string;
  paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING';
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    discountPercentage: number;
    discountAmount: number;
    finalPrice: number;
    discountType?: 'FLAT' | 'PERCENT';
    discountValue?: number;
  }[];

  // v1.1 inputs
  mechanicId?: string | null;
  mechanicName?: string | null;
  payments?: { paymentMethod: string; amount: number; notes?: string }[];
  expectedPaymentDate?: string | null;
  followupReminderDate?: string | null;
  paymentNotes?: string | null;

  // v2.0 inputs
  jobStatus?: 'Waiting' | 'Assigned' | 'Working' | 'Ready for Delivery' | 'Delivered' | 'Cancelled' | 'Work Started' | 'Waiting for Parts' | 'Completed';
  workRequested?: string;
  services: {
    name: string;
    mechanicId?: string | null;
    mechanicName?: string | null;
    labourCharge: number;
    discount: number;
    finalCharge: number;
    // v2.0 details
    mechanicType?: 'Salary' | 'Independent';
    commissionRate?: number;
    workingTime?: number;
    startTime?: string | null;
    endTime?: string | null;
    discountType?: 'FLAT' | 'PERCENT';
    discountValue?: number;
  }[];
  advances?: { amount: number; paymentMode: string }[];
  overallDiscount?: number;
  previousDueAdded?: number;
  previousDueBillIds?: string[];
  
  // v2.0 calculations inputs
  overallDiscountType?: 'FLAT' | 'PERCENT';
  overallDiscountValue?: number;

  // v2.3 branding service notes
  serviceNotes?: string | null;
  showServiceNotes?: boolean;
}

export interface UpdateBillInput {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  vehicleId?: string;
  vehicleNumber?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  date?: string;
  labour?: number;
  notes?: string;
  paymentStatus?: 'PAID' | 'PARTIAL' | 'PENDING';
  items?: {
    name: string;
    quantity: number;
    unitPrice: number;
    discountPercentage: number;
    discountAmount: number;
    finalPrice: number;
    discountType?: 'FLAT' | 'PERCENT';
    discountValue?: number;
  }[];

  // v1.1 inputs
  mechanicId?: string | null;
  mechanicName?: string | null;
  payments?: { paymentMethod: string; amount: number; notes?: string }[];
  expectedPaymentDate?: string | null;
  followupReminderDate?: string | null;
  paymentNotes?: string | null;

  // v2.0 inputs
  jobStatus?: 'Waiting' | 'Assigned' | 'Working' | 'Ready for Delivery' | 'Delivered' | 'Cancelled' | 'Work Started' | 'Waiting for Parts' | 'Completed';
  workRequested?: string;
  services?: {
    name: string;
    mechanicId?: string | null;
    mechanicName?: string | null;
    labourCharge: number;
    discount: number;
    finalCharge: number;
    mechanicType?: 'Salary' | 'Independent';
    commissionRate?: number;
    workingTime?: number;
    startTime?: string | null;
    endTime?: string | null;
    discountType?: 'FLAT' | 'PERCENT';
    discountValue?: number;
  }[];
  advances?: { amount: number; paymentMode: string }[];
  overallDiscount?: number;
  previousDueAdded?: number;
  previousDueBillIds?: string[];

  // v2.0 calculations inputs
  overallDiscountType?: 'FLAT' | 'PERCENT';
  overallDiscountValue?: number;

  // v2.3 branding service notes
  serviceNotes?: string | null;
  showServiceNotes?: boolean;
}
