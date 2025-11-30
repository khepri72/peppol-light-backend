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
function ensureUploadsDir(): string {
  const uploadsPath = path.join(__dirname, 'uploads');
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
  app.patch('/api/invoices/:id', authenticateToken, invoiceController.updateInvoice);
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

  // Download UBL/XML file (already generated)
  app.get('/api/invoices/download-ubl/:filename', authenticateToken, (req, res) => {
    try {
      const { filename } = req.params;
      
      // Security: verify .xml extension
      if (!filename || !filename.endsWith('.xml')) {
        return res.status(400).json({ error: 'Invalid filename format' });
      }
      
      // Prevent directory traversal attacks
      if (filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ error: 'Invalid filename' });
      }
      
      // Path to already generated XML file
      const filePath = path.join(__dirname, 'uploads', filename);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'UBL file not found' });
      }
      
      // Serve the file as download
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.sendFile(filePath);
      
    } catch (error) {
      console.error('Error downloading UBL:', error);
      res.status(500).json({ error: 'Failed to download UBL file' });
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
      
      const filePath = path.join(__dirname, 'uploads', filename);
      
      // Check if file exists and send it
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error('File send error:', err);
          return res.status(404).json({ error: 'File not found' });
        }
      });
    } catch (error) {
      console.error('File access error:', error);
      res.status(500).json({ error: 'Failed to access file' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
