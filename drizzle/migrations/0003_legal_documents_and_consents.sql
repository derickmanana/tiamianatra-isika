-- 1. Documents juridiques (versionnés)
CREATE TABLE public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  version text NOT NULL DEFAULT '1.0',
  content text NOT NULL,
  summary text,
  last_updated date NOT NULL DEFAULT current_date,
  is_published boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT legal_documents_slug_version_key UNIQUE (slug, version)
);

CREATE INDEX legal_documents_slug_idx ON public.legal_documents (slug, is_published);

GRANT SELECT ON public.legal_documents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_documents TO authenticated;
GRANT ALL ON public.legal_documents TO service_role;

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_documents public read published"
  ON public.legal_documents FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "legal_documents admin read all"
  ON public.legal_documents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "legal_documents admin insert"
  ON public.legal_documents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "legal_documents admin update"
  ON public.legal_documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "legal_documents admin delete"
  ON public.legal_documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_legal_documents_upd
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Acceptations des documents par les utilisateurs
CREATE TABLE public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_slug text NOT NULL,
  document_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT legal_acceptances_unique UNIQUE (user_id, document_slug, document_version)
);

GRANT SELECT, INSERT ON public.legal_acceptances TO authenticated;
GRANT ALL ON public.legal_acceptances TO service_role;

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_acceptances select own"
  ON public.legal_acceptances FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "legal_acceptances insert own"
  ON public.legal_acceptances FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Préférences de cookies (utilisateurs connectés)
CREATE TABLE public.cookie_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  necessary boolean NOT NULL DEFAULT true,
  preferences boolean NOT NULL DEFAULT false,
  analytics boolean NOT NULL DEFAULT false,
  policy_version text NOT NULL DEFAULT '1.0',
  decided_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cookie_consents_user_key UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.cookie_consents TO authenticated;
GRANT ALL ON public.cookie_consents TO service_role;

ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cookie_consents select own"
  ON public.cookie_consents FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "cookie_consents insert own"
  ON public.cookie_consents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cookie_consents update own"
  ON public.cookie_consents FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Contenus initiaux (version 1.0, publiés)
INSERT INTO public.legal_documents (slug, title, version, summary, display_order, is_published, content) VALUES
('cgu', 'Conditions Générales d''Utilisation', '1.0', 'Règles d''accès et d''utilisation de la plateforme M''BossTsika.', 1, true,
$doc$## 1. Présentation de la plateforme
M'BossTsika ECOSYSTEM est une plateforme de formation en ligne éditée par {{company_name}}. Elle permet de suivre des formations organisées en modules, blocs et leçons (vidéos, documents, liens).

Trois rôles existent :
- **Étudiant** : consulte le catalogue, suit les formations, débloque les modules, suit sa progression, gère son profil et son CV, échange des messages.
- **Formateur** : crée son école et ses formations, publie des modules, blocs et leçons.
- **Administrateur** : administre la plateforme, les paiements, les contenus et les comptes.

Les services décrits sont ceux réellement disponibles dans l'application au jour de la dernière mise à jour de ce document.

## 2. Création de compte
- L'inscription nécessite une adresse email valide, un nom et un mot de passe.
- Un email de confirmation est envoyé : l'accès complet nécessite la vérification de l'adresse email.
- L'utilisateur est responsable de la confidentialité de ses identifiants et de toute activité effectuée depuis son compte.
- Les informations fournies doivent être exactes et à jour.
- Les rôles et permissions sont attribués selon le type de compte choisi à l'inscription et contrôlés côté serveur.

## 3. Utilisation autorisée et interdite
Il est interdit :
- de frauder, pirater, ou tenter de contourner les paiements et les mécanismes de déblocage des modules ;
- de partager, revendre ou diffuser les codes d'accès à des modules payants ;
- de publier des contenus illégaux, trompeurs, abusifs, haineux ou portant atteinte aux droits d'autrui ;
- d'extraire, copier ou rediffuser les contenus pédagogiques sans autorisation ;
- de perturber le fonctionnement technique de la plateforme.

Le respect des autres utilisateurs et des formateurs est obligatoire. Tout contenu ou comportement abusif peut être signalé via la page Contact ; l'équipe examine les signalements et peut modérer les contenus concernés.

## 4. Formations et certificats
- Les formateurs sont responsables des contenus qu'ils publient.
- Le premier module de chaque formation est gratuit ; les modules suivants peuvent être payants.
- Le déblocage d'un module payant intervient après validation du paiement ou saisie d'un code d'accès valide fourni par l'administration.
- La progression des leçons et vidéos est enregistrée pour permettre le suivi et le déblocage séquentiel.
- Un certificat peut être délivré par la plateforme à l'issue d'une formation, selon les conditions indiquées dans la formation.
- **Portée des certificats** : les certificats délivrés attestent uniquement du suivi d'une formation sur M'BossTsika. Ils ne constituent pas un diplôme d'État ni une certification officiellement reconnue, sauf mention contraire justifiée par l'organisme concerné.

## 5. Suspension et suppression de compte
- Un compte peut être restreint ou suspendu en cas de manquement aux présentes conditions, de fraude, ou d'usage abusif.
- L'utilisateur peut contester une décision en écrivant à l'adresse de contact indiquée dans les Mentions légales.
- La suppression d'un compte entraîne la perte de l'accès aux contenus débloqués.
- Certaines données peuvent être conservées lorsque la loi applicable l'exige (comptabilité, preuves, obligations légales).

## 6. Modification des conditions
Ces conditions peuvent évoluer. La date de mise à jour et le numéro de version figurent en tête de ce document. En cas de modification substantielle, une nouvelle acceptation peut être demandée.$doc$),

