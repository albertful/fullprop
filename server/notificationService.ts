import { emailService } from './emailService.js';
import { storage } from './storage.js';
import type { Property } from '@shared/schema.js';

export class NotificationService {
  async sendLeaseExpiryNotification(property: Property, daysUntilExpiry: number): Promise<boolean> {
    try {
      const companySettings = await storage.getCompanySettings();
      
      // Check if lease expiry notifications are enabled
      if (!companySettings?.notifyLeaseExpiry) {
        console.log('Lease expiry notifications are disabled');
        return false;
      }

      const notificationEmail = companySettings.notificationEmail || 'fullardpropertymgmt@gmail.com';
      
      const subject = `Lease Expiry Alert - ${property.name}`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Lease Expiry Alert</h2>
          
          <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #991b1b;">Property: ${property.name}</h3>
            <p style="margin: 5px 0;"><strong>Address:</strong> ${property.address}</p>
            <p style="margin: 5px 0;"><strong>Tenant:</strong> ${property.tenantName || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Days until expiry:</strong> ${daysUntilExpiry} days</p>
            <p style="margin: 5px 0;"><strong>Lease end date:</strong> ${property.leaseEndDate ? new Date(property.leaseEndDate).toLocaleDateString() : 'N/A'}</p>
          </div>
          
          <p>This lease will expire in ${daysUntilExpiry} days. Please take appropriate action to renew or handle the property transition.</p>
          
          <hr style="margin: 30px 0; border: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">
            This notification was sent from your Fullard Property Management System.<br>
            To disable these notifications, go to Settings > Email Notification Settings.
          </p>
        </div>
      `;

      return await emailService.sendNotificationEmail(
        notificationEmail,
        subject,
        htmlContent
      );
    } catch (error) {
      console.error('Error sending lease expiry notification:', error);
      return false;
    }
  }

  async sendInvoiceGenerationNotification(property: Property, invoiceNumber: string): Promise<boolean> {
    try {
      const companySettings = await storage.getCompanySettings();
      
      // Check if invoice generation notifications are enabled
      if (!companySettings?.notifyInvoiceGeneration) {
        console.log('Invoice generation notifications are disabled');
        return false;
      }

      const notificationEmail = companySettings.notificationEmail || 'fullardpropertymgmt@gmail.com';
      
      const subject = `Invoice Generated - ${invoiceNumber}`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Invoice Generated Successfully</h2>
          
          <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #047857;">Invoice: ${invoiceNumber}</h3>
            <p style="margin: 5px 0;"><strong>Property:</strong> ${property.name}</p>
            <p style="margin: 5px 0;"><strong>Address:</strong> ${property.address}</p>
            <p style="margin: 5px 0;"><strong>Tenant:</strong> ${property.tenantName || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Amount:</strong> R${parseFloat(property.rentIncludingVat || property.rentExcludingVat || '0').toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
            <p style="margin: 5px 0;"><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <p>A new invoice has been automatically generated for this property. The invoice is saved as a draft and can be reviewed and sent from the Invoices section.</p>
          
          <hr style="margin: 30px 0; border: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">
            This notification was sent from your Fullard Property Management System.<br>
            To disable these notifications, go to Settings > Email Notification Settings.
          </p>
        </div>
      `;

      return await emailService.sendNotificationEmail(
        notificationEmail,
        subject,
        htmlContent
      );
    } catch (error) {
      console.error('Error sending invoice generation notification:', error);
      return false;
    }
  }

  async checkAndSendLeaseExpiryNotifications(): Promise<void> {
    try {
      const properties = await storage.getProperties();
      const currentDate = new Date();
      
      for (const property of properties) {
        if (property.isOccupied && property.leaseEndDate) {
          const leaseEndDate = new Date(property.leaseEndDate);
          const timeDiff = leaseEndDate.getTime() - currentDate.getTime();
          const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          // Send notifications for properties expiring in 30 days or 7 days
          if (daysUntilExpiry === 30 || daysUntilExpiry === 7 || daysUntilExpiry === 1) {
            console.log(`Sending lease expiry notification for property ${property.name} (${daysUntilExpiry} days)`);
            await this.sendLeaseExpiryNotification(property, daysUntilExpiry);
          }
        }
      }
    } catch (error) {
      console.error('Error checking lease expiry notifications:', error);
    }
  }
}

export const notificationService = new NotificationService();