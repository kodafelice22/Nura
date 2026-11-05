import { Metadata } from "next"
import LegalPageLayout from "@modules/legal/components/legal-page-layout"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getSiteSettings } from "@lib/data/site-settings"
import { getLegalInformation } from "@lib/legal"

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales de la maison Nura.",
}

export default async function MentionsLegalesPage() {
  const [siteSettings, legalInformation] = await Promise.all([
    getSiteSettings(),
    getLegalInformation(),
  ])

  return (
    <LegalPageLayout
      title="Mentions légales"
      updatedAt={legalInformation.lastUpdated}
    >
      <section>
        <h2>Éditeur du site</h2>
        <p>
          Le site {legalInformation.siteHost} est édité par :
          <br />
          <strong>{legalInformation.businessName}</strong>,{" "}
          {legalInformation.legalForm}, au capital de {legalInformation.capital}
          <br />
          Immatriculée au RCS de {legalInformation.registryCity} sous le numéro{" "}
          {legalInformation.registrationNumber}
          <br />
          Numéro de TVA intracommunautaire : {legalInformation.vatNumber}
          <br />
          Siège social : {legalInformation.address}
          <br />
          Téléphone :{" "}
          {siteSettings.phones
            .map((contact) => `${contact.label} ${contact.display}`)
            .join(" · ")}
          <br />
          Email :{" "}
          <a href={`mailto:${siteSettings.email}`}>{siteSettings.email}</a>
        </p>
      </section>

      <section>
        <h2>Directeur de la publication</h2>
        <p>{legalInformation.publicationDirector}</p>
      </section>

      <section>
        <h2>Hébergement</h2>
        <p>
          Le site est hébergé par :
          <br />
          <strong>{legalInformation.hostName}</strong>
          <br />
          {legalInformation.hostAddress}
          <br />
          {legalInformation.hostPhone}
        </p>
      </section>

      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble des contenus présents sur ce site (textes, images,
          logos, photographies, charte graphique) est la propriété exclusive
          de Nura ou de ses partenaires, et est protégé par le droit
          d&apos;auteur. Toute reproduction, représentation, modification ou
          exploitation, totale ou partielle, sans autorisation écrite
          préalable, est interdite et constitue une contrefaçon sanctionnée
          par le Code de la propriété intellectuelle.
        </p>
      </section>

      <section>
        <h2>Données personnelles</h2>
        <p>
          Le traitement des données personnelles collectées sur ce site est
          détaillé dans notre{" "}
          <LocalizedClientLink href="/confidentialite">
            politique de confidentialité
          </LocalizedClientLink>
          .
        </p>
      </section>

      <section>
        <h2>Médiation de la consommation</h2>
        <p>
          Conformément à l&apos;article L.616-1 du Code de la consommation,
          tout client peut recourir gratuitement au service de médiation{" "}
          {legalInformation.mediatorName} en cas de
          litige non résolu directement avec notre service client, dans un
          délai d&apos;un an à compter de sa réclamation écrite :{" "}
          {legalInformation.mediatorUrl ? (
            <a
              href={legalInformation.mediatorUrl}
              target="_blank"
              rel="noreferrer"
            >
              {legalInformation.mediatorUrl}
            </a>
          ) : (
            "À compléter dans l’Admin"
          )}.
        </p>
      </section>
    </LegalPageLayout>
  )
}
