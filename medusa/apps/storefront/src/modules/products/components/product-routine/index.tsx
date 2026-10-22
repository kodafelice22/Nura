import { Routine } from "@lib/data/routines"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"

type ProductRoutineProps = {
  routine: Routine
  /** The product being viewed: its step is marked rather than linked. */
  currentProductId: string
}

// A routine: ordered products with how to use each one. Rendered on the page
// of every product it contains.
const ProductRoutine = ({ routine, currentProductId }: ProductRoutineProps) => {
  return (
    <section
      aria-labelledby={`routine-${routine.id}`}
      className="flex flex-col gap-8"
      data-testid="product-routine"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="eyebrow">Le rituel</span>
        <h2
          id={`routine-${routine.id}`}
          className="font-serif text-3xl text-brown small:text-4xl"
        >
          {routine.title}
        </h2>
        {routine.intro && (
          <p className="max-w-lg text-sm leading-relaxed text-ui-fg-subtle">
            {routine.intro}
          </p>
        )}
      </div>

      <ol className="grid grid-cols-1 gap-8 small:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
        {routine.steps.map((step) => {
          const isCurrent = step.product.id === currentProductId

          return (
            <li key={step.product.id} className="flex flex-col gap-3">
              <span className="font-serif text-2xl text-gold lining-nums" aria-hidden="true">
                {String(step.order).padStart(2, "0")}
              </span>
              <div className="w-full max-w-[220px]">
                <Thumbnail
                  thumbnail={step.product.thumbnail}
                  title={step.product.title}
                  size="full"
                />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-[11px] uppercase tracking-[0.2em] text-brown">
                  <span className="sr-only">Étape {step.order} : </span>
                  {isCurrent ? (
                    <>
                      {step.product.title}
                      <span className="ml-2 text-gold">· Vous consultez ce produit</span>
                    </>
                  ) : (
                    <LocalizedClientLink
                      href={`/products/${step.product.handle}`}
                      className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      {step.product.title}
                    </LocalizedClientLink>
                  )}
                </p>
                {step.instruction && (
                  <p className="text-sm leading-relaxed text-ui-fg-subtle">
                    {step.instruction}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default ProductRoutine
