import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CogSixTooth } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Switch,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import RepeatableField from "../../components/repeatable-field"
import { adminFetch } from "../../lib/api"

type Block = { key: string; data: Record<string, any>; active: boolean }

type Phone = { label: string; tel: string; display: string }
type Message = { text: string }

type SettingsState = {
  email: string
  hours: string
  phones: Phone[]
  instagram: string
  tiktok: string
}

const EMPTY_SETTINGS: SettingsState = {
  email: "",
  hours: "",
  phones: [],
  instagram: "",
  tiktok: "",
}

type SharedField = {
  name: string
  label: string
  multiline?: boolean
  list?: boolean
}

type SharedSection = {
  key: string
  title: string
  description: string
  fields: SharedField[]
}

type SharedBlockState = {
  active: boolean
  data: Record<string, string>
}

const SHARED_SECTIONS: SharedSection[] = [
  {
    key: "legal_information",
    title: "Mentions légales",
    description:
      "Informations réglementaires affichées dans les mentions légales, les CGV et les politiques du site.",
    fields: [
      { name: "last_updated", label: "Date de dernière mise à jour" },
      { name: "business_name", label: "Raison sociale" },
      { name: "legal_form", label: "Forme juridique" },
      { name: "capital", label: "Capital social" },
      { name: "registry_city", label: "Ville d'immatriculation" },
      { name: "registration_number", label: "Numéro d'immatriculation" },
      { name: "vat_number", label: "Numéro de TVA" },
      { name: "address", label: "Adresse du siège", multiline: true },
      { name: "publication_director", label: "Directeur de publication" },
      { name: "host_name", label: "Hébergeur" },
      { name: "host_address", label: "Adresse de l'hébergeur", multiline: true },
      { name: "host_phone", label: "Téléphone de l'hébergeur" },
      { name: "mediator_name", label: "Médiateur de la consommation" },
      { name: "mediator_url", label: "URL du médiateur" },
    ],
  },
  {
    key: "newsletter_band",
    title: "Newsletter",
    description: "Le bandeau d'inscription affiché avant le pied de page.",
    fields: [
      { name: "title", label: "Titre" },
      { name: "subtitle", label: "Sous-titre", multiline: true },
      { name: "success_message", label: "Message de confirmation" },
      { name: "consent_text", label: "Texte de consentement", multiline: true },
    ],
  },
  {
    key: "cookie_banner",
    title: "Bandeau cookies",
    description: "Le texte affiché avant le choix des préférences.",
    fields: [{ name: "text", label: "Texte", multiline: true }],
  },
  {
    key: "whatsapp",
    title: "WhatsApp",
    description: "Le message prérempli. Le numéro vient des coordonnées.",
    fields: [{ name: "message", label: "Message", multiline: true }],
  },
  {
    key: "footer_extra",
    title: "Pied de page",
    description: "La présentation de la marque et les moyens de paiement.",
    fields: [
      { name: "tagline", label: "Signature" },
      { name: "blurb", label: "Présentation", multiline: true },
      { name: "copyright_suffix", label: "Mention de copyright" },
      {
        name: "payment_methods",
        label: "Moyens de paiement (un par ligne)",
        multiline: true,
        list: true,
      },
    ],
  },
  {
    key: "product_extras",
    title: "Fiches produit",
    description: "Réassurance, livraison et retours sur chaque fiche produit.",
    fields: [
      { name: "reassurance_question", label: "Introduction du contact" },
      { name: "reassurance_shipping", label: "Réassurance livraison" },
      { name: "reassurance_returns", label: "Réassurance retours" },
      { name: "shipping_tab_title", label: "Titre livraison" },
      { name: "shipping_tab_text", label: "Texte livraison", multiline: true },
      { name: "returns_tab_title", label: "Titre retours" },
      { name: "returns_tab_text", label: "Texte retours", multiline: true },
      { name: "related_title", label: "Titre des recommandations" },
      {
        name: "related_text",
        label: "Texte des recommandations",
        multiline: true,
      },
      { name: "recently_viewed_text", label: "Texte des produits consultés" },
      { name: "reviews_empty_text", label: "Texte lorsqu'il n'y a aucun avis" },
      {
        name: "review_submitted_text",
        label: "Confirmation après envoi d'un avis",
      },
    ],
  },
]

