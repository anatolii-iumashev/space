# DESIGN.md

Design system for the Space project — unified workspace application.

---

name: Space Workspace
description: Clean, minimal design system for an open workspace combining calendar, files, and email.

colors:
  primary: "#2563EB"
  primaryHover: "#1D4ED8"
  secondary: "#64748B"
  background: "#FFFFFF"
  surface: "#F8FAFC"
  border: "#E2E8F0"
  text: "#0F172A"
  textSecondary: "#64748B"
  danger: "#EF4444"
  success: "#22C55E"
  warning: "#F59E0B"

typography:
  h1:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
  h2:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4

spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px

rounded:
  sm: 4px
  md: 8px
  lg: 12px
  full: 9999px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
  sidebar:
    backgroundColor: "{colors.surface}"
    borderRight: "1px solid {colors.border}"
    width: 240px

---

## Layout

- Fixed sidebar (240px) on the left with navigation icons and labels
- Main content area fills remaining space
- Top bar with search, user avatar
- Responsive: sidebar collapses to icons on smaller screens

## Sidebar Navigation

- Icons from Lucide React
- Active state: primary color background, bold text
- Hover: subtle background highlight

## Cards & Containers

- White background with subtle border
- Rounded corners (8px)
- Light shadow on hover
- Consistent padding (16px)

## Forms & Inputs

- Border: 1px solid #E2E8F0
- Focus ring: 2px primary color outline
- Rounded: 8px
- Placeholder color: #94A3B8

## Lists & Tables

- Alternating row backgrounds (optional)
- Hover highlight
- Compact vertical spacing
- Divider lines between items

## Icons

- Lucide React icon library
- Size: 20px (navigation), 16px (inline)
- Color: inherit from parent text color

## Dark Mode

Not implemented yet. When adding: use Tailwind `dark:` variants with CSS variables for colors.

## UI/UX Philosophy — Notion-like

The overall UI/UX is inspired by **Notion**: clean, content-first, minimal chrome.

Key principles:
- **Sidebar** is a lightweight navigation panel — no nested menus unless necessary
- **Content area** is the hero — maximum width, minimal distractions
- **Typography over decoration** — hierarchy is communicated through font weight and size, not color
- **Inline actions** — actions appear on hover near the relevant content, not in a distant toolbar
- **Empty states** are friendly and prompt action (not blank pages)
- **Smooth transitions** — subtle animations (100–200ms) for state changes, not flashy effects
- **Keyboard-first** — common actions should be keyboard-accessible
- **Block/section-based layout** where applicable — content organized in clear, scannable blocks

## Do's and Don'ts

- ✅ Keep UI minimal — no decorative elements
- ✅ Use consistent spacing (multiples of 8px)
- ✅ Prefer text labels alongside icons
- ✅ Follow Notion-like patterns: clean blocks, inline editing, hover-revealed actions
- ❌ Don't use gradients or heavy shadows
- ❌ Don't introduce new colors without updating this file
- ❌ Don't mix icon-only and text+icon navigation styles
- ❌ Don't add toolbars or floating panels that obscure content
