# M'BossTsika Academy

Crée une application web moderne, professionnelle, responsive et sécurisée appelée M'BossTsika.

L'objectif de cette application est de vendre des formations vidéo en ligne organisées par modules. Les vidéos sont hébergées sur YouTube et affichées dans l'application via des playlists YouTube.

L'application doit posséder deux interfaces distinctes :

Interface Client
Interface Administrateur

Ajouter un sélecteur de langue visible dans toute l'application :

Malagasy
Français
English

Toute l'application doit être traduite dynamiquement selon la langue choisie.

Design moderne et professionnel.
Compatible mobile, tablette et ordinateur.
Interface fluide et rapide.
Mode clair et sombre.
Bouton Retour sur toutes les pages secondaires.
Icônes modernes.
Animations légères.
Menu de navigation fixe.

Créer automatiquement un administrateur principal :

Email :
rasolonjatovojeannoel21@gmail.com

Mot de passe initial :
@madaga2100/9991

Le mot de passe doit être stocké de manière sécurisée.

Créer les formations suivantes :

Formation Création Application Web
Formation Fanafarana Entana avy any Chine Complet
Formation Canva AI
Formation Musique et Instrumental avec l'IA
Formation Crypto Money
Applications et Sites permettant de gagner entre 200$ et 1000$

Chaque formation doit contenir :

Module 1
Module 2
Module 3

Chaque module contient plusieurs vidéos.

Le client doit pouvoir :

Créer un compte
Se connecter
Modifier son profil
Consulter les formations
Consulter les modules
Acheter un module
Envoyer une preuve de paiement
Recevoir des notifications
Consulter ses achats
Consulter son historique de paiements
Lire les annonces
Lire les messages administrateur

Menu Client :

Accueil
Formations
Mes Modules
Paiements
Notifications
Messages
Mon Profil

Tous les modules sont verrouillés par défaut.

Pour accéder à un module :

Cliquer sur le module.
Afficher immédiatement la page de paiement.
Effectuer le paiement.
Envoyer une capture d'écran obligatoire.
Paiement en attente.
Vérification par l'administrateur.
Validation.
Déblocage automatique du module.

Module 2 :

Bloqué tant que Module 1 n'est pas acheté et validé.

Module 3 :

Bloqué tant que Module 2 n'est pas acheté et validé.

Le client doit suivre l'ordre des modules.

Les vidéos restent hébergées sur YouTube.

L'application doit utiliser un lecteur intégré.

IMPORTANT :

Lorsque l'administrateur ajoute un lien de playlist YouTube :

Le système récupère automatiquement toutes les vidéos de la playlist.
Les vidéos apparaissent automatiquement dans le module.
Aucun ajout manuel vidéo par vidéo.

Le système doit afficher :

Miniature vidéo
Titre vidéo
Durée vidéo
Ordre vidéo

Prix par défaut :

52 500 Ariary par module

Méthodes de paiement initiales :

Mvola

Numéro :
0387909713

Titulaire :
Jean Noël

Orange Money

Numéro :
0376324415

Titulaire :
Jean Noël

Binance UID

UID :
1028468482

Titulaire :
Jean Noël

Taux initial :

1 USDT = 4450 Ariary

Formule :

Montant_USDT = Prix_Module / Taux_USDT

Exemple :

52 500 Ariary = 11.80 USDT

Afficher automatiquement le montant USDT à payer.

L'administrateur peut modifier le taux.

Capture d'écran obligatoire.

Formats acceptés :

JPG
PNG
JPEG
WEBP

Statuts :

En attente
Validé
Refusé

Si refusé :

Le client reçoit une notification.

Créer un système complet de notifications.

Notifications possibles :

Paiement validé
Paiement refusé
Nouveau module disponible
Nouvelle vidéo ajoutée
Nouveau message administrateur
Nouvelle annonce
Compte bloqué
Compte débloqué

Chaque notification possède :

Titre
Message
Date
Statut lu/non lu

L'administrateur peut :

Envoyer un message à un utilisateur
Envoyer un message à tous les utilisateurs

Les utilisateurs peuvent consulter leurs messages.

Créer un système d'annonces.

L'administrateur peut :

Ajouter
Modifier
Supprimer
Activer
Désactiver

Exemples :

Formation en préparation
Module indisponible
Promotion spéciale

Les annonces doivent apparaître sur l'accueil client.

Menu Admin :

Dashboard
Formations
Modules
Vidéos
Paiements
Utilisateurs
Notifications
Messages
Annonces
Paramètres Paiement
Paramètres Application

Afficher :

Nombre total utilisateurs
Nombre total formations
Nombre total modules
Nombre total vidéos
Paiements en attente
Paiements validés
Revenus totaux
Revenus par formation
Dernières activités

L'administrateur peut :

Ajouter une formation
Modifier une formation
Supprimer une formation
Ajouter image couverture
Modifier description
Modifier prix

L'administrateur peut :

Ajouter module
Modifier module
Supprimer module
Verrouiller module
Déverrouiller module
Ajouter message d'indisponibilité

Exemple :

"Cette formation n'est pas encore disponible."

L'administrateur peut :

Ajouter playlist YouTube
Modifier playlist
Supprimer playlist

Lorsqu'une playlist est ajoutée :

Import automatique des vidéos
Synchronisation automatique
Mise à jour automatique

L'administrateur peut :

Voir tous les utilisateurs
Rechercher utilisateur
Voir profil utilisateur
Voir achats
Voir paiements
Bloquer utilisateur
Débloquer utilisateur
Supprimer utilisateur

L'administrateur peut :

Voir toutes les preuves
Zoomer les captures
Valider paiement
Refuser paiement
Ajouter commentaire

Lorsqu'un paiement est validé :

Déblocage automatique du module
Notification automatique

L'administrateur peut modifier :

Numéro Mvola
Numéro Orange Money
UID Binance
Nom du titulaire
Prix des modules
Taux USDT

Sans modifier le code.

Créer les tables :

users
formations
modules
playlists
videos
payments
unlocked_modules
notifications
messages
announcements
payment_methods
settings
user_activity_logs
Authentification sécurisée
Rôles Admin / Client
Protection des pages privées
Protection contre accès non autorisés
Validation des uploads
Historique des actions
Journalisation des connexions
Gestion des sessions

Frontend :
React + Tailwind CSS

Backend :
Supabase

Base de données :
PostgreSQL

Authentification :
Supabase Auth

Stockage :
Supabase Storage

Déploiement :
Vercel

Créer une plateforme professionnelle de vente de formations vidéo appelée M'BossTsika, permettant aux clients d'acheter des modules de formation, envoyer leurs preuves de paiement, recevoir des notifications, suivre leur progression, consulter des vidéos provenant automatiquement de playlists YouTube, tandis que l'administrateur dispose d'un contrôle complet sur les formations, modules, vidéos, paiements, utilisateurs, annonces, messages et paramètres de l'application.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://tiamianatra-isika.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4f55acbe-8136-4205-b3d3-da7708deb71c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
