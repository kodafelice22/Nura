import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ListBullet } from "@medusajs/icons"
import {
  Badge,
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

type Step = { product_id: string; instruction: string }

type Routine = {
  id: string
  title: string
  handle: string
  intro: string | null
  is_active: boolean
  steps: { product_id: string; step_order: number; instruction: string | null }[]
}

type ProductOption = { id: string; title: string }

type Draft = {
  id: string | null
  title: string
  handle: string
  intro: string
  is_active: boolean
  steps: Step[]
}

const EMPTY_DRAFT: Draft = {
  id: null,
  title: "",
  handle: "",
  intro: "",
  is_active: false,
  steps: [
    { product_id: "", instruction: "" },
    { product_id: "", instruction: "" },
  ],
}

const toDraft = (routine: Routine): Draft => ({
  id: routine.id,
  title: routine.title,
  handle: routine.handle,
  intro: routine.intro ?? "",
  is_active: routine.is_active,
  steps: [...routine.steps]
    .sort((a, b) => a.step_order - b.step_order)
    .map((step) => ({
      product_id: step.product_id,
      instruction: step.instruction ?? "",
    })),
})

const selectClassName =
  "h-8 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-2 text-sm text-ui-fg-base"

const RoutinesPage = () => {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [routineData, productData] = await Promise.all([
        adminFetch<{ routines: Routine[] }>("/admin/routines"),
        adminFetch<{ products: ProductOption[] }>(
          "/admin/products?limit=200&fields=id,title"
        ),
      ])
      setRoutines(routineData.routines)
      setProducts(productData.products)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chargement impossible.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const productTitle = (id: string) =>
    products.find((product) => product.id === id)?.title ?? "Produit supprimé"

  const save = async () => {
    if (!draft) {
      return
    }

    setSaving(true)
    try {
      await adminFetch(
        draft.id ? `/admin/routines/${draft.id}` : "/admin/routines",
        {
          method: "POST",
          body: JSON.stringify({
            title: draft.title,
            handle: draft.handle,
            intro: draft.intro,
            is_active: draft.is_active,
            steps: draft.steps,
          }),
        }
      )
      toast.success("Routine enregistrée.")
      setDraft(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (routine: Routine) => {
    if (!window.confirm(`Supprimer la routine « ${routine.title} » ?`)) {
      return
    }

    try {
      await adminFetch(`/admin/routines/${routine.id}`, { method: "DELETE" })
      toast.success("Routine supprimée.")
      if (draft?.id === routine.id) {
        setDraft(null)
      }
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible.")
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <Heading level="h1">Routines</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Une routine enchaîne 2 à 8 produits avec un conseil par étape. Elle
              s'affiche sur la fiche de chacun de ses produits, une fois publiée.
              Un produit supprimé ou non publié disparaît de la routine ; elle
              n'est plus affichée s'il reste moins de deux produits.
            </Text>
          </div>
          <Button size="small" onClick={() => setDraft({ ...EMPTY_DRAFT })}>
            Nouvelle routine
          </Button>
        </div>

        {routines.length === 0 ? (
          <Text size="small" className="text-ui-fg-muted">
            Aucune routine pour le moment.
          </Text>
        ) : (
          <ul className="flex flex-col divide-y divide-ui-border-base">
            {routines.map((routine) => (
              <li
                key={routine.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Text weight="plus">{routine.title}</Text>
                    <Badge size="2xsmall" color={routine.is_active ? "green" : "grey"}>
                      {routine.is_active ? "Publiée" : "Brouillon"}
                    </Badge>
                  </div>
                  <Text size="small" className="text-ui-fg-subtle">
                    {routine.steps.length} produits
                  </Text>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => setDraft(toDraft(routine))}
                  >
                    Modifier
                  </Button>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => remove(routine)}
                  >
                    Supprimer
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Container>

      {draft && (
        <Container className="flex flex-col gap-y-4">
          <Heading level="h2">
            {draft.id ? "Modifier la routine" : "Nouvelle routine"}
          </Heading>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-y-2">
              <Label size="small" weight="plus">
                Titre
              </Label>
              <Input
                value={draft.title}
                placeholder="Le rituel du soir"
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label size="small" weight="plus">
                Identifiant d'URL (facultatif)
              </Label>
              <Input
                value={draft.handle}
                placeholder="généré depuis le titre"
                onChange={(event) => setDraft({ ...draft, handle: event.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-y-2">
            <Label size="small" weight="plus">
              Introduction
            </Label>
            <Textarea
              rows={2}
              value={draft.intro}
              placeholder="Parfumez. Hydratez. Sublimez."
              onChange={(event) => setDraft({ ...draft, intro: event.target.value })}
            />
          </div>

          <RepeatableField
            label="Étapes, dans l'ordre"
            hint="De 2 à 8 produits, chacun une seule fois."
            items={draft.steps}
            empty={{ product_id: "", instruction: "" }}
            onChange={(steps) => setDraft({ ...draft, steps })}
            addLabel="Ajouter une étape"
            reorderable
            renderItem={(step, update, index) => (
              <div className="flex flex-col gap-y-2">
                <Text size="xsmall" className="text-ui-fg-muted">
                  Étape {index + 1}
                </Text>
                <select
                  className={selectClassName}
                  value={step.product_id}
                  aria-label={`Produit de l'étape ${index + 1}`}
                  onChange={(event) => update({ product_id: event.target.value })}
                >
                  <option value="">Choisir un produit</option>
                  {step.product_id &&
                    !products.some((product) => product.id === step.product_id) && (
                      <option value={step.product_id}>
                        {productTitle(step.product_id)}
                      </option>
                    )}
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.title}
                    </option>
                  ))}
                </select>
                <Textarea
                  rows={2}
                  value={step.instruction}
                  placeholder="Comment l'utiliser à cette étape"
                  onChange={(event) => update({ instruction: event.target.value })}
                />
              </div>
            )}
          />

          <div className="flex items-center gap-x-3">
            <Switch
              checked={draft.is_active}
              onCheckedChange={(checked) => setDraft({ ...draft, is_active: checked })}
            />
            <Label size="small" weight="plus">
              Publiée sur les fiches produit
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDraft(null)}>
              Annuler
            </Button>
            <Button onClick={save} isLoading={saving}>
              Enregistrer
            </Button>
          </div>
        </Container>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Routines",
  icon: ListBullet,
})

export default RoutinesPage
