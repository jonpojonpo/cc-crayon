// Markdown plus crayon's inline tags, parsed to a small tree the renderer
// draws. Pure: no `$`, no palette, so the tests read it directly.

import { NAMED_COLORS } from './themes'

export type Style = {
  /** A raw color as written: a name, a role (`ok`), `#hex` or `rgb()`. */
  color?: string
  bg?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  dim?: boolean
  inverse?: boolean
  /** What markdown made it, so the palette colors it when no tag chose a color. */
  role?: 'bold' | 'italic' | 'strike' | 'highlight'
}

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'link'; href: string; children: Inline[] }
  | { kind: 'span'; style: Style; children: Inline[] }
  | { kind: 'grad'; stops: GradStops; children: Inline[] }
  | { kind: 'badge'; color?: string; children: Inline[] }
  | { kind: 'kbd'; text: string }
  | { kind: 'br' }

/**
 * A gradient's colors: stops as written (names, roles, hex or presets), the
 * rainbow, or a theme's own title gradient (`{}` for the theme in force).
 */
export type GradStops = readonly string[] | 'rainbow' | { theme?: string }

export type Align = 'left' | 'center' | 'right'

export type CalloutKind = 'note' | 'tip' | 'important' | 'warning' | 'caution'

export type ListItem = { task: boolean | null; blocks: Block[] }

export type Block =
  | { kind: 'heading'; level: number; inlines: Inline[] }
  | { kind: 'para'; inlines: Inline[] }
  | { kind: 'list'; ordered: boolean; start: number; isLoose: boolean; items: ListItem[] }
  | { kind: 'quote'; blocks: Block[] }
  | { kind: 'callout'; type: CalloutKind; title: Inline[]; blocks: Block[] }
  | { kind: 'panel'; title?: string; color?: string; border?: string; blocks: Block[] }
  | { kind: 'code'; lang: string; text: string }
  | { kind: 'table'; raw: string; align: Align[]; header: Inline[][]; rows: Inline[][][] }
  | { kind: 'hr' }

// ---------------------------------------------------------------- blocks

const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)[^`]*$/
const HEADING = /^ {0,3}(#{1,6})(?:\s+(.*?))?\s*#*\s*$/
const HR = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/
const QUOTE = /^ {0,3}>/
const LIST = /^( *)([-*+]|\d{1,9}[.)])(?:([ \t]+)(.*))?$/
const TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/
const PANEL_OPEN = /^\s*<panel\b([^>]*)>\s*$/i
const PANEL_CLOSE = /^\s*<\/panel\s*>\s*$/i
const ALERT = /^\s*\[!(note|tip|important|warning|caution)\]\s*(.*)$/i

const isBlank = (line: string) => line.trim() === ''

const indentOf = (line: string) => {
  let n = 0
  for (const c of line) {
    if (c === ' ') n += 1
    else if (c === '\t') n += 4 - (n % 4)
    else break
  }
  return n
}

/** The line with `n` columns of leading indentation taken off, tabs counted to 4. */
function dedent(line: string, n: number): string {
  let col = 0
  let i = 0
  while (i < line.length && col < n) {
    const c = line[i]
    if (c === ' ') col += 1
    else if (c === '\t') col += 4 - (col % 4)
    else break
    i += 1
  }
  return (col > n ? ' '.repeat(col - n) : '') + line.slice(i)
}

function startsBlock(line: string): boolean {
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    QUOTE.test(line) ||
    HR.test(line) ||
    PANEL_OPEN.test(line) ||
    LIST.test(line)
  )
}

function splitRow(line: string): string[] {
  let body = line.trim()
  if (body.startsWith('|')) body = body.slice(1)
  if (body.endsWith('|') && !body.endsWith('\\|')) body = body.slice(0, -1)
  const cells: string[] = []
  let cell = ''
  let inCode = false
  for (let i = 0; i < body.length; i += 1) {
    const c = body[i]!
    if (c === '\\' && body[i + 1] === '|') {
      cell += '|'
      i += 1
    } else if (c === '`') {
      inCode = !inCode
      cell += c
    } else if (c === '|' && !inCode) {
      cells.push(cell.trim())
      cell = ''
    } else {
      cell += c
    }
  }
  cells.push(cell.trim())
  return cells
}

