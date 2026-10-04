# Grid Protocol Quarto Template: Agent Instructions

## Role
You are an implementation agent for this Quarto Reveal.js slide template.
Your job is to produce/modify `index.qmd` (or similar `.qmd` slide files) so they match the Grid Protocol visual system and interaction behavior.

Always prefer Markdown authoring first, then use the existing template classes and `data-*` hooks.

## Template Root
Work from:
- `project-grid-protocol/quarto_version/slides`

Primary files:
- `_quarto.yml` (Reveal config and includes)
- `index.qmd` (authoring source)
- `gp-quarto.js` (Quarto-to-template bridge)
- `gp-quarto.css` (Quarto parity overrides)
- `gp-template/css/grid-protocol.css` (base design system)
- `gp-template/css/gp-image-fx.css` (image tone filters + halftone wrappers)
- `gp-template/js/grid-protocol.js` (folio, corner matrix, auto layout helpers)
- `gp-template/js/gp-paper-shaders-halftone.js` (shader presets and mounting)

Do not treat generated files as source of truth:
- `index.html`
- `index_files/`
- `.quarto/`

## Render and Preview
From template root:

```bash
quarto render index.qmd
quarto preview index.qmd
```

Use HTTP preview for shader slides. Do not rely on `file://`.

## Global Behavior (What the System Auto-Does)
Bridge behavior from `gp-quarto.js`:
- Adds `gp-slide` to every leaf slide.
- Resolves layout from heading attributes/classes and maps to `gp-*` classes.
- Infers layout when missing (basic media/list/text heuristics).
- Injects `.gp-marks` scaffolding.
- Converts `::: aside` into footer citation band `.gp-cites`.
- Adds `gp-list` styles to top-level lists.
- Builds title/divider scaffolding and accent bars.
- Normalizes citation text so footer citations are not wrapped in parentheses.
- Applies list/figure fragments unless `data-gp-fragments="off"`; a block with `data-gp-after-item="N"` is revealed right after list item N.
- Enforces click navigation mode (disables scroll view behavior).

Layout automation from `gp-template/js/grid-protocol.js`:
- Assigns folio numbers (`data-gp-folio`).
- Renders top-right corner matrix and section state.
- Fits accent-bar widths to heading/tag anchors.
- Auto-columnizes dense lists/refs/flow text when thresholds are exceeded or forced.

## Slide Layout Types
Use slide heading attributes like:

```md
# Slide title {layout="bullets"}
```

Supported `layout` values:
- `title` -> `gp-title`
- `outline` -> `gp-outline`
- `divider` -> `gp-divider`
- `claim` -> `gp-claim`
- `bullets` -> `gp-bullets`
- `reading` -> `gp-reading`
- `quote` or `quote-slide` -> `gp-quote-slide`
- `exhibit` -> `gp-exhibit`
- `half` -> `gp-half`
- `filters` -> `gp-filters`
- `table` or `table-slide` -> `gp-table-slide`
- `references` -> `gp-references`

## Authoring Patterns
### 1) Title Slide
Recommended attributes:

```md
# Talk title {layout="title" data-gp-slug="Short Slug" data-gp-kicker="SPEC / TALK" data-gp-code="SHORT CODE"}
```

`data-gp-slug` sets the running head shown top-left on every slide (falls back to `pagetitle`).
A single slide can override it with `data-running-head="..."`.

Optional blocks:
- `.gp-subtitle`
- `.gp-meta-grid` with `.gp-block` and inline `.gp-label`

### 2) Divider Slide
Use:

```md
# Section Name {layout="divider" data-gp-kicker="Section / 01"}
```

### 3) Bullets Slide + Modal Trigger
Use normal lists and optional modal links:

```md
* Point text. [OPEN](#){.opens-modal data-modal-type="image" data-modal-url="images/example.png"}
```

Modal types commonly used:
- `image`
- `iframe`
- `video`
- `html`

Notes:
- Keep `href="#"` for modal anchors.
- Modal trigger styling is automatic via `.gp-modal-trigger`.

### 4) Citation Footer Apparatus
Use `aside` blocks:

