import { createClient } from '@supabase/supabase-js';

// Variables d'environnement Supabase (à configurer dans Replit Secrets)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être configurés');
}

// Client Supabase pour le frontend
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});

// Types TypeScript pour la base Supabase
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          subscription_plan: 'free' | 'starter' | 'pro';
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          downloads_used_this_month: number;
          downloads_quota: number; // -1 = illimité
          quota_reset_date: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_plan?: 'free' | 'starter' | 'pro';
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          downloads_used_this_month?: number;
          downloads_quota?: number;
          quota_reset_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_plan?: 'free' | 'starter' | 'pro';
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          downloads_used_this_month?: number;
          downloads_quota?: number;
          quota_reset_date?: string;
          created_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          user_id: string;
          pdf_url: string;
          ubl_file_url: string | null;
          status: 'pending' | 'analyzed' | 'ready' | 'error';
          score: number | null;
          extracted_data: Record<string, any> | null;
          errors: Record<string, any> | null;
          downloaded: boolean;
          downloaded_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pdf_url: string;
          ubl_file_url?: string | null;
          status?: 'pending' | 'analyzed' | 'ready' | 'error';
          score?: number | null;
          extracted_data?: Record<string, any> | null;
          errors?: Record<string, any> | null;
          downloaded?: boolean;
          downloaded_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          pdf_url?: string;
          ubl_file_url?: string | null;
          status?: 'pending' | 'analyzed' | 'ready' | 'error';
          score?: number | null;
          extracted_data?: Record<string, any> | null;
          errors?: Record<string, any> | null;
          downloaded?: boolean;
          downloaded_at?: string | null;
          created_at?: string;
        };
      };
      downloads_log: {
        Row: {
          id: string;
          user_id: string;
          invoice_id: string;
          plan_at_download: string;
          downloaded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          invoice_id: string;
          plan_at_download: string;
          downloaded_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          invoice_id?: string;
          plan_at_download?: string;
          downloaded_at?: string;
        };
      };
    };
  };
};
