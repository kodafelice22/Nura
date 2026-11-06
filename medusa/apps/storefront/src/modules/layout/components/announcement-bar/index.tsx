"use client"

import { useEffect, useState } from "react"

const DEFAULT_MESSAGES = [
  "Livraison en France et en Côte d'Ivoire",
  "Paiement sécurisé",
  "Retours sous 14 jours",
  "Votre aura commence ici",
]

const AnnouncementBar = ({ messages }: { messages?: string[] }) => {
  const items = messages?.length ? messages : DEFAULT_MESSAGES
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (items.length < 2 || paused) {
      return
    }

    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), 4500)
    return () => clearInterval(id)
  }, [items.length, paused])

  return (
    <div
      className="relative z-20 w-full bg-brown text-bg-alt"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="content-container flex h-9 items-center justify-center overflow-hidden">
        <p
          key={index}
          className="animate-fade-in-top text-center text-[11px] uppercase leading-tight tracking-[0.12em] xsmall:tracking-[0.2em] small:tracking-[0.3em]"
          aria-live="off"
        >
          {items[index % items.length]}
        </p>
      </div>
    </div>
  )
}

export default AnnouncementBar
