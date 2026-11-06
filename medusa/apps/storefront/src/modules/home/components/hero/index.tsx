import { HeroBlock } from "@lib/data/home-content"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"

const DEFAULTS = {
  eyebrow: "Nura",
  title: "Votre aura commence ici.",
  text: "Parfumerie et bodycare premium, pensés pour accompagner chaque aura, chaque humeur et chaque moment.",
  cta_label: "Découvrir la collection",
  cta_href: "/store",
  secondary_label: "Explorer les parfums",
  secondary_href: "/categories/parfums",
  image: "/images/hero.webp",
  image_mobile: "/images/hero-mobile.webp",
}

const Hero = ({ block }: { block?: HeroBlock }) => {
  const content = { ...DEFAULTS, ...(block || {}) }
  const image = content.image || DEFAULTS.image
  const imageMobile = content.image_mobile || DEFAULTS.image_mobile
  const video = block?.video?.trim()

  return (
    <section
      data-floating-clear
      className="relative h-[calc(100svh-7rem)] min-h-[440px] max-h-[680px] w-full overflow-hidden bg-nude small:h-[88svh] small:min-h-[560px] small:max-h-[900px] [@media(max-height:500px)]:min-h-[300px]"
    >
      {/* Both crops keep a clean field of backdrop for the wording, so no
          scrim is needed over the photograph. The portrait crop leaves bands
          above and below the subject and the left half free, so on portrait
          screens the wording splits across those bands; landscape phones get
          the wide crop. */}
      {video ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster={image}
        >
          <source src={video} type="video/mp4" />
        </video>
      ) : (
        <>
          <Image
            src={image}
            alt="Campagne Nura"
            fill
            priority
            sizes="100vw"
            className="hidden object-cover object-center animate-slow-zoom landscape:block small:block"
          />
          <Image
            src={imageMobile}
            alt="Campagne Nura"
            fill
            priority
            sizes="100vw"
            className="object-cover object-top landscape:hidden small:hidden"
          />
        </>
      )}

      <div className="content-container relative z-10 flex h-full animate-fade-up flex-col justify-between gap-5 py-6 xsmall:py-10 small:justify-center small:gap-7 small:py-0 [@media(max-height:500px)]:py-6">
        <h1 className="flex max-w-xl flex-col gap-3 xsmall:gap-5 small:gap-7">
          <span className="font-serif text-xl uppercase tracking-[0.45em] text-brown xsmall:text-2xl small:text-3xl">
            {content.eyebrow}
          </span>
          {/* Narrow enough on portrait screens to stay left of the subject. */}
          <span className="max-w-[60vw] font-serif text-[clamp(2rem,10vw,2.75rem)] leading-[1.05] text-brown landscape:max-w-[62vw] small:max-w-none small:text-7xl [@media(max-height:500px)]:text-4xl">
            {content.title}
          </span>
        </h1>
        <div className="flex max-w-xl flex-col items-start gap-5 small:gap-7">
          {content.text && (
            <p className="max-w-[min(50vw,24rem)] text-sm font-light leading-relaxed text-brown/75 landscape:max-w-sm small:max-w-sm">
              {content.text}
            </p>
          )}
          <div className="flex flex-col gap-3 pt-1 landscape:flex-row landscape:items-center small:flex-row small:items-center">
            {content.cta_label && (
              <LocalizedClientLink
                href={content.cta_href || "/store"}
                className="inline-flex h-12 items-center justify-center bg-brown px-10 text-[11px] uppercase tracking-[0.2em] text-bg-alt transition-colors hover:bg-ink"
              >
                {content.cta_label}
              </LocalizedClientLink>
            )}
            {content.secondary_label && (
              <LocalizedClientLink
                href={content.secondary_href || "/store"}
                className="inline-flex h-12 items-center justify-center border border-brown/30 px-10 text-[11px] uppercase tracking-[0.2em] text-brown transition-colors hover:border-brown"
              >
                {content.secondary_label}
              </LocalizedClientLink>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
