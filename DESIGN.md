---
name: Monochrome Geometric
colors:
  surface: '#fbf9f9'
  surface-dim: '#dbdad9'
  surface-bright: '#fbf9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#e9e8e7'
  surface-container-highest: '#e3e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#4c4546'
  inverse-surface: '#303031'
  inverse-on-surface: '#f2f0f0'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#5d5f5f'
  on-secondary: '#ffffff'
  secondary-container: '#dcdddd'
  on-secondary-container: '#5f6161'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1a1c1c'
  on-tertiary-container: '#838484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#fbf9f9'
  on-background: '#1b1c1c'
  surface-variant: '#e3e2e2'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 80px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 20px
  margin-desktop: 64px
  container-max: 1280px
---

## Brand & Style

This design system is defined by extreme high contrast and a clinical, modernist approach to minimalism. It draws inspiration from Swiss graphic design, prioritizing clarity, rigid grids, and impactful scale transitions. The aesthetic is sophisticated and "premium-utilitarian," focusing on the interplay between deep blacks, stark whites, and perfectly circular geometry.

The tone is confident and direct. It avoids any decorative flourishes like gradients, blurs, or drop shadows in favor of solid fills and razor-sharp architectural lines. The emotional response is one of organized prestige—the digital equivalent of a high-end physical gallery space.

## Colors

The palette is strictly achromatic to ensure maximum visual impact and content focus.

- **Primary (#000000):** Used for headlines, primary buttons, and structural borders.
- **Surface (#FFFFFF):** The default canvas color, providing a crisp, high-key background.
- **Secondary Surface (#F5F5F5):** A subtle cool gray used for secondary sections, input backgrounds, or subtle card differentiation.
- **Muted Text (#757575):** Used for metadata, small labels, and placeholder text to create a clear hierarchy without distracting from primary messaging.

Colors are applied with 100% opacity to maintain the "solid fill" requirement. Interactive states use simple inversions (e.g., black button with white text becomes white button with black border).

## Typography

This design system utilizes **Hanken Grotesk** across all roles to maintain a unified, modern-monospaced feeling without losing readability. 

Typography is used as a primary design element. Large-scale displays feature tight letter-spacing and aggressive line heights to create "text blocks" that act as visual anchors. On mobile, headlines scale down significantly to ensure they do not break prematurely, while maintaining their bold weight. 

Metadata and secondary labels should often be used in a smaller font size with a medium weight to contrast against the lighter body copy.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy on desktop and a **Fluid Grid** on mobile.

- **Desktop:** 12-column grid with a maximum container width of 1280px. Gutters are fixed at 24px to provide breathable air between content blocks.
- **Mobile:** 4-column fluid grid with 20px side margins. 
- **Vertical Rhythm:** A strict 8px baseline grid is used. Sections should be separated by large, purposeful gaps (e.g., 128px or 160px) to lean into the minimalist aesthetic.

Whitespace is never treated as "empty"; it is used as a structural tool to group items and direct the eye toward the primary action.

## Elevation & Depth

This design system rejects shadows and blurs. Depth is communicated exclusively through **Tonal Layering** and **Contrasting Outlines**.

1.  **Level 0 (Base):** White (#FFFFFF) background.
2.  **Level 1 (In-set):** Light gray (#F5F5F5) used for background containers or input fields.
3.  **Level 2 (Active/High-Contrast):** Solid black (#000000) used for floating elements or primary call-to-actions.

Borders are 1px solid black or subtle gray. When an element needs to "pop," it should do so through an inverted color scheme (Black background with white text) rather than a shadow.

## Shapes

The shape language is characterized by **extreme roundedness**, creating a tension between the rigid grid and the soft UI elements.

- **Pill-Shaped UI:** Buttons, tags, and search bars use a `ROUND_FULL` (pill) radius.
- **Image Containers:** While interactive UI is pill-shaped, product images or gallery cards use a slightly more restrained but still significant `rounded-xl` (1.5rem / 24px) to balance the composition.
- **Icons:** Icons should be enclosed in circular containers to echo the vinyl record motif from the reference material.

## Components

### Buttons
Primary buttons are pill-shaped, solid black with white typography. They often feature an inset circular icon (white circle with black icon) at the trailing edge to signify action. Secondary buttons are pill-shaped with a 1px black outline and no fill.

### Cards
Cards are minimalist with no shadows. Use a 1px #E0E0E0 border or a light gray #F5F5F5 background. Content inside cards (like product titles and prices) is aligned to the bottom with significant padding (24px).

### Input Fields
Pill-shaped containers with a #F5F5F5 background. Text is left-aligned with a 24px horizontal padding to ensure it stays within the curve of the pill.

### Chips & Tags
Small pill-shaped elements using black text on a light gray background. Used for categories or status indicators.

### Lists
List items are separated by thin, full-width 1px lines. They should feature generous vertical padding (20px-24px) to maintain the airy, premium feel of the design system.