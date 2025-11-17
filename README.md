# Peppol Light Backend

Backend API REST Node.js/Express pour un SaaS de facturation avec intégration Airtable.

## 🎯 Caractéristiques

- ✅ **Authentification sécurisée** avec JWT et hashage bcrypt
- ✅ **CRUD complet** pour les factures et utilisateurs
- ✅ **Upload de PDF** avec authentification
- ✅ **Base de données Airtable** pour la persistance
- ✅ **Validation des données** avec Zod
- ✅ **Protection contre les injections** de formules Airtable
- ✅ **CORS** configuré pour la sécurité
- ✅ **Gestion d'erreurs** complète

## 📁 Structure du Projet

```
server/
├── config/
│   ├── airtable.ts       # Configuration Airtable
│   └── env.ts            # Variables d'environnement
├── controllers/
│   ├── authController.ts # Authentification (register/login)
│   ├── invoiceController.ts # Gestion des factures
│   └── userController.ts # Gestion des utilisateurs
├── middlewares/
│   └── auth.ts           # Middleware JWT
├── utils/
│   └── airtableHelpers.ts # Helpers sécurisés pour Airtable
├── uploads/              # Fichiers PDF uploadés
├── routes.ts             # Définition des routes API
└── index.ts              # Point d'entrée du serveur

shared/
└── schema.ts             # Schémas de validation Zod
```

## 🚀 Démarrage

L'API démarre automatiquement avec :
```bash
npm run dev
```

Le serveur écoute sur **http://0.0.0.0:5000**

### Health Check
```bash
curl http://0.0.0.0:5000/health
```

## 🔑 Variables d'Environnement

Les secrets suivants sont configurés dans Replit Secrets :

- `AIRTABLE_API_KEY` - Clé API Airtable
- `AIRTABLE_BASE_ID` - ID de la base Airtable  
- `JWT_SECRET` - Secret pour les tokens JWT

## 📊 Configuration Airtable

Créez deux tables dans votre base Airtable :

### Table "Users"
| Champ | Type | Description |
|-------|------|-------------|
| email | Single line text | Email de l'utilisateur (unique) |
| password | Long text | Mot de passe hashé |
| companyName | Single line text | Nom de l'entreprise (optionnel) |
| createdAt | Single line text | Date de création (ISO) |

### Table "Invoices"
| Champ | Type | Description |
|-------|------|-------------|
| userId | Single line text | ID de l'utilisateur propriétaire |
| invoiceNumber | Single line text | Numéro de facture |
| clientName | Single line text | Nom du client |
| clientEmail | Email | Email du client |
| amount | Number | Montant total |
| currency | Single line text | Devise (EUR, USD, etc.) |
| status | Single select | draft, sent, paid, overdue |
| dueDate | Single line text | Date d'échéance (ISO) |
| items | Long text | Articles (JSON stringifié) |
| notes | Long text | Notes (optionnel) |
| pdfUrl | URL | URL du PDF (optionnel) |
| createdAt | Single line text | Date de création (ISO) |
| updatedAt | Single line text | Date de modification (ISO) |

## 📚 Documentation API

Consultez [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) pour la documentation complète des endpoints :

- **Authentification** : `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- **Utilisateurs** : `/api/users/profile`
- **Factures** : `/api/invoices` (CRUD complet)
- **Upload** : `/api/upload/pdf`, `/api/uploads/:filename`

## 🔒 Sécurité

- ✅ Mots de passe hashés avec bcrypt (10 rounds)
- ✅ Tokens JWT valides 7 jours
- ✅ Protection contre les injections de formules Airtable
- ✅ Protection contre le directory traversal
- ✅ Uploads de fichiers authentifiés uniquement
- ✅ Validation des données avec Zod
- ✅ CORS configuré

## 🛠️ Technologies

- **Node.js** - Runtime JavaScript
- **Express** - Framework web minimaliste
- **Airtable** - Base de données cloud
- **JWT** - JSON Web Tokens pour l'authentification
- **Bcrypt** - Hashage sécurisé des mots de passe
- **Zod** - Validation des schémas
- **Multer** - Upload de fichiers
- **CORS** - Cross-Origin Resource Sharing
- **TypeScript** - Typage statique

## 📝 Exemples d'Utilisation

### Inscription
```bash
curl -X POST http://0.0.0.0:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "motdepasse123",
    "companyName": "Ma Société"
  }'
```

### Connexion
```bash
curl -X POST http://0.0.0.0:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "motdepasse123"
  }'
```

### Créer une Facture
```bash
curl -X POST http://0.0.0.0:5000/api/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
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
    ]
  }'
```

## 📦 Déploiement

Pour déployer en production :

1. Assurez-vous que toutes les variables d'environnement sont configurées
2. Configurez l'origine CORS pour votre domaine frontend
3. L'application est prête pour Replit Deployment

## 🤝 Support

Pour toute question ou problème, consultez la documentation API ou les logs du serveur.

---

**Développé avec ❤️ pour Peppol Light**
