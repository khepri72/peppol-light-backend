import { z } from "zod";

// User Schema
export const insertUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  companyName: z.string().min(1, "Company name is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const updateUserProfileSchema = z.object({
  email: z.string().email().optional(),
  companyName: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;

export interface User {
  id: string;
  email: string;
  password?: string; // Optional for Google users
  companyName?: string;
  googleId?: string;
  plan?: 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';
  quotaUsed?: number;
  quotaLimit?: number;
  quotaResetDate?: string;
  picture?: string;
  createdAt: string;
}

export const invoiceTemplateSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  companyLogo: z.string().url().optional(),
  companyAddress: z.string().optional(),
  companyPhone: z.string().optional(),
  footerText: z.string().optional(),
});

export type InvoiceTemplate = z.infer<typeof invoiceTemplateSchema>;

export interface UserSettings {
  id: string;
  userId: string;
  primaryColor?: string;
  companyLogo?: string;
  companyAddress?: string;
  companyPhone?: string;
  footerText?: string;
  createdAt: string;
  updatedAt: string;
}

// Invoice Schema for Peppol Verification
export const insertInvoiceSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().url("Invalid URL format"),
  status: z.enum(["uploaded", "checked", "converted", "sent"]).optional().default("uploaded"),
  conformityScore: z.number().min(0).max(100).optional(),
  errorsList: z.string().optional(),
});

export const updateInvoiceSchema = insertInvoiceSchema.partial();

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type UpdateInvoice = z.infer<typeof updateInvoiceSchema>;

export interface Invoice {
  id: string;
  userId?: string;
  fileName: string;
  fileUrl?: string;
  status?: "uploaded" | "checked" | "converted" | "sent";
  conformityScore?: number;
  errorsList?: string;
  createdAt?: string;
}