function alignOf(cell: string): Align {
  const c = cell.trim()
  if (c.startsWith(':') && c.endsWith(':')) return 'center'
  if (c.endsWith(':')) return 'right'
  return 'left'
}

function parseAttrs(raw: string): { named: Record<string, string>; bare: string[] } {
  const named: Record<string, string> = {}
  const bare: string[] = []
  const re = /([a-zA-Z#][\w#-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*["']?([^}"']*)["']?\s*\}|([^\s"'>]+)))?/g
  for (const m of raw.matchAll(re)) {
    const name = m[1]!
    const value = m[2] ?? m[3] ?? m[4] ?? m[5]
    if (value === undefined) bare.push(name)
    else named[name.toLowerCase()] = value
  }
  return { named, bare }
}

export function parseBlocks(input: string): Block[] {
  const lines = input.replace(/\r\n?/g, '\n').split('\n')
  return blocksOf(lines)
}

function blocksOf(lines: readonly string[]): Block[] {
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]!
    if (isBlank(line)) {
      i += 1
      continue
    }

    const fence = FENCE.exec(line)
    if (fence) {
      const mark = fence[1]!
      const body: string[] = []
      const indent = indentOf(line)
      i += 1
      while (i < lines.length) {
        const l = lines[i]!
        const close = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(l)
        if (close && close[1]![0] === mark[0] && close[1]!.length >= mark.length) {
          i += 1
          break
        }
        body.push(dedent(l, indent))
        i += 1
      }
      blocks.push({ kind: 'code', lang: fence[2] ?? '', text: body.join('\n') })
      continue
    }

    const panel = PANEL_OPEN.exec(line)
    if (panel) {
      const { named, bare } = parseAttrs(panel[1] ?? '')
      const body: string[] = []
      let depth = 1
      i += 1
      while (i < lines.length) {
        const l = lines[i]!
        if (PANEL_OPEN.test(l)) depth += 1
        if (PANEL_CLOSE.test(l)) {
          depth -= 1
          if (depth === 0) {
            i += 1
            break
          }
        }
        body.push(l)
        i += 1
      }
      blocks.push({
        kind: 'panel',
        title: named.title,
        color: named.color ?? bare.find(b => !BORDERS.has(b.toLowerCase())),
        border: named.border ?? named.style ?? bare.find(b => BORDERS.has(b.toLowerCase())),
        blocks: blocksOf(body),
      })
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1]!.length, inlines: parseInlines(heading[2] ?? '') })
      i += 1
      continue
    }

    if (HR.test(line)) {
      blocks.push({ kind: 'hr' })
      i += 1
      continue
    }

    if (QUOTE.test(line)) {
      const body: string[] = []
      while (i < lines.length && QUOTE.test(lines[i]!)) {
        body.push(lines[i]!.replace(/^ {0,3}> ?/, ''))
        i += 1
      }
      const alert = ALERT.exec(body[0] ?? '')
      if (alert) {
        const type = alert[1]!.toLowerCase() as CalloutKind
        blocks.push({ kind: 'callout', type, title: parseInlines(alert[2] ?? ''), blocks: blocksOf(body.slice(1)) })
      } else {
        blocks.push({ kind: 'quote', blocks: blocksOf(body) })
      }
      continue
    }

    const next = lines[i + 1]
    if (line.includes('|') && next !== undefined && TABLE_SEP.test(next) && next.includes('-')) {
      const header = splitRow(line)
      const align = splitRow(next).map(alignOf)
      const raw = [line, next]
      const rows: Inline[][][] = []
      i += 2
      while (i < lines.length && !isBlank(lines[i]!) && lines[i]!.includes('|')) {
        raw.push(lines[i]!)
        const cells = splitRow(lines[i]!)
        rows.push(header.map((_, c) => parseInlines(cells[c] ?? '')))
        i += 1
      }
      blocks.push({ kind: 'table', raw: raw.join('\n'), align, header: header.map(parseInlines), rows })
      continue
    }

    const item = LIST.exec(line)
    if (item) {
      const [list, after] = listAt(lines, i)
      blocks.push(list)
      i = after
      continue
    }

    // A paragraph: lines up to a blank or the start of another block; a
    // setext underline turns it into a heading.
    const body: string[] = [line.trim()]
    i += 1
    let level = 0
    while (i < lines.length) {
      const l = lines[i]!
      if (isBlank(l)) break
      if (/^ {0,3}=+\s*$/.test(l)) {
        level = 1
        i += 1
        break
      }
      if (/^ {0,3}-+\s*$/.test(l)) {
        level = 2
        i += 1
        break
      }
      if (startsBlock(l)) break
      body.push(l.trim())
      i += 1
    }
    const inlines = parseInlines(body.join('\n'))
    blocks.push(level > 0 ? { kind: 'heading', level, inlines } : { kind: 'para', inlines })
  }
  return blocks
}

