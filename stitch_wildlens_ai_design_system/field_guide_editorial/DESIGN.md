---
name: Field Guide Editorial
colors:
  surface: '#f2fcf4'
  surface-dim: '#d3dcd5'
  surface-bright: '#f2fcf4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#ecf6ee'
  surface-container: '#e6f0e9'
  surface-container-high: '#e1ebe3'
  surface-container-highest: '#dbe5dd'
  on-surface: '#151d19'
  on-surface-variant: '#414943'
  inverse-surface: '#29322d'
  inverse-on-surface: '#e9f3eb'
  outline: '#717973'
  outline-variant: '#c1c8c1'
  surface-tint: '#3e6750'
  primary: '#093421'
  on-primary: '#ffffff'
  primary-container: '#234b36'
  on-primary-container: '#8fba9f'
  inverse-primary: '#a5d1b5'
  secondary: '#52634e'
  on-secondary: '#ffffff'
  secondary-container: '#d5e8cd'
  on-secondary-container: '#586954'
  tertiary: '#3b2a18'
  on-tertiary: '#ffffff'
  tertiary-container: '#54402c'
  on-tertiary-container: '#c7ac92'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c0edd0'
  primary-fixed-dim: '#a5d1b5'
  on-primary-fixed: '#002112'
  on-primary-fixed-variant: '#274e39'
  secondary-fixed: '#d5e8cd'
  secondary-fixed-dim: '#baccb2'
  on-secondary-fixed: '#111f0f'
  on-secondary-fixed-variant: '#3b4b37'
  tertiary-fixed: '#fcddc1'
  tertiary-fixed-dim: '#dec1a7'
  on-tertiary-fixed: '#281807'
  on-tertiary-fixed-variant: '#57432f'
  background: '#f2fcf4'
  on-background: '#151d19'
  surface-variant: '#dbe5dd'
typography:
  display-lg:
    fontFamily: Newsreader
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Newsreader
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  headline-sm:
    fontFamily: Newsreader
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  editorial-italic:
    fontFamily: Newsreader
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system blends the deliberate craftsmanship of early 20th-century botanical field notebooks with the utilitarian clarity of modern expedition gear. It rejects the neon glows, artificial glassmorphism, and synthetic gamification common in AI applications. Instead, it positions AI as an unobtrusive optical loupe: a quiet, offline-first instrument for real-world discovery.

The aesthetic marries tactile warmth and literary authority:
- **Atmosphere:** Grounded, scholarly, serene, and durable. Evoking linen field journals, pressed flora, archival paper, and matte anodized field equipment.
- **Audience:** Field biologists, foraging enthusiasts, hikers, conservationists, and nature lovers seeking immersion in the physical landscape rather than a screen.
- **Visual Stance:** Restrained and editorial. Surfaces emulate archival paper stocks rather than synthetic backlights. Photography is presented without filters or artificial vignette treatments, prioritizing biological authenticity, natural grain, and high legibility under direct sunlight.

## Colors

The palette derives from terrestrial tones: damp spruce needles, pale lichen, weathered sandstone, and sun-bleached cotton paper. Contrast ratios strictly adhere to WCAG AAA standards for outdoor legibility in varying daylight conditions.

### Core Roles
- **Primary (`#234B36` - Forest Green):** Used for key brand actions, primary identification actions, active navigation anchors, and primary stamps.
- **Deep Pine (`#18372B`):** Reserved for high-priority editorial headlines, dark mode anchors, and high-contrast structural dividers.
- **Secondary / Accent (`#A7B9A0` - Sage):** Soft vegetative tint for secondary badges, subtle fills, map overlay fills, and contextual tags.
- **Tertiary / Earth (`#8B735C` - Earth Brown):** Evokes geological strata and dried flora; used for secondary metadata, specimen collection dates, taxonomy families, and measurement markers.
- **Neutral / Text Primary (`#29322D` - Soft Charcoal):** Rich, organic carbon tone replacing harsh pure black to reduce eye strain against paper grounds.
- **Neutral / Text Secondary (`#747D74` - Muted Grey-Green):** Subtle botanical gray for captions, binomial nomenclature authorities, and timestamps.

