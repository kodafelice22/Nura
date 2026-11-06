"use client"

import { addToCart } from "@lib/data/cart"
import { clx } from "@modules/common/components/ui"
import { useParams } from "next/navigation"
import { useState } from "react"

export type QuickAddVariant = {
  id: string
  title: string
  available: boolean
}

const QuickAdd = ({ variants }: { variants: QuickAddVariant[] }) => {
  const { countryCode } = useParams() as { countryCode: string }
  const [open, setOpen] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const available = variants.filter((variant) => variant.available)

  if (available.length === 0) {
    return (
      <span className="block w-full bg-bg-alt/90 py-3 text-center text-[11px] uppercase tracking-[0.2em] text-ui-fg-muted">
        Épuisé
      </span>
    )
  }

  const add = async (variantId: string) => {
    setError(null)
    setPendingId(variantId)

    try {
      await addToCart({ variantId, quantity: 1, countryCode })
      setAdded(true)
      setOpen(false)
      setTimeout(() => setAdded(false), 2000)
    } catch {
      setError("Ajout impossible. Réessayez.")
    } finally {
      setPendingId(null)
    }
  }

  const handleTrigger = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (available.length === 1) {
      add(available[0].id)
      return
    }

    setOpen((value) => !value)
  }

  return (
    <div className="relative">
      {error && (
        <p
          className="absolute bottom-full left-0 right-0 bg-bg-alt px-3 py-2 text-center text-xs text-rose-700"
          role="alert"
        >
          {error}
        </p>
      )}
      {open && (
        <ul className="absolute bottom-full left-0 right-0 mb-px flex flex-wrap gap-px bg-nude/60">
          {available.map((variant) => (
            <li key={variant.id} className="flex-1">
              <button
                type="button"
                disabled={pendingId !== null}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  add(variant.id)
                }}
                className="min-h-11 w-full bg-bg-alt/95 px-2 py-3 text-[11px] uppercase tracking-[0.12em] text-brown transition-colors hover:bg-brown hover:text-bg-alt disabled:opacity-50"
              >
                {pendingId === variant.id ? "…" : variant.title}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={handleTrigger}
        disabled={pendingId !== null}
        className={clx(
          "min-h-11 w-full bg-bg-alt/95 px-3 py-3 text-[11px] uppercase tracking-[0.2em] transition-colors hover:bg-brown hover:text-bg-alt disabled:opacity-60",
          added ? "text-gold" : "text-brown"
        )}
      >
        {added
          ? "Ajouté au panier"
          : pendingId
          ? "Ajout…"
          : open
          ? "Choisir une taille"
          : "Ajout rapide"}
      </button>
    </div>
  )
}

export default QuickAdd
