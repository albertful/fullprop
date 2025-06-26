import { storage } from './storage.js';
import { notificationService } from './notificationService.js';
import { emailService } from './emailService.js';
import { InsertInvoice } from '@shared/schema.js';
import cron from 'node-cron';

export class InvoiceService {
  constructor() {
    this.initializeCronJobs();
  }

  private initializeCronJobs() {
    // Generate monthly invoices on the 1st of each month at 9 AM
    cron.schedule('0 9 1 * *', async () => {
      console.log('Starting monthly invoice generation...');
      await this.generateMonthlyInvoices();
    });
    
    // Check for lease expiry notifications daily at 10:00 AM
    cron.schedule('0 10 * * *', async () => {
      console.log('Checking lease expiry notifications...');
      await notificationService.checkAndSendLeaseExpiryNotifications();
    });
    
    console.log('Invoice and notification cron jobs initialized');
  }

  async generateMonthlyInvoices() {
    try {
      const properties = await storage.getProperties();
      const occupiedProperties = properties.filter(p => 
        p.tenantName && 
        p.tenantName.trim() !== '' && 
        p.leaseStartDate && 
        p.leaseEndDate &&
        new Date(p.leaseEndDate) > new Date()
      );

      console.log(`Generating invoices for ${occupiedProperties.length} occupied properties`);

      let invoicesCreated = 0;
      const createdInvoices = [];

      for (const property of occupiedProperties) {
        const invoice = await this.createInvoiceForProperty(property);
        if (invoice) {
          invoicesCreated++;
          createdInvoices.push({
            property: property.name,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.amount,
            tenant: property.tenantName
          });
        }
      }

      // Send one summary email if invoices were created
      if (invoicesCreated > 0) {
        await this.sendInvoiceCreationSummary(invoicesCreated, createdInvoices);
      }

      console.log(`Monthly invoice generation completed - ${invoicesCreated} invoices created`);
    } catch (error) {
      console.error('Error generating monthly invoices:', error);
    }
  }

  async createInvoiceForProperty(property: any) {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Invoice for current month
    const invoiceDate = new Date(currentYear, currentMonth, 1);
    const dueDate = new Date(currentYear, currentMonth, 7);
    
    // Check if invoice already exists for this month
    const existingInvoices = await storage.getInvoicesByProperty(property.id);
    const monthInvoiceExists = existingInvoices.some(invoice => {
      const invDate = new Date(invoice.invoiceDate);
      return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
    });

    if (monthInvoiceExists) {
      console.log(`Invoice already exists for property ${property.id} for current month`);
      return;
    }

    const invoiceNumber = `INV-${currentYear}${(currentMonth + 1).toString().padStart(2, '0')}-${property.id.toString().padStart(3, '0')}`;
    
    const rentPeriodEndDate = new Date(currentYear, currentMonth + 1, 0);
    
    const newInvoice: InsertInvoice = {
      propertyId: property.id,
      invoiceNumber,
      amount: property.rentIncludingVat?.toString() || property.rentExcludingVat?.toString() || '0',
      invoiceDate: invoiceDate,
      dueDate: dueDate,
      status: 'draft',
      description: `Rental for ${property.propertyType} - ${invoiceDate.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}`,
      ccEmails: property.ccEmails || [],
      rentPeriodStart: invoiceDate,
      rentPeriodEnd: rentPeriodEndDate
    };

    console.log('Creating invoice with data:', {
      ...newInvoice,
      invoiceDate: newInvoice.invoiceDate?.toISOString(),
      dueDate: newInvoice.dueDate?.toISOString(),
    });

    const createdInvoice = await storage.createInvoice(newInvoice);
    console.log(`Created invoice ${invoiceNumber} for property ${property.id}`);
    
    // Don't send individual notification emails - will send summary instead
    return createdInvoice;
  }

