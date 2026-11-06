import { defineRouteConfig } from "@medusajs/admin-sdk"
import { QuestionMarkCircle } from "@medusajs/icons"
import { Button, Container, Heading, Input, Text, Textarea, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import RepeatableField from "../../components/repeatable-field"
import { adminFetch } from "../../lib/api"

type Block = {
  key: string
  data: { items?: FaqItem[] }
}

type FaqItem = { question: string; answer: string; category?: string }

const FaqPage = () => {
  const [items, setItems] = useState<FaqItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { blocks } = await adminFetch<{ blocks: Block[] }>(
        "/admin/home-content"
      )
      const faq = blocks.find((block) => block.key === "faq")
      setItems(faq?.data?.items ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chargement impossible.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await adminFetch("/admin/home-content", {
        method: "POST",
        body: JSON.stringify({ key: "faq", data: { items }, active: true }),
      })
      toast.success("FAQ enregistrée.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.")
    } finally {
      setSaving(false)
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
    <Container className="flex flex-col gap-y-4">
      <div>
        <Heading level="h1">FAQ</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Les questions fréquentes affichées sur la page /faq, dans l'ordre. Une
          catégorie facultative regroupe les questions : les catégories
          apparaissent dans l'ordre de leur première question, et les questions
          sans catégorie forment un groupe « Autres questions ».
        </Text>
      </div>

      <RepeatableField
        label="Questions"
        items={items}
        empty={{ question: "", answer: "", category: "" }}
        onChange={setItems}
        addLabel="Ajouter une question"
        renderItem={(item, update) => (
          <div className="flex flex-col gap-y-2">
            <Input
              value={item.category ?? ""}
              placeholder="Catégorie (facultatif), ex. Livraison"
              onChange={(event) => update({ category: event.target.value })}
            />
            <Textarea
              rows={1}
              value={item.question}
              placeholder="Question"
              onChange={(event) => update({ question: event.target.value })}
            />
            <Textarea
              rows={3}
              value={item.answer}
              placeholder="Réponse"
              onChange={(event) => update({ answer: event.target.value })}
            />
          </div>
        )}
      />

      <div className="flex justify-end">
        <Button onClick={save} isLoading={saving}>
          Enregistrer
        </Button>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "FAQ",
  icon: QuestionMarkCircle,
})

export default FaqPage