const BORDERS = new Set(['round', 'single', 'double', 'bold', 'classic', 'singledouble', 'doublesingle'])

/** The list starting at line `start`, and the index of the line after it. */
function listAt(lines: readonly string[], start: number): [Block, number] {
  const first = LIST.exec(lines[start]!)!
  const ordered = /\d/.test(first[2]!)
  const baseIndent = indentOf(first[1]!)
  const items: ListItem[] = []
  let isLoose = false
  let i = start

  while (i < lines.length) {
    const m = LIST.exec(lines[i]!)
    if (!m || indentOf(m[1]!) !== baseIndent || /\d/.test(m[2]!) !== ordered) break
    const gap = m[3] ?? ' '
    const width = indentOf(m[1]!) + m[2]!.length + (gap.length > 4 ? 1 : Math.max(1, indentOf(gap)))
    const body: string[] = [m[4] ?? '']
    i += 1
    let sawBlank = false
    while (i < lines.length) {
      const l = lines[i]!
      if (isBlank(l)) {
        sawBlank = true
        body.push('')
        i += 1
        continue
      }
      if (indentOf(l) >= width) {
        body.push(dedent(l, width))
        sawBlank = false
        i += 1
        continue
      }
      // A line less indented than the item's content: a sibling, the end of
      // the list, or a lazy continuation of the item's last paragraph.
      if (!sawBlank && !startsBlock(l)) {
        body.push(l.trim())
        i += 1
        continue
      }
      break
    }
    while (body.length > 0 && isBlank(body[body.length - 1]!)) body.pop()
    if (sawBlank && i < lines.length && LIST.test(lines[i]!)) isLoose = true

    let task: boolean | null = null
    const box = /^\[([ xX])\][ \t]+/.exec(body[0] ?? '')
    if (box) {
      task = box[1] !== ' '
      body[0] = body[0]!.slice(box[0].length)
    }
    items.push({ task, blocks: blocksOf(body) })
  }

  const start0 = ordered ? Number(/\d+/.exec(first[2]!)![0]) : 1
  return [{ kind: 'list', ordered, start: start0, isLoose, items }, i]
}

// ---------------------------------------------------------------- inlines

type TagHead =
  | { kind: 'span'; style: Style }
  | { kind: 'grad'; stops: GradStops }
  | { kind: 'badge'; color?: string }

type TagSpec = (named: Record<string, string>, bare: string[]) => TagHead

const FLAGS: Record<string, keyof Style> = {
  bold: 'bold',
  b: 'bold',
  italic: 'italic',
  i: 'italic',
  underline: 'underline',
  u: 'underline',
  strike: 'strike',
  strikethrough: 'strike',
  s: 'strike',
  dim: 'dim',
  dimcolor: 'dim',
  inverse: 'inverse',
  inv: 'inverse',
}

