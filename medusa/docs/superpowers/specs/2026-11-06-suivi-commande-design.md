# Suivi de commande client — conception

Date : 2026-11-06. Validé en conversation avec le propriétaire de la boutique.

## Pourquoi

Un client qui a perdu l'email de confirmation, ou qui a commandé sans compte,
n'a aujourd'hui aucun moyen de retrouver sa commande : le lien « Suivi de
commande » du pied de page mène à `/account/orders`, qui exige une connexion.
Et la page de commande n'affiche qu'un statut en texte (« Préparée »), sans
étapes ni lien transporteur.

## Ce qui existe déjà (à réutiliser, pas à refaire)

- Lien signé vers une commande : `getOrderAccessUrl()` / `createOrderAccessToken()`
  (backend `src/lib`), vérifié par la route storefront
  `/[countryCode]/order/[id]/access/[token]` qui pose un cookie puis redirige
  vers `/order/[id]/confirmed`.
- Emails à la confirmation, à l'expédition (avec n° ou lien de suivi) et à la
  livraison : `src/subscribers/{order-placed,shipment-created,delivery-created}.ts`.
- Options du checkout stockées dans `cart.metadata`, recopiées sur la commande
  (modèle : `gift-option`).

## Objectifs

1. **Page « Suivre ma commande »** (`/[countryCode]/suivre-ma-commande`) : le
   client saisit son n° de commande et son email ; si les deux correspondent,
   il est redirigé vers la page de commande existante via le lien signé.
2. **Frise des étapes** sur la page de commande (confirmation et « Mon compte ») :
   Confirmée → Préparée → Expédiée → Livrée, avec dates, étape en cours mise en
   avant, lien ou n° de suivi transporteur quand il existe, état « Annulée » à part.
3. **Notifications WhatsApp** à la confirmation, à l'expédition et à la livraison,
   pour les clients qui l'ont demandé, en plus des emails.

## Décisions

- Livraison : livreur local et transporteur. Les étapes suivent les actions
  natives de l'admin Medusa (créer l'expédition, marquer expédiée, marquer
  livrée), sans nouvel écran. Le n° / lien de suivi est saisi à l'expédition
  quand il existe.
- Preuve d'identité : n° de commande + email. Réponse identique pour « commande
  inconnue » et « email différent ». Échecs limités par n° de commande et par
  email (le backend ne voit que l'IP du serveur Next, pas celle du client).
- WhatsApp : Meta Cloud API en direct. Pas encore de compte : le code est livré
  inactif tant que `WHATSAPP_ACCESS_TOKEN` et `WHATSAPP_PHONE_NUMBER_ID` ne sont
  pas définis ; rien ne casse sans eux.
- Consentement : case « Recevoir le suivi de ma commande sur WhatsApp » au
  checkout, décochée par défaut, stockée en `metadata.whatsapp_opt_in`.
- Téléphone : devient obligatoire au checkout.

## Non-objectifs

- Pas de nouvel écran admin, pas de suivi transporteur en temps réel (API DHL…).
- Pas de lien magique par email, pas de recherche par téléphone.
- Les emails existants ne changent pas.

## Choix laissés à l'implémentation (et faits)

- Recherche : `POST /store/order-lookup` `{ order_number, email }` → `{ order_id }`.
  La boutique pose alors son propre cookie d'accès (`setOrderAccessToken`, comme
  après le checkout) et redirige vers `/order/[id]/confirmed`. Le n° accepte
  « 1042 », « #1042 », « n°1042 ».
- Limitation : 5 échecs par n° et 10 par email sur 15 min, en mémoire.
  Raccourci : une instance backend ; passer à Redis si on en lance plusieurs.
- Numéros WhatsApp : normalisation sans dépendance. Format international
  (`+`/`00`) accepté tel quel ; numéro local converti via une table
  d'indicatifs (le 0 initial est retiré sauf pour CI et IT). Pays inconnu et
  numéro local : pas d'envoi, journalisé.
- Modèles WhatsApp à faire valider chez Meta (langue `fr`), chacun avec
  {{1}} = n° de commande et {{2}} = lien vers la commande :
  `nura_commande_confirmee`, `nura_commande_expediee`, `nura_commande_livree`.
- Un échec WhatsApp est journalisé et ne bloque jamais la commande ni l'email.