### Ground & Surfaces
- **Canvas Base (`#F7F5ED` - Warm Ivory):** The foundational substrate across all views, mimicking unbleached field journal stock.
- **Surface / Card (`#FFFDF7` - Paper White):** Elevated layer for specimen plates, observation dossiers, and input sheets.
- **Border / Edge (`#E5E0D3` - Archival Edge):** Crisp, low-intensity rule for separating cards, plates, and tables.

### Operational & Hardware States
- **Ready / On-Device AI Active:** `#2E6B47`
- **Model Processing / Downloading:** `#C48E28`
- **Offline / Model Unavailable:** `#B8473D`
- **Environmental Context / Info:** `#476B82`

## Typography

The type system balances nineteenth-century natural history documentation with contemporary outdoor UI pragmatism.

- **Newsreader (Display, Headlines, Binomial Latin):** Serves as the literary voice of the system. Used for species common names, journal section titles, and taxonomical rankings. It offers optical sizing with humanist serifs, imparting a sense of permanence and naturalist heritage. Scientific Latin names (*Genus species*) must always be rendered in italic variants of this face.
- **Plus Jakarta Sans (Interface, Body, Metrics, Hardware Badges):** Provides clean, highly legible functionality for observational data, geo-coordinates, sensory measurements, and interactive components. The geometric structure retains friendly warmth while remaining ultra-sharp on glare-prone screens out in the field.
- **Formatting Conventions:**
  - Elevation coordinates, timestamps, and confidence percentages leverage tabular figures (`tnum`) in Plus Jakarta Sans.
  - Subheaders detailing botanical taxonomic hierarchy (Kingdom, Order, Family) employ `label-sm` with upper-case letter-spacing (+0.04em) in Earth Brown (`#8B735C`).

## Layout & Spacing

The layout philosophy combines the disciplined structure of a printed botanical compendium with responsive field ergonomics. 

- **Grid Architecture:** 
  - **Mobile (< 768px):** Single-column layout with 4-column sub-grid, 16px margins, and 16px gutters. UI controls group closely around bottom-thumb reach areas to permit single-handed use while holding flora or trekking poles.
  - **Tablet (768px - 1024px):** 8-column layout with 24px margins, featuring split-pane interfaces (viewfinder or map on the left, observation dossier on the right).
  - **Desktop (> 1024px):** 12-column editorial grid capped at a maximum container width of 1280px, flanked by 40px outer margins. Multi-column editorial compositions pair long-form natural history narratives with marginalia specimen cards.
- **Rhythm & Padding:** Spacing operates strictly on a 4px/8px incremental base rhythm. Vertical breathing space is deliberate; dense metadata blocks are framed by generous section gaps (`space-xl`) to reflect classic printed catalog pacing.

## Elevation & Depth

This system avoids heavy drop shadows, synthetic neon glows, and artificial lighting angles. Depth is expressed as physical sheets of archival stock resting atop one another in natural, overcast daylight.

- **Tonal Grounding:** Canvas begins at Warm Ivory (`#F7F5ED`). Surface cards sit slightly raised at Paper White (`#FFFDF7`). Layering is communicated via this subtle tonal step, not steep contrast.
- **Low-Contrast Structural Borders:** All cards, dialogs, and modular blocks feature a crisp `1px solid #E5E0D3` border. This border visually anchors panels against the ivory background, preventing edge bleed under bright outdoor light.
- **Organic Ambient Shadows:** When a card or sheet requires interactive separation (e.g., bottom drawer or floating control panel), depth is rendered with a warm, dual-layer diffused shadow:
  - `box-shadow: 0 2px 4px rgba(41, 50, 45, 0.03), 0 8px 24px rgba(41, 50, 45, 0.06);`
  - The shadow tone incorporates Soft Charcoal (`#29322D`) rather than neutral gray, emulating soft diffuse natural shade on grass or stone.
- **Viewfinder Overlays:** When elements sit on top of live camera feeds, they use crisp solid Paper White badges with 1px border frames rather than translucent glass blur, ensuring complete readability across complex, dappled leaf textures.

## Shapes

The shape system adopts a curated, moderate radius (`roundedness: 2`) that evokes debossed paper labels, field tags, and precision gear chassis.

