// The parsed reply drawn with the surface's own elements: Text runs for every
// inline style, Boxes for layout, the engine's Code for fences.

import type { ElementTable, RenderChildren, RenderElement } from 'claude-code'

import { type Block, type CalloutKind, type Inline, plainOf, stripTags } from './parse'
import { GRADIENTS, RAINBOW, ROLE_COLORS, type Palette, resolveColor, shadeFor, spread } from './themes'

type Table = Pick<ElementTable, 'Box' | 'Text' | 'Link' | 'Code' | 'Markdown'>

export type Ctx = {
  t: Table
  p: Palette
  isLight: boolean
  /** Columns the block draws into. */
  width: number
  /** How deep in lists, for the bullet glyph and color. */
  listDepth: number
  /** Inside a blockquote: paragraphs draw italic. */
  isQuoted: boolean
}

/** A Text string's bound is 10000; runs are cut well below it. */
const CHUNK = 4000
const BULLETS = ['•', '◦', '▸', '▪']
const BORDERS: Record<string, string> = {
  round: 'round',
  single: 'single',
  double: 'double',
  bold: 'bold',
  classic: 'classic',
  singledouble: 'singleDouble',
  doublesingle: 'doubleSingle',
}

/** Text as a Text may hold it: no escapes or control characters, tabs as spaces. */
export function clean(text: string): string {
  return text
    .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    .replace(/\t/g, '    ')
    .replace(/[\x00-\x09\x0b-\x1f\x7f]/g, '')
}

function chunks(text: string): string[] {
  const out: string[] = []
  for (let i = 0; i < text.length; i += CHUNK) out.push(text.slice(i, i + CHUNK))
  return out.length > 0 ? out : ['']
}

/** Props with the unset ones left out, as a tree's props must be. */
function defined<T extends Record<string, unknown>>(props: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) if (v !== undefined && v !== false) out[k] = v
  return out as T
}

/** Terminal cells a string takes: wide East Asian and emoji count two, marks none. */
export function cellWidth(text: string): number {
  let n = 0
  for (const ch of text) {
    const c = ch.codePointAt(0)!
    if ((c >= 0x300 && c <= 0x36f) || (c >= 0x200b && c <= 0x200f) || c === 0xfe0f || c === 0x20e3) continue
    if (
      (c >= 0x1100 && c <= 0x115f) ||
      (c >= 0x2e80 && c <= 0xa4cf) ||
      (c >= 0xac00 && c <= 0xd7a3) ||
      (c >= 0xf900 && c <= 0xfaff) ||
      (c >= 0xfe30 && c <= 0xfe4f) ||
      (c >= 0xff00 && c <= 0xff60) ||
      (c >= 0xffe0 && c <= 0xffe6) ||
      (c >= 0x1f300 && c <= 0x1f64f) ||
      (c >= 0x1f900 && c <= 0x1f9ff) ||
      (c >= 0x20000 && c <= 0x3fffd)
    ) {
      n += 2
    } else {
      n += 1
    }
  }
  return n
}

/** A raw color as drawn here: a role from the palette, anything else shaded for the background. */
function colorOf(raw: string | undefined, ctx: Ctx): string | undefined {
  if (raw === undefined) return undefined
  if (ROLE_COLORS[raw.trim().toLowerCase()] !== undefined) return resolveColor(raw, ctx.p)
  const hex = resolveColor(raw, ctx.p)
  return hex === undefined ? undefined : shadeFor(hex, ctx.isLight)
}

/** Dark or light text, whichever reads on `bg`. */
function contrast(bg: string): string {
  const n = parseInt(bg.slice(1), 16)
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)
  return lum > 140 ? '#1c1c1c' : '#ffffff'
}

/** `text` colored along `stops`, in at most `segments` runs. */
function graded(text: string, stops: readonly string[], ctx: Ctx, segments = 48): RenderChildren[] {
  const { Text } = ctx.t
  const chars = Array.from(text)
  if (chars.length === 0) return []
  const size = Math.max(1, Math.ceil(chars.length / segments))
  const runs: string[] = []
  for (let i = 0; i < chars.length; i += size) runs.push(chars.slice(i, i + size).join(''))
  const colors = spread(stops, runs.length)
  return runs.map((run, k) => <Text color={colors[k]!}>{run}</Text>)
}

