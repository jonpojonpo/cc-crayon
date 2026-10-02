import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderElement } from 'claude-code'

import type { CrayonPrefs } from '../types'
import { type Block, parseBlocks, restoreLines, stripStreamed } from './parse'
import { type Ctx, blocks } from './render'
import { DEMO, GUIDE } from './text'
import { THEMES, THEME_NAMES, paletteFor } from './themes'

const DEFAULTS: CrayonPrefs = { isEnabled: true, isTeaching: true, theme: 'crayon', background: 'auto' }
const prefs = atom({ plugin: 'crayon', key: 'prefs' } as const, DEFAULTS)
const isLightTheme = atom({ plugin: 'crayon', key: 'isLightTheme' } as const, false)
const written = atom({ plugin: 'crayon', key: 'lines' } as const, {})

/** How many restored lines the session keeps; the oldest go first. */
const MAX_LINES = 3000

/** Replies longer than this are left to the engine: a tree has a size bound. */
const MAX_TEXT = 30000

const parsed = new Map<string, Block[]>()

/** The text's blocks, kept for the redraws a scroll or resize asks for. */
function parse(text: string): Block[] {
  const hit = parsed.get(text)
  if (hit !== undefined) return hit
  const result = parseBlocks(text)
  if (parsed.size > 300) parsed.delete(parsed.keys().next().value!)
  parsed.set(text, result)
  return result
}

function usage(p: CrayonPrefs, isLight: boolean): string {
  const themes = THEME_NAMES.map(name => {
    const stops = THEMES[name]!.title
    const label = name === p.theme ? `**${name}**` : name
    return stops.length > 1 ? `<grad from="${stops[0]}" to="${stops[stops.length - 1]}">${label}</grad>` : label
  }).join(' · ')
  const background = p.background === 'auto' ? `auto (${isLight ? 'light' : 'dark'})` : p.background
  return [
    `crayon is ${p.isEnabled ? '<ok>on</ok>' : '<err>off</err>'} · theme **${p.theme}** · background ${background} · teaching the model ${p.isTeaching ? '<ok>on</ok>' : '<muted>off</muted>'}`,
    '',
    `Themes: ${themes}`,
    '',
    '`/crayon on|off` · `/crayon <theme>` · `/crayon dark|light|auto` · `/crayon teach on|off` · `/crayon demo`',
  ].join('\n')
}

async function loadLight($: EngineInterface): Promise<void> {
  const rows = await $.config.list()
  const theme = rows.find(row => row.key === 'theme')
  await update($, isLightTheme, () => /light/i.test(String(theme?.value ?? '')))
}

/** The saved prefs and the /config theme, read into the session's state. */
async function hydrate($: EngineInterface): Promise<void> {
  const stored = (await $.store.get('prefs')) as Partial<CrayonPrefs> | undefined
  if (stored !== undefined) await update($, prefs, () => ({ ...DEFAULTS, ...stored }))
  await loadLight($).catch(() => undefined)
}

