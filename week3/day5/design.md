# Nexus Market — Design System Specification

This document serves as the visual and architectural specification for every page across the Nexus Market platform (Storefront, Catalog, Product Detail, Cart, Favorites, Vendor Dashboard, Admin Panel, and Authentication).

The goal is a **familiar, trustworthy marketplace aesthetic** — dark chrome, white product surfaces, and one confident green accent — applied consistently throughout the user experience, never reinvented per page.

---

## 1. Color Tokens

| Token | Hex / Value (Dark Mode) | Hex / Value (Light Mode) | Scope & Usage |
|---|---|---|---|
| `--bg-canvas` | `#0D1F18` (Dark Green) | `#F2F6F4` (Mint Light) | Global page background canvas behind all page contents |
| `--bg-header` | `#081611` (Deep Emerald) | `#FFFFFF` (Crisp White) | Top utility bar and category sub-navigation bar chrome |
| `--bg-hero` | `#0A231B` → `#13382D` | `#0A231B` → `#13382D` | Primary marketplace hero banners |
| `--surface-card` | `#FFFFFF` | `#FFFFFF` | Product cards, category pill buttons, modal dialogs, and auth form containers |
| `--accent` | `#1E7A56` | `#1E7A56` | Primary action CTA buttons (Add to Cart, Shop Deals, Search), active nav states, and brand logo mark |
| `--accent-hover` | `#186347` | `#186347` | Hover and active interaction states for accent buttons and interactive links |
| `--text-on-dark` | `#FFFFFF` | `#0D1F18` | Headings and primary text on canvas/header |
| `--text-on-dark-muted` | `#9EBAAF` | `#4A6359` | Secondary text, breadcrumbs, search placeholders, and inactive links |
| `--text-on-card` | `#151A24` | `#151A24` | Primary product titles, bold prices, and prominent labels on white cards |
| `--text-on-card-muted` | `#6B7280` | `#6B7280` | Seller names, secondary meta descriptions, and reviews counts on white cards |
| `--rating-star` | `#F5A623` | `#F5A623` | Golden star rating icons and numeric review scores only |
| `--badge` | `#1E7A56` | `#1E7A56` | Cart and Wishlist count badges (white text on solid green circle) |
| `--border-dark` | `#163A2E` | `#DCE5E0` | Subtle borders dividing header sections, dark panels, and footer rails |
| `--border-card` | `#E5E7EB` | `#E5E7EB` | Subtle grey borders framing white cards and interactive inputs |

### Single Accent Color Rule
Only **one accent color** (`--accent`: `#1E7A56`) is used for interactive and actionable elements across the entire platform. Green strictly communicates: **"You can take action here."**
- **Do NOT** introduce secondary accent colors (no blue links, no purple badges, no orange promotional buttons).
- Destructive actions (e.g. deleting an item or rejecting a vendor) use muted red (`#991B1B` / `#EF4444`) to preserve green as the positive/affirmative action hue.

---

## 2. Typography

- **Font Family**: Single sans-serif family throughout (system UI sans: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, sans-serif). No serif or decorative display fonts.
- **Logo Wordmark**: Bold uppercase with tight letter tracking (`NEXUS MARKET`), accompanied by the solid green square "N" mark.
- **Headline (Hero)**: Bold, 32px–36px, white (`#FFFFFF`), two-line wrap, sentence case.
- **Section Headers** ("Popular Categories", "Trending Products"): Bold, ~20px, white on dark background.
- **Product Name**: Medium weight, ~15px, `text-on-card` (`#151A24`), 2-line clamp.
- **Product Price**: Bold, ~16px–17px, `text-on-card` (`#151A24`), directly below the product title.
- **Seller Row & Ratings**: Regular, ~12px–13px, `text-on-card-muted` (`#6B7280`), with star icon in `rating-star` (`#F5A623`).

---

## 3. Layout & Core Components

### Top Utility Bar
- **Surface**: `bg-header` (`#12192A`), height 64px, bottom border `#232E44`.
- **Layout**:
  - **Left**: Nexus Market logo (solid green square N mark + bold uppercase text).
  - **Center**: Omnibar search box (`flex-grow`, max-w-2xl): Category dropdown selector on light background + search input + green Search button (`#1E7A56`).
  - **Right**: User profile trigger/avatar, Theme Toggle button, and conditional Cart & Wishlist icons.

### Category Navigation Rail
- Second row directly below top bar, same `bg-header` (`#12192A`), 1px top border `#232E44`.
- Plain text links (`text-on-dark-muted`, white on hover/active), horizontally spaced, no pill backgrounds.

