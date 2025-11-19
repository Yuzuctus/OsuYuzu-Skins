# Design System: Organic Code (Yuzu.Dev)

## Concept

**"Organic Code"** blends nature-inspired tones with digital precision. It features a warm, breathable light mode and a high-contrast, neon-accented dark mode.

- **Vibe**: Organic, Fresh, Tech-Nature, Premium.
- **Style**: Soft gradients, glassmorphism hints, rounded aesthetics, and "breathing" animations.

## Visual Pillars

1.  **Colors**: Deep forest greens and warm greys for Light Mode; Deep black-greens and Neon Mint for Dark Mode.
2.  **Shapes**: Extra rounded corners (`rounded-2xl`, `rounded-3xl`) for a friendly, organic feel.
3.  **UI Elements**: Colored shadows (not just black), floating animations, and subtle interactions.

## Color Palette

### Light Theme ("Day - Warm & Organic")

_Warm, natural, readable._

- **Background**: `#E2E8E0` (Warm Grey/Green)
- **Surface/Card**: `#EDF1EB` (Lighter Warm)
- **Primary (Mint)**: `#4ADE80` (Vibrant Green)
- **Primary Hover**: `#22C55E`
- **Text Main**: `#14532D` (Deep Forest Green)
- **Text Muted**: `#374151` (Warm Grey Text)
- **Border**: `#374151` (Dark Grey) or `#86EFAC` (Light Mint)
- **Shadow**: `#1F4B3F` (Deep Green Shadow)

### Dark Theme ("Night - Neon & Deep")

_High contrast, sharp, tech-focused._

- **Background**: `#050B08` (Almost Black Green)
- **Surface/Card**: `#0F1A15` (Deep Green Surface)
- **Accent (Neon)**: `#34D399` (Mint Neon)
- **Accent Secondary**: `#6EE7B7` (Bright Mint)
- **Text Main**: `#E2E8F0` (Off-white)
- **Text Muted**: `#94A3B8` (Blue Grey)
- **Border**: `#34D399` (Neon Mint) or `rgba(255,255,255,0.1)`
- **Shadow**: `rgba(52, 211, 153, 0.4)` (Neon Glow)

## Typography

- **Headings**: `Nunito` or `Outfit` - Bold, Organic.
- **Body**: `Inter` - Clean, legible.

## UI Components

### Buttons

- **Shape**: `rounded-2xl` (approx 16px).
- **Light Mode**:
  - Bg: `#4ADE80`
  - Text: `#052E16`
  - Shadow: `4px 4px 0px #1F4B3F`
- **Dark Mode**:
  - Bg: `#34D399`
  - Text: `#000000`
  - Shadow: `0px 0px 15px rgba(52,211,153,0.4)` (Glow effect)

### Cards

- **Shape**: `rounded-3xl` (approx 24px).
- **Style**: Minimal border, subtle depth.
- **Hover**: Translate Y -5px.

## Animations

- **Float**: A gentle up-and-down floating motion for hero elements.
