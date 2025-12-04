# Configuration Vercel Cron Jobs

## 1. Créer vercel.json à la racine du projet photo-app

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-transfer-balance",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Schedule expliqué :**

- `0 2 * * *` = Tous les jours à 2h00 du matin (UTC)
- Format : minute heure jour mois jour_semaine

**Autres exemples :**

- `0 */6 * * *` = Toutes les 6 heures
- `0 0 * * 0` = Tous les dimanches à minuit
- `*/30 * * * *` = Toutes les 30 minutes (dev/test)

## 2. Variables d'environnement à ajouter

Dans Vercel Dashboard > Settings > Environment Variables :

```
CRON_SECRET=votre_secret_aleatoire_tres_long
STRIPE_SECRET_KEY=sk_live_... (déjà existant)
NEXT_PUBLIC_BASE_URL=https://votre-domaine.com
```

**Générer CRON_SECRET :**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Tester localement (sans cron)

```bash
# Installer dependencies si besoin
npm install

# Tester l'endpoint avec curl
curl -X GET http://localhost:3000/api/cron/auto-transfer-balance \
  -H "Authorization: Bearer VOTRE_CRON_SECRET"
```

## 4. Déployer sur Vercel

```bash
vercel --prod
```

Le cron sera automatiquement activé après le déploiement.

## 5. Monitorer les exécutions

### Dans Vercel Dashboard :

- **Deployments** > **Functions** > Voir les logs de `auto-transfer-balance`
- Les logs montrent chaque exécution avec le résultat

### Dans Supabase :

```sql
-- Voir les transferts automatiques
SELECT * FROM transactions
WHERE type = 'balance_transfer'
AND metadata->>'triggered_by' = 'cron'
ORDER BY created_at DESC;

-- Statistiques
SELECT
  DATE(created_at) as date,
  COUNT(*) as nb_transfers,
  SUM(amount) as total_amount
FROM transactions
WHERE type = 'balance_transfer'
  AND metadata->>'triggered_by' = 'cron'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 6. Désactiver temporairement

Pour désactiver le cron sans supprimer le code :

**Option 1 :** Commenter dans vercel.json

```json
{
  "crons": [
    // {
    //   "path": "/api/cron/auto-transfer-balance",
    //   "schedule": "0 2 * * *"
    // }
  ]
}
```

**Option 2 :** Ajouter une variable d'environnement

```
CRON_ENABLED=false
```

Et dans le code :

```javascript
if (process.env.CRON_ENABLED === "false") {
  return res.status(200).json({ message: "Cron désactivé" });
}
```

## 7. Alertes en cas d'erreur

### Slack/Discord Webhook (optionnel)

```javascript
// À ajouter dans auto-transfer-balance.js
if (results.errors.length > 0) {
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    body: JSON.stringify({
      text: `⚠️ ${results.errors.length} erreurs dans le cron auto-transfer-balance`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Erreurs:*\n${results.errors
              .map((e) => `• ${e.reservation_id}: ${e.error}`)
              .join("\n")}`,
          },
        },
      ],
    }),
  });
}
```

## 8. Fallback manuel

Si le cron échoue, vous pouvez déclencher manuellement :

### Via l'interface admin (à créer)

```javascript
// pages/admin/trigger-balance-transfers.js
const handleTrigger = async () => {
  const res = await fetch("/api/cron/auto-transfer-balance", {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  const data = await res.json();
  console.log("Résultat:", data);
};
```

### Via Supabase Edge Function

```sql
-- Fonction SQL pour marquer manuellement
UPDATE reservations
SET status = 'finished'
WHERE id = 'reservation_id_ici';

-- Le cron s'en occupera à la prochaine exécution
```

## Sécurité

✅ **Header Authorization obligatoire** - Empêche les appels non autorisés
✅ **CRON_SECRET dans .env** - Jamais exposé dans le code
✅ **Vérification des UUIDs** - Protection contre l'injection
✅ **Logs détaillés** - Traçabilité de chaque transfert
✅ **Transactions table** - Audit trail complet

## Support

En cas de problème :

1. Vérifier les logs Vercel
2. Vérifier la table `transactions` dans Supabase
3. Tester l'endpoint manuellement avec curl
4. Vérifier que `CRON_SECRET` est bien défini
