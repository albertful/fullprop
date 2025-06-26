import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertPropertySchema, insertInvoiceSchema, insertCompanySettingsSchema, loginSchema } from "@shared/schema";
import { z } from "zod";
import { invoiceService } from "./invoiceService";
import { pdfService } from "./pdfService";
import { emailService } from "./emailService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    fileFilter: (req, file, cb) => {
      // Allow PDF files for rental agreements and DOCX files for agreement templates
      if (file.fieldname === 'rentalAgreement' && file.mimetype === 'application/pdf') {
        cb(null, true);
      } else if (file.fieldname === 'agreementTemplate' && 
                 (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                  file.mimetype === 'application/msword')) {
        cb(null, true);
      } else {
        const allowedType = file.fieldname === 'rentalAgreement' ? 'PDF' : 'DOCX';
        cb(new Error(`Only ${allowedType} files are allowed for ${file.fieldname}`));
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    }
  });

  // File upload endpoint
  app.post("/api/upload", upload.fields([
    { name: 'rentalAgreement', maxCount: 1 },
    { name: 'agreementTemplate', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const uploadedFiles: { [key: string]: string } = {};
      
      if (files.rentalAgreement) {
        uploadedFiles.rentalAgreement = files.rentalAgreement[0].filename;
      }
      
      if (files.agreementTemplate) {
        uploadedFiles.agreementTemplate = files.agreementTemplate[0].filename;
      }
      
      res.json({ files: uploadedFiles });
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({ message: "Failed to upload files" });
    }
  });

  // Serve uploaded files
  app.get("/api/files/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });

  // Authentication routes
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Simple authentication - in production would use JWT or sessions
      res.json({ success: true, user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Invalid login data" });
    }
  });

  // Get all properties
  app.get("/api/properties", async (req, res) => {
    try {
      const properties = await storage.getProperties();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  // Get property by ID
  app.get("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const property = await storage.getProperty(id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  // Create new property
  app.post("/api/properties", async (req, res) => {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(validatedData);
      res.status(201).json(property);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating property:", error);
      res.status(500).json({ message: "Failed to create property" });
    }
  });

  // Update property
  app.put("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPropertySchema.partial().parse(req.body);
      const property = await storage.updateProperty(id, validatedData);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      res.json(property);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error updating property:", error);
      res.status(500).json({ message: "Failed to update property" });
    }
  });

  // Delete property
  app.delete("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProperty(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting property:", error);
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  // Get dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const properties = await storage.getProperties();
      const now = new Date();
      
      const stats = {
        totalProperties: properties.length,
        occupiedProperties: properties.filter(p => p.isOccupied).length,
        monthlyRevenue: properties
          .filter(p => p.isOccupied)
          .reduce((sum, p) => sum + parseFloat(p.rentIncludingVat), 0),
        expiringSoon: properties.filter(p => {
          if (!p.leaseEndDate) return false;
          const daysUntilExpiry = Math.ceil((p.leaseEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntilExpiry <= 60 && daysUntilExpiry > 0;
        }).length,
        expiringCritical: properties.filter(p => {
          if (!p.leaseEndDate) return false;
          const daysUntilExpiry = Math.ceil((p.leaseEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
        }).length
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Mock file upload endpoint
  app.post("/api/properties/:id/documents", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const property = await storage.getProperty(id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      // Mock file upload - in real implementation, this would handle file storage
      const { documentType, fileName } = req.body;
      const mockPath = `/uploads/${id}/${fileName}`;
      
      const updateData = documentType === 'rental_agreement' 
        ? { rentalAgreementPath: mockPath }
        : { agreementTemplatePath: mockPath };
      
      const updatedProperty = await storage.updateProperty(id, updateData);
      
      res.json({ 
        message: "Document uploaded successfully", 
        path: mockPath,
        property: updatedProperty 
      });
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Generate invoice as DRAFT (never auto-send)
  app.post("/api/properties/:id/invoice", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await invoiceService.manualGenerateInvoice(id);
      
      if (!success) {
        return res.status(400).json({ message: "Cannot generate invoice for this property" });
      }
      
      res.json({ message: "Invoice generated successfully" });
    } catch (error) {
      console.error("Error generating invoice:", error);
      res.status(500).json({ message: "Failed to generate invoice" });
    }
  });

  // Get notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const notifications = await storage.getNotifications();
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Update notification status
  app.put("/api/notifications/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.markNotificationAsRead(id);
      
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error updating notification:", error);
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  // Clear all notifications
  app.delete("/api/notifications", async (req, res) => {
    try {
      const success = await storage.clearAllNotifications();
      
      if (!success) {
        return res.status(404).json({ message: "No notifications to clear" });
      }
      
      res.json({ message: "All notifications cleared successfully" });
    } catch (error) {
      console.error("Error clearing notifications:", error);
      res.status(500).json({ message: "Failed to clear notifications" });
    }
  });

  // Get invoices
  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Get single invoice
  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  // Update invoice
  app.patch("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // Convert ISO string dates to Date objects
      if (updates.invoiceDate) updates.invoiceDate = new Date(updates.invoiceDate);
      if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);
      if (updates.rentPeriodStart) updates.rentPeriodStart = new Date(updates.rentPeriodStart);
      if (updates.rentPeriodEnd) updates.rentPeriodEnd = new Date(updates.rentPeriodEnd);
      
      // Validate updates
      const validUpdates = insertInvoiceSchema.partial().parse(updates);
      
      const invoice = await storage.updateInvoice(id, validUpdates);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  // Generate invoice PDF preview
  app.get("/api/invoices/:id/pdf", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const property = await storage.getProperty(invoice.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      const pdfBuffer = await pdfService.generateInvoicePDF(invoice, property);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      res.status(500).json({ message: "Failed to generate invoice PDF" });
    }
  });

  // Send invoice via email (placeholder for now)
  app.post("/api/invoices/:id/send", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { ccEmails = [] } = req.body;
      
      const invoice = await storage.getInvoice(id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const property = await storage.getProperty(invoice.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (!property.tenantEmail) {
        return res.status(400).json({ message: "Tenant email not found" });
      }
      
      // Actually send the email
      const emailSent = await emailService.sendInvoice(invoice, property, ccEmails);
      
      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send invoice email" });
      }
      
      // Update invoice with CC emails and mark as sent
      await storage.updateInvoice(id, {
        ccEmails,
        status: 'sent',
        sentDate: new Date(),
        isNew: false
      });
      
      // Create notification
      await storage.createNotification({
        propertyId: property.id,
        type: "invoice_sent",
        message: `Invoice ${invoice.invoiceNumber} sent to ${property.tenantEmail}`,
        isRead: false
      });
      
      res.json({ 
        message: "Invoice sent successfully",
        sentTo: property.tenantEmail,
        ccEmails: ccEmails
      });
    } catch (error) {
      console.error("Error sending invoice:", error);
      res.status(500).json({ message: "Failed to send invoice" });
    }
  });

  // Manually generate invoice for property
  app.post("/api/properties/:id/generate-invoice", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await invoiceService.manualGenerateInvoice(id);
      
      if (!success) {
        return res.status(400).json({ message: "Cannot generate invoice for this property" });
      }
      
      res.json({ message: "Invoice generated successfully" });
    } catch (error) {
      console.error("Error generating invoice:", error);
      res.status(500).json({ message: "Failed to generate invoice" });
    }
  });

  // Delete invoice
  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteInvoice(id);
      
      if (!success) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // Update invoice status
  app.put("/api/invoices/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !["draft", "sent", "paid"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const invoice = await storage.updateInvoiceStatus(id, status);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  // Company settings routes
  app.get("/api/company-settings", async (req, res) => {
    try {
      const settings = await storage.getCompanySettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching company settings:", error);
      res.status(500).json({ message: "Failed to fetch company settings" });
    }
  });

  app.put("/api/company-settings", async (req, res) => {
    try {
      const result = insertCompanySettingsSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid input",
          errors: result.error.issues
        });
      }

      const settings = await storage.updateCompanySettings(result.data);
      res.json(settings);
    } catch (error) {
      console.error("Error updating company settings:", error);
      res.status(500).json({ message: "Failed to update company settings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
