"use client"

import { HttpTypes } from "@medusajs/types"
import CartItemSelect from "@modules/cart/components/cart-item-select"
import ErrorMessage from "@modules/checkout/components/error-message"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Spinner from "@modules/common/icons/spinner"
import Thumbnail from "@modules/products/components/thumbnail"
import { convertToLocale } from "@lib/util/money"

import { useLineItem } from "./use-line-item"

/**
 * The cart line as a card. The desktop table has four columns that cannot
 * fit a phone without truncating the price, so small screens get this
 * instead.
 */
const MobileItem = ({
  item,
  currencyCode,
}: {
  item: HttpTypes.StoreCartLineItem
  currencyCode: string
}) => {
  const { updating, error, changeQuantity, maxQuantity } = useLineItem(item)

  return (
    <li className="flex flex-col gap-3 border-b border-nude py-5 first:pt-0 last:border-b-0">
      <div className="flex gap-4">
        <LocalizedClientLink
          href={`/products/${item.product_handle}`}
          className="w-20 flex-none"
          tabIndex={-1}
          aria-hidden="true"
        >
          <Thumbnail
            thumbnail={item.thumbnail}
            images={item.variant?.product?.images}
            title={item.product_title}
            size="square"
          />
        </LocalizedClientLink>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <LocalizedClientLink
            href={`/products/${item.product_handle}`}
            className="-my-1 py-1 text-sm leading-snug text-brown"
            data-testid="product-title"
          >
            {item.product_title}
          </LocalizedClientLink>
          <LineItemOptions
            variant={item.variant}
            data-testid="product-variant"
          />
          {/* With a single unit the line total already says it, so only
              spell out the unit price when there are several. */}
          {item.quantity > 1 && (
            <span className="flex items-center gap-1 text-xs text-ui-fg-muted">
              {item.quantity} ×
              <LineItemUnitPrice
                item={item}
                style="tight"
                currencyCode={currencyCode}
              />
            </span>
          )}
        </div>

        <span
          className="flex-none text-sm text-brown"
          data-testid="product-price"
        >
          {convertToLocale({
            amount: item.total ?? 0,
            currency_code: currencyCode,
          })}
        </span>
      </div>

      <div className="flex items-center justify-between pl-24">
        <div className="flex items-center gap-3">
          {maxQuantity > 0 ? (
            <CartItemSelect
              value={item.quantity}
              onChange={(value) => changeQuantity(parseInt(value.target.value))}
              className="h-11 w-16 p-4"
              data-testid="product-select-button"
            >
              {Array.from({ length: maxQuantity }, (_, i) => (
                <option value={i + 1} key={i + 1}>
                  {i + 1}
                </option>
              ))}
            </CartItemSelect>
          ) : (
            <span className="text-small-regular text-rose-600" role="status">
              Indisponible
            </span>
          )}
          {updating && <Spinner />}
        </div>

        <DeleteButton id={item.id} className="min-h-11 items-center">
          Retirer
        </DeleteButton>
      </div>

      <ErrorMessage error={error} data-testid="product-error-message" />
    </li>
  )
}

export default MobileItem
