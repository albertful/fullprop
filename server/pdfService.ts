import { jsPDF } from 'jspdf';
import { Invoice, Property } from '@shared/schema.js';
import { storage } from './storage.js';

export class PDFService {
  async generateInvoicePDF(invoice: Invoice, property: Property): Promise<Buffer> {
    try {
      console.log('Generating PDF with updated service - should show smaller title and simplified payment info');
      const doc = new jsPDF();
      
      // Get company settings from database
      const companySettings = await storage.getCompanySettings();
      
      // Company header - use database values or fallback to defaults
      const companyName = companySettings?.companyName || 'NEWALD FULLARD TRUST';
      const registrationNumber = companySettings?.registrationNumber || 'IT3469/1996';
      const vatNumber = companySettings?.vatNumber || '4820187534';
      const addressLine1 = companySettings?.addressLine1 || 'P.O. Box 3016';
      const addressLine2 = companySettings?.addressLine2 || 'Paarl, 7646';
      const contactPerson = companySettings?.contactPerson || 'Newald Fullard';
      const phone = companySettings?.phone || '0711426452';
      const email = companySettings?.email || 'fullardpropertymgmt@gmail.com';
      
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(companyName, 20, 30);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(registrationNumber, 20, 38);
      doc.text(`VAT REG NO: ${vatNumber}`, 20, 44);
      doc.text(addressLine1, 20, 50);
      doc.text(addressLine2, 20, 56);
      doc.text(`Trustee: ${contactPerson}`, 20, 62);
      doc.text(`Tel: ${phone}`, 20, 68);
      doc.text(`Email: ${email}`, 20, 74);
      
      // Invoice title - smaller size
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('RENTAL INVOICE', 130, 40);
      
      // Invoice details
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Invoice Details', 20, 96);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 20, 106);
      doc.text(`Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-ZA')}`, 20, 114);
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-ZA')}`, 20, 122);
      
      // Tenant information
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Bill To', 120, 96);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(property.tenantName || 'N/A', 120, 106);
      doc.text(property.name, 120, 114);
      doc.text(property.address, 120, 122);
      doc.text(`Email: ${property.tenantEmail || 'N/A'}`, 120, 130);
      doc.text(`Phone: ${property.tenantPhone || 'N/A'}`, 120, 138);
      
      // Rental details table
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Rental Details', 20, 156);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Description:', 20, 166);
      doc.text('Monthly Rent', 50, 166);
      
      doc.text('Period:', 20, 174);
      const rentStart = new Date(invoice.rentPeriodStart);
      const rentEnd = new Date(invoice.rentPeriodEnd);
      doc.text(`${rentStart.toLocaleDateString('en-ZA')} - ${rentEnd.toLocaleDateString('en-ZA')}`, 50, 174);
      
      doc.text('Property:', 20, 182);
      doc.text(`${property.name} - ${property.address}`, 50, 182);
      
      // Amount breakdown for VAT vs non-VAT properties
      let yPosition = 190;
      const invoiceAmount = parseFloat(invoice.amount);
      
      if (property.isVatExempt) {
        // VAT-exempt property - show simple amount
        doc.text('Amount:', 20, yPosition);
        doc.text(`R ${invoiceAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 120, yPosition);
      } else {
        // Property with VAT - show breakdown with dynamic VAT rate
        const vatRate = parseFloat(companySettings?.vatRate || '15.00');
        const vatMultiplier = 1 + (vatRate / 100);
        const rentExcludingVat = invoiceAmount / vatMultiplier;
        const vatAmount = invoiceAmount - rentExcludingVat;
        
        doc.text('Rent (Excluding VAT):', 20, yPosition);
        doc.text(`R ${rentExcludingVat.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 120, yPosition);
        
        yPosition += 10;
        doc.text(`VAT (${vatRate}%):`, 20, yPosition);
        doc.text(`R ${vatAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 120, yPosition);
        
        yPosition += 10;
        doc.setFont('helvetica', 'bold');
        doc.text('Amount (Including VAT):', 20, yPosition);
        doc.text(`R ${invoiceAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 120, yPosition);
        doc.setFont('helvetica', 'normal');
      }
      
      // Total section
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      const totalYPosition = yPosition + 20;
      doc.text('Total Amount Due:', 20, totalYPosition);
      doc.text(`R ${invoiceAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 120, totalYPosition);
      
      // Payment information - simplified
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      const paymentYPosition = totalYPosition + 25;
      doc.text('Payment Information', 20, paymentYPosition);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Refer to rental agreement for banking details', 20, paymentYPosition + 10);
      
      // Footer - positioned higher to avoid page overflow
      doc.setFontSize(8);
      const footerYPosition = paymentYPosition + 20;
      doc.text('This is a computer-generated invoice. Please quote the invoice number on all correspondence.', 20, footerYPosition);
      doc.text('Thank you for your business.', 20, footerYPosition + 8);
      
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      return pdfBuffer;
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      throw error;
    }
  }
}

export const pdfService = new PDFService();