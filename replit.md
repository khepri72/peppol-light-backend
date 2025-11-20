# Peppol Light Backend

## Overview

Peppol Light Backend is a RESTful API built with Node.js and Express, designed as an invoicing SaaS platform. It manages user authentication, invoice creation, PDF generation with customizable templates, and file uploads. The system utilizes Airtable as its primary data store, offering a serverless database solution. The project aims to provide a robust platform for invoice management and Peppol compliance analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture

The application uses Express.js with Node.js and TypeScript, following RESTful conventions. It employs an MVC-style architecture with separate routes, controllers (auth, authGoogle, invoices, users), and configuration. Key features include JWT-based authentication, Google OAuth2 authentication, bcrypt for password hashing, and Zod for input validation.

### Data Storage

Airtable serves as the cloud-based database, storing `Users` and `Invoices` data. User records include authentication fields (email, password, googleId), quota management (plan, quotaUsed, quotaLimit, quotaResetDate), and profile data (companyName, picture). It offers built-in UI and API access, eliminating the need for traditional database management. The system includes protections against Airtable formula injection.

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

The application requires `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `JWT_SECRET`, `SESSION_SECRET`, and `VITE_GOOGLE_CLIENT_ID`. `FRONTEND_URL` and `PORT` are optional.

## Recent Changes

### 2025-11-19: Login Page Transformation & Mobile Optimization

- **Page Login Redesign**: Complete transformation into a professional, commercial landing page
  - Split-screen layout: Hero section (left) + Login form (right) on desktop
  - Hero section: Gradient blue background, tagline, 3 benefits with check icons, reassurance banner
  - Language switcher: Improved visibility with white active state and transparent/border inactive state
  - CTA button: Orange gradient (#FF6B35 → #FF8C5A) with hover effects
  - New commercial copywriting in FR/NL/EN focused on Peppol 2026 compliance value proposition
- **Conversion Optimizations**: 3 micro-optimizations to increase signup rate
  1. PDF/Excel mention: First benefit explicitly mentions "PDF ou Excel" to clarify supported formats
  2. Reassurance text: "Essai gratuit · Sans carte de crédit" under CTA button to remove payment barrier
  3. Quick signup: "en 1 minute" added to account creation link to reduce perceived effort
- **Mobile Responsive Fixes**: Critical bug fixes for mobile experience
  - Fixed: Hero section now visible on mobile (was completely hidden with `display: none`)
  - Mobile hero: Compact version with logo "Peppol Light" + language switcher + mini-tagline
  - Layout: Stacked vertical (hero top, form bottom) instead of hidden hero
  - Optical centering: Form padding adjusted (pt-4 pb-12) for better visual balance
  - Translations: Added `hero.mobileTagline` in FR/NL/EN for compact mobile display
  - Runtime error fix: Added ErrorBoundary + i18n `useSuspense: false` to eliminate "[plugin:runtime-error-plugin]" overlay
  - Result: Professional branded experience preserved on all screen sizes without runtime errors
- **Peppol Error Internationalization**: Fully internationalized error messages
  - Structured error storage: errorsData JSON field alongside legacy errorsList for backward compatibility
  - Translation system with code-to-i18n mapping for all 8 Peppol validation rules
  - Robust error handling with graceful fallbacks for legacy invoices, corrupted JSON, and unknown error codes
- **Excel Support & Auto-Analysis**: Added support for .xlsx and .xls file uploads
  - Auto-Analysis Workflow: `uploadAndAnalyzeInvoice()` handles upload + analysis in one call
  - Results displayed immediately in dashboard table with conformity scores
- **PDF Parser Migration**: Updated to pdf-parse v2 API using PDFParse class
  - Old: `import * as pdfParse; await pdfParse(buffer)`
  - New: `import { PDFParse }; new PDFParse({ data }).getText(); parser.destroy()`
- **Testing**: End-to-end tests confirm all features work correctly across 3 languages and on mobile viewport (375x667)

### 2025-11-20: Google OAuth2 & Tiered Quota System - Complete Security Audit & Type Safety

- **Google OAuth2 Authentication**: Added Google Sign-In as alternative to email/password
  - Backend: `authGoogleController.ts` verifies Google JWT tokens with Google OAuth2 Library
  - Frontend: Google SDK integration with `handleGoogleLogin()` for One Tap login
  - Route: `POST /api/auth/google` accepts Google credential and returns JWT token
  - Seamless integration: Google users get same JWT flow as email/password users
  - Logo: Custom Google SVG logo component with official 4-color branding
  - UI: "Continue with Google" button on login page with "or" separator
- **Tiered Quota System**: Usage limits based on subscription plans
  - Plans: FREE (1 upload/month), STARTER €29 (10/month), PRO €99 (unlimited), BUSINESS €299 (unlimited)
  - Airtable fields: `plan`, `quotaUsed`, `quotaLimit`, `quotaResetDate`
  - Hook: `useQuotas()` calculates remaining uploads and enforces limits
  - Dashboard badge: Real-time quota display (e.g., "3/10 envois utilisés" or "Illimité")
  - Automatic reset: Monthly quota resets managed server-side
- **Critical Security Fixes**: Complete Airtable injection protection
  - ALL controllers (`authController`, `authGoogleController`) use `buildSafeFilterFormula()` for email/googleId queries
  - Eliminated manual string interpolation in Airtable filterByFormula to prevent injection attacks
  - JWT hardening: All tokens include `issuer: 'peppol-light'` and `audience: 'peppol-light-users'` for verification
- **Backend Quota Persistence**: Automatic migration for legacy users
  - `authController.register`: Creates new users with complete quota fields (plan, quotaUsed, quotaLimit, quotaResetDate)
  - `authController.login`: Persists missing quota fields to Airtable with defaults when user logs in
  - `authController.getCurrentUser`: Persists missing quota fields when fetching profile
  - `authGoogleController.googleAuth`: Persists missing quota fields for both new and existing Google users
  - All legacy users auto-migrated on next login (any method), ensuring data consistency
- **Frontend Type Safety & Cache Management**:
  - Synchronized `User`, `AuthResponse`, `GoogleAuthResponse` interfaces across `shared/schema.ts` and all files
  - React Query cache update: `queryClient.setQueryData(['/api/auth/me'], response)` after Google login (not just invalidate)
  - Eliminates stale cache: Dashboard quota badge now reflects correct limits immediately after login
  - `useQuotas()` derives all values from backend response (no hardcoded defaults)
- **Internationalization Updates**: Added translations for Google Login and quotas
  - `login.googleButton`: "Continue with Google" / "Continuer avec Google" / "Doorgaan met Google"
  - `login.orSeparator`: "or" / "ou" / "of"
  - `quotas.*`: Full translation set for quota messages (used, unlimited, exceeded, upgrade)
- **Architecture**: Preserved existing JWT + localStorage system, Google auth as complementary method
- **Security**: Google Client ID stored in Replit Secrets (`VITE_GOOGLE_CLIENT_ID`)
- **Testing**: System validated by architect tool, all critical issues resolved (injection protection, type safety, quota persistence)