/** The surface's elements and the palette in force, or undefined while crayon is off. */
async function contextFor(
  $: EngineInterface,
  t: Ctx['t'],
  columns: number | undefined,
): Promise<Ctx | undefined> {
  const p = await read($, prefs)
  if (!p.isEnabled) return undefined
  const isLight = p.background === 'auto' ? await read($, isLightTheme) : p.background === 'light'
  return { t, p: paletteFor(p.theme, isLight), isLight, width: Math.max(20, columns ?? 80), listDepth: 0, isQuoted: false }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await hydrate($)
    await $.command.register({
      name: 'crayon',
      description: 'Colorful replies: switch on or off, pick a theme, show a demo',
      argumentHint: '[on|off|demo|<theme>|dark|light|auto|teach on|off]',
    })
    return next(e)
  })

  // `/clear` (and a resume or fork) goes on under a new session whose state
  // starts empty, and no `session.start` fires for it: read the prefs again.
  on('classic.SessionStart', async ($, e, next) => {
    const result = await next(e)
    await hydrate($).catch(() => undefined)
    return result
  })

  on('config.set', { key: 'theme' }, async ($, e, next) => {
    const result = await next(e)
    await loadLight($).catch(() => undefined)
    return result
  })

  on('prompt.compose', async ($, e, next) => {
    const result = await next(e)
    const p = await read($, prefs)
    const isDrawn = e.surfaces.length > 0 && !e.traits.includes('bare') && !e.traits.includes('print')
    if (!p.isEnabled || !p.isTeaching || !isDrawn) return result
    return { sections: [...result.sections, { id: 'crayon:guide', text: GUIDE, scope: 'session' as const }] }
  })

  on('command.run', { command: 'crayon' }, async ($, e) => {
    const words = e.args.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const [first, second] = words
    const set = async (change: Partial<CrayonPrefs>) => {
      const value = await update($, prefs, p => ({ ...p, ...change }))
      await $.store.set('prefs', value)
      return value
    }

    if (first === 'demo') {
      return { text: DEMO }
    }
    if (first === 'on' || first === 'off') {
      await set({ isEnabled: first === 'on' })
    } else if (first === 'teach' && (second === 'on' || second === 'off')) {
      await set({ isTeaching: second === 'on' })
    } else if (first === 'dark' || first === 'light' || first === 'auto') {
      await set({ background: first })
    } else if (first === 'theme' && second !== undefined && THEMES[second] !== undefined) {
      await set({ theme: second, isEnabled: true })
    } else if (first !== undefined && THEMES[first] !== undefined) {
      await set({ theme: first, isEnabled: true })
    } else if (first !== undefined) {
      return { text: `Unknown option \`${e.args.trim()}\`.\n\n${usage(await read($, prefs), await read($, isLightTheme))}` }
    }
    return { text: usage(await read($, prefs), await read($, isLightTheme)) }
  })

  // While a reply streams the engine draws it line by line with its own
  // renderer; take the tags out there so they never flash, and let the
  // finished block draw through crayon.
  // The engine hands AssistantMessage the text as shown, so each line taken
  // apart here is remembered and put back before the finished block parses.
  const streams = new Map<string, { inFence: boolean; changed: Record<string, string> }>()
  on('classic.MessageDisplay', async ($, e, next) => {
    const result = await next(e)
    const p = await read($, prefs)
    if (!p.isEnabled) return result
    const stream = streams.get(e.message_id) ?? { inFence: false, changed: {} }
    const [text, inFence, changed] = stripStreamed(result.displayContent ?? e.delta, stream.inFence)
    stream.inFence = inFence
    Object.assign(stream.changed, changed)
    if (!e.final) {
      // A reply interrupted mid-stream never sends its final delta.
      if (!streams.has(e.message_id) && streams.size >= 50) streams.delete(streams.keys().next().value!)
      streams.set(e.message_id, stream)
    } else {
      streams.delete(e.message_id)
      if (Object.keys(stream.changed).length > 0) {
        await update($, written, lines => {
          const merged = Object.entries({ ...lines, ...stream.changed })
          return Object.fromEntries(merged.slice(-MAX_LINES))
        })
      }
    }
    return { ...result, displayContent: text }
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.props.text.length > MAX_TEXT) return next(e)
    const ctx = await contextFor($, $.ui.resolve(e), e.viewport?.columns)
    if (ctx === undefined) return next(e)
    const text = restoreLines(e.props.text, await read($, written))
    const { Box, Text } = ctx.t
    const tree: RenderElement = (
      <Box flexDirection="row">
        <Box width={2} flexShrink={0}>
          <Text color={ctx.p.dot}>{e.props.isFirstOfReply ? '⏺' : ' '}</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1} flexShrink={1}>
          {blocks(parse(text), { ...ctx, width: ctx.width - 2 })}
        </Box>
      </Box>
    )
    return tree
  })

  on('ui.render', { component: 'CommandOutput', props: { command: 'crayon' } }, async ($, e, next) => {
    if (e.props.isErrored) return next(e)
    const ctx = (await contextFor($, $.ui.resolve(e), e.viewport?.columns)) ?? {
      t: $.ui.resolve(e),
      p: paletteFor('crayon', await read($, isLightTheme)),
      isLight: await read($, isLightTheme),
      width: Math.max(20, e.viewport?.columns ?? 80),
      listDepth: 0,
      isQuoted: false,
    }
    const { Box } = ctx.t
    return (
      <Box flexDirection="column" paddingLeft={2}>
        {blocks(parse(e.props.text.replace(/^crayon:\s*/, '')), { ...ctx, width: ctx.width - 2 })}
      </Box>
    )
  })
}
