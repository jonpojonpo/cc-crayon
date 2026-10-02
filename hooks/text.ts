// The words crayon hands the model and the person.

/** The system prompt section that teaches the model the markup. */
export const GUIDE = `# Rich terminal styling (crayon)

The person's interface draws your replies with crayon, in a color theme they chose and can switch at any time. Markdown is styled by that theme automatically: headings, **bold**, *italic*, \`code\`, lists, tables, > quotes and GitHub alerts (> [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION]), which draw as colored callout boxes. You can also add inline tags that render as real terminal colors and styles. Use them in prose replies to the person only: never inside code blocks, file contents, tool inputs, commit messages, or anything written to disk or sent elsewhere.

Color with the theme's own colors, so the reply matches whatever theme the person picks:
- Meaning: <ok>passed</ok> <warn>…</warn> <err>failed</err> <info>…</info> <accent>…</accent> <muted>…</muted>.
- Telling items apart (the services, cities or options in a list or comparison): <c1>…</c1> to <c5>…</c5>, the theme's distinct hues, used in order.
- Badges and highlights take the same names: <badge ok>PASS</badge> <badge c2>v2.1</badge> <hl>key point</hl>.
- <grad>…</grad> draws the theme's gradient, for a title or a sign-off; <rainbow>…</rainbow> a rainbow.
- These names work anywhere a color goes: <t color="c3" bold>…</t>, <bg accent>…</bg>, a line <panel title="…" color="info"> … a line </panel> for a bordered box around Markdown.

Styles: <b> <i> <u> <s> <dim> <kbd>Ctrl+C</kbd> <br>, or Ink <Text> props as <t bold italic underline strike dim inverse>…</t> (<Text …> works too). Tags close with </name> or </>, nest freely, and Markdown still works inside them.

Fixed colors (<orange>, <t color="#ff8800">, <grad from="#f0f" to="#0ff">) also work and are tinted toward the theme, but use them only when the color itself matters, such as naming or showing a specific color.

Style with intent: color should carry meaning (status, emphasis, structure), not decorate every word. A few well-placed accents per reply beat a wall of color; plain Markdown alone already looks good.`

/** What `/crayon demo` prints: every feature once. */
export const DEMO = `# crayon

Markdown is colored for you: **bold**, *italic*, ~~struck~~, \`inline code\`, and [links](https://claude.com).

## Theme colors
- <ok>✔ 12 passed</ok> · <warn>▲ 2 skipped</warn> · <err>✖ 1 failed</err> · <info>ℹ 3 notes</info> · <accent>accent</accent> · <muted>muted</muted>
- Series: <c1>api</c1> · <c2>web</c2> · <c3>worker</c3> · <c4>db</c4> · <c5>cache</c5>
- <badge ok>PASS</badge> <badge err>FAIL</badge> <badge c3>v2.1</badge> press <kbd>Ctrl+C</kbd> to stop, <hl>highlight</hl> what matters
- <grad>The theme's own gradient</grad>, and <rainbow>somewhere over the rainbow</rainbow>
- <t color="c2" bold>Ink Text props</t>, <t accent italic underline>shorthand words</t>, <Text color="c4" inverse> JSX spelling </Text>
- Fixed colors, tinted to the theme: <orange>orange</orange>, <#5f87ff>#5f87ff</>, <grad sunset>a sunset preset</grad>

### Lists and tasks
1. First with **emphasis**
2. Second, with a nested list
   - nested *bullet*
     - deeper still
- [x] done task
- [ ] open task

| Status | Count | Note |
|:-------|------:|:----:|
| <ok>passed</ok> | 12 | <c1>**fast**</c1> |
| <err>failed</err> | 1 | \`flaky\` |

> [!TIP]
> Callouts use GitHub's alert syntax.

> A plain quote, drawn in a frame.

<panel title="Panel" color="c4">
Any **Markdown** goes inside a <accent>panel</accent>.
</panel>

\`\`\`ts
const crayon = (color: string) => \`<\${color}>\`
\`\`\`

---`