### Hero Banner
- Full-width container with subtle gradient (`#0E2B24` to `#153229`), bordered with `#1E4338`.
- Left-aligned headline + supporting sentence + single green CTA button (`Shop Deals`).
- Carousel arrows (‹ ›) at the vertical center edges, dot pagination indicators bottom-left.
- High-quality bleeding product photography on both left and right edges.

### Popular Categories
- Row of pill-shaped white buttons (`surface-card`, fully rounded), each featuring an outline icon in accent green (`#1E7A56`) and category title in `text-on-card` (`#151A24`).
- Horizontally scrollable without wrapping on mobile viewports.

### Unified Product Card (Core Repeating Unit)
The product card is the atomic commerce component used uniformly across trending sections, catalog listings, search results, vendor storefronts, and favorites:
- **Surface**: `surface-card` (`#FFFFFF`), 12px rounded corners (`rounded-xl`), 1px `#E5E7EB` border, subtle shadow.
- **Image**: Product image full-bleed or contained on white surface, fixed height with smooth hover zoom (`scale-105`).
- **Body**:
  - Product Title (2-line clamp, medium weight).
  - Price (bold, distinct line).
  - Seller attribution row (vendor avatar initials + "Sold by {vendor}", right-aligned star rating and review count).
  - Pinned full-width green "Add to Cart" button (`#1E7A56`, hover `#186347`) with checkmark feedback state.
- **Grid Layout**: 4 columns on desktop, 2 columns on tablet, 1 column on mobile (consistent ~20px gap).

---

## 4. Page-Specific Design Guidelines

### Storefront & Catalog (`/`, `/products`)
- Full canvas background in `bg-canvas` (`#1B2436`).
- Category filter pills at the top with active state highlighted in accent green (`#1E7A56`).
- Unified 4-column Product Card grid.

### Product Detail Page (`/products/[slug]`)
- Canvas background `#1B2436`.
- Breadcrumbs / back navigation in `text-on-dark-muted`.
- Two-column showcase layout:
  - **Left**: Product image container on crisp white surface (`surface-card`) with category chip.
  - **Right**: Product title (`text-on-dark`), rating row, bold price, stock indicator, product description, interactive "Add to Cart" and "Favorite" action buttons, and verified vendor profile card.

### Cart Page (`/cart`) & Favorites Page (`/favorites`)
- **Authentication Guard**: Cart and Favorites access and header icons are strictly displayed for authenticated (logged-in) users. Unauthenticated visitors navigating directly are presented with a clean sign-in prompt card.
- **Cart Layout**: Product list items on white surfaces with quantity adjusters (+ / -), prices, and a sticky Order Summary card with clear subtotal, estimated tax, and checkout CTA (`#1E7A56`).
- **Favorites Layout**: Uniform grid of saved products leveraging the standard `ProductCard` with quick "Remove" and "Add to Cart" options.

### Vendor Storefront (`/vendors/[slug]`)
- Reuses the hero banner pattern with the merchant's brand logo, name, description, and direct contact details.
- Storefront catalog rendered using the identical unified `ProductCard` grid.

### Authentication Screens (`/login`, `/register`)
- Global `bg-canvas` (`#1B2436`) canvas background.
- Single centered white `surface-card` form panel (max-w-md, rounded-xl, 1px border `#E5E7EB`).
- Clean, integrated demo account autofill buttons (seamlessly styled within the flow, not floating awkwardly).
- Standard inputs with `#E5E7EB` borders and `#1E7A56` active focus rings.
- Primary CTA button in accent green (`#1E7A56`).

---

## 5. Strict Constraints & "What to Avoid"

1. **No Gradient Text or Glassmorphism**: Keep all text solid white or charcoal. No translucent blurry cards for product listings.
2. **No Secondary Accent Hues**: Do not introduce blue, purple, amber, or teal buttons/links. Green is the sole interactive accent color.
3. **No Canvas Background Drift**: The entire page canvas behind headers and cards must remain `#1B2436` across all routes. Do not revert to plain white outside of product card surfaces.
4. **Sentence-Case Section Headers in Footer**: Use "Explore marketplace," "Merchant hub," "Platform & admin," not all-caps.
5. **No Implementation Details in User-Facing UI**: Do not display backend or database connection strings ("Connected to Supabase PostgreSQL").
6. **One Consistent Logo Mark**: Always use the official green square "N" logo mark identically everywhere (header, footer, auth screens). No circular or multi-colored gradient variants.
