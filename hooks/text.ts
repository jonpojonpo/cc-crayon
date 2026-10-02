// The words crayon hands the model and the person.

import { GRADIENTS, NAMED_COLORS } from './themes'

/** The system prompt section that teaches the model the markup. */
export const GUIDE = `# Rich terminal styling (crayon)

The person's interface draws your replies with crayon: Markdown is drawn in color automatically (headings, **bold**, *italic*, \`code\`, lists, tables, > quotes), and you can add inline tags that render as real terminal colors and text styles. Use them in prose replies to the person only: never inside code blocks, file contents, tool inputs, commit messages, or anything written to disk or sent elsewhere.

Tags close with </name> or </>, nest freely, and Markdown still works inside them:
- Ink <Text> props: <t color="#ff8800" bg="#202030" bold italic underline strike dim inverse>…</t>. <Text color="cyan" bold>…</Text> works too, and bare words are shorthand: <t red bold>…</t>.
- Colors as tags: ${Object.keys(NAMED_COLORS).filter(n => !/bright|grey/.test(n)).join(' ')}; or hex: <orange>…</orange>, <#ff5f87>…</>, <bg navy>…</bg>.
- Meaning colors that follow the person's palette: <ok>passed</ok> <warn>…</warn> <err>failed</err> <info>…</info> <accent>…</accent> <muted>…</muted>.
- Styles: <b> <i> <u> <s> <dim> <hl>highlighted</hl> <kbd>Ctrl+C</kbd> <badge green>PASS</badge> <br>.
- Effects: <rainbow>…</rainbow>; <grad from="#ff5f6d" to="#ffc371">…</grad>, or a preset: <grad ${Object.keys(GRADIENTS).slice(0, 8).join('|')}>…</grad>.
- Blocks: GitHub alerts (> [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION]) draw as colored callout boxes. A line <panel title="…" color="teal"> … a line </panel> draws a bordered box around Markdown.

Style with intent: color should carry meaning (status, emphasis, structure), not decorate every word. A few well-placed accents per reply beat a wall of color; plain Markdown alone already looks good.`

/** What `/crayon demo` prints: every feature once. */
export const DEMO = `# crayon

Markdown is colored for you: **bold**, *italic*, ~~struck~~, \`inline code\`, and [links](https://claude.com).

## Inline tags
- <t color="#ff8800" bold>Ink Text props</t>, <t cyan italic underline>shorthand words</t>, <Text color="magenta" inverse> JSX spelling </Text>
- <ok>✔ 12 passed</ok> · <warn>▲ 2 skipped</warn> · <err>✖ 1 failed</err> · <info>ℹ 3 notes</info>
- <badge green>PASS</badge> <badge red>FAIL</badge> <badge #af87ff>v2.1</badge> press <kbd>Ctrl+C</kbd> to stop, <hl>highlight</hl> what matters
- <rainbow>Somewhere over the rainbow</rainbow> and <grad sunset>a sunset gradient</grad>, <grad ocean>an ocean one</grad>, <grad from="#f0f" to="#0ff">or your own</grad>

### Lists and tasks
1. First with **emphasis**
2. Second, with a nested list
   - nested *bullet*
     - deeper still
- [x] done task
- [ ] open task

| Status | Count | Note |
|:-------|------:|:----:|
| <ok>passed</ok> | 12 | **fast** |
| <err>failed</err> | 1 | \`flaky\` |

> [!TIP]
> Callouts use GitHub's alert syntax.

> A plain quote, drawn in a frame.

<panel title="Panel" color="teal">
Any **Markdown** goes inside a <accent>panel</accent>.
</panel>

\`\`\`ts
const crayon = (color: string) => \`<\${color}>\`
\`\`\`

---`
