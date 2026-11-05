import { Metadata } from "next"
import LegalPageLayout from "@modules/legal/components/legal-page-layout"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getSiteSettings } from "@lib/data/site-settings"
import { getLegalInformation } from "@lib/legal"

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité et de protection des données personnelles de la maison Nura.",
}

export default async function ConfidentialitePage() {
  const [siteSettings, legalInformation] = await Promise.all([
    getSiteSettings(),
    getLegalInformation(),
  ])

  return (
    <LegalPageLayout
      title="Politique de confidentialité"
      updatedAt={legalInformation.lastUpdated}
    >
      <section>
        <h2>1. Responsable de traitement</h2>
        <p>
          Le responsable du traitement des données personnelles collectées
          sur {legalInformation.siteHost} est {legalInformation.businessName}, dont
          les coordonnées figurent dans nos{" "}
          <LocalizedClientLink href="/mentions-legales">
            mentions légales
          </LocalizedClientLink>
          .
        </p>
      </section>

      <section>
        <h2>2. Données collectées</h2>
        <p>Nous collectons les données suivantes, selon votre usage du site :</p>
        <ul>
          <li>Données de compte : nom, prénom, email, mot de passe (chiffré)</li>
          <li>Données de commande : adresses de livraison et de facturation, historique de commandes</li>
          <li>Données de paiement : traitées par Stripe ou Jèko selon le marché, jamais stockées intégralement sur nos serveurs</li>
          <li>Données de contact : nom, email, message, envoyés via le formulaire de contact</li>
          <li>Données de newsletter : adresse email, envoyée via le formulaire d&apos;inscription à la newsletter</li>
          <li>
            Données de navigation : cookies techniques et, le cas échéant,
            cookies de mesure d&apos;audience (voir notre{" "}
            <LocalizedClientLink href="/politique-cookies">
              politique de cookies
            </LocalizedClientLink>
            )
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Finalités et base légale</h2>
        <ul>
          <li>Gestion des commandes et de la relation client — exécution du contrat</li>
          <li>Réponse aux demandes via le formulaire de contact — intérêt légitime</li>
          <li>Création et gestion du compte client — exécution du contrat</li>
          <li>Respect de nos obligations légales et comptables — obligation légale</li>
          <li>Envoi de la newsletter — consentement (vous pouvez vous désinscrire à tout moment en nous écrivant)</li>
        </ul>
      </section>

      <section>
        <h2>4. Destinataires des données</h2>
        <p>
          Vos données sont destinées à Nura et, pour les besoins strictement
          nécessaires à l&apos;exécution des commandes, à nos prestataires :
          hébergement, paiement (Stripe ou Jèko), envoi d&apos;emails
          transactionnels (Resend), transporteur(s). Ces prestataires n&apos;utilisent vos
          données que pour le compte de Nura et dans le cadre de leur
          mission.
        </p>
      </section>

      <section>
        <h2>5. Durée de conservation</h2>
        <p>
          Les données relatives à votre compte client sont conservées tant
          que ce dernier est actif. Les données de commande sont conservées
          conformément aux durées légales de conservation comptable et
          fiscale (10 ans). Les données du formulaire de contact sont
          conservées 3 ans à compter du dernier échange, en l&apos;absence
          de relation contractuelle.
        </p>
      </section>

      <section>
        <h2>6. Vos droits</h2>
        <p>
          Conformément au Règlement Général sur la Protection des Données
          (RGPD) et à la loi Informatique et Libertés, vous disposez d&apos;un
          droit d&apos;accès, de rectification, d&apos;effacement, de
          limitation, d&apos;opposition et de portabilité sur vos données
          personnelles. Vous pouvez exercer ces droits en écrivant à{" "}
          <a href={`mailto:${siteSettings.email}`}>{siteSettings.email}</a>.
          Une réponse vous sera apportée dans un délai maximum d&apos;un
          mois.
        </p>
        <p>
          Vous disposez également du droit d&apos;introduire une réclamation
          auprès de la Commission Nationale de l&apos;Informatique et des
          Libertés (CNIL) — <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">www.cnil.fr</a>.
        </p>
      </section>

      <section>
        <h2>7. Sécurité</h2>
        <p>
          Nura met en œuvre les mesures techniques et organisationnelles
          appropriées pour assurer la sécurité et la confidentialité de vos
          données personnelles, et empêcher qu&apos;elles ne soient
          déformées, endommagées ou communiquées à des tiers non autorisés.
        </p>
      </section>

      <section>
        <h2>8. Transferts hors Union européenne</h2>
        <p>
          Certains prestataires peuvent traiter des données hors de l&apos;Espace
          économique européen, notamment pour le paiement, l&apos;email ou
          l&apos;hébergement. Ces transferts sont encadrés, selon le prestataire
          et le pays, par une décision d&apos;adéquation, le Data Privacy Framework
          ou les clauses contractuelles types de la Commission européenne.
          Pour une livraison ou un paiement en Côte d&apos;Ivoire, les données
          strictement nécessaires sont transmises aux prestataires locaux dans
          le cadre de l&apos;exécution de la commande.
        </p>
      </section>

      <section>
        <h2>9. Cookies</h2>
        <p>
          Le site utilise des cookies. Pour en savoir plus et gérer vos
          préférences, consultez notre{" "}
          <LocalizedClientLink href="/politique-cookies">
            politique de cookies
          </LocalizedClientLink>
          .
        </p>
      </section>

      <section>
        <h2>10. Contact</h2>
        <p>
          Pour toute question relative à cette politique de
          confidentialité :{" "}
          <a href={`mailto:${siteSettings.email}`}>{siteSettings.email}</a>.
        </p>
      </section>
    </LegalPageLayout>
  )
}
