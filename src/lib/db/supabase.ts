import { createClient } from '@supabase/supabase-js';
import { 
  GarageSettings, Customer, Vehicle, Bill, BillItem, PartSuggestion, 
  CreateBillInput, UpdateBillInput, Mechanic, Payment, Service, 
  ServiceSuggestion, Advance, JobTimer, Followup, ManualImport, ServiceJob,
  VehicleSuggestion, ComplaintSuggestion
} from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helpers to map database models (snake_case) to application types (camelCase)
function mapSettings(dbSettings: any): GarageSettings {
  return {
    name: dbSettings.name,
    logo: dbSettings.logo || '',
    ownerName: dbSettings.owner_name,
    phone: dbSettings.phone,
    address: dbSettings.address,
    footerMessage: dbSettings.footer_message,
    gstNumber: dbSettings.gst_number || null,
    warrantyNotes: dbSettings.warranty_notes || '',
    whatsappNumber: dbSettings.whatsapp_number || '',
    socialMedia: dbSettings.social_media || '',
    mechanicMode: dbSettings.mechanic_mode || 'Mixed',
  };
}

function mapCustomer(dbCustomer: any): Customer {
  return {
    id: dbCustomer.id,
    name: dbCustomer.name,
    phone: dbCustomer.phone,
    createdAt: dbCustomer.created_at,
  };
}

function mapVehicle(dbVehicle: any): Vehicle {
  return {
    id: dbVehicle.id,
    customerId: dbVehicle.customer_id,
    vehicleNumber: dbVehicle.vehicle_number,
    brand: dbVehicle.brand,
    model: dbVehicle.model,
    createdAt: dbVehicle.created_at,
  };
}

function mapBillItem(dbItem: any): BillItem {
  return {
    id: dbItem.id,
    billId: dbItem.bill_id,
    name: dbItem.name,
    price: dbItem.price ? Number(dbItem.price) : null,
    quantity: dbItem.quantity ? Number(dbItem.quantity) : 1,
    unitPrice: dbItem.unit_price ? Number(dbItem.unit_price) : 0,
    discountPercentage: dbItem.discount_percentage ? Number(dbItem.discount_percentage) : 0,
    discountAmount: dbItem.discount_amount ? Number(dbItem.discount_amount) : 0,
    finalPrice: dbItem.final_price ? Number(dbItem.final_price) : 0,
    discountType: dbItem.discount_type || 'PERCENT',
    discountValue: dbItem.discount_value ? Number(dbItem.discount_value) : 0,
  };
}

function mapMechanic(dbMechanic: any): Mechanic {
  return {
    id: dbMechanic.id,
    garageId: dbMechanic.garage_id,
    name: dbMechanic.name,
    createdAt: dbMechanic.created_at,
    workType: (dbMechanic.work_type || 'Salary') as 'Salary' | 'Independent',
    commissionRate: dbMechanic.commission_rate ? Number(dbMechanic.commission_rate) : 0,
    salary: dbMechanic.salary ? Number(dbMechanic.salary) : 0,
  };
}

function mapPayment(dbPayment: any): Payment {
  return {
    id: dbPayment.id,
    garageId: dbPayment.garage_id,
    billId: dbPayment.bill_id,
    paymentMethod: dbPayment.payment_method as any,
    amount: Number(dbPayment.amount),
    paymentDate: dbPayment.payment_date,
    notes: dbPayment.notes,
    createdBy: dbPayment.created_by,
    createdAt: dbPayment.created_at,
  };
}

function mapService(dbService: any): Service {
  return {
    id: dbService.id,
    billId: dbService.bill_id,
    name: dbService.name,
    mechanicId: dbService.mechanic_id || null,
    labourCharge: Number(dbService.labour_charge || 0),
    discount: Number(dbService.discount || 0),
    finalCharge: Number(dbService.final_charge || 0),
    mechanic: dbService.mechanics ? mapMechanic(dbService.mechanics) : null,
    mechanicType: (dbService.mechanic_type || 'Salary') as 'Salary' | 'Independent',
    commissionRate: dbService.commission_rate ? Number(dbService.commission_rate) : 0,
    workingTime: dbService.working_time ? Number(dbService.working_time) : 0,
    startTime: dbService.start_time || null,
    endTime: dbService.end_time || null,
    discountType: dbService.discount_type || 'FLAT',
    discountValue: dbService.discount_value ? Number(dbService.discount_value) : 0,
  };
}

function mapServiceSuggestion(dbSug: any): ServiceSuggestion {
  return {
    id: dbSug.id,
    name: dbSug.name,
    charge: Number(dbSug.charge || 0),
  };
}

function mapAdvance(dbAdv: any): Advance {
  return {
    id: dbAdv.id,
    billId: dbAdv.bill_id,
    amount: Number(dbAdv.amount),
    paymentMode: dbAdv.payment_mode as any,
    createdAt: dbAdv.created_at,
  };
}

function mapJobTimer(dbTimer: any): JobTimer {
  return {
    id: dbTimer.id,
    billId: dbTimer.bill_id,
    action: dbTimer.action as any,
    timestamp: dbTimer.timestamp,
  };
}

function mapFollowup(dbFol: any): Followup {
  return {
    id: dbFol.id,
    billId: dbFol.bill_id,
    followupDate: dbFol.followup_date,
    notes: dbFol.notes || null,
    status: dbFol.status as any,
    createdAt: dbFol.created_at,
  };
}

function mapManualImport(dbImp: any): ManualImport {
  return {
    id: dbImp.id,
    customerName: dbImp.customer_name,
    phone: dbImp.phone,
    vehicleNumber: dbImp.vehicle_number,
    billDate: dbImp.bill_date,
    amount: Number(dbImp.amount),
    paidAmount: Number(dbImp.paid_amount),
    pendingAmount: Number(dbImp.pending_amount),
    notes: dbImp.notes || null,
    createdAt: dbImp.created_at,
  };
}

function mapBill(dbBill: any): Bill {
  return {
    id: dbBill.id,
    vehicleId: dbBill.vehicle_id,
    customerId: dbBill.customer_id,
    invoiceNumber: dbBill.invoice_number,
    date: dbBill.date,
    labour: Number(dbBill.labour),
    total: Number(dbBill.total),
    notes: dbBill.notes || '',
    paymentStatus: dbBill.payment_status as 'PAID' | 'PARTIAL' | 'PENDING',
    createdAt: dbBill.created_at,
    customer: dbBill.customers ? mapCustomer(dbBill.customers) : undefined,
    vehicle: dbBill.vehicles ? mapVehicle(dbBill.vehicles) : undefined,
    items: dbBill.bill_items ? dbBill.bill_items.map(mapBillItem) : undefined,
    
    // v1.1 fields
    mechanicId: dbBill.mechanic_id || null,
    receivedAmount: dbBill.received_amount ? Number(dbBill.received_amount) : 0,
    remainingAmount: dbBill.remaining_amount ? Number(dbBill.remaining_amount) : 0,
    expectedPaymentDate: dbBill.expected_payment_date || null,
    followupReminderDate: dbBill.followup_reminder_date || null,
    paymentNotes: dbBill.payment_notes || null,

    // v2.0 fields
    jobStatus: (dbBill.job_status || 'Waiting') as any,
    workRequested: dbBill.work_requested || '',
    jobStartTime: dbBill.job_start_time || null,
    jobEndTime: dbBill.job_end_time || null,
    totalWorkingTime: dbBill.total_working_time ? Number(dbBill.total_working_time) : 0,
    pauseDuration: dbBill.pause_duration ? Number(dbBill.pause_duration) : 0,
    actualWorkingDuration: dbBill.actual_working_duration ? Number(dbBill.actual_working_duration) : 0,
    timerState: (dbBill.timer_state || 'STOPPED') as any,
    lastTimerActionAt: dbBill.last_timer_action_at || null,

    partsTotal: dbBill.parts_total ? Number(dbBill.parts_total) : 0,
    partsDiscount: dbBill.parts_discount ? Number(dbBill.parts_discount) : 0,
    labourTotal: dbBill.labour_total ? Number(dbBill.labour_total) : 0,
    labourDiscount: dbBill.labour_discount ? Number(dbBill.labour_discount) : 0,
    overallDiscount: dbBill.overall_discount ? Number(dbBill.overall_discount) : 0,
    advanceReceived: dbBill.advance_received ? Number(dbBill.advance_received) : 0,
    previousDueAdded: dbBill.previous_due_added ? Number(dbBill.previous_due_added) : 0,
    previousDueBillIds: dbBill.previous_due_bill_ids || [],
    overallDiscountType: (dbBill.overall_discount_type || 'FLAT') as 'FLAT' | 'PERCENT',
    overallDiscountValue: dbBill.overall_discount_value ? Number(dbBill.overall_discount_value) : 0,
    serviceNotes: dbBill.service_notes || '',
    showServiceNotes: dbBill.show_service_notes !== undefined ? dbBill.show_service_notes : true,

    // Joins
    mechanic: dbBill.mechanics ? mapMechanic(dbBill.mechanics) : null,
    payments: dbBill.payments ? dbBill.payments.map(mapPayment) : undefined,
    services: dbBill.services ? dbBill.services.map(mapService) : undefined,
    advances: dbBill.advances ? dbBill.advances.map(mapAdvance) : undefined,
    timers: dbBill.job_timers ? dbBill.job_timers.map(mapJobTimer) : undefined,
    followups: dbBill.followups ? dbBill.followups.map(mapFollowup) : undefined,
  };
}

