# TintPair

**One hex color. Two polished themes. Copy the CSS.**

**[Open the live demo →](https://syedhassan3323.github.io/Tint-Pair/)** — try TintPair in your browser.

Turn a brand color into coordinated light and dark themes. See both on a small
dashboard before copying the exact same tokens into your Tailwind v4 project.
Optional secondary and accent colors, twelve palette presets, a component
gallery, and a token inspector help you explore a complete palette. Version 1.2
uses neutral surfaces and text with restrained soft fills, plus icon-only
light/dark and GitHub controls in the application header. Version 1.3 adds a
richer three-color dashboard and dedicated Forms and Tables playgrounds.
TintPair itself uses native browser JavaScript and CSS; it needs no Tailwind,
build tool, package installation, account, or backend API.

## Run it

Use Node.js 24 or newer. From this directory:

```sh
npm start
```

Open **http://127.0.0.1:4173**. Stop the server with Ctrl+C.

```sh
npm test
```

There are no dependencies, install steps, or lockfiles. Tests use `node:test`
and `node:assert/strict`. You can also run `node serve.mjs` and `node --test`
directly. The server binds only to loopback and explicitly serves the HTML,
stylesheet, and two browser modules; repository files are not public routes.
If port 4173 is busy, stop its current process and restart TintPair.

## Use it

1. Pick a primary color or enter `#RGB` or `#RRGGBB`. Secondary and accent colors
   follow it automatically until you edit them; **Reset to auto** restores this.
2. Try one of twelve named, three-color presets. Adjust the corner radius from
   0 to 24 whole pixels, or use **Reset theme** to restore the defaults.
3. Switch between **Dashboard**, **Components**, **Forms**, **Tables**, and
   **Color tokens**. Both light and dark previews stay available. Token rows
   copy their exact values.
4. Expand **Text contrast** beneath either preview to inspect all nine ratios.
5. Choose **Copy Tailwind CSS** or **Download .css**.
6. Choose **Share theme** in the header. Copy the selectable link or use your
   device's native sharing option when supported. Links restore all three colors
   and the radius. Sharing does not change a hosted app's access permissions.
7. Use the **moon/sun icon** in the header to switch between light and dark site
   appearance independently of the paired previews. The icon shows the mode you
   can switch to, and the button has an accessible label and pressed state.
   Your preference is remembered on this device when browser storage is available;
   the default is light. There is no System option.

The header's GitHub icon links to [syedhassan3323](https://github.com/syedhassan3323).
Update this link in `index.html` if you fork the tool.

Invalid color input leaves the last valid preview and export intact. Short hex
is expanded and accepted colors are normalized to lowercase. Clipboard failure
opens a labeled dialog with selectable text; use your device's Copy command and
close it with the button or Escape. Downloads work independently of clipboard
permission. Preview project names are demonstrations and are never saved.

## Explore the playground

- **Dashboard:** three metric cards, a stacked acquisition chart with a labeled
  primary/secondary/accent legend, three project progress bars, a task checklist,
  team avatars and activity, and a quick project entry. All three chosen colors
  appear in the chart, progress, avatar, and metric treatments. Example metrics
  and activity are illustrative, not live analytics. Enter a project name and
  choose **Create project** to prefill Forms; **View all** opens Tables.
- **Components:** button variants, badges, selects, checkboxes, radio groups,
  switches, feedback, progress, and a compact table.
- **Forms:** project name, contact email, a whole-dollar budget, project type,
  brief with character count, visibility radios, update/reminder controls, and
  team-seat usage. Submit to try inline errors, first-invalid-field focus, and
  validation feedback. Reset clears errors and restores initial field values.
- **Tables:** six sample projects with owner, status, progress, and palette-role
  badges. Search by name or owner, combine it with a status filter, and try an
  empty search result. **Clear filters** restores the full list. Each preview
  keeps its own filter state; narrow tables scroll horizontally.
- **Color tokens:** inspect and copy each mode's exact exported color values.

Forms, tasks, and filters are browser-local demonstrations. Form submission is
intercepted: nothing is sent or saved, and form entries never enter share links
or CSS exports. Each preview's radio groups and form values remain independent.
Changing the palette recolors the controls without clearing entered demo values.
On desktop, theme controls stay within reach while scrolling the taller dashboard.

Share links use a fragment such as
`#seed=%237c3aed&radius=12&secondary=%23475569&accent=%2314b8a6`. The fragment
contains only validated colors and radius, is restored at startup and on hash
changes, and is not sent in HTTP requests. Unknown keys are ignored. Invalid
seed and radius values fall back independently to `#7c3aed` and `12`.
Missing or invalid optional secondary/accent colors are derived from the primary.
Older links containing only seed and radius still work. Shared palette values
are explicit colors when restored; use **Reset to auto** to link them again.
Share a link to wherever you host TintPair; a loopback link only opens on the
recipient's own computer and does not make your local server public.

## Use the exported CSS with Tailwind v4

TintPair generates a complete entry stylesheet beginning with:

```css
@import "tailwindcss";
```

In a project that already builds Tailwind v4, use the download as the entry
stylesheet, or merge it into your current entry:

1. Keep **one** `@import "tailwindcss";` at the top. Do not paste a second import.
2. Add the generated `:root` and `.dark` token blocks. Merge existing declarations
   deliberately if your project already uses the same token names.
3. Add the `@theme inline` mappings. They reference `--tp-*`, for example
   `--color-primary: var(--tp-primary)` and
   `--radius-card: var(--tp-radius)`, with no self-referencing variables.
4. Keep one class-based dark variant, replacing or merging an existing definition:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

This uses Tailwind's documented selector form. Semantic colors automatically
switch when `.dark` overrides the underlying tokens; `dark:` utilities also
work. No `tailwind.config.js` is needed.

```html
<html lang="en" class="dark">
  <body class="min-h-screen bg-background text-foreground">
    <main class="rounded-card border border-border bg-surface p-6">
      <h1 class="text-foreground">Welcome back</h1>
      <p class="text-muted">A little progress, every day.</p>
      <button class="rounded-card bg-primary px-4 py-2 text-primary-foreground">
        Create project
      </button>
      <button class="rounded-card bg-secondary px-4 py-2 text-secondary-foreground">
        View projects
      </button>
      <span class="rounded-card bg-accent px-2 py-1 text-accent-foreground">New</span>
    </main>
  </body>
</html>
```

Remove `class="dark"` for light mode. Toggle it on the document's `<html>` element
with your application's own theme control. TintPair exports CSS, not a theme
toggle or a Tailwind compiler. Your consuming project needs its normal Tailwind
v4 build setup; the TintPair generator needs no installation.

References: [Tailwind theme variables](https://tailwindcss.com/docs/theme#referencing-other-variables)
and [class-based dark mode](https://tailwindcss.com/docs/dark-mode#toggling-dark-mode-manually).

## Color recipes

`mixHex(a, b, w)` mixes **encoded sRGB channels**, with `w` representing the share
of `b`: `round(a × (1 − w) + b × w)` per channel. It is deterministic, rounds to
8-bit channels, and is **not** linear-light mixing or a perceptually uniform
color-space operation. The seed is preserved exactly as `primary` in both modes.

| Token | Light | Dark |
| --- | --- | --- |
| background | `#f3f5f8` + 1.5% primary | `#101419` + 1.5% primary |
| surface | white | `#1c222b` + 2% primary |
| foreground candidate | `#192231` | `#ecf0f6` |
| muted candidate | `#5f6b7c` | `#a3adbd` |
| border | surface + 14% foreground | surface + 17% foreground |
| primary | normalized seed | normalized seed |
| primary-foreground | higher contrast of black/white | higher contrast of black/white |
| secondary (auto) | primary + 60% `#64748b` | same color |
| accent (auto) | primary + 60% `#14b8a6` | same color |
| secondary/accent overrides | normalized chosen color | same color |
| secondary-foreground | higher contrast of black/white on secondary | same color |
| accent-foreground | higher contrast of black/white on accent | same color |
| primary-soft | surface + 9% primary | surface + 18% primary |
| secondary-soft | surface + 9% secondary | surface + 18% secondary |
| accent-soft | surface + 9% accent | surface + 18% accent |
| radius | selected integer in px | selected integer in px |

Starting from each text candidate, scan from 0% to 100% toward black (light
mode) or white (dark mode), in whole percentage steps. Select the first rounded
hex result whose **unrounded** contrast is at least 4.5:1 against every required
background: foreground against background, surface, and all three soft fills;
muted against surface. Each of the three palette fills uses whichever of
black/white has the higher contrast for its text. Choose black on a tie. All nine displayed pairs
are checked against the 4.5:1 threshold.

The neutral anchors keep dark mode from becoming a saturated brown, green, or
purple canvas. Primary actions use the exact primary pair. Secondary actions,
badges, and feedback use soft fills with neutral foreground text, reserving
strong color for emphasis. For example, use
`bg-accent-soft text-foreground` for a quiet badge and
`bg-primary text-primary-foreground` for the main action. The gallery's filled
accent button also shows the exact chosen accent. Recipes use encoded sRGB
mixing, including explicit neutral anchors; they do not model perceptual uniformity.

Relative luminance normalizes channels to 0–1, then uses `c / 12.92` when
`c <= 0.04045`, otherwise `((c + 0.055) / 1.055) ** 2.4`. The linear channels
are weighted 0.2126, 0.7152, 0.0722. Contrast is
`(lighter + 0.05) / (darker + 0.05)`. Displayed ratios round to two decimals;
threshold checks do not. Preview token values and export token values come from
the same `buildTheme` result; no additional palette is generated in the UI.

## Limits

- These are **ordinary text-contrast checks, not full accessibility certification**.
  Review focus, semantics, keyboard behavior, non-text contrast, states, content,
  and usability in your real application.
- Muted is checked against surface only. Put it on surface, or check contrast
  yourself before using it on another background. Foreground is checked on both.
- Chosen primary, secondary, and accent colors are never altered. Very light or dark colors may blend into nearby
  surfaces even though their black/white button text passes. Borders and chart
  marks are not guaranteed to meet non-text contrast requirements.
- This is a compact semantic palette, not an entire 50–950 color scale. It does
  not export dedicated hover, disabled, success, warning, or error colors. Gallery
  feedback uses accent-soft with neutral foreground and does not imply a semantic
  success/error token.
- sRGB mixing can produce different apparent saturation across hues. The tool
  makes no claim of perceptual uniformity or suitability for every brand.
- Use a current browser with ES modules, native color/range inputs, and `<dialog>`.
  Clipboard access depends on a secure context and browser permissions; a manual
  copy fallback is included. Serve the app over HTTP rather than opening a file.
- The app stores only an optional site-appearance preference, no theme history,
  sends no telemetry, and makes no runtime
  requests to external services. Hosting a copy requires only static-file hosting.

## Project structure and contributions

`theme.mjs` owns pure color math, configuration validation, and CSS generation;
it imports no browser or Node-specific APIs. `app.mjs` owns DOM interactions
and exports pure sample-project filtering and form-validation helpers. Browser
initialization is guarded so those helpers can be tested with Node alone.
`styles.css` styles the generator without Tailwind. `serve.mjs` uses Node's HTTP
and filesystem built-ins, allows GET/HEAD only, and serves an explicit allowlist.
Tests cover math, presets, a 216-color RGB grid, edge colors, radius validation,
share serialization, export/preview token equality, form-validation boundaries,
and combined project search/status filtering.

To contribute, make a branch in your checkout, keep the implementation readable
and dependency-free, run `npm test`, and verify the browser checklist below.
Submit a pull request with the problem, resulting behavior, and checks performed.
Add meaningful tests for changes to color math or export behavior. Keep recipes
and documentation aligned with the implementation. Do not add generated files,
package downloads, or a lockfile. CI runs `npm test` on Node 24 for pushes and PRs.

## Eight-second demo storyboard

Record the interface first; keep both theme previews and the copy control visible.
This is a recording plan, not a claim that a GIF is included.

| Time | Action |
| --- | --- |
| 0–2s | Paste `#7c3aed` into Brand color; show both purple previews. |
| 2–4s | Move the radius slider to demonstrate matching rounded components. |
| 4–6s | Choose the Orange preset; pause as both previews change together. |
| 6–8s | Click **Copy Tailwind CSS**; show the copy confirmation or selectable fallback. |

## Manual browser verification

- Check all three color controls, twelve presets, short/long hex, normalization,
  invalid input preservation, and automatic secondary/accent reset.
- Move radius to 0, 12, and 24 with both mouse and keyboard; compare both previews.
- Switch Dashboard/Components/Color tokens; try inputs, radio groups, switches,
  and token copying. Light and dark radio groups should operate independently.
- Check all three dashboard color roles in metrics, chart legend, progress and
  avatars. Recolor primary, secondary and accent independently in both modes.
- Use the quick project entry to open Forms. Submit empty and valid entries;
  check errors, keyboard focus, budget boundaries, the brief counter and Reset.
- Open Tables, combine name/owner search with status filters, trigger the empty
  state and clear filters. Verify horizontal scrolling at narrow widths.
- Confirm that form/radio/filter state stays independent between modes, and
  changing colors preserves entered demo values.
- Expand text checks; inspect all nine numerical ratios in each mode.
- Copy and download CSS; verify the values match the preview tokens.
- Deny clipboard permission; check selectable fallback, Escape, and focus return.
- Share a theme; reopen the link and change the hash. Try malformed values.
- Verify full-palette sharing, old one-color links, copy-link fallback and native
  sharing cancellation. Confirm site access settings are unchanged.
- Toggle the moon/sun control with pointer, Enter, and Space, reload, and verify
  the icon, tooltip, pressed state, and that preview and
  export tokens stay unchanged. Test with browser storage disabled.
- Check that the GitHub control shows only its icon, has an accessible name and
  tooltip, and opens the correct profile in a new tab.
- Tab through controls and demo components; confirm focus is always visible.
- Check narrow widths (320px and 390px), desktop, and reduced-motion preference.
- Compile the export in an existing Tailwind v4 project; toggle `.dark` on `<html>`.

## License

MIT © 2026 TintPair contributors. See [LICENSE](LICENSE).
