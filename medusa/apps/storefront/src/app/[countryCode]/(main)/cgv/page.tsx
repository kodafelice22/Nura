import { Metadata } from "next"
import LegalPageLayout from "@modules/legal/components/legal-page-layout"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getSiteSettings } from "@lib/data/site-settings"
import { getLegalInformation } from "@lib/legal"

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description: "Conditions générales de vente de la maison Nura.",
}

export default async function CgvPage() {
  const [siteSettings, legalInformation] = await Promise.all([
    getSiteSettings(),
    getLegalInformation(),
  ])

  return (
    <LegalPageLayout
      title="Conditions générales de vente"
      updatedAt={legalInformation.lastUpdated}
    >
      <section>
        <h2>1. Objet</h2>
        <p>
          Les présentes conditions générales de vente (CGV) régissent les
          ventes de produits réalisées sur le site {legalInformation.siteHost} entre{" "}
          {legalInformation.businessName} (voir{" "}
          <LocalizedClientLink href="/mentions-legales">
            mentions légales
          </LocalizedClientLink>
          ), ci-après
          « Nura », et toute personne physique ou morale effectuant un achat
          via le site, ci-après « le Client ». Toute commande implique
          l&apos;acceptation sans réserve des présentes CGV.
        </p>
      </section>

      <section>
        <h2>2. Produits</h2>
        <p>
          Les produits proposés à la vente sont ceux figurant sur le site au
          jour de la consultation, dans la limite des stocks disponibles.
          Nura se réserve le droit de modifier son assortiment à tout
          moment.
        </p>
      </section>

      <section>
        <h2>3. Prix</h2>
        <p>
          Les prix sont indiqués en euros (EUR) ou en francs CFA (XOF) selon
          le marché sélectionné, toutes taxes comprises (TTC), hors frais de
          livraison qui sont précisés avant la validation
          définitive de la commande. Nura se réserve le droit de modifier
          ses prix à tout moment, étant entendu que le prix figurant sur la
          commande au moment de sa validation par le Client est le seul
          applicable à cette commande.
        </p>
      </section>

      <section>
        <h2>4. Commande</h2>
        <p>
          Le Client sélectionne les produits de son choix, les ajoute à son
          panier, puis valide sa commande après avoir vérifié le détail et
          le prix total, renseigné ses coordonnées de livraison et procédé
          au paiement. La commande n&apos;est définitive qu&apos;après
          confirmation du paiement. Un email de confirmation est envoyé au
          Client à réception de sa commande.
        </p>
      </section>

      <section>
        <h2>5. Paiement</h2>
        <p>
          Le paiement s&apos;effectue en ligne, au moment de la commande,
          par carte bancaire via Stripe ou par mobile money via Jèko (Wave,
          Orange Money, MTN, Moov ou Djamo), selon le marché et les moyens
          proposés au moment du paiement. Nura ne conserve aucune donnée
          bancaire ni identifiant secret de portefeuille du Client sur ses
          propres serveurs.
        </p>
      </section>

      <section>
        <h2>6. Livraison</h2>
        <p>
          Les produits sont livrés à l&apos;adresse indiquée par le Client
          lors de la commande, dans les délais précisés sur la fiche produit
          ou au moment de la commande. La livraison est assurée en France
          métropolitaine et en Côte d&apos;Ivoire via nos transporteurs
          partenaires, avec un délai indicatif de 3 à 7 jours ouvrés. Les
          frais de livraison sont précisés avant la validation de la
          commande. Nura ne saurait être tenue responsable des retards
          imputables au transporteur.
        </p>
      </section>

      <section>
        <h2>7. Droit de rétractation</h2>
        <p>
          Conformément aux articles L.221-18 et suivants du Code de la
          consommation, le Client dispose d&apos;un délai de{" "}
          <strong>14 jours</strong> à compter de la réception de sa commande
          pour exercer son droit de rétractation, sans avoir à justifier de
          motif ni à payer de pénalité.
        </p>
        <p>
          Pour exercer ce droit, le Client doit notifier sa décision par
          email à{" "}
          <a href={`mailto:${siteSettings.email}`}>{siteSettings.email}</a>{" "}
          avant l&apos;expiration du délai de 14 jours. Le produit doit être
          retourné neuf, non ouvert, non descellé et dans son emballage
          d&apos;origine, dans un délai de 14 jours suivant la notification
          de la rétractation. Les frais de retour sont à la charge du
          Client, sauf mention contraire.
        </p>
        <p>
          Conformément à l&apos;article L.221-28 du Code de la
          consommation, le droit de rétractation ne peut être exercé pour
          les produits descellés par le Client après la livraison et qui ne
          peuvent être renvoyés pour des raisons d&apos;hygiène ou de
          protection de la santé (notamment les parfums et produits
          cosmétiques dont le scellé de sécurité a été retiré).
        </p>
        <p>
          Le remboursement est effectué dans un délai de 14 jours suivant la
          réception du produit retourné (ou la preuve d&apos;expédition), en
          utilisant le même moyen de paiement que celui utilisé pour la
          commande lorsque le prestataire le permet. Pour un paiement Jèko,
          le remboursement peut prendre la forme d&apos;un transfert manuel vers
          le portefeuille mobile utilisé lors de la commande.
        </p>
      </section>

      <section>
        <h2>8. Garanties légales</h2>
        <p>
          Tous les produits vendus sur le site bénéficient de la garantie
          légale de conformité (articles L.217-3 et suivants du Code de la
          consommation) et de la garantie légale contre les vices cachés
          (articles 1641 et suivants du Code civil). Pour toute question,
          contactez{" "}
          <a href={`mailto:${siteSettings.email}`}>{siteSettings.email}</a>.
        </p>
      </section>

      <section>
        <h2>9. Données personnelles</h2>
        <p>
          Le traitement des données personnelles du Client est détaillé
          dans notre{" "}
          <LocalizedClientLink href="/confidentialite">
            politique de confidentialité
          </LocalizedClientLink>
          .
        </p>
      </section>

      <section>
        <h2>10. Droit applicable et litiges</h2>
        <p>
          Les présentes CGV sont soumises au droit français. En cas de
          litige, le Client est invité à contacter en priorité le service
          client à l&apos;adresse{" "}
          <a href={`mailto:${siteSettings.email}`}>{siteSettings.email}</a>{" "}
          afin de rechercher une solution amiable. À défaut d&apos;accord,
          le Client peut recourir à la médiation de la consommation décrite
          dans nos{" "}
          <LocalizedClientLink href="/mentions-legales">
            mentions légales
          </LocalizedClientLink>
          , ou saisir les tribunaux compétents.
        </p>
      </section>
    </LegalPageLayout>
  )
}