const isTrue = (v: string | undefined) => v === undefined || !/^(false|0|no|off)$/i.test(v)

/** A `<t>` / `<Text>` tag's attributes as a Style, Ink's prop names and crayon's shorthands alike. */
function styleOf(named: Record<string, string>, bare: string[]): Style {
  const style: Style = {}
  for (const word of bare) {
    const flag = FLAGS[word.toLowerCase()]
    if (flag !== undefined) (style as Record<string, unknown>)[flag] = true
    else if (style.color === undefined) style.color = word
    else if (style.bg === undefined) style.bg = word
  }
  for (const [key, value] of Object.entries(named)) {
    if (key === 'color' || key === 'fg' || key === 'foreground') style.color = value
    else if (key === 'bg' || key === 'background' || key === 'backgroundcolor') style.bg = value
    else {
      const flag = FLAGS[key]
      if (flag !== undefined) (style as Record<string, unknown>)[flag] = isTrue(value)
    }
  }
  return style
}

const span = (style: Style): TagHead => ({ kind: 'span', style })

const STYLE_TAGS: Record<string, TagSpec> = {
  t: (n, b) => span(styleOf(n, b)),
  text: (n, b) => span(styleOf(n, b)),
  style: (n, b) => span(styleOf(n, b)),
  c: (n, b) => span(styleOf(n, b)),
  color: (n, b) => span(styleOf(n, b)),
  fg: (n, b) => span(styleOf(n, b)),
  bg: (n, b) => span({ ...styleOf(n, []), bg: n.color ?? b[0] }),
  b: () => span({ bold: true }),
  bold: () => span({ bold: true }),
  strong: () => span({ bold: true }),
  i: () => span({ italic: true }),
  em: () => span({ italic: true }),
  italic: () => span({ italic: true }),
  u: () => span({ underline: true }),
  underline: () => span({ underline: true }),
  ins: () => span({ underline: true }),
  s: () => span({ strike: true }),
  strike: () => span({ strike: true }),
  del: () => span({ strike: true }),
  dim: () => span({ dim: true }),
  faint: () => span({ dim: true }),
  inv: () => span({ inverse: true }),
  inverse: () => span({ inverse: true }),
  hl: (n, b) => span({ role: 'highlight', bg: n.color ?? b[0] }),
  mark: (n, b) => span({ role: 'highlight', bg: n.color ?? b[0] }),
  highlight: (n, b) => span({ role: 'highlight', bg: n.color ?? b[0] }),
  ok: () => span({ color: 'ok' }),
  success: () => span({ color: 'ok' }),
  warn: () => span({ color: 'warn' }),
  warning: () => span({ color: 'warn' }),
  err: () => span({ color: 'err' }),
  error: () => span({ color: 'err' }),
  info: () => span({ color: 'info' }),
  note: () => span({ color: 'info' }),
  accent: () => span({ color: 'accent' }),
  muted: () => span({ color: 'muted' }),
  c1: () => span({ color: 'c1' }),
  c2: () => span({ color: 'c2' }),
  c3: () => span({ color: 'c3' }),
  c4: () => span({ color: 'c4' }),
  c5: () => span({ color: 'c5' }),
  rainbow: () => ({ kind: 'grad', stops: 'rainbow' }),
  grad: (n, b) => ({ kind: 'grad', stops: gradStops(n, b) }),
  gradient: (n, b) => ({ kind: 'grad', stops: gradStops(n, b) }),
  badge: (n, b) => ({ kind: 'badge', color: n.color ?? n.bg ?? b[0] }),
  pill: (n, b) => ({ kind: 'badge', color: n.color ?? n.bg ?? b[0] }),
}

/** A `<grad>` tag's stops; none, or `theme=<name>`, takes a theme's own gradient. */
function gradStops(named: Record<string, string>, bare: string[]): GradStops {
  if (named.theme !== undefined) return { theme: named.theme }
  const stops = [named.from, ...bare, ...(named.via ? [named.via] : []), named.to].filter((s): s is string => !!s)
  return stops.length > 0 ? stops : {}
}