const EMPTY_SHARED_BLOCKS = Object.fromEntries(
  SHARED_SECTIONS.map((section) => [
    section.key,
    { active: true, data: {} },
  ])
) as Record<string, SharedBlockState>

const SiteSettingsPage = () => {
  const [settings, setSettings] = useState<SettingsState>(EMPTY_SETTINGS)
  const [messages, setMessages] = useState<Message[]>([])
  const [sharedBlocks, setSharedBlocks] =
    useState<Record<string, SharedBlockState>>(EMPTY_SHARED_BLOCKS)
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [savingAnnouncement, setSavingAnnouncement] = useState(false)
  const [savingSharedKey, setSavingSharedKey] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const { blocks } = await adminFetch<{ blocks: Block[] }>(
        "/admin/home-content"
      )

      const siteSettings = blocks.find((b) => b.key === "site_settings")?.data
      const announcement = blocks.find((b) => b.key === "announcement")?.data

      if (siteSettings) {
        setSettings({
          email: siteSettings.email ?? "",
          hours: siteSettings.hours ?? "",
          phones: siteSettings.phones ?? [],
          instagram: siteSettings.social?.instagram ?? "",
          tiktok: siteSettings.social?.tiktok ?? "",
        })
      }

      setMessages(
        (announcement?.messages ?? []).map((text: string) => ({ text }))
      )

      setSharedBlocks((current) => {
        const next = { ...current }

        SHARED_SECTIONS.forEach((section) => {
          const block = blocks.find((item) => item.key === section.key)
          if (!block) {
            return
          }

          next[section.key] = {
            active: block.active,
            data: Object.fromEntries(
              section.fields.map((field) => {
                const value = block.data?.[field.name]
                return [
                  field.name,
                  field.list && Array.isArray(value)
                    ? value.join("\n")
                    : String(value ?? ""),
                ]
              })
            ),
          }
        })

        return next
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chargement impossible.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const saveSettings = async () => {
    setSavingSettings(true)
    try {
      await adminFetch("/admin/home-content", {
        method: "POST",
        body: JSON.stringify({
          key: "site_settings",
          active: true,
          data: {
            email: settings.email,
            hours: settings.hours,
            phones: settings.phones,
            social: { instagram: settings.instagram, tiktok: settings.tiktok },
          },
        }),
      })
      toast.success("Coordonnées enregistrées.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.")
    } finally {
      setSavingSettings(false)
    }
  }

  const saveAnnouncement = async () => {
    setSavingAnnouncement(true)
    try {
      await adminFetch("/admin/home-content", {
        method: "POST",
        body: JSON.stringify({
          key: "announcement",
          active: true,
          data: { messages: messages.map((m) => m.text) },
        }),
      })
      toast.success("Bandeau d'annonces enregistré.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.")
    } finally {
      setSavingAnnouncement(false)
    }
  }

  const updateShared = (
    key: string,
    field: string,
    value: string | boolean
  ) =>
    setSharedBlocks((current) => ({
      ...current,
      [key]:
        field === "active"
          ? { ...current[key], active: Boolean(value) }
          : {
              ...current[key],
              data: { ...current[key].data, [field]: String(value) },
            },
    }))

  const saveShared = async (section: SharedSection) => {
    setSavingSharedKey(section.key)
    try {
      const block = sharedBlocks[section.key]
      const data = Object.fromEntries(
        section.fields.map((field) => {
          const value = block.data[field.name] ?? ""
          return [
            field.name,
            field.list
              ? value
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean)
              : value,
          ]
        })
      )

      await adminFetch("/admin/home-content", {
        method: "POST",
        body: JSON.stringify({
          key: section.key,
          active: block.active,
          data,
        }),
      })
      toast.success("Contenu enregistré.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.")
    } finally {
      setSavingSharedKey(null)
    }
  }

  if (loading) {
    return (
      <Container>
        <Text className="text-ui-fg-subtle">Chargement…</Text>
      </Container>
    )
  }

  return (
    <div className="flex flex-col gap-y-4">
      <Container className="flex flex-col gap-y-4">
        <div>
          <Heading level="h1">Coordonnées & réseaux</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Utilisés partout où le site affiche un contact : menu, pied de
            page, page Contact, FAQ, compte client.
          </Text>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-y-2">
            <Label size="small" weight="plus">
              Email de contact
            </Label>
            <Input
              value={settings.email}
              placeholder="contact@nura-paris.com"
              onChange={(event) =>
                setSettings((s) => ({ ...s, email: event.target.value }))
              }
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label size="small" weight="plus">
              Horaires
            </Label>
            <Input
              value={settings.hours}
              placeholder="Du lundi au vendredi, 9h — 18h"
              onChange={(event) =>
                setSettings((s) => ({ ...s, hours: event.target.value }))
              }
            />
          </div>
        </div>

        <RepeatableField
          label="Numéros de téléphone"
          items={settings.phones}
          empty={{ label: "", tel: "", display: "" }}
          onChange={(phones) => setSettings((s) => ({ ...s, phones }))}
          addLabel="Ajouter un numéro"
          hint="Le numéro d'appel (tel) au format international, ex. +33745064887."
          renderItem={(phone, update) => (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <Input
                value={phone.label}
                placeholder="Libellé, ex. France"
                onChange={(event) => update({ label: event.target.value })}
              />
              <Input
                value={phone.tel}
                placeholder="+33745064887"
                onChange={(event) => update({ tel: event.target.value })}
              />
              <Input
                value={phone.display}
                placeholder="Affiché, ex. +33 7 45 06 48 87"
                onChange={(event) => update({ display: event.target.value })}
              />
            </div>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-y-2">
            <Label size="small" weight="plus">
              Instagram (URL)
            </Label>
            <Input
              value={settings.instagram}
              placeholder="https://instagram.com/nura"
              onChange={(event) =>
                setSettings((s) => ({ ...s, instagram: event.target.value }))
              }
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label size="small" weight="plus">
              TikTok (URL)
            </Label>
            <Input
              value={settings.tiktok}
              placeholder="https://tiktok.com/@nura"
              onChange={(event) =>
                setSettings((s) => ({ ...s, tiktok: event.target.value }))
              }
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={saveSettings} isLoading={savingSettings}>
            Enregistrer
          </Button>
        </div>
      </Container>

      <Container className="flex flex-col gap-y-4">
        <div>
          <Heading level="h1">Bandeau d'annonces</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Les messages qui défilent en haut de chaque page.
          </Text>
        </div>

        <RepeatableField
          label="Messages"
          items={messages}
          empty={{ text: "" }}
          onChange={setMessages}
          addLabel="Ajouter un message"
          renderItem={(message, update) => (
            <Textarea
              rows={1}
              value={message.text}
              placeholder="Livraison en France et en Côte d'Ivoire"
              onChange={(event) => update({ text: event.target.value })}
            />
          )}
        />

        <div className="flex justify-end">
          <Button onClick={saveAnnouncement} isLoading={savingAnnouncement}>
            Enregistrer
          </Button>
        </div>
      </Container>


      {SHARED_SECTIONS.map((section) => {
        const block = sharedBlocks[section.key]

        return (
          <Container key={section.key} className="flex flex-col gap-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Heading level="h2">{section.title}</Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  {section.description}
                </Text>
              </div>
              <div className="flex items-center gap-x-2">
                <Label size="small">Visible</Label>
                <Switch
                  checked={block.active}
                  onCheckedChange={(checked) =>
                    updateShared(section.key, "active", checked)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {section.fields.map((field) => (
                <div key={field.name} className="flex flex-col gap-y-2">
                  <Label size="small" weight="plus">
                    {field.label}
                  </Label>
                  {field.multiline ? (
                    <Textarea
                      rows={field.list ? 4 : 2}
                      value={block.data[field.name] ?? ""}
                      onChange={(event) =>
                        updateShared(
                          section.key,
                          field.name,
                          event.target.value
                        )
                      }
                    />
                  ) : (
                    <Input
                      value={block.data[field.name] ?? ""}
                      onChange={(event) =>
                        updateShared(
                          section.key,
                          field.name,
                          event.target.value
                        )
                      }
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => saveShared(section)}
                isLoading={savingSharedKey === section.key}
              >
                Enregistrer
              </Button>
            </div>
          </Container>
        )
      })}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Réglages du site",
  icon: CogSixTooth,
})

export default SiteSettingsPage
