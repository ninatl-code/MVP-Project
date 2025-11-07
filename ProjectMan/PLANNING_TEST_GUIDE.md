# Guide de test du Planning Smartsheet

## 🎯 Résumé des modifications

✅ **Problème résolu** : L'erreur "Could not find the 'indent_level' column of 'tasks'" a été corrigée
✅ **Nouvelle architecture** : Le planning est maintenant sauvegardé en JSON dans `deliverables.content`
✅ **Sauvegarde automatique** : Chaque modification est instantanément sauvegardée

## 📊 Comment accéder au planning

### URL de test
```
http://localhost:3000/project/[PROJECT_ID]/documents/generators/planning?deliverableId=[DELIVERABLE_ID]
```

### Paramètres requis
- `projectId` : ID du projet (dans l'URL)
- `deliverableId` : ID du livrable (en query parameter)

## 🗃️ Structure de données dans deliverables.content

```json
{
  "tasks": [
    {
      "id": "unique_id",
      "title": "Nom de la tâche",
      "assignee": "Responsable", 
      "start_date": "2024-11-01",
      "end_date": "2024-11-15",
      "notes": "Notes sur la tâche",
      "status": "À faire|En cours|Terminé|En attente|Bloqué",
      "progress": 0-100
    }
  ],
  "lastUpdated": "2024-11-07T...",
  "version": "1.0"
}
```

## ✨ Fonctionnalités disponibles

### Interface Smartsheet
- ✅ Tableau avec colonnes : Tâche, Responsable, Début, Fin, Durée, Notes, Statut
- ✅ Édition inline (clic pour modifier)
- ✅ Diagramme de Gantt synchronisé
- ✅ Vue Timeline avec barres de progression
- ✅ Sauvegarde automatique à chaque modification

### Actions disponibles
- ✅ **Ajouter une ligne** : Bouton + dans le header
- ✅ **Éditer une cellule** : Clic sur n'importe quelle cellule
- ✅ **Supprimer une tâche** : Bouton de suppression
- ✅ **Calcul automatique de durée** : Basé sur les dates

## 🧪 Test rapide

1. **Accéder au planning** : Utiliser l'URL avec un `deliverableId` valide
2. **Ajouter une tâche** : Cliquer sur le bouton "+" 
3. **Modifier des cellules** : Cliquer sur n'importe quelle cellule pour l'éditer
4. **Vérifier la sauvegarde** : Observer le message "Sauvegarde en cours..." puis "sauvegardé"
5. **Rafraîchir la page** : Les données doivent persister

## 🔧 Debug

### Si aucune donnée n'apparaît
- Vérifier que `deliverableId` est valide dans l'URL
- Ouvrir la console : des logs détaillés y apparaissent
- Vérifier que la table `deliverables` existe dans Supabase

### Si les modifications ne se sauvegardent pas
- Ouvrir la console pour voir les erreurs
- Vérifier les permissions sur la table `deliverables`
- S'assurer que l'utilisateur est authentifié

## 📝 Structure de test recommandée

Pour tester, créer un livrable de type "Planning" dans un projet existant, puis utiliser son ID dans l'URL.

Le planning sera automatiquement sauvegardé dans la colonne `content` du livrable sous forme de JSON structuré.