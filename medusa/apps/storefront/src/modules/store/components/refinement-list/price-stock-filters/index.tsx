"use client"

import { FormEvent, useState } from "react"

import { ProductFilters } from "@lib/util/product-filters"

type PriceStockFiltersProps = {
  filters: ProductFilters
  currencyCode?: string
  onApplyPrice: (range: { min: string; max: string }) => void
  onToggleInStock: (inStock: boolean) => void
}

const getCurrencySymbol = (currencyCode?: string) => {
  if (!currencyCode) {
    return ""
  }

  try {
    return (
      new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: currencyCode.toUpperCase(),
        currencyDisplay: "narrowSymbol",
      })
        .formatToParts(0)
        .find((part) => part.type === "currency")?.value ?? ""
    )
  } catch {
    return ""
  }
}

const inputClassName =
  "h-11 w-full border border-nude bg-bg px-3 text-sm text-brown placeholder:text-ui-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"

const PriceStockFilters = ({
  filters,
  currencyCode,
  onApplyPrice,
  onToggleInStock,
}: PriceStockFiltersProps) => {
  const [min, setMin] = useState(filters.minPrice?.toString() ?? "")
  const [max, setMax] = useState(filters.maxPrice?.toString() ?? "")
  const symbol = getCurrencySymbol(currencyCode)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onApplyPrice({ min: min.trim(), max: max.trim() })
  }

  return (
    <div className="flex flex-col gap-y-6" data-testid="price-stock-filters">
      <form onSubmit={submit} className="flex flex-col gap-y-3">
        <span className="txt-compact-small-plus text-ui-fg-subtle">
          Prix{symbol ? ` (${symbol})` : ""}
        </span>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-24 flex-1 flex-col gap-1 text-[11px] uppercase tracking-[0.15em] text-ui-fg-muted">
            Min
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={min}
              onChange={(event) => setMin(event.target.value)}
              placeholder="0"
              className={inputClassName}
              data-testid="price-min"
            />
          </label>
          <label className="flex min-w-24 flex-1 flex-col gap-1 text-[11px] uppercase tracking-[0.15em] text-ui-fg-muted">
            Max
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={max}
              onChange={(event) => setMax(event.target.value)}
              placeholder="Sans limite"
              className={inputClassName}
              data-testid="price-max"
            />
          </label>
          <button
            type="submit"
            className="min-h-11 border border-brown px-5 text-[11px] uppercase tracking-[0.15em] text-brown transition-colors hover:bg-brown hover:text-bg-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            Appliquer
          </button>
        </div>
      </form>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-brown">
        <input
          type="checkbox"
          checked={!!filters.inStock}
          onChange={(event) => onToggleInStock(event.target.checked)}
          className="h-4 w-4 accent-brown focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          data-testid="in-stock-only"
        />
        En stock uniquement
      </label>
    </div>
  )
}

export default PriceStockFilters
