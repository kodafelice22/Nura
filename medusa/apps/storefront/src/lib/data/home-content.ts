"use server"

import { sdk } from "@lib/config"

export type HeroBlock = {
  eyebrow?: string
  title?: string
  text?: string
  cta_label?: string
  cta_href?: string
  secondary_label?: string
  secondary_href?: string
  image?: string
  image_mobile?: string
  video?: string
}

export type CampaignBlock = {
  eyebrow?: string
  title?: string
  text?: string
  cta_label?: string
  cta_href?: string
  image?: string
  image_mobile?: string
}

export type EssentialsBlock = {
  title?: string
  subtitle?: string
  handles?: string
}

export type EditorialPillar = { title: string; text: string }

export type EditorialBlock = {
  eyebrow?: string
  title?: string
  text?: string
  cta_label?: string
  cta_href?: string
  image?: string
  pillars?: EditorialPillar[]
}

export type RitualStep = { title: string; text: string; image?: string; href?: string }

export type RitualBlock = {
  eyebrow?: string
  title?: string
  steps?: RitualStep[]
}

export type CategoryDoor = { handle: string; title: string; description: string }

export type CategoriesBlock = {
  doors?: CategoryDoor[]
}

export type GalleryBlock = {
  eyebrow?: string
  title?: string
  subtitle?: string
}

export type SitePhone = { label: string; tel: string; display: string }

export type SiteSettingsBlock = {
  email?: string
  hours?: string
  phones?: SitePhone[]
  social?: { instagram?: string; tiktok?: string }
}

export type AnnouncementBlock = {
  messages?: string[]
}

export type FaqItem = { question: string; answer: string; category?: string }

export type FaqBlock = {
  items?: FaqItem[]
}

export type PageBlock = {
  title?: string
  content?: string
}

export type BestSellersBlock = {
  eyebrow?: string
  title?: string
  subtitle?: string
  cta_label?: string
  cta_href?: string
}

export type ReviewsHeadingBlock = {
  eyebrow?: string
  title?: string
}

export type NewsletterBandBlock = {
  title?: string
  subtitle?: string
  success_message?: string
  consent_text?: string
}

export type CookieBannerBlock = {
  text?: string
}

export type FooterExtraBlock = {
  tagline?: string
  blurb?: string
  payment_methods?: string[]
  copyright_suffix?: string
}

export type WhatsappBlock = {
  message?: string
}

export type LegalInformationBlock = {
  last_updated?: string
  business_name?: string
  legal_form?: string
  capital?: string
  registry_city?: string
  registration_number?: string
  vat_number?: string
  address?: string
  publication_director?: string
  host_name?: string
  host_address?: string
  host_phone?: string
  mediator_name?: string
  mediator_url?: string
}

export type CartMessagesBlock = {
  empty_title?: string
  empty_text?: string
  empty_cta_label?: string
  empty_cta_href?: string
  sign_in_title?: string
  sign_in_text?: string
  fix_cart_text?: string
  mini_cart_empty?: string
  mismatch_error?: string
  not_found_text?: string
}

export type CheckoutMessagesBlock = {
  unavailable_title?: string
  unavailable_text?: string
  summary_question?: string
  shipping_question?: string
  pickup_label?: string
  pickup_choose?: string
  payment_empty?: string
  payment_empty_hint?: string
  payment_error_generic?: string
  mobile_wallet_prompt?: string
  jeko_error?: string
  gift_option_text?: string
  consent_text?: string
  payment_failed_text?: string
  order_failed_text?: string
}

export type AccountMessagesBlock = {
  login_title?: string
  login_text?: string
  verify_sent_text?: string
  register_title?: string
  register_text?: string
  register_verify_text?: string
  register_consent_text?: string
  forgot_title?: string
  forgot_text?: string
  forgot_sent_title?: string
  forgot_sent_text?: string
  reset_success_title?: string
  reset_success_text?: string
  reset_invalid_title?: string
  reset_invalid_text?: string
  verify_success_text?: string
  verify_invalid_text?: string
  sla_text?: string
  orders_intro?: string
  addresses_intro?: string
  profile_intro?: string
  wishlist_intro?: string
  wishlist_empty_text?: string
  order_overview_empty_title?: string
  order_overview_empty_text?: string
  referral_text?: string
  transfer_intro?: string
}

