import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  ArrowRight,
  BuildingStorefront,
  ChartBar,
  CubeSolid,
  DocumentText,
  Photo,
  ShoppingBag,
  Sparkles,
  Users,
} from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  Skeleton,
  StatusBadge,
  Text,
  toast,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { adminFetch } from "../../lib/api"

type Order = {
  id: string
  display_id: number
  status: string
  fulfillment_status?: string
  payment_status?: string
  total: number
  currency_code: string
  created_at: string
}

type PaginatedResponse<T> = {
  count: number
  orders?: T[]
  products?: T[]
  customers?: T[]
  inventory_items?: T[]
}

type ReviewResponse = {
  reviews: Array<{ id: string }>
}

type DashboardData = {
  orders: Order[]
  orderCount: number
  productCount: number
  customerCount: number
  inventoryCount: number
  pendingReviewCount: number
}

const EMPTY_DATA: DashboardData = {
  orders: [],
  orderCount: 0,
  productCount: 0,
  customerCount: 0,
  inventoryCount: 0,
  pendingReviewCount: 0,
}

const STATUS_LABELS: Record<string, string> = {
  completed: "Terminée",
  canceled: "Annulée",
  pending: "En attente",
  draft: "Brouillon",
  archived: "Archivée",
  requires_action: "Action requise",
}

const STATUS_COLORS: Record<
  string,
  "green" | "red" | "blue" | "orange" | "grey" | "purple"
> = {
  completed: "green",
  canceled: "red",
  pending: "orange",
  draft: "grey",
  archived: "grey",
  requires_action: "red",
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))

const formatAmount = (amount: number, currencyCode: string) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount)

const Metric = ({
  label,
  value,
  detail,
  loading,
  icon: Icon,
}: {
  label: string
  value: number
  detail: string
  loading: boolean
  icon: React.ComponentType<{ className?: string }>
}) => (
  <div className="flex min-h-[132px] flex-col justify-between border-b border-ui-border-base p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
    <div className="flex items-center justify-between gap-3">
      <Text size="small" weight="plus" className="text-ui-fg-subtle">
        {label}
      </Text>
      <div className="flex size-8 items-center justify-center rounded-md bg-ui-bg-subtle text-ui-fg-muted">
        <Icon className="size-4" aria-hidden="true" />
      </div>
    </div>
    <div>
      {loading ? (
        <Skeleton className="mb-2 h-8 w-16" />
      ) : (
        <Text
          as="p"
          className="text-[28px] font-medium leading-none text-ui-fg-base"
        >
          {value.toLocaleString("fr-FR")}
        </Text>
      )}
      <Text size="xsmall" className="mt-2 text-ui-fg-muted">
        {detail}
      </Text>
    </div>
  </div>
)

