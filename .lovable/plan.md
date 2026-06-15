# M'BossTsika — Plan de construction

Plateforme de vente de formations vidéo (YouTube) avec interfaces client et admin, multilingue (MG / FR / EN), mode clair/sombre, paiements manuels avec preuve.

## Étapes proposées

### Phase 1 — Fondations
1. Activer **Lovable Cloud** (auth + base de données + storage).
2. Design system M'BossTsika (couleurs, gradients, dark mode, animations légères, tokens dans `src/styles.css`).
3. i18n (MG / FR / EN) via `react-i18next` avec sélecteur de langue persistant.
4. Layout principal : navigation fixe, bouton retour, sélecteur langue, switch thème.

### Phase 2 — Base de données & sécurité
Tables : `profiles`, `user_roles` (enum admin/client), `formations`, `modules`, `playlists`, `videos`, `payments`, `unlocked_modules`, `notifications`, `messages`, `announcements`, `payment_methods`, `settings`, `user_activity_logs`.
- RLS sur toutes les tables, fonction `has_role` security-definer.
- Trigger auto-création profil au signup.
- Seed : formations + modules (3 par formation) + méthodes de paiement Mvola/Orange/Binance + taux USDT (4450) + prix (52 500 Ar).
- Bucket Storage `payment-proofs` (privé) + `formation-covers` (public).
- **Admin principal** : créé via migration avec `rasolonjatovojeannoel21@gmail.com` + rôle admin (le mot de passe initial sera défini au premier signup via "mot de passe oublié" pour sécurité — voir note ci-dessous).

### Phase 3 — Auth
- Pages `/auth` (login + signup email/password) et `/reset-password`.
- Route guard `_authenticated` (déjà géré par l'intégration).
- Profil utilisateur modifiable.

### Phase 4 — Interface Client
Menu : Accueil · Formations · Mes Modules · Paiements · Notifications · Messages · Profil.
- Accueil : annonces actives + formations en vedette.
- Liste formations → détail → modules verrouillés en cascade.
- Clic module verrouillé → page paiement : affiche méthodes (Mvola/Orange/Binance) + montant Ar + montant USDT calculé, upload capture (JPG/PNG/JPEG/WEBP), soumission → statut "en attente".
- Module débloqué → lecteur YouTube intégré avec liste vidéos (miniature, titre, durée, ordre).
- Verrouillage cascade : module N+1 bloqué tant que N non validé.
- Notifications + Messages + Historique paiements.

### Phase 5 — Interface Admin
Menu : Dashboard · Formations · Modules · Vidéos · Paiements · Utilisateurs · Notifications · Messages · Annonces · Paramètres Paiement · Paramètres App.
- Dashboard : stats (users, formations, modules, vidéos, paiements en attente/validés, revenus total + par formation, activités récentes).
- CRUD formations / modules / playlists.
- **Import playlist YouTube** : server function qui appelle l'API YouTube Data v3 (nécessite `YOUTUBE_API_KEY`) → récupère vidéos (titre, miniature, durée ISO 8601, position) → insère dans `videos`. Bouton "resynchroniser".
- Paiements : liste, zoom capture, valider/refuser + commentaire → déclenche déblocage + notification.
- Utilisateurs : recherche, profil, bloquer/débloquer/supprimer.
- Messages : envoi individuel ou broadcast.
- Annonces : CRUD + activer/désactiver.
- Paramètres paiement : modifier numéros, titulaire, prix, taux USDT (sans toucher au code).

### Phase 6 — Finitions
- Logs d'activité.
- Sitemap + robots.txt.
- SEO meta par route.
- Tests de flux : signup → achat module 1 → validation admin → déblocage → lecture vidéos.

## Détails techniques

**Stack** : TanStack Start (template) + React + Tailwind + Lovable Cloud (Supabase géré). Pas de Vercel — déploiement Lovable.

**i18n** : `react-i18next` + `i18next-browser-languagedetector`, fichiers JSON par langue dans `src/locales/`.

**Lecteur YouTube** : iframe embed standard avec `playlist` param (pas besoin de clé pour lecture).

**Import playlist** : server function `importPlaylist` utilisant `https://www.googleapis.com/youtube/v3/playlistItems` + `videos?part=contentDetails` pour durée. Requiert secret `YOUTUBE_API_KEY` (à demander après activation Cloud).

**Admin initial — note importante** : Supabase Auth ne permet pas d'injecter un hash bcrypt directement dans une migration de façon fiable et sécurisée. Approche : la migration crée le rôle admin pour l'email `rasolonjatovojeannoel21@gmail.com` dès qu'il s'inscrit (trigger sur `auth.users` qui assigne rôle `admin` si email match). L'utilisateur s'inscrit normalement avec le mot de passe `@madaga2100/9991` via la page signup → devient automatiquement admin. C'est plus sûr que d'embarquer le hash en clair.

**Calcul USDT** : `Math.round((prix_ar / taux_usdt) * 100) / 100` affiché à 2 décimales.

**Sécurité** :
- RLS partout, jamais de rôle sur `profiles`.
- Server functions pour toute opération admin (valider paiement, importer playlist) protégées par `requireSupabaseAuth` + check `has_role(admin)`.
- Upload preuves : validation type + taille côté client et serveur.

## Questions avant de démarrer

1. **Clé API YouTube** : pour l'import automatique des playlists, il faut une clé API YouTube Data v3 (gratuite, créée dans Google Cloud Console). Je peux te guider pour l'obtenir au moment voulu. OK ?
2. **Admin initial** : OK pour l'approche "auto-promote sur signup de l'email cible" décrite ci-dessus ?
3. **Scope phase 1** : je construis tout d'un coup (gros) ou on démarre par fondations + auth + client browsing, puis paiements, puis admin dans des itérations suivantes ?