import { 
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
import { type IStorage } from "./storage";

export class MemoryStorage implements IStorage {
  private properties: Property[] = [];
  private notifications: Notification[] = [];
  private invoices: Invoice[] = [];
  private users: User[] = [
    {
      id: 1,
      username: "admin",
      password: "admin1234",
      createdAt: new Date()
    }
  ];
  private companySettings: CompanySettings = {
    id: 1,
    companyName: "NEWALD FULLARD TRUST",
    registrationNumber: "IT3469/1996",
    vatNumber: "4820187534",
    addressLine1: "P.O. Box 3016",
    addressLine2: "Paarl, 7646",
    contactPerson: "Newald Fullard",
    phone: "0711426452",
    email: "fullardpropertymgmt@gmail.com",
    vatRate: "15.00",
    notifyLeaseExpiry: true,
    notifyInvoiceGeneration: true,
    notificationEmail: "fullardpropertymgmt@gmail.com",
    updatedAt: new Date()
  };
  
  private nextPropertyId = 1;
  private nextNotificationId = 1;
  private nextInvoiceId = 1;

  // Property operations
  async getProperties(): Promise<Property[]> {
    return [...this.properties];
  }

  async getProperty(id: number): Promise<Property | undefined> {
    return this.properties.find(p => p.id === id);
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const newProperty: Property = {
      ...property,
      id: this.nextPropertyId++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.properties.push(newProperty);
    return newProperty;
  }

  async updateProperty(id: number, updates: Partial<InsertProperty>): Promise<Property | undefined> {
    const index = this.properties.findIndex(p => p.id === id);
    if (index === -1) return undefined;
    
    this.properties[index] = {
      ...this.properties[index],
      ...updates,
      updatedAt: new Date()
    };
    return this.properties[index];
  }

  async deleteProperty(id: number): Promise<boolean> {
    const index = this.properties.findIndex(p => p.id === id);
    if (index === -1) return false;
    
    this.properties.splice(index, 1);
    // Also remove related notifications and invoices
    this.notifications = this.notifications.filter(n => n.propertyId !== id);
    this.invoices = this.invoices.filter(i => i.propertyId !== id);
    return true;
  }

  // Notification operations
  async getNotifications(): Promise<Notification[]> {
    return [...this.notifications];
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const newNotification: Notification = {
      ...notification,
      id: this.nextNotificationId++,
      createdAt: new Date()
    };
    this.notifications.push(newNotification);
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const notification = this.notifications.find(n => n.id === id);
    if (!notification) return false;
    
    notification.isRead = true;
    return true;
  }

  async clearAllNotifications(): Promise<boolean> {
    this.notifications = [];
    return true;
  }

  // Invoice operations
  async getInvoices(): Promise<Invoice[]> {
    return [...this.invoices];
  }

  async getInvoicesByProperty(propertyId: number): Promise<Invoice[]> {
    return this.invoices.filter(i => i.propertyId === propertyId);
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    return this.invoices.find(i => i.id === id);
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const newInvoice: Invoice = {
      ...invoice,
      id: this.nextInvoiceId++,
      createdAt: new Date()
    };
    this.invoices.push(newInvoice);
    return newInvoice;
  }

  async updateInvoice(id: number, updates: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const index = this.invoices.findIndex(i => i.id === id);
    if (index === -1) return undefined;
    
    this.invoices[index] = {
      ...this.invoices[index],
      ...updates
    };
    return this.invoices[index];
  }

  async updateInvoiceStatus(id: number, status: string): Promise<Invoice | undefined> {
    return this.updateInvoice(id, { status });
  }

  async deleteInvoice(id: number): Promise<boolean> {
    const index = this.invoices.findIndex(i => i.id === id);
    if (index === -1) return false;
    
    this.invoices.splice(index, 1);
    return true;
  }

  // Company settings operations
  async getCompanySettings(): Promise<CompanySettings | undefined> {
    return { ...this.companySettings };
  }

  async updateCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings> {
    this.companySettings = {
      ...this.companySettings,
      ...settings,
      updatedAt: new Date()
    };
    return { ...this.companySettings };
  }

  // Authentication operations
  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(u => u.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      ...user,
      id: this.users.length + 1,
      createdAt: new Date()
    };
    this.users.push(newUser);
    return newUser;
  }
}