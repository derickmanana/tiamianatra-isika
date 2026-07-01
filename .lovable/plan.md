# M'BossTsika — Correction urgente + Écosystème Emploi

Votre demande couvre **deux sujets très différents**. Je propose de traiter d'abord l'urgence (bugs d'affichage), puis de découper l'écosystème pro en phases livrables — un mega-lot unique serait risqué et long à valider.

---

## PHASE 0 — URGENT : Suppression des couvertures auto & durcissement médias

Cause identifiée des bandes colorées / lags : le fallback `getFormationCover` (src/lib/formation-covers.ts) associe automatiquement des images bundlées via regex sur le titre (Canva, Musique, Crypto, "gagner"…). Ces images sont chargées même quand l'admin n'en a pas défini. On supprime ce comportement.

**Changements**
- `src/lib/formation-covers.ts` : remplacer les mappings regex par UNE seule image par défaut neutre (`formation-business.jpg`).
- `getFormationCover` retourne :
  - `cover_url` si défini ET valide (http(s) ou chemin storage)
  - sinon → image par défaut unique
  - jamais d'image "devinée" à partir du titre
- `CoverImage.tsx` : durcir la validation
  - refuser toute URL non http(s) ou chemin storage
  - `onError` déjà présent → étendre : logger dans `console.warn`, marquer l'image comme "corrompue" en cache mémoire (Set) pour ne plus la retenter
  - garder `preferStatic` pour vidéos (thumbnail YouTube)
- `HeroSlider.tsx` : idem — image manquante = slide texte only
- Aucune génération auto, aucun appel imagegen côté runtime.

**Résultat** : plus aucune couverture "IA/auto". L'admin doit uploader ou fournir une URL. Fallback = 1 image neutre stable.

---

## PHASE 1 — Espace Partenaires (Formateur / Recruteur)

### Base de données
- Enum `partner_type` : `formateur | recruteur`
- Table `partners` : user_id, type, display_name, bio, logo_url, status (`pending|approved|rejected|suspended`), commission_rate
- Ajout rôle `partner` à `app_role` + `has_role` déjà en place
- `formations.owner_partner_id` (nullable) + `formations.status` (`draft|pending|approved|rejected`)
- Modules/vidéos : hérite du statut de la formation parente
- RLS : partenaire écrit ses propres formations en `pending`, admin approuve

### UI
- Route `/_authenticated/partenaire/` (layout)
  - `partenaire.index.tsx` : dashboard
  - `partenaire.formations.tsx` : CRUD formations en attente
  - `partenaire.offres.tsx` : (recruteur) offres d'emploi
- Sélecteur rôle à l'inscription : Étudiant / Formateur / Recruteur → crée `partners` en `pending`
- Onglet Admin "Partenaires" : approuver/refuser/suspendre

---

## PHASE 2 — Profil professionnel Étudiant (CV / Portfolio)

### DB
- `profiles` : `headline`, `bio`, `phone`, `location`, `avatar_url` (existant?), `cv_url`, `portfolio_url`, `social_links` (jsonb), `is_complete` (bool calculé)
- Tables `experiences`, `skills`, `education` (liées à user_id)

### UI
- Page `/_authenticated/profil` refonte : sections CV, Expériences, Compétences, Formations, Portfolio, Réseaux sociaux
- Badge "Profil complet" quand tous les champs requis sont remplis

---

## PHASE 3 — Espace Emploi

### DB
- `job_offers` : recruiter_id, title, description, requirements (jsonb : cv/portfolio/certificat/diplôme), location, salary_range, status
- `job_applications` : user_id, job_id, cover_letter, status (`submitted|reviewing|interview|accepted|rejected`)
- `job_assessments` (QCM/écrit/cas pratique) + `assessment_responses` avec chronomètre
- RLS complètes

### UI
- `/_authenticated/emploi.index.tsx` : liste offres + filtres
- `/_authenticated/emploi.$id.tsx` : détail + bouton Postuler (gate : profil complet + CV + portfolio si exigé)
- `/_authenticated/mes-candidatures.tsx` : suivi
- Recruteur : `/partenaire/offres` CRUD + `partenaire/candidatures.$jobId` + éditeur QCM

---

## PHASE 4 — Refonte Accueil style Coursera/Udemy + Messagerie enrichie

- Slider annonces (déjà en place — polish)
- Sections : Formations populaires, Nouveautés, **Emplois récents**, Meilleurs étudiants, Certificats récents
- Messagerie : ajouter canaux Admin↔Partenaire, Client↔Recruteur, Client↔Formateur (extension du système `messages` existant avec `thread_type`)
- Notifications temps réel via Supabase Realtime sur `notifications`
- Optimisation : `React.memo` sur toutes les cartes (déjà en cours), lazy routes, `IntersectionObserver` déjà présent pour YouTube

---

## Détails techniques transverses

- **Aucun upload direct de vidéo** : uniquement URL YouTube (déjà en place) — étendre aux offres/portfolio
- **Validation médias** : util `isSafeImageUrl(url)` + fallback systématique
- **Lazy loading** : `loading="lazy"` + `decoding="async"` partout (déjà appliqué sur `CoverImage`)
- **Compatibilité Android WebView** : bannir `backdrop-filter` (déjà fait), éviter `filter: drop-shadow` sur listes, préférer `text-shadow`

---

## Ma recommandation

**Je démarre par PHASE 0 immédiatement** (30 min, corrige les bugs graphiques signalés). Puis vous validez chaque phase avant que je passe à la suivante.

Voulez-vous que je :
1. **Lance Phase 0 maintenant** (correction urgente couvertures), puis on discute les phases suivantes ?
2. Enchaîne Phase 0 + Phase 1 (Partenaires) dans la foulée ?
3. Autre priorité (Emploi d'abord ? Profil pro d'abord ?)
