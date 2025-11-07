# 🚀 Guide de Démarrage Rapide - ProjectHub

## ✅ **Étapes de Configuration**

### **1. Base de Données Supabase**

Exécutez les scripts SQL dans l'ordre suivant :

```sql
-- 1. Améliorations du schéma
-- Copiez le contenu de database/schema_improvements.sql
-- et exécutez-le dans l'éditeur SQL de Supabase

-- 2. Données d'exemple
-- Copiez le contenu de database/seed_data.sql
-- et exécutez-le pour avoir des types de documents prêts
```

### **2. Test des Fonctionnalités**

#### **Navigation Recommandée**

1. **Connexion** → Créez un compte ou connectez-vous
2. **Dashboard** → `/projectman` - Vue d'ensemble
3. **Créer un Projet** → Cliquez sur "+ Create Project"
4. **Parcourir les Modèles** → `/documents/templates`
5. **Créer un Document** → Sélectionner un type → Remplir → Créer
6. **Éditeur** → `/documents/edit/[id]` - Personnalisez et exportez

#### **Fonctionnalités à Tester**

- ✅ Changement de langue (EN/FR)
- ✅ Création de projet
- ✅ Sélection de modèles par phase
- ✅ Édition de contenu
- ✅ Personnalisation (couleurs, polices)
- ✅ Prévisualisation temps réel
- ✅ Export PDF
- ✅ Sauvegarde automatique

### **3. Personnalisation des Modèles**

#### **Ajouter un Nouveau Type de Document**

```sql
INSERT INTO deliverable_types (name, description, phase_id) VALUES
('Mon Nouveau Document', 'Description du document', 'uuid_de_la_phase');
```

#### **Créer un Template Personnalisé**

```sql
INSERT INTO deliverable_templates (name, description, type_id, content, is_public) VALUES
('Mon Template', 'Description', 'uuid_du_type',
'{
  "sections": [
    {
      "id": "header",
      "type": "header",
      "title": {"en": "My Document", "fr": "Mon Document"}
    },
    {
      "id": "content",
      "type": "content",
      "fields": [
        {
          "id": "main_content",
          "type": "textarea",
          "label": {"en": "Content", "fr": "Contenu"},
          "rows": 10
        }
      ]
    }
  ]
}', true);
```

## 📱 **Pages Principales**

| Page              | URL                          | Description                  |
| ----------------- | ---------------------------- | ---------------------------- |
| **Dashboard**     | `/projectman`                | Vue d'ensemble, accès rapide |
| **Modèles**       | `/documents/templates`       | Galerie de templates         |
| **Mes Documents** | `/documents`                 | Liste avec filtres           |
| **Création**      | `/documents/create/[typeId]` | Nouveau document             |
| **Édition**       | `/documents/edit/[docId]`    | Éditeur complet              |

## 🎨 **Personnalisation Rapide**

### **Changer les Couleurs par Défaut**

Dans `pages/documents/edit/[id].js`, modifiez :

```javascript
const [customization, setCustomization] = useState({
  primaryColor: "#YOUR_COLOR", // Couleur principale
  secondaryColor: "#YOUR_COLOR", // Couleur secondaire
  fontFamily: "YOUR_FONT", // Police
  fontSize: 14, // Taille
});
```

### **Ajouter de Nouvelles Polices**

Dans le même fichier, ajoutez à `FONT_FAMILIES` :

```javascript
const FONT_FAMILIES = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "YOUR_NEW_FONT", // ← Ajoutez ici
];
```

## 🔧 **Dépannage Courant**

### **Problème de Connexion**

- Vérifiez les variables d'environnement Supabase
- Vérifiez que les tables existent dans Supabase

### **Pas de Templates Affichés**

- Exécutez `database/seed_data.sql`
- Vérifiez que `is_public = true` sur les templates

### **Export PDF ne Fonctionne Pas**

- Vérifiez que `jspdf` et `html2canvas` sont installés
- Testez dans un navigateur moderne

### **Modifications Non Sauvegardées**

- Vérifiez la console pour erreurs Supabase
- Vérifiez les permissions RLS (Row Level Security)

## 🎯 **Prochaines Étapes Recommandées**

1. **Testez le Flow Complet** : Créer → Éditer → Exporter
2. **Personnalisez les Templates** : Ajoutez vos propres modèles
3. **Configurez l'Apparence** : Logo, couleurs corporate
4. **Créez des Types Spécifiques** : Documents métier personnalisés

## 📞 **Besoin d'Aide ?**

- 📚 Documentation complète : `README.md`
- 🗂️ Exemples de code : `/database/jsonb_structures.js`
- 🐛 Problèmes connus : Vérifiez la console navigateur

---

**Bon développement ! 🚀**