```md
::: aside
[@keyOne; @keyTwo]
:::
```

Rules:
- Keep citations in `aside` for footer rendering.
- Inline citation markers are hidden by design on content area.

## Figure and Exhibit Primitives
### Exhibit layout (`layout="exhibit"`)
Preferred simple form:

```md
# Image exhibit {layout="exhibit" data-gp-caption="FIG. N - Caption text."}

![](images/example.png)
```

Bridge auto-wraps media into:
- `figure.gp-figure`
- `.gp-frame`
- `.gp-media.gp-media--exhibit`

For embeds:
- Use direct `<iframe ...>` in slide.
- Bridge assigns `.gp-frame-embed` and frame embed behavior.

### Half layout (`layout="half"`)
Use Quarto columns plus explicit exhibit block:
- text in one column
- framed figure/iframe in the other
- `.gp-half-exhibit` for right-side framed exhibit

### Filter lab layout (`layout="filters"`)
Use a 2-column grid:
- wrapper `.gp-filter-grid`
- each item as `.gp-figure` with `.gp-frame`

## Image Filters and Shader Controls
### CSS tone filters (no WebGL)
Apply directly to images where needed:
- `.gp-img-ink`
- `.gp-img-pop`
- `.gp-img-tone-bw`
- `.gp-img-tone-navy`
- `.gp-img-tone-steel`
- `.gp-img-tone-olive`
- `.gp-img-tone-amber`

### Halftone shader wrapper
Wrap image inside `.gp-halftone` and set data attrs:

```md
::: {.gp-media .gp-halftone data-gp-halftone="dots" data-gp-preset="mosaic"}
<img src="images/example.png" class="gp-frame-img" alt="..."/>
:::
```

Supported modes:
- `data-gp-halftone="dots"`
- `data-gp-halftone="cmyk"`

Preset families:
- Dots: `default`, `led`, `mosaic`, `roundSquare`, `blueprint`, `xray`, `stencil`
- CMYK: `default`, `drops`, `newspaper`, `vintage`, `risograph`, `noirPress`, `toxicPop`

Useful per-node overrides:
- `data-gp-options='{"size":0.5,"contrast":1.2}'` (JSON object)
- `data-gp-fit="cover|contain"`
- `data-gp-speed`, `data-gp-frame`
- `data-gp-min-pixel-ratio`, `data-gp-max-pixel-count`

Slide-level default shortcut:
- `data-gp-halftone-default="true"` on exhibit slide (defaults to dots/default unless overridden)

## References Slide
Use:

```md
# Literature {layout="references"}
```

Behavior:
- Citeproc bibliography is styled as two columns on desktop.
- Falls back to one column on narrow viewports.
- Keep references as generated CSL entries; do not hand-format unless necessary.
- Put `::: {#refs}` / `:::` on the references slide so the bibliography stays there even when backup slides follow it.

## Style Guardrails
- Keep the neutral paper/ink palette. Do not introduce unrelated color systems.
- Keep sharp corners and strong black rules (no soft cards, no rounded UI language).
- Use template typography only (Jost for headings and labels, Newsreader for body text; palette and type follow maxnoichl.eu).
- Keep footer apparatus clear: no overlapping blocks over citation band.
- Prefer exhibit framing over full-bleed decorative images.

## Agent Workflow for New Deck Content
1. Start with semantic Markdown content and `layout="..."` per slide.
2. Add `aside` citations for footer references.
3. Add figures using template wrappers (`gp-figure`, `gp-frame`, `gp-media`) only where needed.
4. Add modal links only for specific expansion content.
5. Use filters/shaders intentionally; avoid mixing many effect styles on one slide.
6. Render and visually QA before handing off.

## QA Checklist
- `quarto render` succeeds without errors.
- Slide title hierarchy and accent bars align visually.
- Corner matrix present and top-right on all slides.
- Footers show citations without parentheses.
- References slide is two columns (desktop) and legible.
- Modal open/close behavior works and close button is styled correctly.
- Half/filter/exhibit frames contain media cleanly (no clipping/blank placeholders).