export type OrderMessagesBlock = {
  thank_you_title?: string
  thank_you_text?: string
  confirmation_email_text?: string
  help_title?: string
  transfer_success_text?: string
  transfer_declined_text?: string
  transfer_request_text?: string
  transfer_ownership_text?: string
  transfer_ignore_text?: string
}

export type NotFoundMessagesBlock = {
  title?: string
  text?: string
  error_eyebrow?: string
  error_title?: string
  error_text?: string
}

export type StorePageBlock = {
  eyebrow?: string
  title?: string
  text?: string
  empty_state?: string
}

export type CollectionsPageBlock = {
  eyebrow?: string
  title?: string
  text?: string
  empty_state?: string
  collection_blurb_template?: string
}

export type ProductExtrasBlock = {
  reassurance_question?: string
  reassurance_shipping?: string
  reassurance_returns?: string
  shipping_tab_title?: string
  shipping_tab_text?: string
  returns_tab_title?: string
  returns_tab_text?: string
  related_title?: string
  related_text?: string
  recently_viewed_text?: string
  reviews_empty_text?: string
  review_submitted_text?: string
  stock_alert_title?: string
  stock_alert_text?: string
  stock_alert_cta?: string
  stock_alert_success?: string
  stock_alert_consent?: string
}

export type ContactExtrasBlock = {
  success_message?: string
}

export type JournalPageBlock = {
  eyebrow?: string
  title?: string
  text?: string
  empty_state?: string
}

export type HomeBlocks = {
  hero?: HeroBlock
  campaign?: CampaignBlock
  essentials?: EssentialsBlock
  editorial?: EditorialBlock
  ritual?: RitualBlock
  categories?: CategoriesBlock
  gallery?: GalleryBlock
  best_sellers?: BestSellersBlock
  reviews_heading?: ReviewsHeadingBlock
  site_settings?: SiteSettingsBlock
  announcement?: AnnouncementBlock
  faq?: FaqBlock
  newsletter_band?: NewsletterBandBlock
  cookie_banner?: CookieBannerBlock
  footer_extra?: FooterExtraBlock
  whatsapp?: WhatsappBlock
  legal_information?: LegalInformationBlock
  page_a_propos?: PageBlock
  page_contact?: PageBlock
  page_livraison_retours?: PageBlock
  page_politique_cookies?: PageBlock
  cart_messages?: CartMessagesBlock
  checkout_messages?: CheckoutMessagesBlock
  account_messages?: AccountMessagesBlock
  order_messages?: OrderMessagesBlock
  not_found_messages?: NotFoundMessagesBlock
  store_page?: StorePageBlock
  collections_page?: CollectionsPageBlock
  product_extras?: ProductExtrasBlock
  contact_extras?: ContactExtrasBlock
  journal_page?: JournalPageBlock
}

export type HomeContent = {
  blocks: HomeBlocks
  /** Keys the admin has switched off, or that are outside their dates. */
  hidden: string[]
}

/**
 * What the admin has configured across the site — home page sections, the
 * static pages, the FAQ, and shared settings like contact details. Absent
 * blocks use presentation defaults; switched-off block keys are returned in
 * `hidden` so consumers can omit them.
 *
 * The cache is dropped by the backend the moment an editor saves (see the
 * content-revalidate subscriber); the hour-long window is only a safety net
 * for when that call cannot get through.
 */
export const getHomeContent = async (): Promise<HomeContent> => {
  return sdk.client
    .fetch<HomeContent>("/store/home-content", {
      method: "GET",
      next: { tags: ["home-content"], revalidate: 3600 },
      cache: "force-cache",
    })
    .then((content) => ({
      blocks: content.blocks || {},
      hidden: content.hidden || [],
    }))
    .catch(() => ({ blocks: {}, hidden: [] }))
}
