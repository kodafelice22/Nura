import { GalleryBlock } from "@lib/data/home-content"
import { getSiteSettings } from "@lib/data/site-settings"
import Reveal from "@modules/common/components/reveal"
import Image from "next/image"

const tiles = [
  {
    src: "/images/ugc-4.webp",
    label: "Campagne",
    span: "small:col-span-2 small:row-span-2",
  },
  { src: "/images/ugc-1.webp", label: "Rituel du matin", span: "" },
  { src: "/images/ugc-3.webp", label: "Aura Dorée", span: "" },
  { src: "/images/ugc-2.webp", label: "Gestes de soin", span: "" },
  { src: "/images/ugc-5.webp", label: "Textures", span: "" },
]

const Gallery = async ({ block }: { block?: GalleryBlock }) => {
  const social = (await getSiteSettings()).social
  const eyebrow = block?.eyebrow || "Communauté"
  const title = block?.title || "L'univers Nura"
  const subtitle =
    block?.subtitle ||
    "Campagnes, routines et gestes du quotidien — l'aura Nura vue par la maison et par vous."

  return (
    <section className="border-t border-nude bg-bg-alt">
      <div className="content-container section-y">
        <Reveal className="mb-10 flex flex-col gap-4 small:mb-14 small:flex-row small:items-end small:justify-between">
          <div className="flex flex-col gap-3">
            <span className="eyebrow">{eyebrow}</span>
            <h2 className="font-serif text-4xl text-brown small:text-5xl">
              {title}
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-ui-fg-subtle">
              {subtitle}
            </p>
          </div>
          {social.instagram && (
            <a
              href={social.instagram}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center self-start border border-brown/30 px-8 text-[11px] uppercase tracking-[0.2em] text-brown transition-colors hover:border-brown"
            >
              Suivre Nura
            </a>
          )}
        </Reveal>

        <Reveal>
          <ul className="grid grid-cols-2 gap-3 small:grid-cols-4 small:grid-rows-2">
            {tiles.map((tile) => (
              <li key={tile.src} className={tile.span}>
                <div className="group relative block h-full w-full overflow-hidden">
                  <div className="relative aspect-square h-full w-full">
                    <Image
                      src={tile.src}
                      alt=""
                      fill
                      sizes="(max-width: 900px) 50vw, 25vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-bg-alt opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    {tile.label}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>

        {(social.instagram || social.tiktok) && (
          <div className="mt-6 flex justify-center gap-6 text-[11px] uppercase tracking-[0.2em] text-brown/70">
            {social.instagram && (
              <a
                href={social.instagram}
                target="_blank"
                rel="noreferrer"
                className="link-underline hover:text-brown"
              >
                Instagram
              </a>
            )}
            {social.tiktok && (
              <a
                href={social.tiktok}
                target="_blank"
                rel="noreferrer"
                className="link-underline hover:text-brown"
              >
                TikTok
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default Gallery