function stopsOf(stops: readonly string[] | 'rainbow', ctx: Ctx): string[] {
  if (stops === 'rainbow') return RAINBOW.map(c => shadeFor(c, ctx.isLight))
  const out: string[] = []
  for (const stop of stops) {
    const preset = GRADIENTS[stop.toLowerCase()]
    if (preset !== undefined) out.push(...preset.map(c => shadeFor(c, ctx.isLight)))
    else {
      const color = colorOf(stop, ctx)
      if (color !== undefined) out.push(color)
    }
  }
  return out.length > 0 ? out : GRADIENTS.sunset!.map(c => shadeFor(c, ctx.isLight))
}

/** The href a Link accepts (`https:` or local `http:`, printable ASCII, no `@`), or undefined. */
function safeHref(href: string): string | undefined {
  try {
    const url = new URL(href)
    const isLocal = url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    if (url.protocol !== 'https:' && !isLocal) return undefined
    const spelled = url.href
    if (spelled.length > 2048 || !/^[\x21-\x7e]+$/.test(spelled) || spelled.includes('@')) return undefined
    return spelled
  } catch {
    return undefined
  }
}

// ---------------------------------------------------------------- inline

export function inlines(nodes: readonly Inline[], ctx: Ctx, hasColor = false): RenderChildren[] {
  return nodes.map(n => inline(n, ctx, hasColor))
}

function inline(n: Inline, ctx: Ctx, hasColor: boolean): RenderChildren {
  const { Text, Link } = ctx.t
  const { p } = ctx
  switch (n.kind) {
    case 'text':
      return chunks(clean(n.text))
    case 'br':
      return '\n'
    case 'code':
      return (
        <Text color={p.code} backgroundColor={p.codeBg}>
          {chunks(clean(n.text))}
        </Text>
      )
    case 'kbd': {
      const bg = ctx.isLight ? '#e0e0e0' : '#4a4a5a'
      return (
        <Text backgroundColor={bg} color={contrast(bg)} bold>
          {` ${clean(n.text)} `}
        </Text>
      )
    }
    case 'link': {
      const label = n.children.length > 0 ? inlines(n.children, ctx, true) : [clean(n.href)]
      const styled = (
        <Text color={p.link} underline>
          {label}
        </Text>
      )
      const href = safeHref(n.href)
      if (href !== undefined) return <Link href={href}>{styled}</Link>
      const shown = plainOf(n.children)
      if (n.href === '' || shown === n.href) return styled
      return (
        <Text>
          {styled}
          <Text color={p.muted}>{` (${clean(n.href)})`}</Text>
        </Text>
      )
    }
    case 'span': {
      const s = n.style
      let color = colorOf(s.color, ctx)
      let bg = colorOf(s.bg, ctx)
      if (s.role === 'highlight') {
        bg = bg ?? p.highlight
        color = color ?? contrast(bg)
      }
      if (color === undefined && !hasColor) {
        if (s.role === 'bold') color = p.bold
        else if (s.role === 'italic') color = p.italic
        else if (s.role === 'strike') color = p.muted
      }
      const props = defined({
        color,
        backgroundColor: bg,
        bold: s.bold,
        italic: s.italic,
        underline: s.underline,
        strikethrough: s.strike,
        dimColor: s.dim,
        inverse: s.inverse,
      })
      return <Text {...props}>{inlines(n.children, ctx, hasColor || color !== undefined)}</Text>
    }
    case 'grad':
      return <Text>{graded(clean(plainOf(n.children)), stopsOf(n.stops, ctx), ctx)}</Text>
    case 'badge': {
      const bg = colorOf(n.color, ctx) ?? p.accent
      return (
        <Text backgroundColor={bg} color={contrast(bg)} bold>
          {' '}
          {inlines(n.children, ctx, true)}{' '}
        </Text>
      )
    }
  }
}

