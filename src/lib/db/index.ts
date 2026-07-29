import { jsonDb } from './jsonDb';
import { supabaseDb, supabaseClient } from './supabase';

const isSupabaseConfigured = (): boolean => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    supabaseClient
  );
};

export const db = {
  isSupabase: (): boolean => {
    return isSupabaseConfigured();
  },

  seedDemoData: async (garageId: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.seedDemoData(garageId, supabase);
    } else {
      return jsonDb.seedDemoData(garageId);
    }
  },

  // Garage Settings
  getGarageSettings: async (garageId: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.getGarageSettings(garageId, supabase);
    } else {
      return jsonDb.getGarageSettings(garageId);
    }
  },

  updateGarageSettings: async (garageId: string, settings: any, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.updateGarageSettings(garageId, settings, supabase);
    } else {
      return jsonDb.updateGarageSettings(garageId, settings);
    }
  },

  // Mechanics
  getMechanics: async (garageId: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.getMechanics(garageId, supabase);
    } else {
      return jsonDb.getMechanics(garageId);
    }
  },

  createMechanic: async (garageId: string, name: string, workType: 'Salary' | 'Independent' = 'Salary', commissionRate: number = 0, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.createMechanic(garageId, name, supabase, workType, commissionRate);
    } else {
      return jsonDb.createMechanic(garageId, name, workType, commissionRate);
    }
  },

  updateMechanic: async (garageId: string, id: string, name: string, workType?: 'Salary' | 'Independent', commissionRate?: number, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.updateMechanic(garageId, id, name, workType, commissionRate, supabase);
    } else {
      return jsonDb.updateMechanic(garageId, id, name, workType, commissionRate);
    }
  },

  deleteMechanic: async (garageId: string, id: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.deleteMechanic(garageId, id, supabase);
    } else {
      return jsonDb.deleteMechanic(garageId, id);
    }
  },

  // Labour Service suggestions
  getServiceSuggestions: async (garageId: string, query?: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.getServiceSuggestions(garageId, query, supabase);
    } else {
      return jsonDb.getServiceSuggestions(garageId, query);
    }
  },

  addServiceSuggestion: async (garageId: string, name: string, charge: number = 0, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.addServiceSuggestion(garageId, name, charge, supabase);
    } else {
      return jsonDb.addServiceSuggestion(garageId, name, charge);
    }
  },

  // Payments
  getPaymentsForBill: async (garageId: string, billId: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.getPaymentsForBill(garageId, billId, supabase);
    } else {
      return jsonDb.getPaymentsForBill(garageId, billId);
    }
  },

  addPayment: async (
    garageId: string, 
    billId: string, 
    paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CREDIT' | 'OTHER', 
    amount: number, 
    notes?: string | null, 
    paymentDate?: string,
    supabase?: any
  ) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.addPayment(garageId, billId, paymentMethod, amount, notes, paymentDate, supabase);
    } else {
      return jsonDb.addPayment(garageId, billId, paymentMethod, amount, notes, paymentDate);
    }
  },

  deletePayment: async (garageId: string, id: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.deletePayment(garageId, id, supabase);
    } else {
      return jsonDb.deletePayment(garageId, id);
    }
  },

  // Job Timers state trigger
  logTimerAction: async (garageId: string, billId: string, action: 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE', supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.logTimerAction(garageId, billId, action, supabase);
    } else {
      return jsonDb.logTimerAction(garageId, billId, action);
    }
  },

  // Manual Imports ledger
  getManualImports: async (garageId: string, query?: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.getManualImports(garageId, query, supabase);
    } else {
      return jsonDb.getManualImports(garageId, query);
    }
  },

  createManualImport: async (garageId: string, input: any, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.createManualImport(garageId, input, supabase);
    } else {
      return jsonDb.createManualImport(garageId, input);
    }
  },

  // Customers
  getCustomers: async (garageId: string, query?: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.getCustomers(garageId, query, supabase);
    } else {
      return jsonDb.getCustomers(garageId, query);
    }
  },

  getCustomerById: async (garageId: string, id: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.getCustomerById(garageId, id, supabase);
    } else {
      return jsonDb.getCustomerById(garageId, id);
    }
  },

  getCustomerByPhone: async (garageId: string, phone: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.getCustomerByPhone(garageId, phone, supabase);
    } else {
      return jsonDb.getCustomerByPhone(garageId, phone);
    }
  },

  getCustomerOutstandingDues: async (garageId: string, phone: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.getCustomerOutstandingDues(garageId, phone, supabase);
    } else {
      return jsonDb.getCustomerOutstandingDues(garageId, phone);
    }
  },

  createCustomer: async (garageId: string, name: string, phone: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.createCustomer(garageId, name, phone, supabase);
    } else {
      return jsonDb.createCustomer(garageId, name, phone);
    }
  },

  // Vehicles
  getVehiclesByCustomerId: async (garageId: string, customerId: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.getVehiclesByCustomerId(garageId, customerId, supabase);
    } else {
      return jsonDb.getVehiclesByCustomerId(garageId, customerId);
    }
  },

  getVehicleById: async (garageId: string, id: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.getVehicleById(garageId, id, supabase);
    } else {
      return jsonDb.getVehicleById(garageId, id);
    }
  },

  createVehicle: async (garageId: string, customerId: string, vehicleNumber: string, brand: string, model: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.createVehicle(garageId, customerId, vehicleNumber, brand, model, supabase);
    } else {
      return jsonDb.createVehicle(garageId, customerId, vehicleNumber, brand, model);
    }
  },

  // Part Suggestions
  getPartSuggestions: async (garageId: string, query?: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.getPartSuggestions(garageId, query, supabase);
    } else {
      return jsonDb.getPartSuggestions(garageId, query);
    }
  },

  addPartSuggestion: async (garageId: string, name: string, price: number | null = null, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.addPartSuggestion(garageId, name, price, supabase);
    } else {
      return jsonDb.addPartSuggestion(garageId, name, price);
    }
  },

  // Bills
  getBillsByVehicleId: async (garageId: string, vehicleId: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.getBillsByVehicleId(garageId, vehicleId, supabase);
    } else {
      return jsonDb.getBillsByVehicleId(garageId, vehicleId);
    }
  },

  getBillById: async (garageId: string, id: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.getBillById(garageId, id, supabase);
    } else {
      return jsonDb.getBillById(garageId, id);
    }
  },

  getRecentBills: async (garageId: string, limit: number = 20, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.getRecentBills(garageId, limit, supabase);
    } else {
      return jsonDb.getRecentBills(garageId, limit);
    }
  },

  createBill: async (garageId: string, input: any, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.createBill(garageId, input, supabase);
    } else {
      return jsonDb.createBill(garageId, input);
    }
  },

  updateBill: async (garageId: string, id: string, input: any, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.updateBill(garageId, id, input, supabase);
    } else {
      return jsonDb.updateBill(garageId, id, input);
    }
  },

  searchUniversal: async (garageId: string, query: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.searchUniversal(garageId, query, supabase);
    } else {
      return jsonDb.searchUniversal(garageId, query);
    }
  },

  updatePartSuggestion: async (garageId: string, id: string, name: string, price: number | null, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.updatePartSuggestion(garageId, id, name, price, supabase);
    } else {
      return jsonDb.updatePartSuggestion(garageId, id, name, price);
    }
  },

  deletePartSuggestion: async (garageId: string, id: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.deletePartSuggestion(garageId, id, supabase);
    } else {
      return jsonDb.deletePartSuggestion(garageId, id);
    }
  },

  updateServiceSuggestion: async (garageId: string, id: string, name: string, charge: number, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.updateServiceSuggestion(garageId, id, name, charge, supabase);
    } else {
      return jsonDb.updateServiceSuggestion(garageId, id, name, charge);
    }
  },

  deleteServiceSuggestion: async (garageId: string, id: string, supabase?: any) => {
    if (isSupabaseConfigured()) {
      return supabaseDb.deleteServiceSuggestion(garageId, id, supabase);
    } else {
      return jsonDb.deleteServiceSuggestion(garageId, id);
    }
  }
};

export type { GarageSettings, Customer, Vehicle, Bill, BillItem, PartSuggestion, CreateBillInput, UpdateBillInput, Mechanic, Payment, Service, ServiceSuggestion, Advance, JobTimer, Followup, ManualImport } from './types';
