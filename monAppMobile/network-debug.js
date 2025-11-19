// Diagnostics réseau pour l'app mobile Shooty
// À exécuter depuis le terminal dans monAppMobile/

// 1. Vérifier la configuration Supabase
console.log('=== DIAGNOSTIC RÉSEAU SHOOTY APP ===\n');

// Test 1: Vérification de la configuration
console.log('1. Configuration Supabase:');
console.log('URL: https://phnilkcfphwjjpojzrh.supabase.co');
console.log('Anonkey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');

// Test 2: Solutions pour "Network request failed"
console.log('\n2. Solutions pour "Network request failed":');
console.log('   a) Simulateur iOS: Reset simulator et redémarrer');
console.log('   b) Expo: npx expo start --clear');
console.log('   c) Metro: rm -rf node_modules && npm install');
console.log('   d) Android: Cold boot dans Android Studio');

// Test 3: Configuration réseau
console.log('\n3. Vérifications réseau:');
console.log('   • WiFi actif et stable');
console.log('   • Firewall/antivirus désactivé temporairement');
console.log('   • VPN désactivé si présent');
console.log('   • Proxy d\'entreprise configuré si nécessaire');

// Test 4: Commandes de debug
console.log('\n4. Commandes de debug:');
console.log('   npx expo doctor');
console.log('   npx expo install --fix');
console.log('   npx react-native doctor (si RN CLI installé)');

// Test 5: Variables d'environnement
console.log('\n5. Variables d\'environnement à vérifier:');
console.log('   EXPO_NO_TELEMETRY=1 (optionnel)');
console.log('   NODE_ENV=development');

console.log('\n=== FIN DIAGNOSTIC ===');
console.log('Si le problème persiste, vérifiez les logs détaillés dans l\'app.');