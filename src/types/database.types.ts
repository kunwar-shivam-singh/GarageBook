export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      garage: {
        Row: {
          id: string;
          name: string;
          logo: string;
          owner_name: string;
          phone: string;
          address: string;
          footer_message: string;
          gst_number: string | null;
          owner_id: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          logo?: string;
          owner_name?: string;
          phone?: string;
          address?: string;
          footer_message?: string;
          gst_number?: string | null;
          owner_id: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          logo?: string;
          owner_name?: string;
          phone?: string;
          address?: string;
          footer_message?: string;
          gst_number?: string | null;
          owner_id?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          garage_id: string;
          name: string;
          phone: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          garage_id: string;
          name: string;
          phone: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          garage_id?: string;
          name?: string;
          phone?: string;
          created_at?: string;
        };
      };
      vehicles: {
        Row: {
          id: string;
          garage_id: string;
          customer_id: string;
          vehicle_number: string;
          brand: string;
          model: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          garage_id: string;
          customer_id: string;
          vehicle_number: string;
          brand: string;
          model: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          garage_id?: string;
          customer_id?: string;
          vehicle_number?: string;
          brand?: string;
          model?: string;
          created_at?: string;
        };
      };
      bills: {
        Row: {
          id: string;
          garage_id: string;
          vehicle_id: string;
          customer_id: string;
          invoice_number: string;
          date: string;
          labour: number;
          total: number;
          notes: string;
          payment_status: 'PAID' | 'PENDING';
          created_at: string;
        };
        Insert: {
          id?: string;
          garage_id: string;
          vehicle_id: string;
          customer_id: string;
          invoice_number: string;
          date: string;
          labour?: number;
          total: number;
          notes?: string;
          payment_status?: 'PAID' | 'PENDING';
          created_at?: string;
        };
        Update: {
          id?: string;
          garage_id?: string;
          vehicle_id?: string;
          customer_id?: string;
          invoice_number?: string;
          date?: string;
          labour?: number;
          total?: number;
          notes?: string;
          payment_status?: 'PAID' | 'PENDING';
          created_at?: string;
        };
      };
      bill_items: {
        Row: {
          id: string;
          garage_id: string;
          bill_id: string;
          name: string;
          price: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          garage_id: string;
          bill_id: string;
          name: string;
          price?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          garage_id?: string;
          bill_id?: string;
          name?: string;
          price?: number | null;
          created_at?: string;
        };
      };
      part_suggestions: {
        Row: {
          id: string;
          garage_id: string;
          name: string;
          price: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          garage_id: string;
          name: string;
          price?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          garage_id?: string;
          name?: string;
          price?: number | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
