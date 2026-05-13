# Theme Migration

Hardcoded Tailwind grays → semantic shadcn tokens, so every product surface
re-themes when the user picks cream / paper / slate / light / dark in
**Settings → Appearance**.

## Token contract

Defined in `frontend/src/app/globals.css` (`@theme inline` block + per-theme
`html[data-theme="..."]` overrides):

| Token | Tailwind class | Use |
|-------|----------------|-----|
| `--background` | `bg-background` | Top-level page surface |
| `--foreground` | `text-foreground` | Default text |
| `--card` | `bg-card` / `text-card-foreground` | Cards, panels, modals |
| `--popover` | `bg-popover` / `text-popover-foreground` | Floating menus |
| `--primary` | `bg-primary` / `text-primary-foreground` | Primary buttons |
| `--secondary` | `bg-secondary` / `text-secondary-foreground` | Secondary buttons |
| `--muted` | `bg-muted` / `text-muted-foreground` | Subtle surfaces and de-emphasized text |
| `--accent` | `bg-accent` / `text-accent-foreground` | Hover surfaces |
| `--destructive` | `bg-destructive` | Errors and destructive actions |
| `--border` | `border-border` | Default border |
| `--input` | `border-input` | Form-field border |
| `--ring` | `ring-ring` | Focus ring |
| `--success` | `bg-success` / `text-success-foreground` | Status — success |
| `--warning` | `bg-warning` / `text-warning-foreground` | Status — warning |
| `--info` | `bg-info` / `text-info-foreground` | Status — info |

## Theme palettes

| Theme id | Vibe |
|----------|------|
| `cream` (default) | Warm cream + slate ink + muted gold; current Louis aesthetic |
| `paper` | Warm off-white + brown undertone |
| `slate` | Cool light gray + slate text — semi-dark feel |
| `light` | Stock shadcn light — stark white, cool neutral grays |
| `dark` | Real dark surfaces, OKLCH grays |

## Migration rules

For every file in `frontend/src/app/(pages)/`, `frontend/src/app/components/`,
and `frontend/src/components/ui/` we applied these conservative swaps:

| Before | After |
|--------|-------|
| `bg-white` (+ alpha) | `bg-card` (+ alpha) |
| `bg-gray-50`, `bg-gray-100`, `bg-gray-200`, `bg-gray-300` | `bg-muted` |
| `bg-gray-400` | `bg-muted-foreground/30` |
| `bg-gray-700` / `800` / `900` | `bg-foreground` |
| `text-gray-200` … `text-gray-600` | `text-muted-foreground` |
| `text-gray-700` | `text-foreground/80` |
| `text-gray-800`, `text-gray-900` | `text-foreground` |
| `border-gray-50` … `border-gray-500` | `border-border` |
| `border-gray-900` | `border-foreground` |
| `divide-gray-100/200/300` | `divide-border` |
| `hover:bg-gray-50` / `100` / `200` / `300` | `hover:bg-muted` |
| `hover:bg-gray-700/800/900` | `hover:bg-foreground` |
| `hover:text-gray-500…900` | `hover:text-foreground` |
| `hover:border-gray-300/400` | `hover:border-border` |
| `bg-amber-*`, `text-amber-*`, `border-amber-*` | **untouched** — gold-leaf brand accent |
| `bg-red-*`, `bg-emerald-*`, `bg-rose-*`, `bg-sky-*`, `bg-blue-*` | **untouched** — semantic status colors |
| `bg-[#E7E2D6]`, `bg-[#F5F0E5]`, `bg-[#C9A961]`, `text-[#8a743f]` | **untouched** — brand cream/gold literals |

## Excluded files (intentionally)

These are marketing / auth / brand surfaces that stay literal-cream regardless
of theme choice:

- `frontend/src/app/page.tsx` — marketing landing
- `frontend/src/app/login/page.tsx`, `frontend/src/app/signup/page.tsx`
- `frontend/src/app/auth/callback/page.tsx`
- `frontend/src/components/marketing/*`
- `frontend/src/components/auth/*`
- `frontend/src/components/brand/*`

## Files needing manual review

These rely on patterns the regex couldn't safely rewrite. They still render
correctly in the cream theme but may not re-theme perfectly:

- `frontend/src/app/(pages)/drafting-board/page.tsx` — uses
  `style={{ background: "var(--louis-cream, #FBF8F2)" }}` for the manuscript
  canvas. Intentional (it's a "page" surface that should look like paper). If
  we want it to dim with the theme, swap to
  `style={{ background: "var(--card)" }}`.
- `frontend/src/app/components/editor/SuggestionsRail.tsx` — inline hex colors
  for tracked-change insertions/deletions (`#166534`, `#b91c1c`). These are
  status colors and intentionally literal.
- Any usage of `bg-[#E7E2D6]`, `bg-[#F5F0E5]`, `bg-[#C9A961]`, `text-[#8a743f]`
  is the gold-leaf brand accent and stays literal.

## How to extend

To add a new theme:

1. Append a new `html[data-theme="..."] { … }` block to `globals.css` setting
   the same token variables as the existing themes.
2. Add the theme id to `AppearanceTheme` in `frontend/src/app/lib/louisApi.ts`
   and to `THEMES` in `frontend/src/contexts/AppearanceContext.tsx`.

The components do not need to change — they already consume tokens.
