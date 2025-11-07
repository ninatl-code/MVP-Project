# 📋 ProjectHub - Outil de Gestion de Documents de Projet

## 🎯 **Vue d'ensemble**

ProjectHub est un outil complet destiné aux chefs de projet pour créer, personnaliser et gérer des documents professionnels à travers toutes les phases d'un projet. L'outil utilise des modèles prédéfinis et permet une personnalisation avancée (logo, couleurs, polices, mise en page).

## 🏗️ **Architecture**

### **Stack Technique**

- **Frontend**: Next.js (React) avec JavaScript
- **Base de données**: Supabase (PostgreSQL)
- **Styling**: CSS-in-JS avec styles personnalisés
- **Export**: jsPDF + html2canvas pour génération PDF
- **Authentification**: Supabase Auth

### **Structure des Pages**

```
pages/
├── projectman.js           # Dashboard principal
├── documents/
│   ├── index.js           # Liste de tous les documents
│   ├── templates.js       # Sélection de modèles
│   ├── create/[id].js     # Création par type de document
│   └── edit/[id].js       # Éditeur de document complet
├── project/[id].js        # Détails d'un projet
├── login.js & signup.js   # Authentification
```

## 🚀 **Getting Started**

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.
