import { Metadata } from "next"
import LegalPageLayout from "@modules/legal/components/legal-page-layout"
import { getHomeContent } from "@lib/data/home-content"
import { resolveLegalInformation } from "@lib/legal"
import PostBody from "@modules/journal/components/post-body"
import CookiePreferencesButton from "@modules/layout/components/cookie-preferences-button"

export const metadata: Metadata = {
  title: "Politique de cookies",
  description: "Politique de gestion des cookies du site Nura.",
}

const DEFAULT_CONTENT = `## Qu'est-ce qu'un cookie ?

Un cookie est un petit fichier texte déposé sur votre appareil lors de la visite d'un site internet. Il permet au site de reconnaître votre appareil et de mémoriser certaines informations sur vos préférences ou actions passées.

## Les cookies utilisés sur ce site

Cookies strictement nécessaires — indispensables au fonctionnement du site (panier, session de connexion, région choisie). Ils ne peuvent pas être désactivés et ne nécessitent pas votre consentement conformément à la réglementation.

Cookies de mesure d'audience et de publicité — utilisés uniquement si vous les acceptez, pour mesurer la fréquentation du site (Google Analytics) et l'efficacité de nos campagnes publicitaires (Meta, TikTok). Ces outils ne sont chargés qu'après votre consentement explicite via le bandeau de cookies.

## Gérer vos préférences

Lors de votre première visite, un bandeau vous permet d'accepter ou de refuser les cookies non essentiels. Vous pouvez modifier votre choix à tout moment avec le bouton de gestion des cookies disponible sur cette page et dans le pied de page.`

export default async function PolitiqueCookiesPage() {
  const { blocks } = await getHomeContent()
  const page = blocks.page_politique_cookies
  const legalInformation = resolveLegalInformation(blocks.legal_information)

  return (
    <LegalPageLayout
      title={page?.title || "Politique de cookies"}
      updatedAt={legalInformation.lastUpdated}
    >
      <PostBody content={page?.content || DEFAULT_CONTENT} />
      <CookiePreferencesButton className="mt-8 inline-flex min-h-11 items-center border border-brown px-5 text-[11px] uppercase tracking-[0.15em] text-brown hover:bg-nude/30" />
    </LegalPageLayout>
  )
}
