"use client"

import { AccountMessagesBlock } from "@lib/data/home-content"
import Login from "@modules/account/components/login"
import Register from "@modules/account/components/register"
import { clx } from "@modules/common/components/ui"
import { KeyboardEvent, useRef, useState } from "react"

const TABS = [
  { id: "sign-in", label: "Connexion" },
  { id: "register", label: "Créer un compte" },
] as const

type View = (typeof TABS)[number]["id"]

const AuthTabs = ({ messages }: { messages?: AccountMessagesBlock }) => {
  const [view, setView] = useState<View>("sign-in")
  const tabRefs = useRef<Record<View, HTMLButtonElement | null>>({
    "sign-in": null,
    register: null,
  })

  // Arrow keys move between tabs, as in the WAI-ARIA tabs pattern.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return
    }

    event.preventDefault()
    const next = view === "sign-in" ? "register" : "sign-in"
    setView(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col">
      <div
        role="tablist"
        aria-label="Connexion ou création de compte"
        className="mb-10 grid grid-cols-2"
        onKeyDown={onKeyDown}
      >
        {TABS.map((tab) => {
          const selected = view === tab.id

          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[tab.id] = element
              }}
              type="button"
              role="tab"
              id={`auth-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`auth-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setView(tab.id)}
              className={clx(
                "border-b pb-3 text-[11px] uppercase tracking-[0.2em] transition-colors",
                selected
                  ? "border-brown text-brown"
                  : "border-nude text-ui-fg-muted hover:text-brown"
              )}
              data-testid={`auth-tab-${tab.id}`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={`auth-panel-${view}`}
        aria-labelledby={`auth-tab-${view}`}
      >
        {view === "sign-in" ? (
          <Login messages={messages} />
        ) : (
          <Register messages={messages} />
        )}
      </div>
    </div>
  )
}

export default AuthTabs
