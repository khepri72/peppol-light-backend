import { z } from "zod";

// User Schema
export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  companyName: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
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
  password: string;
  companyName?: string;
  createdAt: string;
}

// Invoice Schema
export const insertInvoiceSchema = z.object({
  invoiceNumber: z.string(),
  clientName: z.string(),
  clientEmail: z.string().email(),
  amount: z.number().positive(),
  currency: z.string().default("EUR"),
  status: z.enum(["draft", "sent", "paid", "overdue"]).default("draft"),
  dueDate: z.string(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
  })),
  notes: z.string().optional(),
  pdfUrl: z.string().optional(),
});

export const updateInvoiceSchema = insertInvoiceSchema.partial();

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type UpdateInvoice = z.infer<typeof updateInvoiceSchema>;

export interface Invoice {
  id: string;
  userId: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue";
  dueDate: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  notes?: string;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}