- **Standard Elements (Buttons, Inputs, Small Plates):** Use 0.5rem (8px) corner rounding to maintain structural intent and crisp boundaries.
- **Specimen Cards & Modal Panels:** Use `rounded-lg` (1rem / 16px) for an organic, approachable feel that prevents the clinical stiffness of sharp right angles.
- **Large Presentation Drawers:** Use `rounded-xl` (1.5rem / 24px) exclusively on top sheet corners.
- **Anti-Pill Principle:** Full pill borders (`border-radius: 9999px`) are strictly forbidden except for circular camera shutter triggers and small quantitative count badges. Status chips, tags, and buttons must stay anchored to 8px or 16px radii to avoid resembling consumer social media apps.

## Components

### Buttons
- **Primary:** Solid Forest Green (`#234B36`) with Paper White text (`#FFFDF7`). 8px border radius, no drop shadow. On hover/active, transitions to Deep Pine (`#18372B`).
- **Secondary:** Surface Paper White (`#FFFDF7`) with 1px border (`#E5E0D3`), text in Forest Green (`#234B36`). 8px border radius.
- **Field Action (Tertiary):** Earth Brown (`#8B735C`) text with transparent background, underlined with a 1px border on hover.
- **Shutter / Capture:** Double concentric ring with a solid center, high-contrast Forest Green border against ivory backgrounds.

### Local AI & System Status Badges
- **Offline Indicator:** A compact, non-pill badge with 6px border radius, background in `#234B36` at 8% opacity, and a 1px border in `#234B36` at 20% opacity.
- **Typography & Iconography:** A solid 6px dot indicator in Ready (`#2E6B47`), Loading (`#C48E28`), or Unavailable (`#B8473D`), followed by concise text: `Local AI · Ready` in Plus Jakarta Sans 11px bold, letter-spaced.
- **Negative Space Rule:** Never include glow pulses, iridescent borders, or futuristic sparks. The indicator must read like an instrument status LED on outdoor equipment.

### Cards & Specimen Plates
- **Construction:** Paper White (`#FFFDF7`) ground, `1px solid #E5E0D3` outline, 16px corner radius.
- **Imagery:** Aspect ratios adhere strictly to traditional photographic ratios (4:3, 3:2, or 1:1 square macro plates). Images never have rounded inner borders that clash with card radii—they feature a matching internal nest or full-bleed header with no vignettes.
- **Content Flow:** Specimen taxonomic family in `label-sm` Earth Brown, Common Name in `headline-md` Newsreader Deep Pine, followed by Binomial nomenclature in italic `Newsreader` Soft Charcoal.

### Chips & Taxonomical Tags
- **Appearance:** Rectangular with a 6px corner radius. Background Sage (`#A7B9A0`) at 20% tint, border `1px solid #A7B9A0` at 40% tint, text Soft Charcoal (`#29322D`).
- **Pill Ban:** Never use full circular pill edges. Tags should resemble pinned herbarium classification labels.

### Lists & Observation Tables
- **Dividers:** Fine continuous hair-lines (`1px solid #E5E0D3`).
- **Rhythm:** Generous row heights (minimum 56px) allowing quick finger tap targets during active fieldwork. Left column anchors specimen thumbnail or botanical glyph; central column displays hierarchical name; right column shows confidence metric and on-device processing confirmation.

### Checkboxes & Radio Controls
- **Checkboxes:** 20px square with a 4px corner radius, border in `1.5px solid #8B735C`. Checked state fills with Forest Green (`#234B36`) revealing a crisp ivory checkmark.
- **Radios:** 20px circle with an inner solid 8px pip in Forest Green when selected. No soft glow or neomorphic shadow.

### Input Fields
- **Container:** Paper White (`#FFFDF7`) background, 8px corner radius, `1.5px solid #E5E0D3` idle border.
- **Focus State:** Border shifts cleanly to Forest Green (`#234B36`) with a 0 0 0 1px ring. Placeholder text uses Muted Grey-Green (`#747D74`).
- **Field Metric Suffixes:** Unit measurements (e.g., "m elev", "cm", "mm") are positioned inside the field trailing edge in Earth Brown (`#8B735C`) tabular typography.