// ---------------------------------------------------------------- blocks

const CALLOUTS: Record<CalloutKind, { glyph: string; label: string; color: (p: Palette) => string }> = {
  note: { glyph: '●', label: 'Note', color: p => p.info },
  tip: { glyph: '★', label: 'Tip', color: p => p.ok },
  important: { glyph: '◆', label: 'Important', color: p => p.accent },
  warning: { glyph: '▲', label: 'Warning', color: p => p.warn },
  caution: { glyph: '✖', label: 'Caution', color: p => p.err },
}

/** Blocks one under another, a blank row between them unless `isTight`. */
export function blocks(list: readonly Block[], ctx: Ctx, isTight = false): RenderElement[] {
  const { Box } = ctx.t
  return list.map((b, i) => (
    <Box flexDirection="column" marginTop={i > 0 && !isTight ? 1 : 0}>
      {block(b, ctx)}
    </Box>
  ))
}

function block(b: Block, ctx: Ctx): RenderElement {
  const { Box, Text, Code, Markdown } = ctx.t
  const { p } = ctx
  switch (b.kind) {
    case 'heading': {
      if (b.level === 1) {
        const title = clean(plainOf(b.inlines))
        const rule = '━'.repeat(Math.max(3, Math.min(cellWidth(title), ctx.width - 1)))
        return (
          <Box flexDirection="column">
            <Text bold>{graded(title, p.title, ctx)}</Text>
            <Text>{graded(rule, p.title, ctx)}</Text>
          </Box>
        )
      }
      if (b.level === 2) {
        return (
          <Text bold color={p.h2}>
            {'▍ '}
            {inlines(b.inlines, ctx, true)}
          </Text>
        )
      }
      if (b.level === 3) {
        return (
          <Text bold color={p.h3}>
            {inlines(b.inlines, ctx, true)}
          </Text>
        )
      }
      return (
        <Text bold italic color={p.h4}>
          {inlines(b.inlines, ctx, true)}
        </Text>
      )
    }

    case 'para':
      return ctx.isQuoted ? <Text italic>{inlines(b.inlines, ctx)}</Text> : <Text>{inlines(b.inlines, ctx)}</Text>

    case 'list': {
      const last = b.start + b.items.length - 1
      const markWidth = b.ordered ? String(last).length + 1 : 1
      const bulletColor = p.bullets[ctx.listDepth % p.bullets.length]!
      return (
        <Box flexDirection="column">
          {b.items.map((item, k) => {
            const mark = b.ordered ? `${b.start + k}.`.padStart(markWidth) : BULLETS[ctx.listDepth % BULLETS.length]!
            const marker =
              item.task === null ? (
                <Text color={b.ordered ? p.number : bulletColor} bold={b.ordered}>
                  {mark}
                </Text>
              ) : item.task ? (
                <Text color={p.ok} bold>
                  {'✔'}
                </Text>
              ) : (
                <Text color={p.muted}>{'○'}</Text>
              )
            const inner: Ctx = { ...ctx, width: ctx.width - markWidth - 1, listDepth: ctx.listDepth + 1 }
            return (
              <Box flexDirection="row" marginTop={b.isLoose && k > 0 ? 1 : 0}>
                <Box width={markWidth + 1} flexShrink={0}>
                  {marker}
                </Box>
                <Box flexDirection="column" flexGrow={1} flexShrink={1}>
                  {blocks(item.blocks, inner, !b.isLoose)}
                </Box>
              </Box>
            )
          })}
        </Box>
      )
    }

    case 'quote':
      return (
        <Box borderStyle="round" borderColor={p.quote} paddingX={1} flexDirection="column" alignSelf="flex-start">
          {blocks(b.blocks, { ...ctx, width: ctx.width - 4, isQuoted: true })}
        </Box>
      )

    case 'callout': {
      const meta = CALLOUTS[b.type]
      const color = meta.color(p)
      return (
        <Box borderStyle="round" borderColor={color} paddingX={1} flexDirection="column" alignSelf="flex-start">
          <Text bold color={color}>
            {`${meta.glyph} ${meta.label}`}
            {b.title.length > 0 ? ': ' : ''}
            {inlines(b.title, ctx, true)}
          </Text>
          {blocks(b.blocks, { ...ctx, width: ctx.width - 4 })}
        </Box>
      )
    }

    case 'panel': {
      const color = colorOf(b.color, ctx) ?? p.accent
      const border = BORDERS[(b.border ?? 'round').toLowerCase()] ?? 'round'
      return (
        <Box borderStyle={border} borderColor={color} paddingX={1} flexDirection="column" alignSelf="flex-start">
          {b.title !== undefined && (
            <Text bold color={color}>
              {clean(b.title)}
            </Text>
          )}
          {blocks(b.blocks, { ...ctx, width: ctx.width - 4 })}
        </Box>
      )
    }

    case 'code': {
      const source = b.text.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '').replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '')
      const lang = b.lang.replace(/[^\w+#.-]/g, '')
      const parts: string[] = []
      let rest = source
      while (rest.length > 9000) {
        const cut = rest.lastIndexOf('\n', 9000)
        const at = cut > 0 ? cut : 9000
        parts.push(rest.slice(0, at))
        rest = rest.slice(at + (cut > 0 ? 1 : 0))
      }
      parts.push(rest)
      return (
        <Box flexDirection="column">
          {lang !== '' && (
            <Text color={p.muted} italic>
              {lang}
            </Text>
          )}
          {parts.map(part =>
            part.trim() === '' ? <Text> </Text> : lang !== '' ? <Code source={part} language={lang} /> : <Code source={part} />,
          )}
        </Box>
      )
    }

    case 'table':
      return table(b, ctx) ?? <Markdown text={stripTags(clean(b.raw)).slice(0, 9500)} />

    case 'hr':
      return <Text>{graded('─'.repeat(Math.max(3, ctx.width - 1)), p.rule, ctx)}</Text>
  }
}

