# Peppol Light Backend

## Overview

Peppol Light Backend is a RESTful API built with Node.js and Express, designed as an invoicing SaaS platform. It manages user authentication, invoice creation, PDF generation with customizable templates, and file uploads. The system utilizes Airtable as its primary data store, offering a serverless database solution. The project aims to provide a robust platform for invoice management and Peppol compliance analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture

The application uses Express.js with Node.js and TypeScript, following RESTful conventions and an MVC-style architecture. It features JWT-based authentication, Google OAuth2, bcrypt for password hashing, and Zod for input validation.

### Data Storage

Airtable serves as the cloud-based database for `Users` and `Invoices` data. It stores authentication details, quota management, and profile information, with built-in protections against formula injection.

### File Upload and Analysis

The system handles PDF and Excel file uploads via Multer. Uploaded files undergo automatic Peppol validation and analysis. A custom Peppol analysis engine extracts data, validates it against six critical Peppol rules, calculates a conformity score, and generates UBL XML files. This engine supports basic PDF and Excel data extraction and handles amount normalization and date parsing. Analysis results, including conformity scores, are immediately displayed and registered in Airtable.

### Frontend Architecture

The frontend is built with React and Vite, utilizing shadcn/ui components (based on Radix UI) and Tailwind CSS for styling. React Query manages server state, and Wouter handles client-side routing.

### Internationalization (i18n)

The application supports French (default), Dutch, and English, specifically for the Belgian market, using `react-i18next` for language detection, translation, and persistence. Peppol validation error messages are fully internationalized, mapping error codes to translated keys for comprehensive language support.

### Development and Build Process

The project uses TypeScript for type safety, with Vite for frontend asset bundling and esbuild for backend code.

### Security and Quota System

The system implements a tiered quota system for invoice uploads based on subscription plans (FREE, STARTER, PRO, BUSINESS) with monthly resets. Critical security measures include robust Airtable injection protection using `buildSafeFilterFormula()` for all data queries and JWT hardening with issuer and audience verification.

## External Dependencies

### Third-Party Services

- **Airtable**: Primary cloud-based database.
- **Google OAuth2 Library**: For verifying Google JWT tokens for authentication.

### Key NPM Packages

- **Backend**: `express`, `airtable`, `bcrypt`, `jsonwebtoken`, `multer`, `cors`, `zod`, `pdf-parse`.
- **Frontend**: `react`, `react-dom`, `@tanstack/react-query`, `wouter`, `@radix-ui/*`, `tailwindcss`, `react-i18next`.
- **Development**: `vite`, `typescript`, `tsx`, `esbuild`.

### Environment Configuration

The application requires `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `JWT_SECRET`, `SESSION_SECRET`, and `VITE_GOOGLE_CLIENT_ID`.