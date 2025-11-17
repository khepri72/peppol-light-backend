# Peppol Light Backend

## Overview

Peppol Light Backend is a RESTful API built with Node.js and Express that provides a complete invoicing SaaS platform. The system manages user authentication, invoice creation and management, and PDF file uploads. It uses Airtable as a cloud-based database solution for data persistence, making it easy to deploy and scale without managing traditional database infrastructure.

The application follows a standard MVC-style architecture with clear separation between routes, controllers, and configuration. It includes a React frontend with shadcn/ui components, though the primary focus is on the backend API functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture

**Framework & Runtime**: The application uses Express.js running on Node.js with TypeScript for type safety. The server is configured to run on port 5000 and handles both API requests and static file serving for the frontend in production.

**Routing Structure**: The API follows RESTful conventions with routes organized by resource type (auth, invoices, users). All API endpoints are prefixed with `/api` to separate them from frontend routes. A health check endpoint at `/health` provides basic service monitoring.

**Controller Pattern**: Business logic is separated into three main controllers:
- `authController`: Handles user registration and login with JWT token generation
- `invoiceController`: Manages CRUD operations for invoices
- `userController`: Handles user profile management

This separation ensures each controller has a single responsibility and makes the codebase easier to maintain and test.

### Authentication & Authorization

**JWT-based Authentication**: The system uses JSON Web Tokens (JWT) for stateless authentication. Upon successful login or registration, users receive a token that must be included in the Authorization header (as "Bearer TOKEN") for protected endpoints.

**Password Security**: User passwords are hashed using bcrypt with 10 salt rounds before storage. Plain-text passwords are never stored in the database, ensuring security even if the database is compromised.

**Middleware Protection**: The `authenticateToken` middleware validates JWTs and extracts the userId, which is then attached to the request object for use by downstream controllers. This middleware protects all routes that require authentication.

### Data Storage & Management

**Airtable as Database**: Rather than using a traditional SQL or NoSQL database, this application uses Airtable as its data store. This choice offers several advantages:
- No database server to manage or maintain
- Built-in UI for viewing and managing data
- Easy to set up and deploy
- Automatic backups and version control
- RESTful API provided by Airtable

**Schema Structure**: The system uses two main Airtable tables:
- `Users`: Stores email, hashed password, company name, and creation timestamp
- `Invoices`: Stores invoice data linked to users, including client information, amounts, items, status, and PDF URLs

**Security Measures**: The application includes protection against Airtable formula injection attacks through the `buildSafeFilterFormula` helper function, which properly escapes user input before using it in filter formulas.

### File Upload System

**PDF Upload Handling**: The application uses Multer middleware to handle PDF file uploads for invoices. Files are stored locally in the `server/uploads` directory with unique filenames generated using timestamps and random numbers.

**Upload Validation**: The system enforces strict validation on uploaded files:
- Only PDF files are accepted (MIME type validation)
- Maximum file size is 10MB
- Files are stored with secure, unique filenames to prevent overwrites

### Data Validation

**Zod Schema Validation**: All user input is validated using Zod schemas defined in `shared/schema.ts`. This ensures type safety and data integrity across both frontend and backend. The schemas validate:
- User registration (email format, password length)
- Invoice creation (required fields, number formats, enum values)
- Invoice updates (partial validation)

### Frontend Architecture

**React with Vite**: The frontend is built using React and bundled with Vite for fast development and optimized production builds. The development server includes HMR (Hot Module Replacement) for rapid iteration.

**UI Component Library**: The application uses shadcn/ui components built on Radix UI primitives, providing accessible and customizable UI components. Styling is handled through Tailwind CSS with a custom design system.

**State Management**: React Query (@tanstack/react-query) is used for server state management, providing caching, background updates, and request deduplication.

**Routing**: The frontend uses Wouter for client-side routing, which is lightweight and suitable for the application's needs.

### Development & Build Process

**TypeScript Configuration**: The project uses TypeScript with strict mode enabled, ensuring type safety across the entire codebase. Path aliases are configured for cleaner imports (`@/`, `@shared/`).

**Build Pipeline**:
- Frontend: Vite builds the React application to `dist/public`
- Backend: esbuild bundles the server code to `dist/index.js`
- Production: The Express server serves both the API and static frontend files

**Development Mode**: Running `npm run dev` starts the server with hot reloading using tsx, which compiles TypeScript on the fly for faster iteration.

### CORS & Security

**Cross-Origin Configuration**: CORS is configured to allow requests from any origin in development, with the ability to restrict to specific domains in production via the `FRONTEND_URL` environment variable.

**Request Logging**: Custom middleware logs all API requests with timing information, helping with debugging and performance monitoring.

**Error Handling**: Controllers include comprehensive error handling with appropriate HTTP status codes and error messages, ensuring clients receive meaningful feedback.

## External Dependencies

### Third-Party Services

**Airtable**: Cloud-based spreadsheet/database service used as the primary data store. Requires an API key and base ID configured via environment variables (`AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`).

### Key NPM Packages

**Backend Dependencies**:
- `express`: Web framework for handling HTTP requests
- `airtable`: Official Airtable SDK for database operations
- `bcrypt`: Password hashing library
- `jsonwebtoken`: JWT creation and validation
- `multer`: Multipart form data handling for file uploads
- `cors`: Cross-origin request handling
- `zod`: Runtime type validation

**Frontend Dependencies**:
- `react` & `react-dom`: UI framework
- `@tanstack/react-query`: Server state management
- `wouter`: Lightweight routing
- `@radix-ui/*`: Accessible UI component primitives
- `tailwindcss`: Utility-first CSS framework
- `class-variance-authority`: Component variant management

**Development Tools**:
- `vite`: Frontend build tool and development server
- `typescript`: Type checking and compilation
- `tsx`: TypeScript execution for development
- `esbuild`: Fast backend bundling

### Environment Configuration

The application requires the following environment variables:
- `AIRTABLE_API_KEY`: Authentication for Airtable API
- `AIRTABLE_BASE_ID`: Identifier for the Airtable base
- `JWT_SECRET`: Secret key for signing JWT tokens
- `FRONTEND_URL` (optional): CORS origin restriction in production
- `PORT` (optional): Server port, defaults to 5000

### Database Migration Note

While the application currently uses Airtable, there is evidence of Drizzle ORM configuration (`drizzle.config.ts`) and PostgreSQL dependencies (`@neondatabase/serverless`). This suggests the system is designed to potentially migrate to a PostgreSQL database in the future. The code agent should be aware that adding proper PostgreSQL support would require implementing the schema definitions in `shared/schema.ts` using Drizzle ORM and updating the controllers to use database queries instead of Airtable API calls.