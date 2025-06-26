import { pgTable, text, serial, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  propertyType: text("property_type").notNull().default("apartment"),
  rentExcludingVat: decimal("rent_excluding_vat", { precision: 10, scale: 2 }).notNull(),
  rentIncludingVat: decimal("rent_including_vat", { precision: 10, scale: 2 }).notNull(),
  isVatExempt: boolean("is_vat_exempt").notNull().default(false),
  tenantName: text("tenant_name"),
  tenantPhone: text("tenant_phone"),
  tenantEmail: text("tenant_email"),
  leaseStartDate: timestamp("lease_start_date"),
  leaseEndDate: timestamp("lease_end_date"),
  isOccupied: boolean("is_occupied").notNull().default(false),
  rentalAgreementPath: text("rental_agreement_path"),
  agreementTemplatePath: text("agreement_template_path"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  type: text("type").notNull(), // 'lease_expiry', 'invoice_sent', etc.
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  amount: text("amount").notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  rentPeriodStart: timestamp("rent_period_start").notNull(),
  rentPeriodEnd: timestamp("rent_period_end").notNull(),
  dueDate: timestamp("due_date").notNull(),
  sentDate: timestamp("sent_date"),
  ccEmails: text("cc_emails").array().default([]),
  status: text("status").notNull().default("draft"), // 'draft', 'sent', 'paid'
  description: text("description"),
  isNew: boolean("is_new").notNull().default(true), // For showing "New invoice" badge
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull().default("NEWALD FULLARD TRUST"),
  registrationNumber: text("registration_number").notNull().default("IT3469/1996"),
  vatNumber: text("vat_number").notNull().default("4820187534"),
  addressLine1: text("address_line1").notNull().default("P.O. Box 3016"),
  addressLine2: text("address_line2").notNull().default("Paarl, 7646"),
  contactPerson: text("contact_person").notNull().default("Newald Fullard"),
  phone: text("phone").notNull().default("0711426452"),
  email: text("email").notNull().default("fullardpropertymgmt@gmail.com"),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).notNull().default("15.00"),
  notifyLeaseExpiry: boolean("notify_lease_expiry").notNull().default(true),
  notifyInvoiceGeneration: boolean("notify_invoice_generation").notNull().default(true),
  notificationEmail: text("notification_email").notNull().default("fullardpropertymgmt@gmail.com"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  rentExcludingVat: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Monthly rent must be a positive number",
  }),
  rentIncludingVat: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Monthly rent must be a positive number",
  }),
  tenantEmail: z.string().email().optional().or(z.literal("")),
  leaseStartDate: z.string().optional(),
  leaseEndDate: z.string().optional(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({
  id: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type CompanySettings = typeof companySettings.$inferSelect;
export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginData = z.infer<typeof loginSchema>;
