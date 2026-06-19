# Refonte complète Accueil M'BossTsika — Plan

Cette refonte touche la base de données, l'admin, et l'accueil client. Vu l'ampleur, je propose de découper en **3 phases livrables** plutôt qu'un seul mega-commit (risqué et difficile à valider).

---

## Phase 1 — Fondations base de données & couvertures vidéo

### Nouvelles tables
- `hero_slides` : type (text|image|video), title, body, media_url (image storage path), youtube_url, display_order, is_active
- `schools` : name, logo_url, description, country, display_order, is_active
- `learning_tracks` (types d'apprentissage) : code (`tsotra`|`certificat`|`diplome_equiv`|`diplome`), label, description, price_multiplier, is_active
- `course_durations` : name (Normal/Accéléré/Journée/Soir/Weekend), description, duration_weeks, price_multiplier, is_active
- `formation_enrollments` : user_id, formation_id, school_id, track_id, duration_id, status — trace le parcours utilisateur

### Modifs colonnes
- `formations` : ajouter `cover_type` ('image'|'video'), `youtube_url`, `price`, `level` (debutant|intermediaire|avance)
- Bucket `hero-media` (privé) pour images d'annonces

### Grants + RLS (admin write, authenticated read sur tables référentielles)

---

## Phase 2 — Interface Admin

Onglets ajoutés dans `/admin` :
- **Annonces Slider** : CRUD hero_slides + uploader image + champ YouTube + toggle actif + ordre
- **Écoles** : CRUD + logo upload + pays
- **Types d'apprentissage** : CRUD learning_tracks
- **Durées** : CRUD course_durations
- **Formations** (existant) : ajouter sélecteur Type couverture (Image/YouTube), champ URL YouTube, prix, niveau

---

## Phase 3 — Refonte Accueil + parcours inscription

### Accueil (`src/routes/index.tsx`)
- **Hero Slider premium** : embla-carousel, autoplay 5s, dots, prev/next, glassmorphism, supporte texte/image/vidéo YouTube (lecture muet+loop via `youtube.com/embed?autoplay=1&mute=1&loop=1`)
- **Barre de recherche** : filtre instantané (titre + école + catégorie)
- **Sections** :
  - 🔥 Formations populaires (par nb inscriptions)
  - ⭐ Recommandées
  - 🎓 Nouvelles
  - 🏆 Meilleurs étudiants (top badges)
  - 📜 Derniers certificats
  - 📢 Annonces récentes
- **Carte formation premium** : cover image OU iframe YouTube, hover scale Netflix-style, badge Premium, prix, modules, niveau, bouton **🎓 Hianatra**

### Modal Hianatra (4 étapes)
1. Choix track (Tsotra / Certificat / Diplôme équiv / Diplôme)
2. Choix école
3. Choix durée
4. Récap → crée `formation_enrollments` → redirige vers `/formations/$id` (modules + paiement existant)

### Design
Palette nuit (bleu nuit/noir/violet/or) déjà partiellement présente — renforcer via tokens `--gradient-hero`, `--gold`. Animations fade-in / hover-scale / skeleton.

---

## Technique
- `src/components/HeroSlider.tsx`, `SearchBar.tsx`, `FormationCard.tsx`, `HianatraDialog.tsx`, `YouTubeCover.tsx`
- `src/lib/youtube.ts` : extract video ID (déjà existant — étendre)
- Admin tabs : `AnnouncementsTab.tsx`, `SchoolsTab.tsx`, `TracksTab.tsx`, `DurationsTab.tsx`
- Server fns : `hero.functions.ts`, `schools.functions.ts`, `enrollment.functions.ts`

---

## Question
Voulez-vous que je démarre par la **Phase 1 (migration DB)** maintenant ? Une fois approuvée, j'enchaîne Phase 2 puis Phase 3 dans les tours suivants. Ou préférez-vous tout en un seul gros lot (plus long, plus risqué) ?