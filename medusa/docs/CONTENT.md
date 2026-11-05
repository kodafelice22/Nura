# Contenu éditable depuis l'admin

Tout le texte, les images et les coordonnées du site public sont pilotés
depuis l'admin Medusa (`/app`), sans toucher au code. Ce document liste ce qui
est éditable, où le modifier, et les quelques exceptions volontaires.

## Où éditer

| Admin | Contenu |
| --- | --- |
| **Page d'accueil** | Hero, Campagne, Essentiels, Éditorial, Rituel, Catégories mises en avant, Galerie |
| **Pages** | À propos, Contact (texte d'intro), Livraison & retours, Politique de cookies |
| **FAQ** | Les questions/réponses de `/faq` |
| **Réglages du site** | Email, horaires, téléphones, réseaux sociaux, bandeau d'annonces et mentions légales |
| **Journal** | Les articles du blog |

Chaque section a un interrupteur « Visible » et des dates optionnelles de
début/fin, pour programmer une mise en avant (ex. une campagne limitée dans le
temps) sans revenir la désactiver manuellement.

Les modifications sont visibles sur le site en quelques secondes : la
sauvegarde déclenche une revalidation instantanée du cache (voir
`content-revalidate.ts`), il n'y a rien à redéployer.

## Mise en forme du texte

Les champs « Contenu » (pages statiques, articles du Journal) acceptent une
syntaxe simple, volontairement sans HTML pour rester sûre :

- une ligne vide sépare les paragraphes
- une ligne commençant par `## ` devient un sous-titre
- une ligne commençant par `- ` devient un élément de liste
- `[texte](/lien)` crée un lien — interne (`/contact`) ou externe (`https://…`)

## Informations légales

Les informations d'identité affichées dans les CGV, la politique de
confidentialité et les mentions légales se modifient dans **Réglages du site →
Mentions légales**. Les textes juridiques et les références aux articles de loi
restent dans le code; seuls les champs structurés de l'entreprise, de
l'hébergeur et du médiateur sont éditables.

Les variables d'environnement `LEGAL_*` restent disponibles comme valeurs de
secours, mais elles ne sont pas nécessaires au build ni au déploiement. Tant
qu'une information n'est renseignée ni dans l'Admin ni dans l'environnement,
le site affiche « À compléter dans l’Admin ».

## Ce qui reste dans le code, volontairement

- **Textes juridiques des CGV, de la politique de confidentialité et des
  mentions légales** : leur structure et leurs références légales restent dans
  le code. L'Admin ne modifie que les informations d'identité structurées.
- **Les 5 images de la Galerie** : seuls le sur-titre, le titre et le
  sous-titre de cette section sont éditables. Les visuels et leurs légendes
  restent fixes dans `modules/home/components/gallery`.
- **La structure de navigation et le tunnel de commande** : les liens du menu,
  les catégories, et les étapes du checkout ne sont pas pilotés par l'admin —
  seul leur contenu ponctuel (coordonnées, bandeau d'annonces) l'est.
- **La dernière réponse de la FAQ** (« Comment vous contacter ? ») mentionne
  l'email et les numéros de téléphone en texte. Si ces coordonnées changent
  dans **Réglages du site**, pensez à mettre à jour cette réponse à la main
  dans **FAQ** — les deux ne sont pas liés automatiquement.
