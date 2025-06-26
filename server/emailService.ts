import nodemailer from 'nodemailer';
import { Invoice, Property } from '@shared/schema.js';
import { pdfService } from './pdfService.js';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'fullardpropertymgmt@gmail.com',
        pass: 'cvlw iwfz cghz oqxr'
      }
    });
  }

  async sendInvoice(invoice: Invoice, property: Property, ccEmails: string[] = []): Promise<boolean> {
    try {
      const pdfBuffer = await pdfService.generateInvoicePDF(invoice, property);
      
      if (!property.tenantEmail) {
        throw new Error('Tenant email is required to send invoice');
      }

      const mailOptions = {
        from: 'fullardpropertymgmt@gmail.com',
        to: property.tenantEmail,
        cc: ccEmails.length > 0 ? ccEmails.join(', ') : undefined,
        subject: `Invoice ${invoice.invoiceNumber} - ${property.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">Rental Invoice</h2>
            <p>Dear ${property.tenantName},</p>
            <p>Please find attached your rental invoice for ${property.name}.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">Invoice Details</h3>
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Amount Due:</strong> R ${parseFloat(invoice.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
              <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-ZA')}</p>
            </div>

            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">Payment Information</h3>
              <p>Please see rental agreement for banking details.</p>
              <p><strong>Reference:</strong> ${property.tenantName?.split(' ').pop() || 'RENT'}</p>
            </div>

            <p>Please ensure payment is made by the due date to avoid any late fees.</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            
            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>Newald Fullard Trust</strong><br>
              Tel: 0711426452<br>
              Email: fullardpropertymgmt@gmail.com
            </p>
          </div>
        `,
        attachments: [
          {
            filename: `Invoice_${invoice.invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Invoice ${invoice.invoiceNumber} sent successfully to ${property.tenantEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send invoice email:', error);
      return false;
    }
  }

  async sendNotificationEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: 'fullardpropertymgmt@gmail.com',
        to: to,
        subject: subject,
        html: htmlContent
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Notification email sent successfully to ${to}`);
      return true;
    } catch (error) {
      console.error('Failed to send notification email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();