('cgv', 'Conditions Générales de Vente', '1.0', 'Achat de modules, paiements, validation et réclamations.', 2, true,
$doc$## 1. Objet
Les présentes conditions régissent l'achat de modules de formation payants sur M'BossTsika, édité par {{company_name}}.

## 2. Produits et prix
- Les produits vendus sont des modules de formation en ligne rattachés à une formation.
- Les prix sont affichés en **Ariary (MGA)** sur la fiche de chaque module.
- Le premier module de chaque formation est gratuit ; les modules suivants peuvent être payants.
- Les prix peuvent être modifiés à tout moment ; le prix applicable est celui affiché au moment de la demande de paiement.

## 3. Processus de paiement
- Le paiement s'effectue par les moyens indiqués dans l'application (notamment mobile money et transfert), avec **transmission d'une preuve de paiement**.
- Le paiement est vérifié manuellement par l'administration. Tant qu'il n'est pas validé, le module reste verrouillé.
- Après validation, le module est débloqué et l'accès est immédiat.
- Un code d'accès fourni par l'administration peut également permettre le déblocage d'un module.

## 4. Erreurs et échecs de paiement
- En cas de preuve illisible, de montant incorrect ou de doublon, la demande peut être refusée avec un commentaire explicatif.
- L'utilisateur peut soumettre une nouvelle demande corrigée.
- Toute contestation doit être adressée à {{contact_email}} avec la référence du paiement.

## 5. Remboursements, annulations et réclamations
- Les contenus étant numériques et immédiatement accessibles après déblocage, les demandes de remboursement sont examinées **au cas par cas**.
- Aucun remboursement automatique n'est garanti : toute demande doit être motivée et envoyée à {{contact_email}}.
- Les droits légaux impératifs applicables à l'utilisateur restent réservés.
- Les modalités détaillées figurent dans la *Politique de remboursement et d'annulation*.

## 6. Responsabilités
- Les formateurs sont responsables du contenu pédagogique qu'ils publient.
- La plateforme assure la mise à disposition technique du service et met en œuvre des moyens raisonnables pour en garantir la disponibilité.
- La responsabilité de la plateforme est limitée dans les conditions permises par la loi applicable.

## 7. Portefeuille interne
Lorsque cette fonctionnalité est activée, le solde du portefeuille sert uniquement au déblocage de modules sur la plateforme ; il n'est pas convertible en espèces sauf disposition contraire communiquée par l'administration.$doc$),

