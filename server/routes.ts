import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { authenticateToken } from "./middlewares/auth";
import { checkQuota } from "./middlewares/checkQuota";
import { checkPlanFeature } from "./middlewares/checkPlanFeature";
import * as authController from "./controllers/authController";
import * as authGoogleController from "./controllers/authGoogleController";
import * as invoiceController from "./controllers/invoiceController";
import * as userController from "./controllers/userController";
import * as stripeController from "./controllers/stripeController";
import * as stripeWebhookController from "./controllers/stripeWebhookController";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Utility function to ensure uploads directory exists
// IMPORTANT: Utilise process.cwd() pour un chemin cohérent avec invoiceController
function ensureUploadsDir(): string {
  const uploadsPath = path.join(process.cwd(), 'server', 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log('📁 Created uploads directory at', uploadsPath);
  }
  return uploadsPath;
}

// Configure Multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsPath = ensureUploadsDir();
    cb(null, uploadsPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'invoice-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Accept PDF and Excel files
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Excel files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'API en ligne',
      timestamp: new Date().toISOString(),
    });
  });

  // Debug version endpoint
  app.get('/api/debug/version', (req, res) => {
    res.json({
      service: 'peppol-light-backend',
      env: process.env.NODE_ENV,
      time: new Date().toISOString(),
      commit: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || 'unknown'
    });
  });

  // Authentication routes
  app.post('/api/auth/register', authController.register);
  app.post('/api/auth/login', authController.login);
  app.post('/api/auth/google', authGoogleController.googleAuth);
  app.get('/api/auth/me', authenticateToken, authController.getCurrentUser);

  // User routes
  app.get('/api/users/profile', authenticateToken, userController.getUserProfile);
  app.patch('/api/users/profile', authenticateToken, userController.updateUserProfile);

  // Stripe webhook route (must be before express.json to access raw body)
  // Note: This route should be configured to receive RAW body for Stripe signature verification
  app.post('/api/stripe/webhook', stripeWebhookController.handleWebhook);

  // Stripe routes (protected - requires authentication)
  app.post('/api/stripe/checkout', authenticateToken, stripeController.createCheckoutSession);

  // Invoice routes
  app.post('/api/invoices', authenticateToken, invoiceController.registerUploadedInvoice);
  app.get('/api/invoices', authenticateToken, invoiceController.getInvoices);
  app.delete('/api/invoices/:id', authenticateToken, invoiceController.deleteInvoice);
  
  // Analyze invoice with Peppol engine (PDF or Excel)
  app.post('/api/invoices/analyze', authenticateToken, checkQuota, upload.single('file'), invoiceController.analyzeInvoice);

  // File upload route (PDF or Excel)
  app.post('/api/upload/pdf', authenticateToken, upload.single('pdf'), (req, res, next) => {
    try {
      console.log('📥 /api/upload/pdf called');
      console.log('User ID:', (req as any).userId);
      console.log('File info:', req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        filename: req.file.filename,
        path: req.file.path
      } : 'NO FILE');

      if (!req.file) {
        console.error('❌ No file uploaded from frontend');
        return res.status(400).json({ error: 'No file uploaded from frontend' });
      }

      console.log('▶️ File uploaded successfully:', req.file.originalname);
      
      const fileUrl = `/api/uploads/${req.file.filename}`;
      console.log('✅ Upload complete, file URL:', fileUrl);
      
      res.json({
        message: 'File uploaded successfully',
        url: fileUrl,
        filename: req.file.filename,
      });
    } catch (error) {
      console.error('❌ Fatal upload error:', error);
      return res.status(500).json({
        error: 'Upload failed',
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
      });
    }
  });

  // Global error handler for Multer errors
  app.use((error: any, req: any, res: any, next: any) => {
    if (error instanceof multer.MulterError) {
      console.error('❌ Multer error:', error.code, error.message);
      return res.status(400).json({
        error: 'File upload error',
        code: error.code,
        details: error.message,
      });
    }
    
    if (error) {
      console.error('❌ Middleware error:', error);
      return res.status(500).json({
        error: 'Server error',
        details: error.message || String(error),
      });
    }
    
    next();
  });

  // Download UBL/XML file from Airtable (compatible Render ephemeral filesystem)
  // Protected: requires STARTER/PRO/BUSINESS plan (not FREE)
  app.get('/api/invoices/download-ubl/:invoiceId', authenticateToken, checkPlanFeature('ubl-download'), async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const userId = (req as any).userId;
      
      console.log('🔍 [DOWNLOAD-UBL] Demande pour invoiceId:', invoiceId);
      
      if (!invoiceId) {
        return res.status(400).json({ error: 'Invoice ID required' });
      }
      
      // Importer Airtable config
      const { base, TABLES } = await import('./config/airtable');
      
      // Récupérer l'invoice depuis Airtable
      let record;
      try {
        record = await base(TABLES.INVOICES).find(invoiceId);
      } catch (findError: any) {
        console.error('❌ [DOWNLOAD-UBL] Invoice non trouvée:', findError.message);
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      // Vérifier que l'utilisateur est propriétaire de cette facture
      const userIds = record.fields['User'] as string[];
      if (!userIds || !userIds.includes(userId)) {
        console.error('❌ [DOWNLOAD-UBL] Accès refusé pour user:', userId);
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Récupérer le contenu UBL depuis Airtable
      const ublContent = record.fields['UBL Content'] as string;
      const xmlFilename = record.fields['XML Filename'] as string || `invoice-${invoiceId}.xml`;
      
      if (!ublContent) {
        console.error('❌ [DOWNLOAD-UBL] Pas de contenu UBL pour cette facture');
        return res.status(404).json({ error: 'UBL content not found. Please re-analyze the invoice.' });
      }
      
      console.log('✅ [DOWNLOAD-UBL] UBL trouvé, taille:', ublContent.length, 'caractères');
      
      // Envoyer le contenu XML directement
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="${xmlFilename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(ublContent, 'utf8'));
      return res.send(ublContent);
      
    } catch (error) {
      console.error('❌ [DOWNLOAD-UBL] Erreur:', error);
      return res.status(500).json({ error: 'Failed to download UBL file' });
    }
  });

  // Download PDF Report for an invoice
  app.get('/api/invoices/report-pdf/:invoiceId', authenticateToken, async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const userId = (req as any).userId;
      
      console.log('📄 [REPORT-PDF] Request for invoiceId:', invoiceId);
      
      if (!invoiceId) {
        return res.status(400).json({ error: 'Invoice ID required' });
      }
      
      // Import dependencies
      const { base, TABLES } = await import('./config/airtable');
      const { generatePdfReportBuffer } = await import('./utils/pdfReport');
      
      // Get invoice from Airtable
      let invoiceRecord;
      try {
        invoiceRecord = await base(TABLES.INVOICES).find(invoiceId);
      } catch (findError: any) {
        console.error('❌ [REPORT-PDF] Invoice not found:', findError.message);
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      // Check ownership
      const userIds = invoiceRecord.fields['User'] as string[];
      if (!userIds || !userIds.includes(userId)) {
        console.error('❌ [REPORT-PDF] Access denied for user:', userId);
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Get user for plan info
      let userRecord;
      try {
        userRecord = await base(TABLES.USERS).find(userId);
      } catch (userError: any) {
        console.error('❌ [REPORT-PDF] User not found:', userError.message);
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userPlan = String(userRecord.fields['userPlan'] || 'free').toLowerCase();
      
      // Parse errors
      let errors: Array<{ message: string }> = [];
      let warnings: Array<{ message: string }> = [];
      
      const errorsData = invoiceRecord.fields['Errors Data'] as string;
      if (errorsData) {
        try {
          const parsed = JSON.parse(errorsData);
          errors = (parsed.errors || []).map((e: any) => ({ message: e.message || String(e) }));
          warnings = (parsed.warnings || []).map((w: any) => ({ message: w.message || String(w) }));
        } catch (e) {
          // Fallback to Errors List
          const errorsList = invoiceRecord.fields['Errors List'] as string;
          if (errorsList) {
            errors = errorsList.split('\n').filter(Boolean).map(msg => ({ message: msg }));
          }
        }
      }
      
      // Get createdAt
      const createdAt = (invoiceRecord as any)._rawJson?.createdTime || 
                        (invoiceRecord as any).createdTime || 
                        new Date().toISOString();
      
      // Generate PDF
      const pdfBuffer = await generatePdfReportBuffer({
        fileName: invoiceRecord.fields['File Name'] as string || 'Unknown',
        invoiceNumber: invoiceRecord.fields['Invoice Number'] as string || '',
        invoiceDate: invoiceRecord.fields['Invoice Date'] as string || '',
        analysisDate: new Date(createdAt).toLocaleDateString('fr-FR'),
        score: Number(invoiceRecord.fields['Conformity Score']) || 0,
        status: invoiceRecord.fields['Status'] as string || 'Unknown',
        errors,
        warnings,
        userPlan
      });
      
      const pdfFilename = `rapport-peppol-${invoiceId}.pdf`;
      
      console.log('✅ [REPORT-PDF] PDF generated, size:', pdfBuffer.length, 'bytes');
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
      
    } catch (error) {
      console.error('❌ [REPORT-PDF] Error:', error);
      return res.status(500).json({ error: 'Failed to generate PDF report' });
    }
  });

  // Serve uploaded files with authentication (SECURE)
  app.get('/api/uploads/:filename', authenticateToken, (req, res) => {
    try {
      const { filename } = req.params;
      
      // Prevent directory traversal attacks
      if (filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ error: 'Invalid filename' });
      }
      
      // UTILISER LE MÊME DOSSIER QUE MULTER ET LA GÉNÉRATION XML
      const uploadsPath = ensureUploadsDir();
      const filePath = path.join(uploadsPath, filename);
      
      console.log('🔍 Serving file:', filePath);
      
      // Check if file exists and send it
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error('❌ File send error:', err);
          return res.status(404).json({ error: 'File not found' });
        }
      });
    } catch (error) {
      console.error('❌ File access error:', error);
      res.status(500).json({ error: 'Failed to access file' });
    }
  });

  // Support ticket route
  app.post('/api/support', authenticateToken, async (req, res) => {
    try {
      const { subject, message, priority } = req.body;
      const userId = (req as any).userId;

      if (!subject || !message) {
        return res.status(400).json({ error: 'Sujet et message requis' });
      }

      // Import Airtable config
      const { base, TABLES } = await import('./config/airtable');

      // Load user
      const user = await base(TABLES.USERS).find(userId);
      const userEmail = user.fields.Email as string;
      const userName = user.fields.Name as string || user.fields['Company Name'] as string || 'Inconnu';

      // Create ticket in Airtable
      await base(TABLES.SUPPORT_TICKETS).create({
        User: [userId],
        Email: userEmail,
        Subject: subject,
        Message: message,
        Status: 'New',
        Priority: priority || 'Medium',
        'Created At': new Date().toISOString()
      });

      console.log(`[Support] Ticket créé - User: ${userName}, Subject: ${subject}`);

      res.json({ 
        success: true,
        message: 'Ticket de support créé avec succès' 
      });
    } catch (error) {
      console.error('[Support] Erreur:', error);
      res.status(500).json({ error: 'Erreur lors de la création du ticket' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}