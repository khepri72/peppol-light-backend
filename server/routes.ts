import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { fileURLToPath } from 'url';
import { authenticateToken } from "./middlewares/auth";
import * as authController from "./controllers/authController";
import * as invoiceController from "./controllers/invoiceController";
import * as userController from "./controllers/userController";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
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

  // File upload route
  app.post('/api/upload/pdf', authenticateToken, upload.single('pdf'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      const fileUrl = `/api/uploads/${req.file.filename}`;
      res.json({
        message: 'PDF uploaded successfully',
        url: fileUrl,
        filename: req.file.filename,
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload PDF' });
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
