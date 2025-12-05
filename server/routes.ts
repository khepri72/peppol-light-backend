import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { authenticateToken } from "./middlewares/auth";
import * as authController from "./controllers/authController";
import * as authGoogleController from "./controllers/authGoogleController";
import * as invoiceController from "./controllers/invoiceController";
import * as userController from "./controllers/userController";

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

  // Authentication routes
  app.post('/api/auth/register', authController.register);
  app.post('/api/auth/login', authController.login);
  app.post('/api/auth/google', authGoogleController.googleAuth);
  app.get('/api/auth/me', authenticateToken, authController.getCurrentUser);

  // User routes
  app.get('/api/users/profile', authenticateToken, userController.getUserProfile);
  app.patch('/api/users/profile', authenticateToken, userController.updateUserProfile);

  // Invoice routes
  app.post('/api/invoices', authenticateToken, invoiceController.registerUploadedInvoice);
  app.get('/api/invoices', authenticateToken, invoiceController.getInvoices);
  app.delete('/api/invoices/:id', authenticateToken, invoiceController.deleteInvoice);
  
  // Analyze invoice with Peppol engine (PDF or Excel)
  app.post('/api/invoices/analyze', authenticateToken, upload.single('file'), invoiceController.analyzeInvoice);

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
  app.get('/api/invoices/download-ubl/:invoiceId', authenticateToken, async (req, res) => {
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

  const httpServer = createServer(app);

  return httpServer;
}