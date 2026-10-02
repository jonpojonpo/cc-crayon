# Changelog

## 0.1.0 — 2026-10-02

First release.

- Themed Markdown for every assistant reply: gradient H1s, colored emphasis and code, depth-colored bullets, task checkboxes, box-drawn tables, framed quotes, GitHub alert callouts and gradient rules.
- Inline tags the model can write: Ink `Text` props (`<t>` / `<Text>`), named and hex colors, meaning colors (`<ok>`, `<warn>`, `<err>`, …), badges, key caps, highlights, rainbow and gradient text, and bordered `<panel>` blocks.
- A system prompt guide that teaches the model the tags (`/crayon teach on|off`).
- Six themes (`crayon`, `synthwave`, `pastel`, `ocean`, `forest`, `mono`), shaded for light backgrounds.
- Tags are stripped while a reply streams, so they never flash on screen.
- `/crayon` command for themes, on/off, background and a demo. Settings persist across sessions and survive `/clear`.
