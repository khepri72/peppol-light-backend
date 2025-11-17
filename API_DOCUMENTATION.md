# Peppol Light Backend - API Documentation

Backend API pour un SaaS de facturation utilisant Node.js, Express et Airtable.

## 🚀 Technologies

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **Airtable** - Base de données cloud
- **JWT** - Authentification par tokens
- **Bcrypt** - Hashage des mots de passe
- **Multer** - Upload de fichiers PDF
- **CORS** - Sécurité cross-origin

## 📁 Structure du projet

```
server/
├── config/          # Configuration Airtable et environnement
│   ├── airtable.ts
│   └── env.ts
├── controllers/     # Logique métier
│   ├── authController.ts
│   ├── invoiceController.ts
│   └── userController.ts
├── middlewares/     # Middleware JWT
│   └── auth.ts
├── routes.ts        # Routes API
├── index.ts         # Point d'entrée
└── uploads/         # Fichiers PDF uploadés
```

## 🔐 Variables d'environnement

Les variables suivantes doivent être définies dans les secrets Replit :

- `AIRTABLE_API_KEY` - Clé API Airtable
- `AIRTABLE_BASE_ID` - ID de la base Airtable
- `JWT_SECRET` - Secret pour signer les tokens JWT

## 📊 Structure Airtable

### Table "Users"
- `email` (text)
- `password` (text, hashé)
- `companyName` (text)
- `createdAt` (text, ISO date)

### Table "Invoices"
- `userId` (text, lié à Users)
- `invoiceNumber` (text)
- `clientName` (text)
- `clientEmail` (text)
- `amount` (number)
- `currency` (text)
- `status` (text: draft, sent, paid, overdue)
- `dueDate` (text, ISO date)
- `items` (text, JSON stringifié)
- `notes` (text)
- `pdfUrl` (text)
- `createdAt` (text, ISO date)
- `updatedAt` (text, ISO date)

## 🛣️ Routes API

### Health Check
```
GET /health
```
Vérifie que l'API est en ligne.

**Réponse:**
```json
{
  "status": "API en ligne",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Authentification

#### Inscription
```
POST /api/auth/register
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "motdepasse123",
  "companyName": "Ma Société" // optionnel
}
```

**Réponse:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "rec123...",
    "email": "user@example.com",
    "companyName": "Ma Société"
  }
}
```

#### Connexion
```
POST /api/auth/login
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "motdepasse123"
}
```

**Réponse:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "rec123...",
    "email": "user@example.com",
    "companyName": "Ma Société"
  }
}
```

#### Obtenir l'utilisateur courant
```
GET /api/auth/me
Authorization: Bearer <token>
```

### Utilisateurs

#### Obtenir le profil
```
GET /api/users/profile
Authorization: Bearer <token>
```

#### Mettre à jour le profil
```
PATCH /api/users/profile
Authorization: Bearer <token>
```
**Body:**
```json
{
  "companyName": "Nouvelle Société"
}
```

### Factures

#### Créer une facture
```
POST /api/invoices
Authorization: Bearer <token>
```
**Body:**
```json
{
  "invoiceNumber": "INV-001",
  "clientName": "Client ABC",
  "clientEmail": "client@example.com",
  "amount": 1500.00,
  "currency": "EUR",
  "status": "draft",
  "dueDate": "2024-12-31",
  "items": [
    {
      "description": "Service de consultation",
      "quantity": 10,
      "unitPrice": 150.00
    }
  ],
  "notes": "Paiement sous 30 jours"
}
```

#### Lister toutes les factures
```
GET /api/invoices
Authorization: Bearer <token>
```

#### Obtenir une facture
```
GET /api/invoices/:id
Authorization: Bearer <token>
```

#### Mettre à jour une facture
```
PATCH /api/invoices/:id
Authorization: Bearer <token>
```
**Body:** (tous les champs sont optionnels)
```json
{
  "status": "paid",
  "notes": "Payé le 15/01/2024"
}
```

#### Supprimer une facture
```
DELETE /api/invoices/:id
Authorization: Bearer <token>
```

### Upload de fichiers

#### Upload d'un PDF
```
POST /api/upload/pdf
Authorization: Bearer <token>
Content-Type: multipart/form-data
```
**Form Data:**
- `pdf` - Fichier PDF (max 10MB)

**Réponse:**
```json
{
  "message": "PDF uploaded successfully",
  "url": "/uploads/invoice-1234567890-123456789.pdf",
  "filename": "invoice-1234567890-123456789.pdf"
}
```

## 🔒 Authentification

Toutes les routes protégées nécessitent un token JWT dans le header :
```
Authorization: Bearer <votre_token_jwt>
```

Le token est valide pendant 7 jours.

## ⚠️ Codes d'erreur

- `400` - Données invalides
- `401` - Non authentifié
- `403` - Accès refusé
- `404` - Ressource non trouvée
- `500` - Erreur serveur

## 🚀 Démarrage

L'API démarre automatiquement sur le port 5000 avec `npm run dev`.

Le endpoint de health check est disponible à : `http://0.0.0.0:5000/health`