const QuickLink = ({
  to,
  title,
  description,
  icon: Icon,
}: {
  to: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}) => (
  <Link
    to={to}
    className="group flex min-h-[76px] items-center gap-3 rounded-md border border-ui-border-base bg-ui-bg-base p-3 outline-none transition-colors hover:bg-ui-bg-subtle focus-visible:shadow-borders-focus"
  >
    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-ui-bg-subtle text-ui-fg-subtle transition-colors group-hover:bg-[#b58a45]/10 group-hover:text-[#8f682c]">
      <Icon className="size-4" aria-hidden="true" />
    </div>
    <div className="min-w-0 flex-1">
      <Text size="small" weight="plus" className="text-ui-fg-base">
        {title}
      </Text>
      <Text size="xsmall" className="mt-0.5 text-ui-fg-muted">
        {description}
      </Text>
    </div>
    <ArrowRight
      className="size-4 shrink-0 text-ui-fg-muted transition-transform group-hover:translate-x-0.5"
      aria-hidden="true"
    />
  </Link>
)

const PilotagePage = () => {
  const [data, setData] = useState<DashboardData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const [orders, products, customers, inventory, reviews] =
        await Promise.all([
          adminFetch<PaginatedResponse<Order>>(
            "/admin/orders?limit=5&order=-created_at&fields=id,display_id,status,fulfillment_status,payment_status,total,currency_code,created_at"
          ),
          adminFetch<PaginatedResponse<never>>(
            "/admin/products?limit=1&fields=id"
          ),
          adminFetch<PaginatedResponse<never>>(
            "/admin/customers?limit=1&fields=id"
          ),
          adminFetch<PaginatedResponse<never>>(
            "/admin/inventory-items?limit=1&fields=id"
          ),
          adminFetch<ReviewResponse>("/admin/reviews?status=pending"),
        ])

      setData({
        orders: orders.orders ?? [],
        orderCount: orders.count,
        productCount: products.count,
        customerCount: customers.count,
        inventoryCount: inventory.count,
        pendingReviewCount: reviews.reviews.length,
      })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Le tableau de bord n'a pas pu être chargé."
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const today = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date())

  return (
    <div className="flex flex-col gap-4">
      <section className="relative overflow-hidden rounded-lg bg-[#171613] px-5 py-6 text-white sm:px-7 sm:py-7">
        <div
          className="absolute inset-y-0 right-0 hidden w-48 border-l border-white/10 sm:block"
          aria-hidden="true"
        >
          <div className="absolute left-8 top-0 h-full w-px bg-white/10" />
          <div className="absolute left-16 top-0 h-full w-px bg-[#b58a45]/40" />
        </div>
        <div className="relative max-w-3xl">
          <div className="mb-5 flex items-center gap-2 text-[#d7b87a]">
            <Sparkles className="size-4" aria-hidden="true" />
            <Text size="xsmall" weight="plus" className="text-[#d7b87a]">
              Maison Nura
            </Text>
          </div>
          <Heading
            level="h1"
            className="text-[32px] font-medium leading-tight tracking-normal text-white"
            style={{
              fontFamily:
                '"Iowan Old Style", "Baskerville", "Times New Roman", serif',
            }}
          >
            Pilotez votre boutique avec clarté.
          </Heading>
          <Text className="mt-2 max-w-2xl text-white/65">
            L'essentiel de l'activité, les actions prioritaires et les contenus
            Nura réunis dans une seule vue.
          </Text>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <StatusBadge color="green">Boutique en ligne</StatusBadge>
            <Text size="xsmall" className="capitalize text-white/50">
              {today}
            </Text>
          </div>
        </div>
      </section>

      <Container className="p-0">
        <div className="flex items-center justify-between gap-4 border-b border-ui-border-base px-5 py-4">
          <div>
            <Heading level="h2">Vue d'ensemble</Heading>
            <Text size="small" className="mt-1 text-ui-fg-subtle">
              Indicateurs opérationnels en temps réel
            </Text>
          </div>
          <Button
            variant="secondary"
            size="small"
            isLoading={refreshing}
            onClick={() => load(true)}
          >
            Actualiser
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Commandes"
            value={data.orderCount}
            detail="Toutes les commandes"
            loading={loading}
            icon={ShoppingBag}
          />
          <Metric
            label="Produits"
            value={data.productCount}
            detail="Références au catalogue"
            loading={loading}
            icon={CubeSolid}
          />
          <Metric
            label="Clients"
            value={data.customerCount}
            detail="Profils enregistrés"
            loading={loading}
            icon={Users}
          />
          <Metric
            label="Stocks"
            value={data.inventoryCount}
            detail="Articles suivis"
            loading={loading}
            icon={ChartBar}
          />
        </div>
      </Container>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
        <Container className="p-0">
          <div className="flex items-center justify-between gap-3 border-b border-ui-border-base px-5 py-4">
            <div>
              <Heading level="h2">Commandes récentes</Heading>
              <Text size="small" className="mt-1 text-ui-fg-subtle">
                Les cinq dernières commandes reçues
              </Text>
            </div>
            <Button asChild variant="transparent" size="small">
              <Link to="/orders">Tout afficher</Link>
            </Button>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3 p-5">
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} className="h-12 w-full" />
              ))}
            </div>
          ) : data.orders.length > 0 ? (
            <div className="divide-y divide-ui-border-base">
              {data.orders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 outline-none transition-colors hover:bg-ui-bg-subtle focus-visible:shadow-borders-focus"
                >
                  <div className="min-w-0 flex-1">
                    <Text size="small" weight="plus">
                      Commande #{order.display_id}
                    </Text>
                    <Text size="xsmall" className="mt-0.5 text-ui-fg-muted">
                      {formatDate(order.created_at)}
                    </Text>
                  </div>
                  <StatusBadge color={STATUS_COLORS[order.status] ?? "grey"}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </StatusBadge>
                  <Text size="small" weight="plus" className="hidden sm:block">
                    {formatAmount(order.total, order.currency_code)}
                  </Text>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[240px] flex-col items-center justify-center px-6 py-10 text-center">
              <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-[#b58a45]/10 text-[#8f682c]">
                <ShoppingBag className="size-5" aria-hidden="true" />
              </div>
              <Heading level="h3">Prête pour la première commande</Heading>
              <Text size="small" className="mt-2 max-w-sm text-ui-fg-subtle">
                Les nouvelles commandes apparaîtront ici dès qu'un achat sera
                finalisé sur la boutique.
              </Text>
              <Button asChild variant="secondary" size="small" className="mt-5">
                <a
                  href="https://nurabeautyco.com/ci"
                  target="_blank"
                  rel="noreferrer"
                >
                  Voir la boutique
                </a>
              </Button>
            </div>
          )}
        </Container>

        <div className="flex flex-col gap-4">
          <Container className="p-0">
            <div className="border-b border-ui-border-base px-5 py-4">
              <Heading level="h2">Accès rapides</Heading>
              <Text size="small" className="mt-1 text-ui-fg-subtle">
                Les tâches les plus fréquentes
              </Text>
            </div>
            <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 xl:grid-cols-1">
              <QuickLink
                to="/products/create"
                title="Ajouter un produit"
                description="Créer une nouvelle référence"
                icon={CubeSolid}
              />
              <QuickLink
                to="/home-content"
                title="Mettre à jour l'accueil"
                description="Visuels, messages et sélections"
                icon={Photo}
              />
              <QuickLink
                to="/journal"
                title="Publier dans le Journal"
                description="Créer un nouvel article"
                icon={DocumentText}
              />
              <QuickLink
                to="/site-settings"
                title="Réglages du site"
                description="Coordonnées, légal et réassurance"
                icon={BuildingStorefront}
              />
            </div>
          </Container>

          <Container className="p-0">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <Text size="small" weight="plus">
                  Avis à modérer
                </Text>
                <Text size="xsmall" className="mt-1 text-ui-fg-muted">
                  Retours clients en attente de validation
                </Text>
              </div>
              {loading ? (
                <Skeleton className="h-7 w-10" />
              ) : (
                <div className="flex min-w-9 items-center justify-center rounded-md bg-ui-bg-subtle px-2.5 py-1.5">
                  <Text size="small" weight="plus">
                    {data.pendingReviewCount}
                  </Text>
                </div>
              )}
            </div>
          </Container>
        </div>
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Vue d'ensemble",
  icon: ChartBar,
})

export default PilotagePage