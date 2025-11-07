# Générateur de Workflow Interactif - Documentation

## 🎯 Vue d'ensemble

Le générateur de workflow interactif est une page web de type Miro/FigJam intégrée dans votre application Next.js. Il permet aux utilisateurs de créer des workflows visuels par glisser-déposer.

## 🚀 Installation et Configuration

### 1. Dépendances installées

```bash
npm install konva react-konva uuid file-saver --legacy-peer-deps
```

### 2. Fichiers créés

- `pages/documents/generators/workflow-interactive.js` - Page principale
- `components/WorkflowIcons.js` - Utilitaires d'icônes
- `tailwind.workflow.config.js` - Configuration Tailwind (optionnel)

## 🎨 Fonctionnalités implémentées

### ✅ Canvas interactif

- Zone de travail avec zoom et déplacement libre
- Grille optionnelle affichable/masquable
- Glisser-déposer des éléments

### ✅ Outils de création

- **Formes de workflow** : Début (🚀), Processus (⚙️), Décision (❓), Fin (🏁)
- **Formes de base** : Rectangle, Cercle, Flèche
- **Texte** : Éditable par double-clic
- **Palette de couleurs** : 8 couleurs prédéfinies

### ✅ Manipulation d'éléments

- Sélection et transformation (redimensionnement)
- Déplacement par glisser-déposer
- Suppression des éléments sélectionnés
- Historique Undo/Redo

### ✅ Interface utilisateur

- Barre d'outils latérale rétractable
- Header avec titre éditable et actions
- Contrôles de zoom intégrés
- Design moderne avec Tailwind CSS

### ✅ Sauvegarde et export

- Sauvegarde dans Supabase avec le workflow complet
- Export PNG haute résolution
- Retour automatique à la page projet

## 🔄 Navigation

### Depuis la page projet

Quand l'utilisateur clique sur un type de document contenant "workflow", "processus", "flux", ou "diagramme", il est automatiquement redirigé vers :

```
/documents/generators/workflow-interactive?projectId=XXX&typeId=YYY
```

### Retour au projet

- Bouton "← Retour au Projet" dans le header
- Redirection automatique après sauvegarde

## 🎮 Utilisation

### 1. Création d'éléments

- Cliquer sur un élément dans la sidebar pour l'ajouter au canvas
- Les éléments apparaissent avec une position aléatoire
- Utiliser les couleurs prédéfinies pour personnaliser

### 2. Manipulation

- **Sélection** : Cliquer sur un élément
- **Déplacement** : Glisser-déposer
- **Redimensionnement** : Poignées de transformation (rectangles/cercles)
- **Édition de texte** : Double-clic sur les éléments texte
- **Suppression** : Sélectionner puis cliquer "Supprimer"

### 3. Canvas

- **Zoom** : Molette de souris ou boutons +/-
- **Déplacement** : Glisser le canvas en mode sélection
- **Grille** : Checkbox dans la sidebar

### 4. Sauvegarde

- **Sauvegarder** : Sauvegarde complète dans Supabase
- **Export PNG** : Téléchargement d'image haute résolution

## 💾 Structure des données sauvegardées

```json
{
  "title": "Workflow - Nom du projet",
  "elements": [
    {
      "id": "uuid",
      "type": "rect|circle|text|arrow",
      "x": 100,
      "y": 100,
      "width": 120,
      "height": 80,
      "fill": "#3b82f6",
      "stroke": "#000000",
      "strokeWidth": 2,
      "text": "Nom de l'élément",
      "workflowType": "start|process|decision|end",
      "icon": "🚀"
    }
  ],
  "canvasSettings": {
    "zoom": 1,
    "position": { "x": 0, "y": 0 },
    "showGrid": true
  },
  "generatedAt": "2025-11-06T20:00:00.000Z",
  "projectId": "uuid"
}
```

## 🔧 Personnalisation

### Ajouter de nouveaux types d'éléments

Modifier `WORKFLOW_SHAPES` dans `workflow-interactive.js` :

```javascript
const WORKFLOW_SHAPES = [
  {
    id: "custom",
    name: "Nouveau Type",
    type: "process",
    color: "#custom",
    icon: "🎯",
  },
];
```

### Ajouter de nouvelles couleurs

Modifier `COLORS` dans le fichier :

```javascript
const COLORS = {
  // ... couleurs existantes
  custom: "#your-color",
};
```

### Personnaliser l'interface

Le design utilise Tailwind CSS. Modifier les classes CSS dans le JSX pour personnaliser l'apparence.

## 🔗 Intégration avec d'autres pages

Le générateur s'intègre automatiquement avec :

- `pages/project/[id].js` - Navigation depuis la page projet
- Base de données Supabase - Sauvegarde automatique
- Système d'authentification existant

## 🚨 Points d'attention

1. **Performance** : Avec de nombreux éléments, le canvas peut ralentir
2. **Responsive** : Interface optimisée pour desktop
3. **Navigateurs** : Testé sur Chrome/Firefox/Safari modernes
4. **Sauvegarde** : Vérifier la connexion Supabase avant sauvegarde

## 🔄 Mises à jour futures possibles

- Collaboration en temps réel (WebSockets)
- Plus de formes et outils
- Import/export SVG
- Templates de workflows prédéfinis
- Raccourcis clavier
- Alignement automatique
- Connexions automatiques entre éléments
