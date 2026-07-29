'use server';

import { db, GarageSettings, CreateBillInput, UpdateBillInput } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Helper to resolve the active tenant garage context from Supabase or Fallback
async function getContext() {
  const isSupabase = db.isSupabase();
  if (!isSupabase) {
    return {
      isSupabase: false,
      garageId: 'demo-garage-id',
      userId: 'demo-user-id',
      supabase: undefined,
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Query garage row owned by user
  const { data: garage } = (await supabase
    .from('garage')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()) as any;

  if (!garage) {
    // Auto-create default settings row for the authenticated user if missing
    const { data: newGarage, error: createError } = (await supabase
      .from('garage')
      .insert({
        owner_id: user.id,
        name: 'My Motorcycle Garage',
        owner_name: user.email?.split('@')[0] || 'Owner Name',
        phone: '9876543210',
        address: 'Garage Address',
        footer_message: 'Thank you for your business! Ride safe!',
      } as any)
      .select('id')
      .single()) as any;

    if (createError) throw createError;
    return {
      isSupabase: true,
      garageId: newGarage.id,
      userId: user.id,
      supabase,
    };
  }

  return {
    isSupabase: true,
    garageId: garage.id,
    userId: user.id,
    supabase,
  };
}

export async function getSettings() {
  const { garageId, supabase } = await getContext();
  return await db.getGarageSettings(garageId, supabase);
}

export async function saveSettings(settings: GarageSettings) {
  const { garageId, supabase } = await getContext();
  const updated = await db.updateGarageSettings(garageId, settings, supabase);
  revalidatePath('/');
  revalidatePath('/settings');
  revalidatePath('/entry/new');
  return updated;
}

export async function seedDatabase() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Database seeding is restricted to development environment only.');
  }
  const { garageId, supabase } = await getContext();
  await db.seedDemoData(garageId, supabase);
  revalidatePath('/');
  revalidatePath('/bills');
  revalidatePath('/search');
  revalidatePath('/followups');
  revalidatePath('/reports');
  revalidatePath('/dashboard');
  revalidatePath('/queue');
  return true;
}

export async function searchCustomers(query: string) {
  const { garageId, supabase } = await getContext();
  return await db.getCustomers(garageId, query, supabase);
}

export async function getCustomerByPhone(phone: string) {
  const { garageId, supabase } = await getContext();
  return await db.getCustomerByPhone(garageId, phone, supabase);
}

export async function getCustomerOutstandingDues(phone: string) {
  const { garageId, supabase } = await getContext();
  return await db.getCustomerOutstandingDues(garageId, phone, supabase);
}

export async function getVehiclesByCustomer(customerId: string) {
  const { garageId, supabase } = await getContext();
  return await db.getVehiclesByCustomerId(garageId, customerId, supabase);
}

export async function getPartSuggestions(query: string) {
  const { garageId, supabase } = await getContext();
  return await db.getPartSuggestions(garageId, query, supabase);
}

export async function getServiceSuggestions(query: string) {
  const { garageId, supabase } = await getContext();
  return await db.getServiceSuggestions(garageId, query, supabase);
}

export async function addServiceSuggestion(name: string, charge: number) {
  const { garageId, supabase } = await getContext();
  return await db.addServiceSuggestion(garageId, name, charge, supabase);
}

export async function getBillById(id: string) {
  const { garageId, supabase } = await getContext();
  return await db.getBillById(garageId, id, supabase);
}

export async function getRecentBills(limit: number = 20) {
  const { garageId, supabase } = await getContext();
  return await db.getRecentBills(garageId, limit, supabase);
}

export async function getOpenServiceQueue() {
  const { garageId, supabase } = await getContext();
  const all = await db.getRecentBills(garageId, 100, supabase);
  return all.filter(b => 
    (b.jobStatus as string) !== 'Completed' &&
    (b.jobStatus as string) !== 'Work Completed' &&
    (b.jobStatus as string) !== 'Ready for Delivery' &&
    (b.jobStatus as string) !== 'Delivered' && 
    (b.jobStatus as string) !== 'Cancelled' && 
    (b.jobStatus as string) !== 'Closed' &&
    b.paymentStatus !== 'PAID'
  );
}