function mapServiceJob(dbJob: any): ServiceJob {
  return {
    id: dbJob.id,
    vehicleId: dbJob.vehicle_id,
    customerId: dbJob.customer_id,
    date: dbJob.date,
    labour: Number(dbJob.labour),
    total: Number(dbJob.total),
    notes: dbJob.notes || '',
    paymentStatus: dbJob.payment_status as 'PAID' | 'PARTIAL' | 'PENDING',
    createdAt: dbJob.created_at,
    customer: dbJob.customers ? mapCustomer(dbJob.customers) : undefined,
    vehicle: dbJob.vehicles ? mapVehicle(dbJob.vehicles) : undefined,
    items: dbJob.bill_items ? dbJob.bill_items.map(mapBillItem) : undefined,
    
    mechanicId: dbJob.mechanic_id || null,
    receivedAmount: dbJob.received_amount ? Number(dbJob.received_amount) : 0,
    remainingAmount: dbJob.remaining_amount ? Number(dbJob.remaining_amount) : 0,
    expectedPaymentDate: dbJob.expected_payment_date || null,
    followupReminderDate: dbJob.followup_reminder_date || null,
    paymentNotes: dbJob.payment_notes || null,

    jobStatus: (dbJob.job_status || 'Waiting') as any,
    workRequested: dbJob.work_requested || '',
    jobStartTime: dbJob.job_start_time || null,
    jobEndTime: dbJob.job_end_time || null,
    totalWorkingTime: dbJob.total_working_time ? Number(dbJob.total_working_time) : 0,
    pauseDuration: dbJob.pause_duration ? Number(dbJob.pause_duration) : 0,
    actualWorkingDuration: dbJob.actual_working_duration ? Number(dbJob.actual_working_duration) : 0,
    timerState: (dbJob.timer_state || 'STOPPED') as any,
    lastTimerActionAt: dbJob.last_timer_action_at || null,

    partsTotal: dbJob.parts_total ? Number(dbJob.parts_total) : 0,
    partsDiscount: dbJob.parts_discount ? Number(dbJob.parts_discount) : 0,
    labourTotal: dbJob.labour_total ? Number(dbJob.labour_total) : 0,
    labourDiscount: dbJob.labour_discount ? Number(dbJob.labour_discount) : 0,
    overallDiscount: dbJob.overall_discount ? Number(dbJob.overall_discount) : 0,
    advanceReceived: dbJob.advance_received ? Number(dbJob.advance_received) : 0,
    previousDueAdded: dbJob.previous_due_added ? Number(dbJob.previous_due_added) : 0,
    previousDueBillIds: dbJob.previous_due_bill_ids || [],
    overallDiscountType: (dbJob.overall_discount_type || 'FLAT') as 'FLAT' | 'PERCENT',
    overallDiscountValue: dbJob.overall_discount_value ? Number(dbJob.overall_discount_value) : 0,
    serviceNotes: dbJob.service_notes || '',
    showServiceNotes: dbJob.show_service_notes !== undefined ? dbJob.show_service_notes : true,

    mechanic: dbJob.mechanics ? mapMechanic(dbJob.mechanics) : null,
    payments: dbJob.payments ? dbJob.payments.map(mapPayment) : undefined,
    services: dbJob.services ? dbJob.services.map(mapService) : undefined,
    advances: dbJob.advances ? dbJob.advances.map(mapAdvance) : undefined,
    timers: dbJob.job_timers ? dbJob.job_timers.map(mapJobTimer) : undefined,
    followups: dbJob.followups ? dbJob.followups.map(mapFollowup) : undefined,
  };
}

function mapPartSuggestion(dbPart: any): PartSuggestion {
  return {
    id: dbPart.id,
    name: dbPart.name,
    price: dbPart.price ? Number(dbPart.price) : null,
  };
}

