"use client"

import { addToCart } from "@lib/data/cart"
import { ProductExtrasBlock } from "@lib/data/home-content"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import MobileActions from "./mobile-actions"
import StockAlertForm from "@modules/products/components/stock-alert-form"
import WishlistButton from "@modules/products/components/wishlist-button"
import { useRouter } from "next/navigation"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
  isLoggedIn?: boolean
  isInWishlist?: boolean
  stockAlertContent?: ProductExtrasBlock | null
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  disabled,
  isLoggedIn = false,
  isInWishlist = false,
  stockAlertContent,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>(() => {
    const variantId = searchParams.get("v_id")
    const variant = product.variants?.find((item) => item.id === variantId)

    if (variant) {
      return optionsAsKeymap(variant.options) ?? {}
    }

    if (product.variants?.length === 1) {
      return optionsAsKeymap(product.variants[0].options) ?? {}
    }

    return {}
  })
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const countryCode = useParams().countryCode as string

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // update the options when a variant is selected
  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  //check if the selected options produce a valid variant
  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
    // router/pathname/searchParams are intentionally excluded: this only
    // needs to run when the selected variant changes, and the `v_id`
    // equality check above already no-ops the router.replace() call once the
    // URL reflects the new selection, so including searchParams here would
    // just make the effect re-run without doing anything extra.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariant, isValidVariant])

  // check if the selected variant is in stock
  const inStock = useMemo(() => {
    // If we don't manage inventory, we can always add to cart
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }

    // If we allow back orders on the variant, we can add to cart
    if (selectedVariant?.allow_backorder) {
      return true
    }

    // If there is inventory available, we can add to cart
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }

    // Otherwise, we can't add to cart
    return false
  }, [selectedVariant])

  const actionsRef = useRef<HTMLDivElement>(null)
  const [showMobileActions, setShowMobileActions] = useState(false)

  useEffect(() => {
    const updateMobileActions = () => {
      const actions = actionsRef.current
      setShowMobileActions(Boolean(actions && actions.getBoundingClientRect().bottom < 64))
    }

    updateMobileActions()
    window.addEventListener("scroll", updateMobileActions, { passive: true })
    window.addEventListener("resize", updateMobileActions)

    return () => {
      window.removeEventListener("scroll", updateMobileActions)
      window.removeEventListener("resize", updateMobileActions)
    }
  }, [])

  useEffect(() => {
    document.body.classList.toggle("has-product-bar", showMobileActions)
    return () => document.body.classList.remove("has-product-bar")
  }, [showMobileActions])

  // add the selected variant to the cart
  const handleAddToCart = async (): Promise<void> => {
    if (!selectedVariant?.id) return

    setAddError(null)
    setIsAdding(true)

    try {
      await addToCart({
        variantId: selectedVariant.id,
        quantity: 1,
        countryCode,
      })
    } catch {
      setAddError(
        "Impossible d’ajouter cet article au panier. Vérifiez votre connexion et réessayez."
      )
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-y-4" ref={actionsRef}>
        <div>
          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-5">
              {(product.options || []).map((option) => {
                return (
                  <div key={option.id}>
                    <OptionSelect
                      option={option}
                      variants={product.variants}
                      current={options[option.id]}
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      data-testid="product-options"
                      disabled={!!disabled || isAdding}
                    />
                  </div>
                )
              })}
              <Divider />
            </div>
          )}
        </div>

        <ProductPrice product={product} variant={selectedVariant} />

        {inStock &&
          selectedVariant?.manage_inventory &&
          !selectedVariant?.allow_backorder &&
          typeof selectedVariant.inventory_quantity === "number" &&
          selectedVariant.inventory_quantity > 0 &&
          selectedVariant.inventory_quantity <= 5 && (
            <p className="txt-small text-rose-600" data-testid="low-stock-message">
              Plus que {selectedVariant.inventory_quantity} en stock
            </p>
          )}

        <div className="flex gap-x-2">
          <Button
            onClick={handleAddToCart}
            disabled={
              !inStock ||
              !selectedVariant ||
              !!disabled ||
              isAdding ||
              !isValidVariant
            }
            variant="primary"
            className="h-12 w-full"
            isLoading={isAdding}
            data-testid="add-product-button"
          >
            {!selectedVariant
              ? "Sélectionner une variante"
              : !inStock || !isValidVariant
              ? "Épuisé"
              : "Ajouter au panier"}
          </Button>
          <WishlistButton
            productId={product.id!}
            isLoggedIn={isLoggedIn}
            isInWishlist={isInWishlist}
          />
        </div>
        {selectedVariant?.id && !inStock && !disabled && (
          <StockAlertForm
            key={selectedVariant.id}
            variantId={selectedVariant.id}
            content={stockAlertContent}
          />
        )}
        {addError && (
          <p className="text-sm text-rose-700" role="alert">
            {addError}
          </p>
        )}
        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={showMobileActions}
          optionsDisabled={!!disabled || isAdding}
        />
      </div>
    </>
  )
}
