#!/bin/bash
# Installation & Setup Script pour le système de matching
# À exécuter dans le terminal du projet

echo "🚀 Installation du système de matching photographe/client"
echo "=========================================================="

# ============================================
# STEP 1: Installer dépendances
# ============================================

echo ""
echo "📦 Step 1: Installation des dépendances..."
echo ""

# Vérifier si package.json existe
if [ ! -f "package.json" ]; then
  echo "❌ ERROR: package.json non trouvé"
  echo "Exécuter ce script depuis la racine du projet"
  exit 1
fi

# Installer packages nécessaires
echo "Installing: @react-native-community/datetimepicker"
expo install @react-native-community/datetimepicker

echo "Installing: expo-image-picker"
expo install expo-image-picker

echo "Installing: expo-web-browser"
expo install expo-web-browser

echo "✅ Dependencies installées"

# ============================================
# STEP 2: Vérifier structure fichiers
# ============================================

echo ""
echo "📁 Step 2: Vérification structure fichiers..."
echo ""

# Créer dossiers s'ils n'existent pas
mkdir -p app/photographe/profil
mkdir -p app/client/demandes
mkdir -p lib
mkdir -p database

echo "✅ Dossiers créés/vérifiés"

# ============================================
# STEP 3: Vérifier fichiers existants
# ============================================

echo ""
echo "🔍 Step 3: Vérification fichiers..."
echo ""

FILES=(
  "app/photographe/profil/profil-complet.tsx"
  "app/client/demandes/nouvelle-demande.tsx"
  "app/client/demandes/resultats.tsx"
  "lib/matchingService.ts"
  "lib/photographerProfileSchema.ts"
  "lib/clientBookingSchema.ts"
  "database/migrations_matching_system.sql"
  "SETUP_MATCHING_SYSTEM.md"
  "README_MATCHING_SYSTEM.md"
  "QUICKSTART.md"
)

MISSING=0
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✓ $file"
  else
    echo "✗ $file - MISSING"
    MISSING=$((MISSING + 1))
  fi
done

if [ $MISSING -gt 0 ]; then
  echo ""
  echo "⚠️ WARNING: $MISSING fichiers manquent"
  echo "S'assurer que tous les fichiers sont présents"
else
  echo ""
  echo "✅ Tous les fichiers trouvés!"
fi

# ============================================
# STEP 4: Vérifier TypeScript
# ============================================

echo ""
echo "🔧 Step 4: Vérification TypeScript..."
echo ""

# Vérifier les fichiers TypeScript
npx tsc --noEmit app/photographe/profil/profil-complet.tsx 2>/dev/null
if [ $? -eq 0 ]; then
  echo "✓ profil-complet.tsx - OK"
else
  echo "✗ profil-complet.tsx - Erreurs TypeScript"
fi

npx tsc --noEmit app/client/demandes/nouvelle-demande.tsx 2>/dev/null
if [ $? -eq 0 ]; then
  echo "✓ nouvelle-demande.tsx - OK"
else
  echo "✗ nouvelle-demande.tsx - Erreurs TypeScript"
fi

npx tsc --noEmit app/client/demandes/resultats.tsx 2>/dev/null
if [ $? -eq 0 ]; then
  echo "✓ resultats.tsx - OK"
else
  echo "✗ resultats.tsx - Erreurs TypeScript"
fi

# ============================================
# STEP 5: Instructions finales
# ============================================

echo ""
echo "📋 Step 5: Prochaines étapes..."
echo ""

echo "1️⃣ DATABASE SETUP (URGENT)"
echo "   - Ouvrir Supabase Dashboard"
echo "   - SQL Editor"
echo "   - Copier database/migrations_matching_system.sql"
echo "   - Exécuter (RUN)"
echo "   - Attendre confirmation"
echo ""

echo "2️⃣ ROUTING"
echo "   - Ajouter routes dans app/_layout.tsx"
echo "   - Voir SETUP_MATCHING_SYSTEM.md pour détails"
echo ""

echo "3️⃣ BOUTONS MENU"
echo "   - Ajouter boutons de navigation"
echo "   - Voir QUICKSTART.md pour code"
echo ""

echo "4️⃣ TEST"
echo "   - npm start"
echo "   - Tester workflow complet"
echo "   - Vérifier Supabase"
echo ""

echo "5️⃣ DOCUMENTATION"
echo "   - Lire QUICKSTART.md (10 min)"
echo "   - Lire SETUP_MATCHING_SYSTEM.md (30 min)"
echo "   - Consulter README_MATCHING_SYSTEM.md (20 min)"
echo ""

# ============================================
# SUCCESS MESSAGE
# ============================================

echo "=========================================================="
echo "✅ Installation préparatoire terminée!"
echo "=========================================================="
echo ""
echo "📚 Documentation disponible:"
echo "   • QUICKSTART.md - Démarrage rapide"
echo "   • SETUP_MATCHING_SYSTEM.md - Setup complet"
echo "   • README_MATCHING_SYSTEM.md - Vue complète"
echo "   • EXEMPLE_UTILISATION.ts - Exemples code"
echo "   • TROUBLESHOOTING.ts - FAQ & debug"
echo ""
echo "🚀 Prêt pour le développement!"
echo ""