export async function createBill(input: CreateBillInput) {
  const { garageId, supabase } = await getContext();
  const bill = await db.createBill(garageId, input, supabase);
  revalidatePath('/');
  revalidatePath('/bills');
  revalidatePath('/search');
  revalidatePath('/followups');
  revalidatePath('/reports');
  revalidatePath('/dashboard');
  revalidatePath('/queue');
  return bill;
}

export async function updateBill(id: string, input: UpdateBillInput) {
  const { garageId, supabase } = await getContext();
  const bill = await db.updateBill(garageId, id, input, supabase);
  revalidatePath('/');
  revalidatePath('/bills');
  revalidatePath(`/bill/${id}`);
  revalidatePath('/search');
  revalidatePath('/followups');
  revalidatePath('/reports');
  revalidatePath('/dashboard');
  revalidatePath('/queue');
  return bill;
}

export async function logTimerAction(billId: string, action: 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE') {
  const { garageId, supabase } = await getContext();
  const updated = await db.logTimerAction(garageId, billId, action, supabase);
  revalidatePath('/');
  revalidatePath('/queue');
  revalidatePath(`/bill/${billId}`);
  return updated;
}

export async function getManualImports(query?: string) {
  const { garageId, supabase } = await getContext();
  return await db.getManualImports(garageId, query, supabase);
}

export async function createManualImport(input: any) {
  const { garageId, supabase } = await getContext();
  const res = await db.createManualImport(garageId, input, supabase);
  revalidatePath('/imports');
  revalidatePath('/reports');
  revalidatePath('/dashboard');
  return res;
}

export async function searchUniversal(query: string) {
  const { garageId, supabase } = await getContext();
  return await db.searchUniversal(garageId, query, supabase);
}

// v1.1 Mechanics Actions
export async function getMechanics() {
  const { garageId, supabase } = await getContext();
  return await db.getMechanics(garageId, supabase);
}

export async function createMechanic(name: string, workType: 'Salary' | 'Independent' = 'Salary', commissionRate: number = 0) {
  const { garageId, supabase } = await getContext();
  const mech = await db.createMechanic(garageId, name, workType, commissionRate, supabase);
  revalidatePath('/settings');
  revalidatePath('/entry/new');
  return mech;
}

export async function updateMechanic(id: string, name: string, workType?: 'Salary' | 'Independent', commissionRate?: number) {
  const { garageId, supabase } = await getContext();
  const mech = await db.updateMechanic(garageId, id, name, workType, commissionRate, supabase);
  revalidatePath('/settings');
  return mech;
}

export async function deleteMechanic(id: string) {
  const { garageId, supabase } = await getContext();
  const success = await db.deleteMechanic(garageId, id, supabase);
  revalidatePath('/settings');
  revalidatePath('/entry/new');
  return success;
}

// v1.1 Payments Actions
export async function getPaymentsForBill(billId: string) {
  const { garageId, supabase } = await getContext();
  return await db.getPaymentsForBill(garageId, billId, supabase);
}

export async function addPaymentToBill(
  billId: string,
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CREDIT' | 'OTHER',
  amount: number,
  notes?: string | null,
  paymentDate?: string
) {
  const { garageId, supabase } = await getContext();
  const payment = await db.addPayment(garageId, billId, paymentMethod, amount, notes, paymentDate, supabase);
  revalidatePath('/');
  revalidatePath('/bills');
  revalidatePath(`/bill/${billId}`);
  revalidatePath('/followups');
  revalidatePath('/reports');
  revalidatePath('/dashboard');
  return payment;
}

export async function deletePaymentFromBill(id: string, billId: string) {
  const { garageId, supabase } = await getContext();
  const success = await db.deletePayment(garageId, id, supabase);
  revalidatePath('/');
  revalidatePath('/bills');
  revalidatePath(`/bill/${billId}`);
  revalidatePath('/followups');
  revalidatePath('/reports');
  revalidatePath('/dashboard');
  return success;
}

