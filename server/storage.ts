import { 
  properties, 
  notifications, 
  invoices,
  companySettings,
  users,
  type Property, 
  type InsertProperty,
  type Notification,
  type InsertNotification,
  type Invoice,
  type InsertInvoice,
  type CompanySettings,
  type InsertCompanySettings,
  type User,
  type InsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Property operations
  getProperties(): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: number): Promise<boolean>;
  
  // Notification operations
  getNotifications(): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<boolean>;
  clearAllNotifications(): Promise<boolean>;
  
  // Invoice operations
  getInvoices(): Promise<Invoice[]>;
  getInvoicesByProperty(propertyId: number): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, updates: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  updateInvoiceStatus(id: number, status: string): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;
  
  // Company settings operations
  getCompanySettings(): Promise<CompanySettings | undefined>;
  updateCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings>;
  
  // Authentication operations
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  async getProperties(): Promise<Property[]> {
    return await db.select().from(properties);
  }

  async getProperty(id: number): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property || undefined;
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const [property] = await db
      .insert(properties)
      .values({
        name: insertProperty.name,
        address: insertProperty.address,
        propertyType: insertProperty.propertyType || "apartment",
        rentExcludingVat: insertProperty.rentExcludingVat,
        rentIncludingVat: insertProperty.rentIncludingVat,
        tenantName: insertProperty.tenantName || null,
        tenantPhone: insertProperty.tenantPhone || null,
        tenantEmail: insertProperty.tenantEmail || null,
        isOccupied: insertProperty.isOccupied || false,
        rentalAgreementPath: insertProperty.rentalAgreementPath || null,
        agreementTemplatePath: insertProperty.agreementTemplatePath || null,
        leaseStartDate: insertProperty.leaseStartDate && insertProperty.leaseStartDate !== "" ? new Date(insertProperty.leaseStartDate) : null,
        leaseEndDate: insertProperty.leaseEndDate && insertProperty.leaseEndDate !== "" ? new Date(insertProperty.leaseEndDate) : null,
      })
      .returning();
    return property;
  }

  async updateProperty(id: number, updateData: Partial<InsertProperty>): Promise<Property | undefined> {
    const updateValues: any = { ...updateData };
    
    if (updateData.leaseStartDate !== undefined) {
      updateValues.leaseStartDate = updateData.leaseStartDate && updateData.leaseStartDate !== "" 
        ? new Date(updateData.leaseStartDate) : null;
    }
    
    if (updateData.leaseEndDate !== undefined) {
      updateValues.leaseEndDate = updateData.leaseEndDate && updateData.leaseEndDate !== ""
        ? new Date(updateData.leaseEndDate) : null;
    }

    const [property] = await db
      .update(properties)
      .set(updateValues)
      .where(eq(properties.id, id))
      .returning();
    
    return property || undefined;
  }

  async deleteProperty(id: number): Promise<boolean> {
    try {
      // First check if property exists
      const property = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
      if (property.length === 0) {
        return false;
      }

      // Delete related invoices first
      await db.delete(invoices).where(eq(invoices.propertyId, id));
      
      // Delete related notifications
      await db.delete(notifications).where(eq(notifications.propertyId, id));
      
      // Finally delete the property
      const result = await db.delete(properties).where(eq(properties.id, id));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error("Error deleting property:", error);
      return false;
    }
  }

  async getNotifications(): Promise<Notification[]> {
    return await db.select().from(notifications).orderBy(notifications.createdAt);
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values({
        propertyId: insertNotification.propertyId,
        type: insertNotification.type,
        message: insertNotification.message,
        isRead: insertNotification.isRead || false,
      })
      .returning();
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
    return (result.rowCount || 0) > 0;
  }

  async clearAllNotifications(): Promise<boolean> {
    const result = await db.delete(notifications);
    return (result.rowCount || 0) > 0;
  }

  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(invoices.createdAt);
  }

  async getInvoicesByProperty(propertyId: number): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.propertyId, propertyId))
      .orderBy(invoices.createdAt);
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db
      .insert(invoices)
      .values({
        propertyId: insertInvoice.propertyId,
        invoiceNumber: insertInvoice.invoiceNumber,
        amount: insertInvoice.amount,
        invoiceDate: insertInvoice.invoiceDate,
        rentPeriodStart: insertInvoice.rentPeriodStart,
        rentPeriodEnd: insertInvoice.rentPeriodEnd,
        dueDate: insertInvoice.dueDate,
        sentDate: insertInvoice.sentDate || null,
        ccEmails: insertInvoice.ccEmails || [],
        status: insertInvoice.status || "draft",
        description: insertInvoice.description || null,
        isNew: insertInvoice.isNew !== undefined ? insertInvoice.isNew : true,
      })
      .returning();
    return invoice;
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async updateInvoice(id: number, updates: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [invoice] = await db
      .update(invoices)
      .set(updates)
      .where(eq(invoices.id, id))
      .returning();
    return invoice || undefined;
  }

  async updateInvoiceStatus(id: number, status: string): Promise<Invoice | undefined> {
    const [invoice] = await db
      .update(invoices)
      .set({ status })
      .where(eq(invoices.id, id))
      .returning();
    return invoice || undefined;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    const result = await db
      .delete(invoices)
      .where(eq(invoices.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getCompanySettings(): Promise<CompanySettings | undefined> {
    const [settings] = await db.select().from(companySettings).limit(1);
    return settings || undefined;
  }

  async updateCompanySettings(settingsData: InsertCompanySettings): Promise<CompanySettings> {
    // Check if settings exist
    const existing = await this.getCompanySettings();
    
    if (existing) {
      // Update existing settings
      const [updated] = await db
        .update(companySettings)
        .set({
          ...settingsData,
          updatedAt: new Date(),
        })
        .where(eq(companySettings.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new settings
      const [created] = await db
        .insert(companySettings)
        .values(settingsData)
        .returning();
      return created;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
}

// Use database storage for production deployment
export const storage = new DatabaseStorage();
