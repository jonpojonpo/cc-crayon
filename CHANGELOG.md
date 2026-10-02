# Changelog

## 0.2.0 — 2026-10-02

Replies follow the theme as far as they can.

- The guide now steers the model toward theme colors: meaning colors, the new series colors and theme gradients first, and fixed colors only when the color itself matters. It no longer lists every named color.
- New series colors `<c1>` to `<c5>`, the theme's distinct hues for telling items apart. They work as tags and anywhere a color goes (`<badge c2>`, `<t color="c3">`).
- `<grad>` with no stops draws the theme's own gradient, and `<grad theme="ocean">` borrows another theme's.
- Each theme has a tone that restyles fixed colors (named, hex, presets, the rainbow) while keeping their hue. Pastel softens them, synthwave makes them neon, ocean and forest tint them, and mono turns them gray.
- `/crayon demo` and the `/crayon` theme previews use theme colors.

## 0.1.1 — 2026-10-02

- The `classic.SessionStart` and `config.set` hooks now do their work first and then pass the event on unchanged with `return next(e)`. A `/config` theme change is read straight from the change itself.
- README: a table of every hook, what it does and what it changes, and what crayon touches.
- A listing icon.

## 0.1.0 — 2026-10-02

First release.

- Themed Markdown for every assistant reply: gradient H1s, colored emphasis and code, depth-colored bullets, task checkboxes, box-drawn tables, framed quotes, GitHub alert callouts and gradient rules.
- Inline tags the model can write: Ink `Text` props (`<t>` / `<Text>`), named and hex colors, meaning colors (`<ok>`, `<warn>`, `<err>`, …), badges, key caps, highlights, rainbow and gradient text, and bordered `<panel>` blocks.
- A system prompt guide that teaches the model the tags (`/crayon teach on|off`).
- Six themes (`crayon`, `synthwave`, `pastel`, `ocean`, `forest`, `mono`), shaded for light backgrounds.
- Tags are stripped while a reply streams, so they never flash on screen.
- `/crayon` command for themes, on/off, background and a demo. Settings persist across sessions and survive `/clear`.