('confidentialite', 'Politique de confidentialité', '1.0', 'Données collectées, finalités, partage, droits et sécurité.', 3, true,
$doc$## 1. Responsable du traitement
Le responsable du traitement est {{company_name}}. Contact pour toute question relative aux données personnelles : {{contact_email}}.

## 2. Données collectées
Selon les fonctionnalités que vous utilisez :
- **Compte** : nom complet, adresse email, mot de passe (stocké sous forme chiffrée/hachée par le service d'authentification), rôle, photo de profil si vous en ajoutez une.
- **Profil et CV (Étudiant)** : titre professionnel, ville/pays, présentation, expériences, formations et diplômes, compétences, document CV téléversé.
- **Téléphone** : uniquement si vous le renseignez dans votre profil.
- **Formation** : formations et modules débloqués, progression des leçons et vidéos, certificats délivrés.
- **Paiements** : montant, méthode, preuve de paiement téléversée, statut et commentaire de validation.
- **Communications** : messages échangés sur la plateforme, notifications.
- **Données techniques** : journaux d'activité nécessaires à la sécurité et au bon fonctionnement du service.

Aucune autre catégorie de données n'est collectée par l'application.

## 3. Finalités
- Création et gestion de votre compte et de votre rôle.
- Fourniture des formations, du suivi de progression et des certificats.
- Traitement et vérification des paiements.
- Support utilisateur et communication liée au service.
- Sécurité, prévention des fraudes et des abus.
- Amélioration du service.
- Respect des obligations légales applicables.

## 4. Partage des données
Vos données sont accessibles :
- aux **administrateurs autorisés** de la plateforme, pour l'exploitation du service ;
- aux **formateurs**, uniquement pour les informations nécessaires au suivi de leurs formations ;
- aux **prestataires techniques** utilisés pour l'hébergement, la base de données, l'authentification, le stockage des fichiers et l'envoi d'emails ;
- aux **autorités compétentes** lorsque la loi l'exige.

Vos données ne sont pas vendues ni transmises à des tiers à des fins commerciales.

## 5. Vos droits
Selon le cadre juridique applicable, vous pouvez demander :
- l'accès à vos données ;
- leur rectification ;
- leur suppression, sous réserve des obligations légales de conservation ;
- la limitation ou l'opposition au traitement lorsque cela s'applique ;
- le retrait de votre consentement lorsque le traitement repose sur celui-ci ;
- l'introduction d'une réclamation auprès de l'autorité compétente.

Pour exercer ces droits : {{contact_email}} (voir aussi la page *Contact et données personnelles*).

## 6. Sécurité et conservation
- Accès aux données restreint par des politiques de sécurité au niveau de la base de données (RLS) et par les rôles applicatifs.
- Les documents sensibles (CV, preuves de paiement, fichiers de cours) sont stockés dans des espaces privés et accessibles uniquement via des liens temporaires.
- Les données de compte sont conservées tant que le compte existe ; les données de paiement et les journaux peuvent être conservés plus longtemps lorsque la loi l'exige.
- En cas d'incident de sécurité susceptible de vous affecter, nous prenons les mesures nécessaires et procédons aux notifications requises par la réglementation applicable.

## 7. Enfants
La plateforme n'est pas destinée aux personnes n'ayant pas l'âge minimum requis par la loi applicable pour consentir à un service en ligne sans autorisation parentale.$doc$),

('cookies', 'Politique de cookies', '1.0', 'Cookies nécessaires, cookies facultatifs et gestion du consentement.', 4, true,
$doc$## 1. Qu'est-ce qu'un cookie ?
Un cookie ou une technologie similaire (stockage local du navigateur) est un petit fichier déposé sur votre appareil lors de la visite d'un service en ligne.

## 2. Cookies et stockage strictement nécessaires
M'BossTsika utilise uniquement des technologies nécessaires à son fonctionnement :
- **Authentification et session** : conservation de votre session de connexion.
- **Sécurité** : protection du compte et prévention des abus.
- **Préférences essentielles d'affichage** : langue et thème clair/sombre.
- **Enregistrement de votre choix de cookies**, afin de ne pas vous le redemander.

Ces éléments sont indispensables : sans eux, la connexion et la navigation ne fonctionnent pas.

## 3. Cookies facultatifs
À ce jour, l'application **n'utilise pas** d'outil de mesure d'audience, de pixel publicitaire ni de cookie marketing. Si de tels outils sont ajoutés, ce document sera mis à jour et votre consentement sera demandé **avant** tout dépôt.

## 4. Gestion de votre consentement
Une bannière s'affiche lors de votre première visite. Vous pouvez :
- **Tout accepter** ;
- **Refuser** les éléments non essentiels ;
- **Personnaliser** vos préférences.

Vos préférences sont modifiables à tout moment depuis *Profil → Confidentialité et documents juridiques*. Pour les utilisateurs connectés, le choix est enregistré afin de conserver une preuve du consentement.

## 5. Suppression
Vous pouvez également supprimer les cookies et le stockage local via les paramètres de votre navigateur. Cela peut vous déconnecter de la plateforme.$doc$),

('mentions-legales', 'Mentions légales', '1.0', 'Éditeur, coordonnées, hébergement et responsable de publication.', 5, true,
$doc$## Éditeur de la plateforme
- **Nom / dénomination** : {{company_name}}
- **Statut juridique** : {{legal_status}}
- **Adresse professionnelle** : {{address}}
- **Email de contact** : {{contact_email}}
- **Téléphone** : {{phone}}
- **Informations d'enregistrement** : {{registration}}

## Responsable de la publication
{{publisher}}

## Hébergement
{{host}}

## Propriété intellectuelle
L'ensemble des éléments de la plateforme (marque, interface, textes, contenus pédagogiques) est protégé. Toute reproduction non autorisée est interdite. Voir la *Politique relative aux contenus et aux droits d'auteur*.

## Signalement
Pour signaler un contenu illicite ou une atteinte aux droits : {{contact_email}}.

> Les informations affichées ci-dessus sont renseignées par l'administrateur de la plateforme. Les champs non complétés doivent être renseignés avant toute publication officielle.$doc$),

('remboursement', 'Politique de remboursement et d''annulation', '1.0', 'Conditions d''examen des demandes de remboursement.', 6, true,
$doc$## 1. Principe
Les modules de formation sont des contenus numériques accessibles immédiatement après validation du paiement. Aucun remboursement automatique n'est prévu.

## 2. Cas pouvant donner lieu à un remboursement ou un avoir
Chaque demande est examinée individuellement, notamment dans les cas suivants :
- double paiement d'un même module ;
- paiement validé par erreur pour un module non souhaité, avant tout accès au contenu ;
- module payé mais durablement inaccessible pour une cause technique imputable à la plateforme ;
- contenu significativement non conforme à la description publiée.

## 3. Cas exclus
- Module déjà consulté en grande partie, sauf obligation légale contraire.
- Changement d'avis après accès au contenu.
- Non-respect des conditions d'utilisation par l'utilisateur.

## 4. Comment demander
Envoyez à {{contact_email}} : votre adresse email de compte, le nom du module, la date et la référence du paiement, ainsi que le motif de la demande.

## 5. Traitement
- Accusé de réception et examen de la demande par l'administration.
- Décision motivée communiquée par email.
- En cas d'accord, le remboursement est effectué par le canal de paiement d'origine lorsque cela est possible, ou par avoir sur la plateforme.

## 6. Annulation
Une demande de paiement en attente de validation peut être annulée sans frais avant sa validation.

## 7. Droits légaux
Les droits impératifs reconnus par la loi applicable à l'utilisateur restent réservés et prévalent sur la présente politique.$doc$),

('regles-utilisation', 'Règles d''utilisation de la plateforme', '1.0', 'Comportements attendus, modération et sanctions.', 7, true,
$doc$## 1. Respect mutuel
Les échanges entre étudiants, formateurs et administrateurs doivent rester courtois. Les insultes, le harcèlement, les propos discriminatoires et les contenus violents sont interdits.

## 2. Comptes
- Un compte par personne ; l'usurpation d'identité est interdite.
- Le partage d'identifiants ou d'un accès payant avec des tiers est interdit.

## 3. Contenus publiés
- Les formateurs publient uniquement des contenus dont ils détiennent les droits.
- Les liens externes doivent être sûrs et pertinents pour la formation.
- La publicité non autorisée, le démarchage et le spam sont interdits.

## 4. Sécurité
- Toute tentative d'intrusion, d'extraction massive de données, de contournement des paiements ou d'altération du service est interdite et peut donner lieu à des poursuites.

## 5. Signalement et modération
- Tout utilisateur peut signaler un contenu ou un comportement via {{contact_email}}.
- L'administration examine le signalement et peut masquer, retirer un contenu, avertir, restreindre ou suspendre un compte.
- L'utilisateur concerné peut demander le réexamen de la décision.

## 6. Sanctions graduées
Selon la gravité : avertissement, retrait du contenu, restriction temporaire, suspension, puis suppression du compte en cas de manquement grave ou répété.$doc$),

('contenus-droits-auteur', 'Politique relative aux contenus et aux droits d''auteur', '1.0', 'Propriété intellectuelle, responsabilités des formateurs, signalement.', 8, true,
$doc$## 1. Propriété des contenus
Les contenus pédagogiques (vidéos, documents, PDF, textes, liens) restent la propriété de leurs auteurs ou titulaires de droits. La plateforme en assure l'hébergement et la diffusion dans le cadre du service.

## 2. Responsabilités du formateur
Le formateur garantit :
- détenir les droits nécessaires sur les contenus publiés (y compris images, vidéos, documents et extraits) ;
- ne pas publier de contenu copié ou utilisé sans autorisation ;
- respecter les droits des tiers et les licences applicables ;
- assumer la responsabilité des liens externes qu'il ajoute.

## 3. Utilisation par les étudiants
L'accès à un module confère un droit d'usage **personnel et non transférable** à des fins d'apprentissage. Sont interdits : le téléchargement non autorisé en vue de rediffusion, la revente, le partage public et la reproduction des contenus.

## 4. Signalement d'une atteinte aux droits d'auteur
Envoyez à {{contact_email}} : vos coordonnées, l'identification précise du contenu concerné (formation, module, leçon), la justification de vos droits et votre demande.

## 5. Traitement du signalement
- Examen de la demande par l'administration.
- Information du formateur concerné et possibilité de réponse.
- Retrait, restriction d'accès ou maintien du contenu selon les éléments recueillis.
- En cas de manquements répétés, l'accès du formateur peut être suspendu.

## 6. Contenus retirés
Le retrait d'un contenu peut entraîner l'indisponibilité d'une leçon ou d'un module. Les utilisateurs concernés en sont informés et les conséquences éventuelles sont traitées selon la *Politique de remboursement et d'annulation*.$doc$),

('contact-donnees', 'Contact et demandes relatives aux données personnelles', '1.0', 'Comment nous joindre et exercer vos droits.', 9, true,
$doc$## Nous contacter
- **Email** : {{contact_email}}
- **Téléphone** : {{phone}}
- **Adresse** : {{address}}
- **Éditeur** : {{company_name}}

## Demandes relatives aux données personnelles
Pour exercer vos droits (accès, rectification, suppression, limitation, opposition, retrait du consentement, portabilité lorsque applicable) :

1. Écrivez à {{contact_email}} avec pour objet « Demande données personnelles ».
2. Indiquez l'adresse email de votre compte et la nature précise de votre demande.
3. Une vérification d'identité raisonnable peut être demandée afin de protéger votre compte.

Nous répondons dans les délais prévus par la réglementation applicable. Si votre demande ne peut être satisfaite (par exemple en raison d'une obligation légale de conservation), la raison vous sera expliquée.

## Signalements
- Contenu illicite ou atteinte aux droits d'auteur : {{contact_email}}
- Abus, fraude ou problème de sécurité : {{contact_email}}

## Support
Pour les questions liées aux formations, paiements ou accès aux modules, utilisez la messagerie de la plateforme ou l'adresse de contact ci-dessus.$doc$);