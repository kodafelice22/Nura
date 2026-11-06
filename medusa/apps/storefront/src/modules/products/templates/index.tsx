import React, { Suspense } from "react"

import { getHomeContent } from "@lib/data/home-content"
import { listProductRoutines } from "@lib/data/routines"
import Breadcrumbs from "@modules/common/components/breadcrumbs"
import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductRoutine from "@modules/products/components/product-routine"
import ProductReassurance from "@modules/products/components/product-reassurance"
import ProductReviews from "@modules/products/components/product-reviews"
import ProductTabs from "@modules/products/components/product-tabs"
import RecentlyViewed from "@modules/products/components/recently-viewed"
import RelatedProducts from "@modules/products/components/related-products"
import TrackRecentlyViewed from "@modules/products/components/track-recently-viewed"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

import ProductActionsWrapper from "./product-actions-wrapper"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
}

const ProductTemplate = async ({
  product,
  region,
  countryCode,
  images,
}: ProductTemplateProps) => {
  if (!product || !product.id) {
    return notFound()
  }

  const [{ blocks, hidden }, routines] = await Promise.all([
    getHomeContent(),
    listProductRoutines(product.id),
  ])
  const productExtras = hidden.includes("product_extras")
    ? null
    : blocks.product_extras

  return (
    <>
      <TrackRecentlyViewed handle={product.handle!} />
      <div className="content-container pt-6">
        <Breadcrumbs
          countryCode={countryCode}
          crumbs={[
            { label: "Boutique", href: "/store" },
            { label: product.title },
          ]}
        />
      </div>
      <div
        className="content-container relative flex flex-col gap-x-12 py-4 pb-28 small:flex-row small:items-start small:gap-x-16 small:py-6 small:pb-6 medium:gap-x-24"
        data-testid="product-container"
      >
        <div className="w-full small:w-3/5">
          <ImageGallery images={images} productTitle={product.title} />
        </div>
        <div className="flex w-full flex-col gap-y-7 py-6 small:sticky small:top-24 small:w-2/5 small:gap-y-8 small:py-2">
          <ProductInfo product={product} />
          <Suspense
            fallback={
              <ProductActions
                disabled={true}
                product={product}
                region={region}
              />
            }
          >
            <ProductActionsWrapper
              id={product.id}
              region={region}
              stockAlertContent={productExtras}
            />
          </Suspense>
          <ProductTabs product={product} content={productExtras} />
          {productExtras !== null && (
            <ProductReassurance content={productExtras} />
          )}
        </div>
      </div>
      {routines.length > 0 && (
        <div className="content-container my-16 small:my-24">
          <ProductRoutine routine={routines[0]} currentProductId={product.id} />
        </div>
      )}
      {productExtras !== null && (
        <>
          <div id="avis-produits" className="content-container my-16 scroll-mt-24 small:my-32">
            <ProductReviews productId={product.id} content={productExtras} />
          </div>
          <div
            className="content-container my-16 small:my-32"
            data-testid="related-products-container"
          >
            <Suspense fallback={<SkeletonRelatedProducts />}>
              <RelatedProducts
                product={product}
                countryCode={countryCode}
                content={productExtras}
              />
            </Suspense>
          </div>
          <RecentlyViewed
            region={region}
            excludeHandle={product.handle}
            text={productExtras?.recently_viewed_text}
          />
        </>
      )}
    </>
  )
}

export default ProductTemplate
