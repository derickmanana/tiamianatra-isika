# Plan de finalisation M'BossTsika

Ce chantier est volumineux. Je propose de le découper en phases livrables et de demander votre approbation avant exécution.

## Phase 1 — Corrections critiques (priorité immédiate)

**1.1 Clé YouTube API + page Paramètres API (admin)**
- Nouvelle table `api_settings` (key/value) protégée admin only.
- Modifier `syncPlaylist` : lire la clé d'abord depuis `api_settings`, fallback `process.env.YOUTUBE_API_KEY`.
- Page `/admin` → onglet "Paramètres API" : champ YouTube API Key (masqué), bouton Tester, bouton Enregistrer.
- Détection auto de l'ID playlist depuis URL collée (déjà partiellement en place, à fiabiliser : supporter `youtu.be`, `list=PL…`, ID brut).

**1.2 Validation des paiements (admin)**
- Onglet "Paiements" admin avec table : utilisateur, formation, module, date, méthode, montant, capture (miniature cliquable → aperçu plein écran modal), statut.
- Boutons Valider / Refuser (modale motif si refus).
- Backend déjà en place (`reviewPayment`) — câbler l'UI et corriger la requête (jointures profiles/modules/formations + URL signée pour la capture du bucket privé).

**1.3 Images par défaut des formations**
- Générer 6 images (1 par formation) via imagegen, uploader comme assets, seeder `formations.cover_url`.
- Admin peut remplacer l'image (upload dans bucket public `formation-covers`).

## Phase 2 — Contenu & Tarification

**2.1 Titres de modules personnalisables** : CRUD admin (créer/modifier/supprimer titre) — colonne `title` existe déjà sur `modules`, ajouter l'UI.
**2.2 Prix par module** : la colonne `price_ariary` existe sur `modules`. Migration de seed (52 500 / 75 000 / 100 000), UI admin pour éditer.
**2.3 Remises utilisateur** : nouvelle table `user_discounts (user_id, percent)`. Appliquée automatiquement au calcul du montant à payer.

## Phase 3 — Profil & Gamification

**3.1 Profil enrichi** : ajout colonnes `avatar_url`, affichage email, date d'inscription. Upload photo (bucket `avatars` public). Édition nom/téléphone/photo.
**3.2 Badges automatiques** : fonction SQL `get_user_badge(user_id)` basée sur le nombre de formations terminées (toutes leurs modules débloqués). Affichage : profil, classement, messages.
**3.3 Certificats** :
- Table `certificates (user_id, formation_id, pdf_url, issued_at, signature_url)`.
- Génération auto côté client (jsPDF) quand le module 3 d'une formation est débloqué, avec logo + nom + formation + date.
- Admin : upload PDF custom, modifier, supprimer.
- Client : voir + télécharger.

## Phase 4 — Affiliation

- Table `affiliate_codes (user_id, code unique, expires_at, uses_count)`.
- Table `affiliate_uses (code_id, used_by, payment_id)`.
- Génération 1 code par utilisateur (30 jours).
- À l'utilisation : −5 % au nouvel utilisateur, +10 % crédité au propriétaire (cumulable jusqu'à 100 %), au 10ᵉ usage : 1 module gratuit attribué + reset compteur.
- Dashboard affiliation : utilisations / gains / modules gratuits gagnés.

## Phase 5 — Refonte design premium

- Palette : Bleu professionnel #1E3A8A + Doré #D4AF37 + Blanc + Noir moderne. Mise à jour `src/styles.css` (tokens, gradients, shadows).
- Cartes formations modernes (cover image, gradient overlay, badge prix).
- Dashboard admin avec stats visuelles (recharts) : revenus, paiements en attente, utilisateurs actifs.
- Animations (framer-motion déjà dispo ? sinon transitions CSS).
- Progression utilisateur : barre par formation, indicateur modules.
- Bottom nav mobile redesign, header desktop premium.

## Détails techniques

- 5 nouvelles migrations (api_settings, user_discounts, certificates, affiliate_codes/uses, colonnes profiles+modules).
- 2 nouveaux buckets : `formation-covers` (public), `avatars` (public), `certificates` (privé).
- ~6 server functions admin supplémentaires (saveApiKey, setUserDiscount, generateAffiliateCode, redeemAffiliateCode, uploadCertificate, etc.) toutes protégées via `has_role('admin')`.
- jsPDF + qrcode pour certificats côté client.
- recharts pour dashboard admin.

## Estimation

Travail très volumineux (~30-40 fichiers modifiés/créés, 5 migrations, génération de 6 images). Je recommande de livrer **Phase 1 d'abord** (vos blocages immédiats : clé YouTube + paiements + images), puis d'enchaîner phase par phase après votre validation de chaque livraison.

## Question

Souhaitez-vous que je :
- **(A)** Démarre par la **Phase 1 seule** (corrections critiques) et qu'on enchaîne ensuite ?
- **(B)** Exécute **tout le plan d'un coup** (long, plus de risques d'erreurs à corriger en cascade) ?
- **(C)** Réordonner / retirer certaines phases ?