  async sendInvoiceCreationSummary(invoicesCreated: number, createdInvoices: any[]) {
    try {
      const companySettings = await storage.getCompanySettings();
      
      // Check if invoice generation notifications are enabled
      if (!companySettings?.notifyInvoiceGeneration) {
        console.log('Invoice generation notifications are disabled');
        return false;
      }

      const notificationEmail = companySettings.notificationEmail || 'fullardpropertymgmt@gmail.com';
      const currentDate = new Date();
      const monthName = currentDate.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
      
      const subject = `Monthly Invoices Created - ${monthName}`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Invoices Created - Ready to be Mailed to Tenants</h2>
          
          <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-size: 16px;"><strong>${invoicesCreated} invoices</strong> have been automatically generated for ${monthName}.</p>
            <p style="margin: 0; color: #065f46;">All invoices are ready to be reviewed and sent to tenants.</p>
          </div>
          
          <h3 style="color: #374151;">Invoice Summary:</h3>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
            ${createdInvoices.map(inv => `
              <div style="border-bottom: 1px solid #e5e7eb; padding: 10px 0;">
                <strong>${inv.property}</strong> - ${inv.tenant}<br>
                <span style="color: #6b7280; font-size: 14px;">Invoice: ${inv.invoiceNumber} | Amount: R${parseFloat(inv.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
            `).join('')}
          </div>
          
          <p style="margin-top: 20px;">You can now review and send these invoices to your tenants through the Invoices page in your property management system.</p>
          
          <hr style="margin: 30px 0; border: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">
            This notification was sent from your Fullard Property Management System.<br>
            To disable these notifications, go to Settings > Email Notification Settings.
          </p>
        </div>
      `;

      const success = await emailService.sendNotificationEmail(
        notificationEmail,
        subject,
        htmlContent
      );

      if (success) {
        console.log('Invoice creation summary email sent successfully');
      }

      return success;
    } catch (error) {
      console.error('Error sending invoice creation summary:', error);
      return false;
    }
  }

  async manualGenerateInvoice(propertyId: number) {
    const property = await storage.getProperty(propertyId);
    if (!property) {
      throw new Error('Property not found');
    }
    
    // Manual generation bypasses duplicate checks
    await this.createManualInvoiceForProperty(property);
    return true;
  }

  async createManualInvoiceForProperty(property: any) {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Invoice for current month
    const invoiceDate = new Date(currentYear, currentMonth, 1);
    const dueDate = new Date(currentYear, currentMonth, 7);
    
    // Generate unique invoice number with timestamp for manual invoices
    const timestamp = Date.now().toString().slice(-4);
    const invoiceNumber = `INV-${currentYear}${(currentMonth + 1).toString().padStart(2, '0')}-${property.id.toString().padStart(3, '0')}-${timestamp}`;
    
    const rentPeriodEndDate = new Date(currentYear, currentMonth + 1, 0);
    
    const newInvoice: InsertInvoice = {
      propertyId: property.id,
      invoiceNumber,
      amount: property.rentIncludingVat?.toString() || property.rentExcludingVat?.toString() || '0',
      invoiceDate: invoiceDate,
      dueDate: dueDate,
      status: 'draft',
      description: `Rental for ${property.propertyType} - ${invoiceDate.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}`,
      ccEmails: property.ccEmails || [],
      rentPeriodStart: invoiceDate,
      rentPeriodEnd: rentPeriodEndDate
    };

    console.log('Creating manual invoice with data:', {
      ...newInvoice,
      invoiceDate: newInvoice.invoiceDate.toISOString(),
      dueDate: newInvoice.dueDate.toISOString(),
      rentPeriodStart: newInvoice.rentPeriodStart.toISOString(),
      rentPeriodEnd: newInvoice.rentPeriodEnd.toISOString()
    });

    try {
      await storage.createInvoice(newInvoice);
      console.log(`Manual invoice ${invoiceNumber} created successfully for property ${property.id}`);
      
      // Send notification email if enabled
      await notificationService.sendInvoiceGenerationNotification(property, invoiceNumber);
    } catch (error) {
      console.error('Error creating manual invoice:', error);
      throw error;
    }
  }
}

export const invoiceService = new InvoiceService();