export async function addPartSuggestion(name: string, price: number | null) {
  const { garageId, supabase } = await getContext();
  return await db.addPartSuggestion(garageId, name, price, supabase);
}

export async function updatePartSuggestion(id: string, name: string, price: number | null) {
  const { garageId, supabase } = await getContext();
  return await db.updatePartSuggestion(garageId, id, name, price, supabase);
}

export async function deletePartSuggestion(id: string) {
  const { garageId, supabase } = await getContext();
  return await db.deletePartSuggestion(garageId, id, supabase);
}

export async function updateServiceSuggestion(id: string, name: string, charge: number) {
  const { garageId, supabase } = await getContext();
  return await db.updateServiceSuggestion(garageId, id, name, charge, supabase);
}

export async function deleteServiceSuggestion(id: string) {
  const { garageId, supabase } = await getContext();
  return await db.deleteServiceSuggestion(garageId, id, supabase);
}

export async function getActiveJobByVehicleNumber(vehicleNumber: string) {
  const { garageId, supabase } = await getContext();
  const cleanNumber = vehicleNumber.replace(/\s+/g, '').replace(/-+/g, '').toUpperCase();

  // Load all bills for this garage
  const allBills = await db.getRecentBills(garageId, 100, supabase);
  
  // Find an active bill matching the vehicle number
  const activeBill = allBills.find(b => 
    b.vehicle?.vehicleNumber.replace(/\s+/g, '').replace(/-+/g, '').toUpperCase() === cleanNumber &&
    (b.jobStatus as string) !== 'Delivered' && 
    (b.jobStatus as string) !== 'Cancelled'
  );

  if (!activeBill) return null;

  return {
    id: activeBill.id,
    vehicleNumber: activeBill.vehicle?.vehicleNumber || vehicleNumber,
    jobStatus: activeBill.jobStatus,
    mechanicName: activeBill.mechanic?.name || 'Unassigned'
  };
}

export async function getLiveHeaderStats() {
  const { garageId, supabase } = await getContext();
  const bills = await db.getRecentBills(garageId, 200, supabase);
  
  const today = new Date();
  const isSameDay = (d1: any, d2: Date) => {
    const date1 = new Date(d1);
    return date1.getDate() === d2.getDate() &&
           date1.getMonth() === d2.getMonth() &&
           date1.getFullYear() === d2.getFullYear();
  };

  const queue = bills.filter(b => 
    (b.jobStatus as string) !== 'Completed' &&
    (b.jobStatus as string) !== 'Work Completed' &&
    (b.jobStatus as string) !== 'Ready for Delivery' &&
    (b.jobStatus as string) !== 'Delivered' && 
    (b.jobStatus as string) !== 'Cancelled' && 
    (b.jobStatus as string) !== 'Closed' &&
    b.paymentStatus !== 'PAID'
  ).length;

  const working = bills.filter(b => b.jobStatus === 'Working').length;
  const waiting = bills.filter(b => b.jobStatus === 'Waiting').length;
  const ready = bills.filter(b => 
    (b.jobStatus as string) === 'Ready for Delivery' || 
    (b.jobStatus as string) === 'Completed' || 
    (b.jobStatus as string) === 'Work Completed'
  ).length;

  const todaysJobs = bills.filter(b => isSameDay(b.date, today)).length;

  const pendingBills = bills
    .filter(b => b.remainingAmount > 0 && (b.jobStatus as string) !== 'Cancelled')
    .reduce((sum, b) => sum + (b.remainingAmount || 0), 0);

  const todaysCollection = bills
    .filter(b => isSameDay(b.date, today))
    .reduce((sum, b) => sum + (b.receivedAmount || 0), 0);

  return {
    queue,
    working,
    waiting,
    ready,
    todaysJobs,
    pendingBills,
    todaysCollection
  };
}
