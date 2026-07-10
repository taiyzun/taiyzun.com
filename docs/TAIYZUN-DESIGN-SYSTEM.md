# Taiyzun Design System Record

## Direction

Taiyzun presents Information & Technology through a Micro & Macro lens. The interface uses a light pearl surface, restrained platinum and silver depth, measured gold highlights, and a small amount of deep blue contrast. Geometry and motion support hierarchy rather than compete with the content.

## Layout Rules

- Use a modular grid with the rule of thirds for primary hero alignment.
- Use asymmetric weight for the home hero: reading surface to the left, sword as the dominant visual anchor, and the @ mark as a smaller supporting signature.
- Keep page heroes constrained by `--premium-max` and responsive gutters.
- Keep repeated blocks within the existing 8px card radius and 18px panel radius system.
- Preserve intrinsic image dimensions and `object-fit: contain` for supplied object artwork.

## Type And Colour

The existing system uses Philosopher with the current local font fallbacks, `clamp()` sizing and balanced line lengths. Core tokens live in the premium bundles and include:

- `--colour-primary`: deep warm ink.
- `--colour-secondary`: restrained deep blue.
- `--colour-accent`: controlled gold.
- `--colour-surface`: pearl ivory.
- `--colour-muted`: readable warm grey.
- `--colour-line`: low-contrast structural rule.
- `--premium-ease`: a smooth deceleration curve for reveals and hover depth.

No new font, external visual identity, copyrighted reference asset or broad colour rewrite was introduced in this pass.

## Motion Rules

- Animate transforms and opacity only for routine interface motion.
- Use passive pointer, scroll and resize listeners.
- Keep 3D movement subtle: pointer parallax is capped at 10 degrees for the sword and 6 degrees for the @ mark.
- Use slow breathing rather than full rotation.
- Pause rendering when a stage is not visible or the document is hidden.
- Defer constrained-device WebGL until interaction or a safe idle opportunity.
- Honour `prefers-reduced-motion` with static fallbacks and no breathing motion.

## Accessibility And Responsive Rules

- Decorative 3D objects use `aria-hidden="true"` and empty alt text.
- Every tested public route retains 1 H1.
- Mobile first load has no horizontal overflow at 390x844.
- The page-level decorative 3D layers are hidden until the full stylesheet is present, preventing an early flash on deferred pages.