function tagSpec(name: string): TagSpec | undefined {
  const lower = name.toLowerCase()
  const spec = STYLE_TAGS[lower]
  if (spec !== undefined) return spec
  // A known color names a span of itself: `<orange>`, `<#ff8800>`.
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(name) || NAMED_COLORS[lower] !== undefined) {
    return (n, b) => span({ ...styleOf(n, b), color: name })
  }
  return undefined
}

/** Whether `<name …>` is one of crayon's tags (`kbd` and `br` included). */
export function isTag(name: string): boolean {
  const lower = name.toLowerCase()
  return lower === 'kbd' || lower === 'key' || lower === 'br' || tagSpec(name) !== undefined
}

const OPEN_TAG = /^<([a-zA-Z#][\w#-]*)((?:\s+[^<>]*?)?)\s*(\/?)>/
const CLOSE_TAG = /^<\/([a-zA-Z#][\w#-]*)?\s*>/
const URL_RE = /^https?:\/\/[^\s<>"'`]+/
const PUNCT = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/

/** The index past a code span opening at `i`, or -1 when it never closes. */
function codeSpanEnd(s: string, i: number): [number, number] {
  let n = 0
  while (s[i + n] === '`') n += 1
  let j = i + n
  while (j < s.length) {
    const k = s.indexOf('`'.repeat(n), j)
    if (k === -1) return [-1, n]
    let run = 0
    while (s[k + run] === '`') run += 1
    if (run === n) return [k, n]
    j = k + run
  }
  return [-1, n]
}

/** Where the close of the tag opened before `from` starts and ends; the string's end when it is never closed. */
function findClose(s: string, from: number, name: string): [number, number] {
  const stack: string[] = []
  let i = from
  while (i < s.length) {
    const c = s[i]
    if (c === '\\') {
      i += 2
      continue
    }
    if (c === '`') {
      const [end, n] = codeSpanEnd(s, i)
      i = end === -1 ? i + n : end + n
      continue
    }
    if (c === '<') {
      const rest = s.slice(i)
      const close = CLOSE_TAG.exec(rest)
      if (close) {
        const closing = close[1]?.toLowerCase()
        // Forgiving: any close tag of ours ends the innermost open tag, so a
        // mismatched `<magenta>x</cyan>` stops where it was meant to.
        const isOurs = closing === undefined || closing === name || isTag(closing)
        if (stack.length === 0 && isOurs) return [i, i + close[0].length]
        if (stack.length > 0 && isOurs) {
          const at = closing === undefined ? -1 : stack.lastIndexOf(closing)
          stack.length = at !== -1 ? at : stack.length - 1
        }
        i += close[0].length
        continue
      }
      const open = OPEN_TAG.exec(rest)
      if (open && isTag(open[1]!) && open[3] !== '/' && !/^(br|kbd|key)$/i.test(open[1]!)) {
        stack.push(open[1]!.toLowerCase())
        i += open[0].length
        continue
      }
    }
    i += 1
  }
  return [s.length, s.length]
}

/** The index of the delimiter run closing emphasis opened before `from`, or -1. */
function findEmphasisClose(s: string, from: number, delim: string): number {
  const ch = delim[0]!
  let i = from
  while (i < s.length) {
    const c = s[i]
    if (c === '\\') {
      i += 2
      continue
    }
    if (c === '`') {
      const [end, n] = codeSpanEnd(s, i)
      i = end === -1 ? i + n : end + n
      continue
    }
    if (c === ch) {
      let run = 0
      while (s[i + run] === ch) run += 1
      const before = s[i - 1] ?? ' '
      const after = s[i + run] ?? ' '
      const canClose = !/\s/.test(before) && (ch !== '_' || !/[\p{L}\p{N}]/u.test(after))
      if (canClose && run >= delim.length && (run === delim.length || run === 3 || delim.length === 3)) {
        // `***` closes `**` with a `*` left over and vice versa: take the matching part.
        return run > delim.length ? i + (run - delim.length) : i
      }
      i += run
      continue
    }
    i += 1
  }
  return -1
}

export function parseInlines(s: string): Inline[] {
  const out: Inline[] = []
  let buf = ''
  const flush = () => {
    if (buf !== '') {
      out.push({ kind: 'text', text: buf })
      buf = ''
    }
  }
  let i = 0
  while (i < s.length) {
    const c = s[i]!

    if (c === '\\' && i + 1 < s.length && PUNCT.test(s[i + 1]!)) {
      buf += s[i + 1]
      i += 2
      continue
    }

    if (c === '`') {
      const [end, n] = codeSpanEnd(s, i)
      if (end === -1) {
        buf += '`'.repeat(n)
        i += n
        continue
      }
      flush()
      let code = s.slice(i + n, end).replace(/\n/g, ' ')
      if (code.startsWith(' ') && code.endsWith(' ') && code.trim() !== '') code = code.slice(1, -1)
      out.push({ kind: 'code', text: code })
      i = end + n
      continue
    }

    if (c === '<') {
      const rest = s.slice(i)
      const auto = /^<(https?:\/\/[^\s<>]+)>/.exec(rest)
      if (auto) {
        flush()
        out.push({ kind: 'link', href: auto[1]!, children: [{ kind: 'text', text: auto[1]! }] })
        i += auto[0].length
        continue
      }
      const open = OPEN_TAG.exec(rest)
      if (open && isTag(open[1]!)) {
        const name = open[1]!.toLowerCase()
        const { named, bare } = parseAttrs(open[2] ?? '')
        const bodyStart = i + open[0].length
        if (name === 'br') {
          flush()
          out.push({ kind: 'br' })
          i = bodyStart
          continue
        }
        if (open[3] === '/') {
          i = bodyStart
          continue
        }
        const [closeStart, closeEnd] = findClose(s, bodyStart, name)
        const inner = s.slice(bodyStart, closeStart)
        flush()
        if (name === 'kbd' || name === 'key') {
          out.push({ kind: 'kbd', text: inner })
        } else {
          const spec = tagSpec(open[1]!)!
          out.push({ ...spec(named, bare), children: parseInlines(inner) })
        }
        i = closeEnd
        continue
      }
      // A stray close tag of ours draws as nothing.
      const close = CLOSE_TAG.exec(rest)
      if (close && (close[1] === undefined || isTag(close[1]))) {
        i += close[0].length
        continue
      }
    }

    if (c === '~' && s[i + 1] === '~' && s[i + 2] !== undefined && !/\s/.test(s[i + 2]!)) {
      const end = s.indexOf('~~', i + 2)
      if (end !== -1 && !/\s/.test(s[end - 1]!)) {
        flush()
        out.push({ kind: 'span', style: { strike: true, role: 'strike' }, children: parseInlines(s.slice(i + 2, end)) })
        i = end + 2
        continue
      }
    }

    if (c === '*' || c === '_') {
      let run = 0
      while (s[i + run] === c) run += 1
      const before = s[i - 1] ?? ' '
      const after = s[i + run] ?? ' '
      const canOpen = !/\s/.test(after) && (c !== '_' || !/[\p{L}\p{N}]/u.test(before))
      if (canOpen && run <= 3) {
        const delim = c.repeat(run)
        const end = findEmphasisClose(s, i + run, delim)
        if (end !== -1 && end > i + run) {
          flush()
          const children = parseInlines(s.slice(i + run, end))
          const style: Style =
            run === 1
              ? { italic: true, role: 'italic' }
              : run === 2
                ? { bold: true, role: 'bold' }
                : { bold: true, italic: true, role: 'bold' }
          out.push({ kind: 'span', style, children })
          i = end + run
          continue
        }
      }
      buf += c.repeat(run)
      i += run
      continue
    }

    if (c === '[' || (c === '!' && s[i + 1] === '[')) {
      const at = c === '!' ? i + 1 : i
      const link = linkAt(s, at)
      if (link) {
        flush()
        const children = parseInlines(link.text)
        if (c === '!') children.unshift({ kind: 'text', text: '🖼 ' })
        out.push({ kind: 'link', href: link.href, children })
        i = link.end
        continue
      }
    }

    if ((c === 'h' || c === 'H') && !/[\p{L}\p{N}]/u.test(s[i - 1] ?? ' ')) {
      const url = URL_RE.exec(s.slice(i))
      if (url) {
        const href = url[0].replace(/[).,;:!?\]]+$/, '')
        flush()
        out.push({ kind: 'link', href, children: [{ kind: 'text', text: href }] })
        i += href.length
        continue
      }
    }

    buf += c
    i += 1
  }
  flush()
  return out
}

function linkAt(s: string, i: number): { text: string; href: string; end: number } | undefined {
  let depth = 0
  let j = i
  for (; j < s.length; j += 1) {
    const c = s[j]
    if (c === '\\') {
      j += 1
      continue
    }
    if (c === '[') depth += 1
    if (c === ']') {
      depth -= 1
      if (depth === 0) break
    }
  }
  if (depth !== 0 || s[j + 1] !== '(') return undefined
  let k = j + 2
  let parens = 1
  for (; k < s.length; k += 1) {
    if (s[k] === '(') parens += 1
    if (s[k] === ')') {
      parens -= 1
      if (parens === 0) break
    }
  }
  if (parens !== 0) return undefined
  const target = s.slice(j + 2, k).trim()
  const href = (/^<([^>]*)>/.exec(target)?.[1] ?? target.split(/\s+/)[0] ?? '').trim()
  return { text: s.slice(i + 1, j), href, end: k + 1 }
}

/** The text an inline tree reads as, tags and markup gone. */
export function plainOf(nodes: readonly Inline[]): string {
  return nodes
    .map(n => {
      switch (n.kind) {
        case 'text':
        case 'code':
        case 'kbd':
          return n.text
        case 'br':
          return '\n'
        default:
          return plainOf(n.children)
      }
    })
    .join('')
}

/** Markdown with crayon's tags taken out, for the engine's own renderer. */
export function stripTags(text: string): string {
  return text.replace(/<\/\s*>/g, '').replace(/<\/?([a-zA-Z#][\w#-]*)(?:\s+[^<>]*?)?\s*\/?>/g, (whole, name: string) =>
    isTag(name) ? '' : whole,
  )
}

/**
 * Streamed lines with crayon's tags taken out, fences and code spans left
 * alone; `inFence` carries a fence open across flushes. Returns the lines,
 * whether a fence is still open after them, and each changed line by how it
 * now shows (trimmed) to how it was written.
 */
export function stripStreamed(delta: string, inFence: boolean): [string, boolean, Record<string, string>] {
  let isOpen = inFence
  const changed: Record<string, string> = {}
  const lines = delta.split('\n').map(line => {
    if (/^ {0,3}(`{3,}|~{3,})/.test(line)) {
      isOpen = !isOpen
      return line
    }
    if (isOpen) return line
    const shown = line
      .split(/(`+[^`]*`+)/)
      .map((part, k) => (k % 2 === 1 ? part : stripTags(part)))
      .join('')
    // A line of tags alone would show blank and could not be found again.
    if (shown === line || shown.trim() === '') return line
    changed[shown.trim()] = line
    return shown
  })
  return [lines.join('\n'), isOpen, changed]
}

/** The block's text with each line `stripStreamed` changed put back as written. */
export function restoreLines(text: string, written: Readonly<Record<string, string>>): string {
  return text
    .split('\n')
    .map(line => {
      const key = line.trim()
      return key !== '' && Object.hasOwn(written, key) ? written[key]! : line
    })
    .join('\n')
}