/** A table drawn in box lines with styled cells, or undefined when it would not fit. */
function table(b: Extract<Block, { kind: 'table' }>, ctx: Ctx): RenderElement | undefined {
  const { Box, Text } = ctx.t
  const { p } = ctx
  const all = [b.header, ...b.rows]
  const plain = all.map(row => row.map(cell => clean(plainOf(cell))))
  if (plain.some(row => row.some(cell => cell.includes('\n')))) return undefined
  const widths = b.header.map((_, c) => Math.max(1, ...plain.map(row => cellWidth(row[c] ?? ''))))
  const total = widths.reduce((sum, w) => sum + w + 3, 1)
  if (total > ctx.width - 1) return undefined

  const line = (left: string, mid: string, right: string) => (
    <Text color={p.muted}>{left + widths.map(w => '─'.repeat(w + 2)).join(mid) + right}</Text>
  )
  const row = (cells: readonly Inline[][], texts: readonly string[], isHeader: boolean) => (
    <Text wrap="truncate-end">
      <Text color={p.muted}>│</Text>
      {widths.map((w, c) => {
        const room = w - cellWidth(texts[c] ?? '')
        const align = b.align[c] ?? 'left'
        const left = align === 'right' ? room : align === 'center' ? Math.floor(room / 2) : 0
        const cell = cells[c] ?? []
        return (
          <Text>
            {' '.repeat(left + 1)}
            {isHeader ? (
              <Text bold color={p.h2}>
                {inlines(cell, ctx, true)}
              </Text>
            ) : (
              <Text>{inlines(cell, ctx)}</Text>
            )}
            {' '.repeat(room - left + 1)}
            <Text color={p.muted}>│</Text>
          </Text>
        )
      })}
    </Text>
  )

  return (
    <Box flexDirection="column">
      {line('╭', '┬', '╮')}
      {row(b.header, plain[0]!, true)}
      {line('├', '┼', '┤')}
      {b.rows.map((cells, r) => row(cells, plain[r + 1]!, false))}
      {line('╰', '┴', '╯')}
    </Box>
  )
}
