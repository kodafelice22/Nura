import "@fontsource/cormorant-garamond/500.css"
import "../styles/auth-brand.css"
import { defineWidgetConfig } from "@medusajs/admin-sdk"

// Renders nothing: it exists for the imports above. Widget modules load when
// the admin boots, so the styles also reach the invite and reset-password
// pages, which have no widget zone of their own.
const AuthBrandWidget = () => null

export const config = defineWidgetConfig({
  zone: "login.before",
})

export default AuthBrandWidget
