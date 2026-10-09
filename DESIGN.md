# SetBook design direction

This guide translates the supplied “Modern Intelligent Workspace” reference
into SetBook’s product context. The reference is the primary visual direction;
the existing indigo-and-coral SetBook mark remains the identity anchor.

## Principles

- Present SetBook as a calm, capable workspace for musicians, not a generic
  SaaS landing page.
- Lead with one clear promise and one obvious action: open the song library.
- Use compact operational previews to show real workflows—charts, setlists, and
  performance state—rather than decorative illustrations or invented metrics.
- Favor structured density, strong alignment, and restrained surfaces. Avoid
  unnecessary sections, floating badges, excessive pills, and ornamental copy.

## Typography

- Use the existing Geist sans family for display and body text and Geist Mono
  for chart content, keys, labels, and compact metadata.
- Desktop display type may reach 64px with approximately 1.04 line height and
  medium-to-semibold weight. Scale fluidly on smaller screens.
- Keep hero headings to two or three lines on common viewports. Body copy uses
  16–18px text with generous 1.6 line height and readable measures.

## Color

- Canvas: white with `#FAFAFA` section backgrounds.
- Primary text and actions: `#111111`; secondary text: `#4B5563`.
- Borders and quiet surfaces: `#E5E7EB`; nested surfaces may use white.
- Use SetBook indigo and coral sparingly for brand marks, chord notation,
  active states, and small signals—not as large background fields.
- Maintain WCAG AA contrast for text and controls in every state.

### Dark theme

- Use a layered charcoal palette rather than pure black: `#12161B` for the
  canvas, `#1A1F26` for primary surfaces, and `#20262E` for elevated surfaces.
- Use `#F3F5F7` for primary text, `#B8C0CB` for secondary text, and no darker
  than `#9EA8B5` for meaningful metadata on the dark canvas.
- Use `#343C47` for quiet boundaries and `#4B5664` for emphasized borders,
  input edges, and active control boundaries.
- Reserve brighter indigo for focus, selection, and primary actions. Selected
  navigation uses a tonal surface instead of a white inversion.
- Dialogs, menus, popovers, and toasts use an elevated surface and visible
  border; inputs remain darker than their containing card.
- Preserve saved chart colors. When a chart color falls below 4.5:1 against
  the active canvas, show a warning and add a subtle text outline that does not
  affect chord or lyric positioning.

## Spacing and layout

- Base spacing unit: 8px. Common gaps are 16px, card padding is 24px, and major
  desktop sections use roughly 80–112px vertical space.
- Use a centered, wide container with a 16px mobile gutter, 24px tablet gutter,
  and 32px desktop gutter.
- The first viewport pairs a concise editorial message with a detailed product
  workspace preview. Feature grids must be mathematically complete and collapse
  without empty cells or horizontal overflow.
- Keep information hierarchy compact inside previews and generous between major
  narrative sections.

## Components

- Cards use 16px radii, quiet borders, and subtle shadow depth. Nested panels
  should remain flatter than their parent.
- Controls use 8–10px radii. Primary buttons are black with white text;
  secondary buttons are light with dark text and a visible border.
- Product previews should show authentic SetBook concepts: song order, keys,
  chart sections, lyrics, readiness, and performance controls.
- Icons clarify actions and categories; they do not replace labels.

## Responsive behavior

- Mobile: one-column narrative, full-width primary actions, compact navigation,
  and stacked preview panels. Preserve 44px minimum interactive targets.
- Tablet: allow two-column feature groupings when content remains readable.
- Desktop: use asymmetry and denser multi-column workspace compositions without
  reducing text measures or creating dead grid space.

## Interaction

- Provide distinct hover, focus-visible, active, and disabled states.
- Use restrained transitions for color, border, shadow, or small transforms.
  Respect `prefers-reduced-motion` and avoid scroll-jacking or decorative motion.
- Anchor links should account for the sticky header. Keyboard order follows the
  visual reading order, and all icon-only controls require accessible names.