export const supabaseDb = {
  // Config Status Helper
  seedDemoData: async (garageId: string, supabase?: any): Promise<boolean> => {
    // In Supabase production, seed is simulated inside SQL triggers and schemas
    return true;
  },

  // Garage Settings
  getGarageSettings: async (garageId: string, supabase?: any): Promise<GarageSettings> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const { data, error } = await client
      .from('garage')
      .select('*')
      .eq('id', garageId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error(`Garage settings not found for ID: ${garageId}`);
    }
    
    return mapSettings(data);
  },

  updateGarageSettings: async (garageId: string, settings: GarageSettings, supabase?: any): Promise<GarageSettings> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const { data, error } = await client
      .from('garage')
      .update({
        name: settings.name,
        logo: settings.logo,
        owner_name: settings.ownerName,
        phone: settings.phone,
        address: settings.address,
        footer_message: settings.footerMessage,
        gst_number: settings.gstNumber,
        warranty_notes: settings.warrantyNotes || '',
        whatsapp_number: settings.whatsappNumber || '',
        social_media: settings.socialMedia || '',
        mechanic_mode: settings.mechanicMode || 'Mixed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', garageId)
      .select()
      .single();

    if (error) throw error;
    return mapSettings(data);
  },

  // Mechanics
  getMechanics: async (garageId: string, supabase?: any): Promise<Mechanic[]> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const { data, error } = await client
      .from('mechanics')
      .select('*')
      .eq('garage_id', garageId)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapMechanic);
  },

  createMechanic: async (
    garageId: string, 
    name: string, 
    supabase?: any, 
    workType: 'Salary' | 'Independent' = 'Salary', 
    commissionRate: number = 0,
    salary: number = 0
  ): Promise<Mechanic> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const cleanName = name.trim();
    // Check if mechanic exists first
    const { data: existing } = await client
      .from('mechanics')
      .select('*')
      .eq('garage_id', garageId)
      .ilike('name', cleanName)
      .maybeSingle();

    if (existing) return mapMechanic(existing);

    const { data, error } = await client
      .from('mechanics')
      .insert({ 
        garage_id: garageId, 
        name: cleanName,
        work_type: workType,
        commission_rate: commissionRate,
        salary: salary
      })
      .select()
      .single();

    if (error) throw error;
    return mapMechanic(data);
  },

  updateMechanic: async (
    garageId: string, 
    id: string, 
    name: string, 
    workType?: 'Salary' | 'Independent', 
    commissionRate?: number, 
    supabase?: any,
    salary?: number
  ): Promise<Mechanic> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const payload: any = { name: name.trim() };
    if (workType) payload.work_type = workType;
    if (commissionRate !== undefined) payload.commission_rate = commissionRate;
    if (salary !== undefined) payload.salary = salary;

    const { data, error } = await client
      .from('mechanics')
      .update(payload)
      .eq('id', id)
      .eq('garage_id', garageId)
      .select()
      .single();

    if (error) throw error;
    return mapMechanic(data);
  },

  deleteMechanic: async (garageId: string, id: string, supabase?: any): Promise<boolean> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const { error } = await client
      .from('mechanics')
      .delete()
      .eq('id', id)
      .eq('garage_id', garageId);

    if (error) throw error;
    return true;
  },

  // Service Suggestions master lists
  getServiceSuggestions: async (garageId: string, query?: string, supabase?: any): Promise<ServiceSuggestion[]> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    let builder = client
      .from('service_suggestions')
      .select('*')
      .eq('garage_id', garageId);

    if (query) {
      builder = builder.ilike('name', `%${query.trim()}%`);
    }

    const { data, error } = await builder.order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map(mapServiceSuggestion);
  },

  addServiceSuggestion: async (garageId: string, name: string, charge: number = 0, supabase?: any): Promise<ServiceSuggestion> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const cleanName = name.trim();
    const { data: existing } = await client
      .from('service_suggestions')
      .select('*')
      .eq('garage_id', garageId)
      .ilike('name', cleanName)
      .maybeSingle();

    if (existing) {
      const { data, error } = await client
        .from('service_suggestions')
        .update({ charge })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return mapServiceSuggestion(data);
    }

    const { data, error } = await client
      .from('service_suggestions')
      .insert({ garage_id: garageId, name: cleanName, charge })
      .select()
      .single();

    if (error) throw error;
    return mapServiceSuggestion(data);
  },

  // Payments
  getPaymentsForBill: async (garageId: string, billId: string, supabase?: any): Promise<Payment[]> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const { data, error } = await client
      .from('payments')
      .select('*')
      .eq('bill_id', billId)
      .eq('garage_id', garageId)
      .order('payment_date', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapPayment);
  },

  addPayment: async (
    garageId: string, 
    billId: string, 
    paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CREDIT' | 'OTHER', 
    amount: number, 
    notes?: string | null, 
    paymentDate?: string,
    supabase?: any
  ): Promise<Payment> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const { data, error } = await client
      .from('payments')
      .insert({
        garage_id: garageId,
        bill_id: billId,
        payment_method: paymentMethod,
        amount: Number(amount),
        payment_date: paymentDate || new Date().toISOString(),
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return mapPayment(data);
  },

  deletePayment: async (garageId: string, id: string, supabase?: any): Promise<boolean> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const { error } = await client
      .from('payments')
      .delete()
      .eq('id', id)
      .eq('garage_id', garageId);

    if (error) throw error;
    return true;
  },

  // Job Timer logs & State updates
  logTimerAction: async (garageId: string, billId: string, action: 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE', supabase?: any): Promise<Bill> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    // Check if it is a Service Job
    const { data: jobData, error: jobCheckError } = await client
      .from('service_jobs')
      .select('*')
      .eq('id', billId)
      .eq('garage_id', garageId)
      .maybeSingle();

    if (jobData) {
      const timestamp = new Date().toISOString();
      const { error: timerError } = await client
        .from('job_timers')
        .insert({
          garage_id: garageId,
          job_id: billId,
          action,
          timestamp,
        });

      if (timerError) throw timerError;

      const lastActionTime = jobData.last_timer_action_at ? new Date(jobData.last_timer_action_at).getTime() : new Date().getTime();
      const diffSeconds = Math.max(0, Math.floor((Date.now() - lastActionTime) / 1000));

      let timerState: 'STOPPED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' = 'STOPPED';
      let jobStatus = jobData.job_status;
      let jobStartTime = jobData.job_start_time;
      let jobEndTime = jobData.job_end_time;
      let actualWorkingDuration = Number(jobData.actual_working_duration || 0);
      let pauseDuration = Number(jobData.pause_duration || 0);

      if (action === 'START') {
        timerState = 'RUNNING';
        jobStartTime = timestamp;
        jobStatus = 'Work Started';
      } else if (action === 'PAUSE') {
        if (jobData.timer_state === 'RUNNING') {
          actualWorkingDuration += diffSeconds;
        }
        timerState = 'PAUSED';
        jobStatus = 'Waiting for Parts';
      } else if (action === 'RESUME') {
        if (jobData.timer_state === 'PAUSED') {
          pauseDuration += diffSeconds;
        }
        timerState = 'RUNNING';
        jobStatus = 'Work Started';
      } else if (action === 'COMPLETE') {
        if (jobData.timer_state === 'RUNNING') {
          actualWorkingDuration += diffSeconds;
        } else if (jobData.timer_state === 'PAUSED') {
          pauseDuration += diffSeconds;
        }
        timerState = 'COMPLETED';
        jobEndTime = timestamp;
        jobStatus = 'Completed';
      }

      const totalWorkingTime = actualWorkingDuration + pauseDuration;

      const { data: finalJob, error: updateError } = await client
        .from('service_jobs')
        .update({
          timer_state: timerState,
          job_status: jobStatus,
          job_start_time: jobStartTime,
          job_end_time: jobEndTime,
          actual_working_duration: actualWorkingDuration,
          pause_duration: pauseDuration,
          total_working_time: totalWorkingTime,
          last_timer_action_at: timestamp,
        })
        .eq('id', billId)
        .eq('garage_id', garageId)
        .select(`
          *,
          customers (*),
          vehicles (*),
          bill_items (*),
          mechanics (*),
          payments (*),
          services (*, mechanics (*)),
          advances (*),
          job_timers (*),
          followups (*)
        `)
        .single();

      if (updateError) throw updateError;
      
      await client
        .from('services')
        .update({
          working_time: actualWorkingDuration,
          start_time: jobStartTime,
          end_time: jobEndTime
        })
        .eq('job_id', billId)
        .eq('garage_id', garageId);

      return {
        ...mapServiceJob(finalJob),
        invoiceNumber: '',
      } as unknown as Bill;
    }

    // 1. Get current bill state
    const { data: billData, error: loadError } = await client
      .from('bills')
      .select('*')
      .eq('id', billId)
      .eq('garage_id', garageId)
      .single();

    if (loadError) throw loadError;

    // 2. Log timer action
    const timestamp = new Date().toISOString();
    const { error: timerError } = await client
      .from('job_timers')
      .insert({
        garage_id: garageId,
        bill_id: billId,
        action,
        timestamp,
      });

    if (timerError) throw timerError;

    // 3. Durations calculations
    const lastActionTime = billData.last_timer_action_at ? new Date(billData.last_timer_action_at).getTime() : new Date().getTime();
    const diffSeconds = Math.max(0, Math.floor((Date.now() - lastActionTime) / 1000));

    let timerState: 'STOPPED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' = 'STOPPED';
    let jobStatus = billData.job_status;
    let jobStartTime = billData.job_start_time;
    let jobEndTime = billData.job_end_time;
    let actualWorkingDuration = Number(billData.actual_working_duration || 0);
    let pauseDuration = Number(billData.pause_duration || 0);

    if (action === 'START') {
      timerState = 'RUNNING';
      jobStartTime = timestamp;
      jobStatus = 'Work Started';
    } else if (action === 'PAUSE') {
      if (billData.timer_state === 'RUNNING') {
        actualWorkingDuration += diffSeconds;
      }
      timerState = 'PAUSED';
      jobStatus = 'Waiting for Parts';
    } else if (action === 'RESUME') {
      if (billData.timer_state === 'PAUSED') {
        pauseDuration += diffSeconds;
      }
      timerState = 'RUNNING';
      jobStatus = 'Work Started';
    } else if (action === 'COMPLETE') {
      if (billData.timer_state === 'RUNNING') {
        actualWorkingDuration += diffSeconds;
      } else if (billData.timer_state === 'PAUSED') {
        pauseDuration += diffSeconds;
      }
      timerState = 'COMPLETED';
      jobEndTime = timestamp;
      jobStatus = 'Completed';
    }

    const totalWorkingTime = actualWorkingDuration + pauseDuration;

    // 4. Update bill details
    const { data: finalBill, error: updateError } = await client
      .from('bills')
      .update({
        timer_state: timerState,
        job_status: jobStatus,
        job_start_time: jobStartTime,
        job_end_time: jobEndTime,
        actual_working_duration: actualWorkingDuration,
        pause_duration: pauseDuration,
        total_working_time: totalWorkingTime,
        last_timer_action_at: timestamp,
      })
      .eq('id', billId)
      .eq('garage_id', garageId)
      .select(`
        *,
        customers (*),
        vehicles (*),
        bill_items (*),
        mechanics (*),
        payments (*),
        services (*, mechanics (*)),
        advances (*),
        job_timers (*),
        followups (*)
      `)
      .single();

    if (updateError) throw updateError;
    return mapBill(finalBill);
  },

  // Manual Old Invoices Import
  getManualImports: async (garageId: string, query?: string, supabase?: any): Promise<ManualImport[]> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    let builder = client
      .from('manual_imports')
      .select('*')
      .eq('garage_id', garageId);

    if (query) {
      const q = query.trim();
      builder = builder.or(`customer_name.ilike.%${q}%,phone.ilike.%${q}%,vehicle_number.ilike.%${q}%`);
    }

    const { data, error } = await builder.order('bill_date', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapManualImport);
  },

  createManualImport: async (garageId: string, input: any, supabase?: any): Promise<ManualImport> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const { data, error } = await client
      .from('manual_imports')
      .insert({
        garage_id: garageId,
        customer_name: input.customerName.trim(),
        phone: input.phone.trim(),
        vehicle_number: input.vehicleNumber.toUpperCase().trim(),
        bill_date: input.billDate || new Date().toISOString(),
        amount: Number(input.amount),
        paid_amount: Number(input.paidAmount),
        pending_amount: Number(input.pendingAmount),
        notes: input.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;
    return mapManualImport(data);
  },

  // Customers
  getCustomers: async (garageId: string, query?: string, supabase?: any): Promise<Customer[]> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    let builder = client
      .from('customers')
      .select('*')
      .eq('garage_id', garageId);

    if (query) {
      const q = query.trim();
      builder = builder.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    const { data, error } = await builder.order('name', { ascending: true });
    if (error) throw error;

    return (data || []).map(mapCustomer);
  },

  getCustomerById: async (garageId: string, id: string, supabase?: any): Promise<Customer | null> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const { data, error } = await client
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('garage_id', garageId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapCustomer(data) : null;
  },

  getCustomerByPhone: async (garageId: string, phone: string, supabase?: any): Promise<Customer | null> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const { data, error } = await client
      .from('customers')
      .select('*')
      .eq('phone', phone.trim())
      .eq('garage_id', garageId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapCustomer(data) : null;
  },

  getCustomerOutstandingDues: async (garageId: string, phone: string, supabase?: any): Promise<{ totalDues: number; unpaidBills: any[]; followupDate?: string | null }> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const customer = await supabaseDb.getCustomerByPhone(garageId, phone, client);
    if (!customer) return { totalDues: 0, unpaidBills: [] };

    // Standard bills outstanding
    const { data: unpaidBills, error: billsError } = await client
      .from('bills')
      .select('id, invoice_number, date, remaining_amount')
      .eq('customer_id', customer.id)
      .neq('payment_status', 'PAID')
      .eq('garage_id', garageId);

    if (billsError) throw billsError;

    // Manual imports outstanding
    const { data: unpaidImports, error: importsError } = await client
      .from('manual_imports')
      .select('id, bill_date, pending_amount')
      .eq('phone', phone.trim())
      .gt('pending_amount', 0)
      .eq('garage_id', garageId);

    if (importsError) throw importsError;

    const formattedBills = (unpaidBills || []).map((b: any) => ({
      id: b.id,
      invoiceNumber: b.invoice_number,
      date: b.date,
      remainingAmount: Number(b.remaining_amount),
    }));

    const formattedImports = (unpaidImports || []).map((m: any) => ({
      id: m.id,
      invoiceNumber: `Imported (${new Date(m.bill_date).toLocaleDateString('en-GB')})`,
      date: m.bill_date,
      remainingAmount: Number(m.pending_amount),
      isImport: true,
    }));

    // Fetch all customer bill IDs and job IDs to locate followups
    const { data: customerBills } = await client
      .from('bills')
      .select('id')
      .eq('customer_id', customer.id);
    
    const { data: customerJobs } = await client
      .from('service_jobs')
      .select('id')
      .eq('customer_id', customer.id);

    const billIds = (customerBills || []).map((b: any) => b.id);
    const jobIds = (customerJobs || []).map((j: any) => j.id);

    let followupDate: string | null = null;
    if (billIds.length > 0 || jobIds.length > 0) {
      let query = client
        .from('followups')
        .select('followup_date')
        .eq('status', 'PENDING')
        .eq('garage_id', garageId);
      
      if (billIds.length > 0 && jobIds.length > 0) {
        query = query.or(`bill_id.in.(${billIds.join(',')}),job_id.in.(${jobIds.join(',')})`);
      } else if (billIds.length > 0) {
        query = query.in('bill_id', billIds);
      } else {
        query = query.in('job_id', jobIds);
      }

      const { data: followups } = await query
        .order('followup_date', { ascending: true })
        .limit(1);

      followupDate = followups && followups.length > 0 ? followups[0].followup_date : null;
    }

    const allDues = [...formattedBills, ...formattedImports];
    const totalDues = allDues.reduce((sum, item) => sum + item.remainingAmount, 0);

    return {
      totalDues,
      unpaidBills: allDues,
      followupDate,
    };
  },

  createCustomer: async (garageId: string, name: string, phone: string, supabase?: any): Promise<Customer> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const cleanPhone = phone.trim();
    const { data: existing } = await client
      .from('customers')
      .select('*')
      .eq('phone', cleanPhone)
      .eq('garage_id', garageId)
      .maybeSingle();

    if (existing) return mapCustomer(existing);

    const { data, error } = await client
      .from('customers')
      .insert({
        garage_id: garageId,
        name: name.trim(),
        phone: cleanPhone,
      })
      .select()
      .single();

    if (error) throw error;
    return mapCustomer(data);
  },

  // Vehicles
  getVehiclesByCustomerId: async (garageId: string, customerId: string, supabase?: any): Promise<Vehicle[]> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const { data, error } = await client
      .from('vehicles')
      .select('*')
      .eq('customer_id', customerId)
      .eq('garage_id', garageId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapVehicle);
  },

  getVehicleById: async (garageId: string, id: string, supabase?: any): Promise<Vehicle | null> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const { data, error } = await client
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .eq('garage_id', garageId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapVehicle(data) : null;
  },

  createVehicle: async (garageId: string, customerId: string, vehicleNumber: string, brand: string, model: string, supabase?: any): Promise<Vehicle> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const cleanNumber = vehicleNumber.toUpperCase().replace(/\s+/g, '-').trim();
    const { data: existing } = await client
      .from('vehicles')
      .select('*')
      .eq('vehicle_number', cleanNumber)
      .eq('garage_id', garageId)
      .maybeSingle();

    if (existing) return mapVehicle(existing);

    const { data, error } = await client
      .from('vehicles')
      .insert({
        garage_id: garageId,
        customer_id: customerId,
        vehicle_number: cleanNumber,
        brand: brand.trim(),
        model: model.trim(),
      })
      .select()
      .single();

    if (error) throw error;
    return mapVehicle(data);
  },

  // Part Suggestions
  getPartSuggestions: async (garageId: string, query?: string, supabase?: any): Promise<PartSuggestion[]> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');
    
    let builder = client
      .from('part_suggestions')
      .select('*')
      .eq('garage_id', garageId);

    if (query) {
      builder = builder.ilike('name', `%${query.trim()}%`);
    }

    const { data, error } = await builder.order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map(mapPartSuggestion);
  },

  addPartSuggestion: async (garageId: string, name: string, price: number | null = null, supabase?: any): Promise<PartSuggestion> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');
    
    const cleanName = name.trim();
    const { data: existing } = await client
      .from('part_suggestions')
      .select('*')
      .ilike('name', cleanName)
      .eq('garage_id', garageId)
      .maybeSingle();

    if (existing) {
      if (price !== null) {
        const { data, error } = await client
          .from('part_suggestions')
          .update({ price })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return mapPartSuggestion(data);
      }
      return mapPartSuggestion(existing);
    }

    const { data, error } = await client
      .from('part_suggestions')
      .insert({ 
        garage_id: garageId, 
        name: cleanName, 
        price 
      })
      .select()
      .single();
      
    if (error) throw error;
    return mapPartSuggestion(data);
  },

  // Bills Queries
  getBillsByVehicleId: async (garageId: string, vehicleId: string, supabase?: any): Promise<Bill[]> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');
    
    const { data, error } = await client
      .from('bills')
      .select(`
        *,
        customers (*),
        vehicles (*),
        bill_items (*),
        mechanics (*),
        payments (*),
        services (*, mechanics (*)),
        advances (*),
        job_timers (*),
        followups (*)
      `)
      .eq('vehicle_id', vehicleId)
      .eq('garage_id', garageId)
      .order('date', { ascending: false });
      
    if (error) throw error;
    return (data || []).map(mapBill);
  },

  getBillById: async (garageId: string, id: string, supabase?: any): Promise<Bill | null> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');
    
    // Check service_jobs first
    const { data: jobData, error: jobError } = await client
      .from('service_jobs')
      .select(`
        *,
        customers (*),
        vehicles (*),
        bill_items (*),
        mechanics (*),
        payments (*),
        services (*, mechanics (*)),
        advances (*),
        job_timers (*),
        followups (*)
      `)
      .eq('id', id)
      .eq('garage_id', garageId)
      .maybeSingle();

    if (jobData) {
      return {
        ...mapServiceJob(jobData),
        invoiceNumber: '',
      } as unknown as Bill;
    }

    const { data, error } = await client
      .from('bills')
      .select(`
        *,
        customers (*),
        vehicles (*),
        bill_items (*),
        mechanics (*),
        payments (*),
        services (*, mechanics (*)),
        advances (*),
        job_timers (*),
        followups (*)
      `)
      .eq('id', id)
      .eq('garage_id', garageId)
      .maybeSingle();
      
    if (error) throw error;
    return data ? mapBill(data) : null;
  },

  getRecentBills: async (garageId: string, limit: number = 20, supabase?: any): Promise<Bill[]> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');
    
    const { data, error } = await client
      .from('bills')
      .select(`
        *,
        customers (*),
        vehicles (*),
        bill_items (*),
        mechanics (*),
        payments (*),
        services (*, mechanics (*)),
        advances (*),
        job_timers (*),
        followups (*)
      `)
      .eq('garage_id', garageId)
      .order('date', { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    return (data || []).map(mapBill);
  },

  createBill: async (garageId: string, input: CreateBillInput, supabase?: any): Promise<Bill> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');
    
    const { 
      customerId, customerName, customerPhone, 
      vehicleId, vehicleNumber, vehicleBrand, vehicleModel,
      date, labour, notes, paymentStatus, items,
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
      customer = await supabaseDb.getCustomerById(garageId, customerId, client) as Customer;
    } else if (customerPhone && customerName) {
      customer = await supabaseDb.createCustomer(garageId, customerName, customerPhone, client);
    } else {
      throw new Error('Customer information missing.');
    }

    // 2. Resolve Vehicle
    let vehicle: Vehicle;
    if (vehicleId) {
      vehicle = await supabaseDb.getVehicleById(garageId, vehicleId, client) as Vehicle;
    } else if (vehicleNumber && vehicleBrand && vehicleModel) {
      vehicle = await supabaseDb.createVehicle(garageId, customer.id, vehicleNumber, vehicleBrand, vehicleModel, client);
    } else {
      throw new Error('Vehicle information missing.');
    }

    // 2b. Prevent active queue duplicates
    const { data: existingActiveBill, error: findActiveError } = await client
      .from('bills')
      .select('id')
      .eq('garage_id', garageId)
      .eq('vehicle_id', vehicle.id)
      .neq('job_status', 'Delivered')
      .neq('job_status', 'Cancelled')
      .limit(1)
      .maybeSingle();

    if (!findActiveError && existingActiveBill) {
      return supabaseDb.getBillById(garageId, existingActiveBill.id, client) as Promise<Bill>;
    }

    // 3. Resolve General Mechanic
    let resolvedMechanicId: string | null = mechanicId || null;
    if (mechanicName && mechanicName.trim()) {
      const mech = await supabaseDb.createMechanic(garageId, mechanicName, client);
      resolvedMechanicId = mech.id;
    }

    // 4. Generate Invoice Number
    const { count, error: countError } = await client
      .from('bills')
      .select('*', { count: 'exact', head: true })
      .eq('garage_id', garageId);
    if (countError) throw countError;
    const invoiceNumber = `GB-${1001 + (count || 0)}`;

    // 5. Insert Bill record
    const { data: billData, error: billError } = await client
      .from('bills')
      .insert({
        garage_id: garageId,
        vehicle_id: vehicle.id,
        customer_id: customer.id,
        invoice_number: invoiceNumber,
        date: date || new Date().toISOString(),
        labour: Number(labour),
        total: 0, // Calculated by Postgres trigger
        notes: notes?.trim() || '',
        payment_status: paymentStatus,
        mechanic_id: resolvedMechanicId,
        expected_payment_date: expectedPaymentDate || null,
        followup_reminder_date: followupReminderDate || null,
        payment_notes: paymentNotes || null,
        // v2.0 parameters
        job_status: jobStatus || 'Waiting',
        work_requested: workRequested || '',
        overall_discount: Number(overallDiscount || 0),
        previous_due_added: Number(previousDueAdded || 0),
        previous_due_bill_ids: previousDueBillIds || [],
        overall_discount_type: overallDiscountType || 'FLAT',
        overall_discount_value: Number(overallDiscountValue || 0),
        service_notes: serviceNotes || '',
        show_service_notes: showServiceNotes !== undefined ? showServiceNotes : true,
      })
      .select()
      .single();
      
    if (billError) throw billError;

    // 6. Insert Parts Items
    const itemsPayload = items.map((item: any) => ({
      garage_id: garageId,
      bill_id: billData.id,
      name: item.name.trim(),
      price: Number(item.finalPrice || item.unitPrice || 0),
      quantity: Number(item.quantity || 1),
      unit_price: Number(item.unitPrice || 0),
      discount_percentage: Number(item.discountPercentage || 0),
      discount_amount: Number(item.discountAmount || 0),
      final_price: Number(item.finalPrice || 0),
      discount_type: item.discountType || 'PERCENT',
      discount_value: Number(item.discountValue || 0),
    }));

    const { error: itemsError } = await client
      .from('bill_items')
      .insert(itemsPayload);
      
    if (itemsError) throw itemsError;

    // 7. Insert Labour Services
    if (inputServices && inputServices.length > 0) {
      const servicesPayload = [];
      for (const s of inputServices) {
        let servMechId = s.mechanicId || null;
        let sWorkType = s.mechanicType || 'Salary';
        let sCommRate = s.commissionRate || 0;
        if (s.mechanicName && s.mechanicName.trim()) {
          const mechObj = await supabaseDb.createMechanic(garageId, s.mechanicName, client);
          servMechId = mechObj.id;
          sWorkType = mechObj.workType;
          sCommRate = Number(mechObj.commissionRate || 0);
        } else if (servMechId) {
          const { data: mechData } = await client
            .from('mechanics')
            .select('work_type, commission_rate')
            .eq('id', servMechId)
            .single();
          if (mechData) {
            sWorkType = mechData.work_type;
            sCommRate = Number(mechData.commission_rate || 0);
          }
        }
        servicesPayload.push({
          garage_id: garageId,
          bill_id: billData.id,
          name: s.name.trim(),
          mechanic_id: servMechId,
          labour_charge: Number(s.labourCharge || 0),
          discount: Number(s.discount || 0),
          final_charge: Number(s.finalCharge || 0),
          mechanic_type: sWorkType,
          commission_rate: sCommRate,
          working_time: Number(s.workingTime || 0),
          start_time: s.startTime || null,
          end_time: s.endTime || null,
          discount_type: s.discountType || 'FLAT',
          discount_value: Number(s.discountValue || 0),
        });
      }
      const { error: servError } = await client.from('services').insert(servicesPayload);
      if (servError) throw servError;
    }

    // 8. Insert Advances
    if (inputAdvances && inputAdvances.length > 0) {
      const advancesPayload = inputAdvances.map((adv: any) => ({
        garage_id: garageId,
        bill_id: billData.id,
        amount: Number(adv.amount),
        payment_mode: adv.paymentMode,
      }));
      const { error: advError } = await client.from('advances').insert(advancesPayload);
      if (advError) throw advError;

      // Automatically insert into payments table as first entry in payment history
      const advPaymentsPayload = inputAdvances
        .filter((adv: any) => adv.amount > 0)
        .map((adv: any) => ({
          garage_id: garageId,
          bill_id: billData.id,
          payment_method: adv.paymentMode.toUpperCase(),
          amount: Number(adv.amount),
          payment_date: date || new Date().toISOString(),
          notes: 'Advance',
        }));
      if (advPaymentsPayload.length > 0) {
        const { error: advPaysError } = await client.from('payments').insert(advPaymentsPayload);
        if (advPaysError) throw advPaysError;
      }
    }

    // 9. Insert Payments
    if (initialPayments && initialPayments.length > 0) {
      const paymentsPayload = initialPayments
        .filter((p: any) => p.amount > 0)
        .map((p: any) => ({
          garage_id: garageId,
          bill_id: billData.id,
          payment_method: p.paymentMethod.toUpperCase(),
          amount: Number(p.amount),
          payment_date: date || new Date().toISOString(),
          notes: p.notes || 'Initial payment',
        }));

      if (paymentsPayload.length > 0) {
        const { error: paysError } = await client
          .from('payments')
          .insert(paymentsPayload);
        if (paysError) throw paysError;
      }
    }

    // 10. Insert Followup
    if (paymentStatus !== 'PAID' && expectedPaymentDate) {
      await client.from('followups').insert({
        garage_id: garageId,
        bill_id: billData.id,
        followup_date: expectedPaymentDate,
        notes: paymentNotes,
      });
    }

    // 11. Clear Merged Customer previous dues
    if (previousDueBillIds && previousDueBillIds.length > 0) {
      for (const oldBillId of previousDueBillIds) {
        const { data: oldBill } = await client.from('bills').select('remaining_amount').eq('id', oldBillId).maybeSingle();
        if (oldBill && Number(oldBill.remaining_amount) > 0) {
          await client.from('payments').insert({
            garage_id: garageId,
            bill_id: oldBillId,
            payment_method: 'CREDIT',
            amount: Number(oldBill.remaining_amount),
            notes: `Merged into invoice ${invoiceNumber}`,
          });
        }
        
        const { data: oldImp } = await client.from('manual_imports').select('pending_amount, notes').eq('id', oldBillId).maybeSingle();
        if (oldImp && Number(oldImp.pending_amount) > 0) {
          await client.from('manual_imports').update({
            paid_amount: oldImp.amount,
            pending_amount: 0,
            notes: `Merged into invoice ${invoiceNumber}. ${oldImp.notes || ''}`
          }).eq('id', oldBillId);
        }

        await client.from('followups').update({ status: 'COMPLETED' }).eq('bill_id', oldBillId);
      }
    }

    // 12. Save part suggestions
    for (const item of items) {
      try {
        await supabaseDb.addPartSuggestion(garageId, item.name, item.unitPrice ? Number(item.unitPrice) : null, client);
      } catch (err) {
        console.error('Failed to add part suggestion:', err);
      }
    }

    // Reload completed bill detail (which automatically triggers the DB triggers calculation)
    const freshBill = await supabaseDb.getBillById(garageId, billData.id, client);
    return freshBill!;
  },

  updateBill: async (garageId: string, id: string, input: UpdateBillInput, supabase?: any): Promise<Bill> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const { data: jobCheck } = await client
      .from('service_jobs')
      .select('id')
      .eq('id', id)
      .eq('garage_id', garageId)
      .maybeSingle();

    if (jobCheck) {
      if (input.jobStatus === 'Delivered') {
        await supabaseDb.updateServiceJob(garageId, id, input, client);
        return await supabaseDb.generateBillFromJob(garageId, id, client);
      } else {
        return await supabaseDb.updateServiceJob(garageId, id, input, client) as unknown as Bill;
      }
    }

    const { 
      date, labour, notes, paymentStatus, items,
      mechanicId, mechanicName, expectedPaymentDate, followupReminderDate, paymentNotes,
      jobStatus, workRequested, services: inputServices, advances: inputAdvances,
      overallDiscount, previousDueAdded, previousDueBillIds,
      overallDiscountType, overallDiscountValue,
      serviceNotes, showServiceNotes
    } = input;

    // 1. Resolve General Mechanic
    let resolvedMechanicId: string | null = mechanicId || null;
    if (mechanicName && mechanicName.trim()) {
      const mech = await supabaseDb.createMechanic(garageId, mechanicName, client);
      resolvedMechanicId = mech.id;
    }

    // 2. Update Bill Details
    const { data: billData, error: billError } = await client
      .from('bills')
      .update({
        date: date,
        labour: Number(labour),
        notes: notes?.trim() || '',
        payment_status: paymentStatus,
        mechanic_id: resolvedMechanicId,
        expected_payment_date: expectedPaymentDate || null,
        followup_reminder_date: followupReminderDate || null,
        payment_notes: paymentNotes || null,
        // v2.0 parameters
        job_status: jobStatus || 'Waiting',
        work_requested: workRequested || '',
        overall_discount: Number(overallDiscount || 0),
        previous_due_added: Number(previousDueAdded || 0),
        previous_due_bill_ids: previousDueBillIds || [],
        overall_discount_type: overallDiscountType || 'FLAT',
        overall_discount_value: Number(overallDiscountValue || 0),
        service_notes: serviceNotes || '',
        show_service_notes: showServiceNotes !== undefined ? showServiceNotes : true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('garage_id', garageId)
      .select()
      .single();

    if (billError) throw billError;

    // 3. Clear existing items, services, advances, followups
    await client.from('bill_items').delete().eq('bill_id', id).eq('garage_id', garageId);
    await client.from('services').delete().eq('bill_id', id).eq('garage_id', garageId);
    await client.from('advances').delete().eq('bill_id', id).eq('garage_id', garageId);
    await client.from('followups').delete().eq('bill_id', id).eq('garage_id', garageId);

    // 4. Re-insert items
    const itemsPayload = items.map((item: any) => ({
      garage_id: garageId,
      bill_id: id,
      name: item.name.trim(),
      price: Number(item.finalPrice || item.unitPrice || 0),
      quantity: Number(item.quantity || 1),
      unit_price: Number(item.unitPrice || 0),
      discount_percentage: Number(item.discountPercentage || 0),
      discount_amount: Number(item.discountAmount || 0),
      final_price: Number(item.finalPrice || 0),
      discount_type: item.discountType || 'PERCENT',
      discount_value: Number(item.discountValue || 0),
    }));

    const { error: itemsError } = await client.from('bill_items').insert(itemsPayload);
    if (itemsError) throw itemsError;

    // 5. Re-insert services
    if (inputServices && inputServices.length > 0) {
      const servicesPayload = [];
      for (const s of inputServices) {
        let servMechId = s.mechanicId || null;
        let sWorkType = s.mechanicType || 'Salary';
        let sCommRate = s.commissionRate || 0;
        if (s.mechanicName && s.mechanicName.trim()) {
          const mechObj = await supabaseDb.createMechanic(garageId, s.mechanicName, client);
          servMechId = mechObj.id;
          sWorkType = mechObj.workType;
          sCommRate = Number(mechObj.commissionRate || 0);
        } else if (servMechId) {
          const { data: mechData } = await client
            .from('mechanics')
            .select('work_type, commission_rate')
            .eq('id', servMechId)
            .single();
          if (mechData) {
            sWorkType = mechData.work_type;
            sCommRate = Number(mechData.commission_rate || 0);
          }
        }
        servicesPayload.push({
          garage_id: garageId,
          bill_id: id,
          name: s.name.trim(),
          mechanic_id: servMechId,
          labour_charge: Number(s.labourCharge || 0),
          discount: Number(s.discount || 0),
          final_charge: Number(s.finalCharge || 0),
          mechanic_type: sWorkType,
          commission_rate: sCommRate,
          working_time: Number(s.workingTime || 0),
          start_time: s.startTime || null,
          end_time: s.endTime || null,
          discount_type: s.discountType || 'FLAT',
          discount_value: Number(s.discountValue || 0),
        });
      }
      const { error: servError } = await client.from('services').insert(servicesPayload);
      if (servError) throw servError;
    }

    // 6. Re-insert advances
    if (inputAdvances && inputAdvances.length > 0) {
      const advancesPayload = inputAdvances.map((adv: any) => ({
        garage_id: garageId,
        bill_id: id,
        amount: Number(adv.amount),
        payment_mode: adv.paymentMode,
      }));
      const { error: advError } = await client.from('advances').insert(advancesPayload);
      if (advError) throw advError;
    }

    // 7. Re-insert followups
    if (paymentStatus !== 'PAID' && expectedPaymentDate) {
      await client.from('followups').insert({
        garage_id: garageId,
        bill_id: id,
        followup_date: expectedPaymentDate,
        notes: paymentNotes,
      });
    }

    // 8. Re-save suggestions
    for (const item of items) {
      try {
        await supabaseDb.addPartSuggestion(garageId, item.name, item.unitPrice ? Number(item.unitPrice) : null, client);
      } catch (err) {
        console.error('Failed to add part suggestion:', err);
      }
    }

    const freshBill = await supabaseDb.getBillById(garageId, id, client);
    return freshBill!;
  },

  searchUniversal: async (garageId: string, query: string, supabase?: any) => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return [];

    // Search mechanics
    const { data: mechanicsData } = await client
      .from('mechanics')
      .select('id')
      .eq('garage_id', garageId)
      .ilike('name', `%${cleanQuery}%`);

    // Search bill items
    const { data: itemsData } = await client
      .from('bill_items')
      .select('bill_id')
      .eq('garage_id', garageId)
      .ilike('name', `%${cleanQuery}%`);

    // Search customers
    const { data: customersData, error: custError } = await client
      .from('customers')
      .select('*')
      .eq('garage_id', garageId)
      .or(`name.ilike.%${cleanQuery}%,phone.ilike.%${cleanQuery}%`);
      
    if (custError) throw custError;

    // Search vehicles
    const { data: vehiclesData, error: vehError } = await client
      .from('vehicles')
      .select('*')
      .eq('garage_id', garageId)
      .or(`vehicle_number.ilike.%${cleanQuery}%,brand.ilike.%${cleanQuery}%,model.ilike.%${cleanQuery}%`);

    if (vehError) throw vehError;

    // Gather matched customer IDs
    const matchedCustomerIds = new Set<string>();
    (customersData || []).forEach((c: any) => matchedCustomerIds.add(c.id));
    (vehiclesData || []).forEach((v: any) => matchedCustomerIds.add(v.customer_id));

    // Search bills by invoice number
    const { data: billsData } = await client
      .from('bills')
      .select('customer_id')
      .eq('garage_id', garageId)
      .ilike('invoice_number', `%${cleanQuery}%`);
    (billsData || []).forEach((b: any) => matchedCustomerIds.add(b.customer_id));

    // Gather bill-specific matching elements
    const matchedBillIds = new Set<string>();
    (itemsData || []).forEach((item: any) => matchedBillIds.add(item.bill_id));

    // If matches on items, query the bills to resolve customer IDs
    if (matchedBillIds.size > 0) {
      const { data: itemBills } = await client
        .from('bills')
        .select('customer_id')
        .eq('garage_id', garageId)
        .in('id', Array.from(matchedBillIds));
      (itemBills || []).forEach((b: any) => matchedCustomerIds.add(b.customer_id));
    }

    // If matches on mechanics, query bills to resolve customer IDs
    if (mechanicsData && mechanicsData.length > 0) {
      const mechIds = mechanicsData.map((m: any) => m.id);
      const { data: mechBills } = await client
        .from('bills')
        .select('customer_id')
        .eq('garage_id', garageId)
        .in('mechanic_id', mechIds);
      (mechBills || []).forEach((b: any) => matchedCustomerIds.add(b.customer_id));
    }

    if (matchedCustomerIds.size === 0) return [];

    const results = [];
    for (const cid of Array.from(matchedCustomerIds)) {
      const { data: customer } = await client
        .from('customers')
        .select('*')
        .eq('id', cid)
        .eq('garage_id', garageId)
        .single();

      const { data: customerVehicles } = await client
        .from('vehicles')
        .select('*')
        .eq('customer_id', cid)
        .eq('garage_id', garageId);

      const { data: customerBills } = await client
        .from('bills')
        .select(`
          *,
          vehicles (*),
          mechanics (*),
          payments (*)
        `)
        .eq('customer_id', cid)
        .eq('garage_id', garageId);

      const { data: customerJobs } = await client
        .from('service_jobs')
        .select(`
          *,
          vehicles (*),
          mechanics (*),
          payments (*)
        `)
        .eq('customer_id', cid)
        .eq('garage_id', garageId);

      const mappedBills = [
        ...(customerJobs || []).map((j: any) => ({ ...mapServiceJob(j), invoiceNumber: '' })),
        ...(customerBills || []).map(mapBill)
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      results.push({
        customer: mapCustomer(customer),
        vehicles: (customerVehicles || []).map(mapVehicle),
        bills: mappedBills,
      });
    }

    return results;
  },

  updatePartSuggestion: async (garageId: string, id: string, name: string, price: number | null, supabase?: any): Promise<PartSuggestion> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');
    const { data, error } = await client
      .from('part_suggestions')
      .update({ name: name.trim(), price: price, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('garage_id', garageId)
      .select()
      .single();
    if (error) throw error;
    return mapPartSuggestion(data);
  },

  deletePartSuggestion: async (garageId: string, id: string, supabase?: any): Promise<boolean> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');
    const { error } = await client
      .from('part_suggestions')
      .delete()
      .eq('id', id)
      .eq('garage_id', garageId);
    if (error) throw error;
    return true;
  },

  updateServiceSuggestion: async (garageId: string, id: string, name: string, charge: number, supabase?: any): Promise<ServiceSuggestion> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');
    const { data, error } = await client
      .from('service_suggestions')
      .update({ name: name.trim(), charge: charge, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('garage_id', garageId)
      .select()
      .single();
    if (error) throw error;
    return mapServiceSuggestion(data);
  },

  deleteServiceSuggestion: async (garageId: string, id: string, supabase?: any): Promise<boolean> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');
    const { error } = await client
      .from('service_suggestions')
      .delete()
      .eq('id', id)
      .eq('garage_id', garageId);
    if (error) throw error;
    return true;
  },

  getServiceJobs: async (garageId: string, supabase?: any): Promise<ServiceJob[]> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');
    const { data, error } = await client
      .from('service_jobs')
      .select(`
        *,
        customers (*),
        vehicles (*),
        bill_items (*),
        mechanics (*),
        payments (*),
        services (*, mechanics (*)),
        advances (*),
        job_timers (*),
        followups (*)
      `)
      .eq('garage_id', garageId)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapServiceJob);
  },

  getServiceJobById: async (garageId: string, id: string, supabase?: any): Promise<ServiceJob | null> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');
    const { data, error } = await client
      .from('service_jobs')
      .select(`
        *,
        customers (*),
        vehicles (*),
        bill_items (*),
        mechanics (*),
        payments (*),
        services (*, mechanics (*)),
        advances (*),
        job_timers (*),
        followups (*)
      `)
      .eq('id', id)
      .eq('garage_id', garageId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapServiceJob(data) : null;
  },

  createServiceJob: async (garageId: string, input: CreateBillInput, supabase?: any): Promise<ServiceJob> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const { 
      customerId, customerName, customerPhone, 
      vehicleId, vehicleNumber, vehicleBrand, vehicleModel,
      date, labour, notes, paymentStatus, items,
      mechanicId, mechanicName, payments: initialPayments,
      expectedPaymentDate, followupReminderDate, paymentNotes,
      jobStatus, workRequested, services: inputServices, advances: inputAdvances,
      overallDiscount, previousDueAdded, previousDueBillIds,
      overallDiscountType, overallDiscountValue,
      serviceNotes, showServiceNotes
    } = input;

    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId && customerPhone && customerName) {
      const cleanPhone = customerPhone.trim();
      const existing = await supabaseDb.getCustomerByPhone(garageId, cleanPhone, client);
      if (existing) {
        resolvedCustomerId = existing.id;
      } else {
        const newCust = await supabaseDb.createCustomer(garageId, customerName, cleanPhone, client);
        resolvedCustomerId = newCust.id;
      }
    }
    if (!resolvedCustomerId) throw new Error('Customer information missing.');

    let resolvedVehicleId = vehicleId;
    if (!resolvedVehicleId && vehicleNumber && vehicleBrand && vehicleModel) {
      const cleanNum = vehicleNumber.toUpperCase().replace(/\s+/g, '-').trim();
      const { data: existingVeh } = await client
        .from('vehicles')
        .select('id')
        .eq('garage_id', garageId)
        .eq('vehicle_number', cleanNum)
        .maybeSingle();

      if (existingVeh) {
        resolvedVehicleId = existingVeh.id;
      } else {
        const newVeh = await supabaseDb.createVehicle(garageId, resolvedCustomerId, cleanNum, vehicleBrand, vehicleModel, client);
        resolvedVehicleId = newVeh.id;
      }
    }
    if (!resolvedVehicleId) throw new Error('Vehicle information missing.');

    if (resolvedVehicleId && vehicleBrand && vehicleModel) {
      await supabaseDb.learnVehicleSuggestion(garageId, vehicleBrand, vehicleModel, client).catch(console.error);
    }
    if (workRequested) {
      const complaints = workRequested.split(',').map((s: string) => s.trim()).filter(Boolean);
      for (const comp of complaints) {
        await supabaseDb.learnComplaintSuggestion(garageId, comp, client).catch(console.error);
      }
    }

    const { data: existingActive } = await client
      .from('service_jobs')
      .select('id')
      .eq('garage_id', garageId)
      .eq('vehicle_id', resolvedVehicleId)
      .not('job_status', 'eq', 'Delivered')
      .not('job_status', 'eq', 'Cancelled')
      .maybeSingle();

    if (existingActive) {
      const activeInfo = await supabaseDb.getServiceJobById(garageId, existingActive.id, client);
      if (activeInfo) return activeInfo;
    }

    let resolvedMechanicId = mechanicId || null;
    if (mechanicName && mechanicName.trim()) {
      const mech = await supabaseDb.createMechanic(garageId, mechanicName, client);
      resolvedMechanicId = mech.id;
    }

    const { data: jobData, error: jobError } = await client
      .from('service_jobs')
      .insert({
        garage_id: garageId,
        vehicle_id: resolvedVehicleId,
        customer_id: resolvedCustomerId,
        date: date || new Date().toISOString(),
        labour: Number(labour || 0),
        total: 0.00,
        notes: notes || '',
        payment_status: paymentStatus || 'PENDING',
        mechanic_id: resolvedMechanicId,
        expected_payment_date: expectedPaymentDate || null,
        followup_reminder_date: followupReminderDate || null,
        payment_notes: paymentNotes || null,
        job_status: jobStatus || 'Waiting',
        work_requested: workRequested || '',
        overall_discount: Number(overallDiscount || 0),
        previous_due_added: Number(previousDueAdded || 0),
        previous_due_bill_ids: previousDueBillIds || [],
        overall_discount_type: overallDiscountType || 'FLAT',
        overall_discount_value: Number(overallDiscountValue || 0),
        service_notes: serviceNotes || '',
        show_service_notes: showServiceNotes !== undefined ? showServiceNotes : true
      })
      .select()
      .single();

    if (jobError) throw jobError;

    if (items && items.length > 0) {
      const itemsPayload = items.map((item) => ({
        garage_id: garageId,
        job_id: jobData.id,
        name: item.name.trim(),
        price: Number(item.finalPrice || item.unitPrice || 0),
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unitPrice || 0),
        discount_percentage: Number(item.discountPercentage || 0),
        discount_amount: Number(item.discountAmount || 0),
        final_price: Number(item.finalPrice || 0),
        discount_type: item.discountType || 'PERCENT',
        discount_value: Number(item.discountValue || 0)
      }));
      const { error: itemsError } = await client.from('bill_items').insert(itemsPayload);
      if (itemsError) throw itemsError;
    }

    if (inputServices && inputServices.length > 0) {
      const servicesPayload = [];
      for (const s of inputServices) {
        let sMechId = s.mechanicId || null;
        let sWorkType = s.mechanicType || 'Salary';
        if (s.mechanicName && s.mechanicName.trim()) {
          const mech = await supabaseDb.createMechanic(garageId, s.mechanicName, client);
          sMechId = mech.id;
          sWorkType = mech.workType;
        } else if (sMechId) {
          const { data: mech } = await client.from('mechanics').select('work_type').eq('id', sMechId).single();
          if (mech) sWorkType = mech.work_type;
        }

        servicesPayload.push({
          garage_id: garageId,
          job_id: jobData.id,
          name: s.name.trim(),
          mechanic_id: sMechId,
          labour_charge: Number(s.labourCharge || 0),
          discount: Number(s.discount || 0),
          final_charge: Number(s.finalCharge || 0),
          mechanic_type: sWorkType,
          commission_rate: Number(s.commissionRate || 0),
          working_time: Number(s.workingTime || 0),
          start_time: s.startTime || null,
          end_time: s.endTime || null,
          discount_type: s.discountType || 'FLAT',
          discount_value: Number(s.discountValue || 0)
        });
      }
      const { error: servicesError } = await client.from('services').insert(servicesPayload);
      if (servicesError) throw servicesError;
    }

    if (initialPayments && initialPayments.length > 0) {
      const paymentsPayload = initialPayments
        .filter(p => p.amount > 0)
        .map(p => ({
          garage_id: garageId,
          job_id: jobData.id,
          payment_method: p.paymentMethod,
          amount: Number(p.amount),
          notes: p.notes || '',
          payment_date: date || new Date().toISOString(),
        }));

      if (paymentsPayload.length > 0) {
        const { error: paysError } = await client.from('payments').insert(paymentsPayload);
        if (paysError) throw paysError;
      }
    }

    if (inputAdvances && inputAdvances.length > 0) {
      const advancesPayload = inputAdvances
        .filter(adv => adv.amount > 0)
        .map(adv => ({
          garage_id: garageId,
          job_id: jobData.id,
          amount: Number(adv.amount),
          payment_mode: adv.paymentMode,
          created_at: date || new Date().toISOString(),
        }));

      if (advancesPayload.length > 0) {
        const { error: advsError } = await client.from('advances').insert(advancesPayload);
        if (advsError) throw advsError;
      }
    }

    if (paymentStatus !== 'PAID' && expectedPaymentDate) {
      await client.from('followups').insert({
        garage_id: garageId,
        job_id: jobData.id,
        followup_date: expectedPaymentDate,
        notes: paymentNotes,
      });
    }

    const freshJob = await supabaseDb.getServiceJobById(garageId, jobData.id, client);
    return freshJob!;
  },

  updateServiceJob: async (garageId: string, id: string, input: UpdateBillInput, supabase?: any): Promise<ServiceJob> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const { 
      date, labour, notes, paymentStatus, items,
      mechanicId, mechanicName, expectedPaymentDate, followupReminderDate, paymentNotes,
      jobStatus, workRequested, services: inputServices, advances: inputAdvances,
      overallDiscount, previousDueAdded, previousDueBillIds,
      overallDiscountType, overallDiscountValue,
      serviceNotes, showServiceNotes
    } = input;

    let resolvedMechanicId = mechanicId || null;
    if (mechanicName && mechanicName.trim()) {
      const mech = await supabaseDb.createMechanic(garageId, mechanicName, client);
      resolvedMechanicId = mech.id;
    }

    const { error: jobError } = await client
      .from('service_jobs')
      .update({
        date: date,
        labour: Number(labour),
        notes: notes ? notes.trim() : '',
        payment_status: paymentStatus,
        mechanic_id: resolvedMechanicId,
        expected_payment_date: expectedPaymentDate || null,
        followup_reminder_date: followupReminderDate || null,
        payment_notes: paymentNotes || null,
        job_status: jobStatus || 'Waiting',
        work_requested: workRequested || '',
        overall_discount: Number(overallDiscount || 0),
        previous_due_added: Number(previousDueAdded || 0),
        previous_due_bill_ids: previousDueBillIds || [],
        overall_discount_type: overallDiscountType || 'FLAT',
        overall_discount_value: Number(overallDiscountValue || 0),
        service_notes: serviceNotes || '',
        show_service_notes: showServiceNotes !== undefined ? showServiceNotes : true
      })
      .eq('id', id)
      .eq('garage_id', garageId);

    if (jobError) throw jobError;

    await client.from('bill_items').delete().eq('job_id', id);
    await client.from('services').delete().eq('job_id', id);
    await client.from('advances').delete().eq('job_id', id);
    await client.from('followups').delete().eq('job_id', id);

    if (items && items.length > 0) {
      const itemsPayload = items.map((item) => ({
        garage_id: garageId,
        job_id: id,
        name: item.name.trim(),
        price: Number(item.finalPrice || item.unitPrice || 0),
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unitPrice || 0),
        discount_percentage: Number(item.discountPercentage || 0),
        discount_amount: Number(item.discountAmount || 0),
        final_price: Number(item.finalPrice || 0),
        discount_type: item.discountType || 'PERCENT',
        discount_value: Number(item.discountValue || 0)
      }));
      const { error: itemsError } = await client.from('bill_items').insert(itemsPayload);
      if (itemsError) throw itemsError;
    }

    if (inputServices && inputServices.length > 0) {
      const servicesPayload = [];
      for (const s of inputServices) {
        let sMechId = s.mechanicId || null;
        let sWorkType = s.mechanicType || 'Salary';
        if (s.mechanicName && s.mechanicName.trim()) {
          const mech = await supabaseDb.createMechanic(garageId, s.mechanicName, client);
          sMechId = mech.id;
          sWorkType = mech.workType;
        } else if (sMechId) {
          const { data: mech } = await client.from('mechanics').select('work_type').eq('id', sMechId).single();
          if (mech) sWorkType = mech.work_type;
        }

        servicesPayload.push({
          garage_id: garageId,
          job_id: id,
          name: s.name.trim(),
          mechanic_id: sMechId,
          labour_charge: Number(s.labourCharge || 0),
          discount: Number(s.discount || 0),
          final_charge: Number(s.finalCharge || 0),
          mechanic_type: sWorkType,
          commission_rate: Number(s.commissionRate || 0),
          working_time: Number(s.workingTime || 0),
          start_time: s.startTime || null,
          end_time: s.endTime || null,
          discount_type: s.discountType || 'FLAT',
          discount_value: Number(s.discountValue || 0)
        });
      }
      const { error: servicesError } = await client.from('services').insert(servicesPayload);
      if (servicesError) throw servicesError;
    }

    if (inputAdvances && inputAdvances.length > 0) {
      const advancesPayload = inputAdvances
        .filter(adv => adv.amount > 0)
        .map(adv => ({
          garage_id: garageId,
          job_id: id,
          amount: Number(adv.amount),
          payment_mode: adv.paymentMode,
          created_at: date || new Date().toISOString(),
        }));

      if (advancesPayload.length > 0) {
        const { error: advsError } = await client.from('advances').insert(advancesPayload);
        if (advsError) throw advsError;
      }
    }

    if (paymentStatus !== 'PAID' && expectedPaymentDate) {
      await client.from('followups').insert({
        garage_id: garageId,
        job_id: id,
        followup_date: expectedPaymentDate,
        notes: paymentNotes,
      });
    }

    const freshJob = await supabaseDb.getServiceJobById(garageId, id, client);
    return freshJob!;
  },

  generateBillFromJob: async (garageId: string, jobId: string, supabase?: any): Promise<Bill> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');

    const { data: job, error: jobError } = await client
      .from('service_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('garage_id', garageId)
      .single();

    if (jobError) throw jobError;

    const { data: billsCount, error: countError } = await client
      .from('bills')
      .select('invoice_number')
      .eq('garage_id', garageId);

    if (countError) throw countError;

    const lastInvoiceNumber = billsCount.length > 0 
      ? Math.max(...billsCount.map((b: any) => {
          const match = b.invoice_number.match(/GB-(\d+)/);
          return match ? parseInt(match[1]) : 1000;
        }))
      : 1000;
    const invoiceNumber = `GB-${lastInvoiceNumber + 1}`;

    const { data: billData, error: billError } = await client
      .from('bills')
      .insert({
        garage_id: garageId,
        vehicle_id: job.vehicle_id,
        customer_id: job.customer_id,
        invoice_number: invoiceNumber,
        date: new Date().toISOString(),
        labour: Number(job.labour),
        total: Number(job.total),
        notes: job.notes,
        payment_status: job.payment_status,
        mechanic_id: job.mechanic_id,
        received_amount: Number(job.received_amount),
        remaining_amount: Number(job.remaining_amount),
        expected_payment_date: job.expected_payment_date,
        followup_reminder_date: job.followup_reminder_date,
        payment_notes: job.payment_notes,
        job_status: 'Delivered',
        work_requested: job.work_requested,
        job_start_time: job.job_start_time,
        job_end_time: job.job_end_time || new Date().toISOString(),
        total_working_time: Number(job.total_working_time),
        pause_duration: Number(job.pause_duration),
        actual_working_duration: Number(job.actual_working_duration),
        timer_state: 'COMPLETED',
        last_timer_action_at: new Date().toISOString(),
        parts_total: Number(job.parts_total),
        parts_discount: Number(job.parts_discount),
        labour_total: Number(job.labour_total),
        labour_discount: Number(job.labour_discount),
        overall_discount: Number(job.overall_discount),
        advance_received: Number(job.advance_received),
        previous_due_added: Number(job.previous_due_added),
        previous_due_bill_ids: job.previous_due_bill_ids,
        overall_discount_type: job.overall_discount_type,
        overall_discount_value: Number(job.overall_discount_value),
        service_notes: job.service_notes,
        show_service_notes: job.show_service_notes
      })
      .select()
      .single();

    if (billError) throw billError;

    await client.from('bill_items').update({ bill_id: billData.id }).eq('job_id', jobId);
    await client.from('services').update({ bill_id: billData.id }).eq('job_id', jobId);
    await client.from('payments').update({ bill_id: billData.id }).eq('job_id', jobId);
    await client.from('advances').update({ bill_id: billData.id }).eq('job_id', jobId);
    await client.from('job_timers').update({ bill_id: billData.id }).eq('job_id', jobId);
    await client.from('followups').update({ bill_id: billData.id }).eq('job_id', jobId);

    await client.from('service_jobs').delete().eq('id', jobId);

    const freshBill = await supabaseDb.getBillById(garageId, billData.id, client);
    return freshBill!;
  },

  getVehicleSuggestions: async (garageId: string, supabase?: any): Promise<VehicleSuggestion[]> => {
    const client = supabase || supabaseClient;
    if (!client) return [];
    const { data, error } = await client
      .from('vehicle_suggestions')
      .select('*')
      .eq('garage_id', garageId);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((v: any) => ({
      id: v.id,
      brand: v.brand,
      model: v.model
    }));
  },

  getComplaintSuggestions: async (garageId: string, supabase?: any): Promise<ComplaintSuggestion[]> => {
    const client = supabase || supabaseClient;
    if (!client) return [];
    const { data, error } = await client
      .from('complaint_suggestions')
      .select('*')
      .eq('garage_id', garageId);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((c: any) => ({
      id: c.id,
      name: c.name
    }));
  },

  learnVehicleSuggestion: async (garageId: string, brand: string, model: string, supabase?: any): Promise<VehicleSuggestion> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');
    const cleanB = brand.trim();
    const cleanM = model.trim();

    const { data: existing } = await client
      .from('vehicle_suggestions')
      .select('*')
      .eq('garage_id', garageId)
      .eq('brand', cleanB)
      .eq('model', cleanM)
      .maybeSingle();

    if (existing) {
      return { id: existing.id, brand: existing.brand, model: existing.model };
    }

    const { data, error } = await client
      .from('vehicle_suggestions')
      .insert({
        garage_id: garageId,
        brand: cleanB,
        model: cleanM
      })
      .select()
      .single();

    if (error) throw error;
    return { id: data.id, brand: data.brand, model: data.model };
  },

  learnComplaintSuggestion: async (garageId: string, name: string, supabase?: any): Promise<ComplaintSuggestion> => {
    const client = supabase || supabaseClient;
    if (!client) throw new Error('Supabase client not initialized');
    const cleanN = name.trim();

    const { data: existing } = await client
      .from('complaint_suggestions')
      .select('*')
      .eq('garage_id', garageId)
      .eq('name', cleanN)
      .maybeSingle();

    if (existing) {
      return { id: existing.id, name: existing.name };
    }

    const { data, error } = await client
      .from('complaint_suggestions')
      .insert({
        garage_id: garageId,
        name: cleanN
      })
      .select()
      .single();

    if (error) throw error;
    return { id: data.id, name: data.name };
  }
};
