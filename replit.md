# Peppol Light Backend

## Overview

Peppol Light Backend is a RESTful API built with Node.js and Express, designed as an invoicing SaaS platform. It manages user authentication, invoice creation, PDF generation with customizable templates, and file uploads. The system utilizes Airtable as its primary data store, offering a serverless database solution. The project aims to provide a robust platform for invoice management and Peppol compliance analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture

The application uses Express.js with Node.js and TypeScript, following RESTful conventions. It employs an MVC-style architecture with separate routes, controllers (auth, invoices, users), and configuration. Key features include JWT-based authentication, bcrypt for password hashing, and Zod for input validation.

### Data Storage

Airtable serves as the cloud-based database, storing `Users` and `Invoices` data. It offers built-in UI and API access, eliminating the need for traditional database management. The system includes protections against Airtable formula injection.

### File Upload and Analysis

The system handles PDF and Excel file uploads using Multer. Uploaded files undergo automatic Peppol validation and analysis. The custom Peppol analysis engine extracts data, validates it against six critical Peppol rules, calculates a conformity score, and generates UBL XML files. This engine supports basic PDF and Excel data extraction using pdf-parse v2 API (PDFParse class) and handles amount normalization and date parsing.

**Auto-Analysis Workflow**: When a file is uploaded through the dashboard:
1. Frontend calls `uploadAndAnalyzeInvoice()` which uploads the file to `/api/upload/pdf`
2. The uploaded file is automatically sent to `/api/invoices/analyze` for Peppol validation
3. The invoice is registered in Airtable with the conformity score and analysis results
4. Results are displayed immediately in the dashboard table

### Frontend Architecture

The frontend is built with React and Vite, using shadcn/ui components (based on Radix UI) and Tailwind CSS for styling. React Query manages server state, and Wouter handles client-side routing.

### Internationalization (i18n)

The application supports French (default), Dutch, and English, specifically tailored for the Belgian market. It uses `react-i18next` for language detection, translation, and persistence of user language preferences.

### Development and Build Process

The project uses TypeScript for type safety. Frontend assets are bundled with Vite, and backend code with esbuild. Development uses `tsx` for hot reloading, while production serves both API and static frontend files.

## External Dependencies

### Third-Party Services

- **Airtable**: Primary cloud-based database for data storage.

### Key NPM Packages

- **Backend**: `express`, `airtable`, `bcrypt`, `jsonwebtoken`, `multer`, `cors`, `zod`, `pdf-parse` (v2).
- **Frontend**: `react`, `react-dom`, `@tanstack/react-query`, `wouter`, `@radix-ui/*`, `tailwindcss`, `react-i18next`.
- **Development**: `vite`, `typescript`, `tsx`, `esbuild`.

### Environment Configuration

The application requires `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `JWT_SECRET`, and `SESSION_SECRET`. `FRONTEND_URL` and `PORT` are optional.

## Recent Changes

### 2025-11-19: Excel Upload and Auto-Analysis

- **Excel Support**: Added support for .xlsx and .xls file uploads alongside PDF files
- **Auto-Analysis Workflow**: Implemented automatic Peppol analysis upon file upload
  - New API method: `uploadAndAnalyzeInvoice()` handles upload + analysis in one call
  - Frontend dashboard updated to accept both PDF and Excel files
  - Results displayed immediately in dashboard table with conformity scores
- **PDF Parser Migration**: Updated to pdf-parse v2 API using PDFParse class
  - Old: `import * as pdfParse; await pdfParse(buffer)`
  - New: `import { PDFParse }; new PDFParse({ data }).getText(); parser.destroy()`
- **Translations**: Added multilingual support for "Formats acceptés: PDF et Excel" in FR/NL/EN
- **Testing**: End-to-end test confirms PDF upload → auto-analysis → 90% score display works correctly
