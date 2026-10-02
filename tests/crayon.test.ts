import { describe, expect, mock, test } from 'claude-code/testing'

import { parseBlocks, parseInlines, plainOf, restoreLines, stripStreamed, stripTags } from '../hooks/parse'
import { DEMO } from '../hooks/text'
import { THEMES, forLight } from '../hooks/themes'

const SURFACES = ['terminal', 'desktop', 'vscode', 'mobile'] as const

const MODEL = { model: 'claude-opus-5-5', promptModel: 'claude-opus-5-5', tools: [], outputStyle: null, traits: [] }

const reply = (text: string) => ({ text, isFirstOfReply: true })

describe('parse', () => {
  test('markdown emphasis and code', async () => {
    const nodes = parseInlines('a **bold** and *it* with `x*y` and snake_case_name')
    expect(nodes.map(n => n.kind)).toEqual(['text', 'span', 'text', 'span', 'text', 'code', 'text'])
    expect(plainOf(nodes)).toBe('a bold and it with x*y and snake_case_name')
  })

  test('tags nest, close by name or </>, and take Ink props', async () => {
    const [node] = parseInlines('<t color="#ff8800" bold>hi <i>there</></t>')
    expect(node).toMatchObject({ kind: 'span', style: { color: '#ff8800', bold: true } })
    const [ink] = parseInlines('<Text color="cyan" italic={true} underline={false}>x</Text>')
    expect(ink).toMatchObject({ kind: 'span', style: { color: 'cyan', italic: true, underline: false } })
    const [short] = parseInlines('<t red bold>x</t>')
    expect(short).toMatchObject({ style: { color: 'red', bold: true } })
    const [color] = parseInlines('<orange>x</orange>')
    expect(color).toMatchObject({ style: { color: 'orange' } })
  })

  test('unknown tags and tags inside code stay literal', async () => {
    expect(plainOf(parseInlines('a <div>b</div> `<red>c</red>`'))).toBe('a <div>b</div> <red>c</red>')
  })

  test('an unclosed tag runs to the end instead of showing raw', async () => {
    expect(plainOf(parseInlines('<ok>passed'))).toBe('passed')
  })

  test('blocks: headings, lists, tasks, tables, callouts, panels, fences', async () => {
    const kinds = parseBlocks(DEMO).map(b => b.kind)
    expect(kinds).toEqual([
      'heading',
      'para',
      'heading',
      'list',
      'heading',
      'list',
      'list',
      'table',
      'callout',
      'quote',
      'panel',
      'code',
      'hr',
    ])
    const [list] = parseBlocks('1. one\n2. two\n   - nested\n')
    expect(list).toMatchObject({ kind: 'list', ordered: true, items: [{}, { blocks: [{ kind: 'para' }, { kind: 'list' }] }] })
  })

  test('a mismatched close ends the tag it was meant for', async () => {
    const nodes = parseInlines('<cyan>a</cyan>, <magenta>b</cyan>, and <orange>c</orange>')
    expect(nodes.map(n => n.kind)).toEqual(['span', 'text', 'span', 'text', 'span'])
    expect(plainOf(nodes)).toBe('a, b, and c')
  })

  test('streamed lines lose their tags outside code only', async () => {
    const [first, isOpen] = stripStreamed('<ok>done</ok> `<b>`\n```html', false)
    expect(first).toBe('done `<b>`\n```html')
    expect(isOpen).toBe(true)
    const [second, isStill] = stripStreamed('<b>kept</b>\n```\n<i>gone</i>', isOpen)
    expect(second).toBe('<b>kept</b>\n```\ngone')
    expect(isStill).toBe(false)
  })

  test('the finished block gets back what streaming took out', async () => {
    const raw = '## <t cyan bold>Cirrus</t>\n<badge teal>35,000 ft</badge>\n</t>\nplain'
    const [shown, , changed] = stripStreamed(raw, false)
    expect(shown).toBe('## Cirrus\n35,000 ft\n</t>\nplain')
    expect(restoreLines(shown, changed)).toBe(raw)
  })

  test('stripTags leaves markdown and unknown tags', async () => {
    expect(stripTags('| <ok>a</ok> | <div>b</div> | <t red>c</> |')).toBe('| a | <div>b</div> | c |')
  })
})

describe('render', () => {
  test('the demo draws on every surface', async $ => {
    for (const surface of SURFACES) {
      const ui = await $.ui.mount({
        plugin: 'crayon',
        surface,
        component: 'AssistantMessage',
        props: reply(DEMO),
        viewport: { columns: 100, rows: 40 },
      })
      expect(await ui.find({ type: 'Text', text: 'Ink Text props' })).toBeDefined()
      expect(await ui.find({ type: 'Code' })).toBeDefined()
      await ui.unmount()
    }
  })

  test('tag colors land on Text props', async $ => {
    const ui = await $.ui.mount({
      plugin: 'crayon',
      surface: 'terminal',
      component: 'AssistantMessage',
      props: reply('<t color="#ff8800" bold>orange</t> and <ok>fine</ok>'),
    })
    const orange = await ui.find({ type: 'Text', text: /^orange$/ })
    expect(orange?.props).toMatchObject({ color: '#ff8800', bold: true })
    const fine = await ui.find({ type: 'Text', text: /^fine$/ })
    expect(typeof fine?.props.color).toBe('string')
    await ui.unmount()
  })

  test('awkward input still draws', async $ => {
    const nasty = [
      '\x1b[31mansi\x1b[0m and \ttabs\r\n',
      '[bad link](javascript:alert(1)) [mail](https://a@b.com) <https://example.com/x y>',
      '| a | b |\n|---|---|\n| ' + 'x'.repeat(300) + ' | y |',
      '```\n\n```',
      '<grad>' + '★'.repeat(500) + '</grad>',
      '<badge nope>?</badge> <t color="rgb(999,0,0)">z</t> <bg>q</bg>',
      '#',
      '- [ ] \n- [x]',
      '> [!WARNING]\n',
      '<panel>\nunclosed',
    ].join('\n\n')
    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ plugin: 'crayon', surface, component: 'AssistantMessage', props: reply(nasty) })
      await ui.drawn()
      await ui.unmount()
    }
  })
})

describe('prompt', () => {
  test('the guide joins the system prompt where something draws', async ($, on) => {
    on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'You are Claude.', scope: 'shared' }] }))
    const drawn = await $.prompt.compose({ ...MODEL, surfaces: ['terminal'] })
    expect(drawn.sections.map(s => s.id)).toEqual(['intro', 'crayon:guide'])
    const headless = await $.prompt.compose({ ...MODEL, surfaces: [] })
    expect(headless.sections.some(s => s.id === 'crayon:guide')).toBe(false)
  })
})

describe('prefs', () => {
  test('saved prefs come back after /clear, which starts the session state over', async ($, on) => {
    mock.store(on, { prefs: { isEnabled: true, isTeaching: true, theme: 'synthwave', background: 'dark' } })
    on('classic.SessionStart', () => ({}))
    const h3Color = async () => {
      const ui = await $.ui.mount({ plugin: 'crayon', surface: 'terminal', component: 'AssistantMessage', props: reply('### Clouds') })
      const color = (await ui.find({ type: 'Text', text: /^Clouds$/ }))?.props.color
      await ui.unmount()
      return color
    }
    expect(await h3Color()).toBe(THEMES.crayon!.h3)
    await $.classic.SessionStart({ source: 'clear' })
    expect(await h3Color()).toBe(THEMES.synthwave!.h3)
  })

  test('a light /config theme switches to the light palette, and the change goes on untouched', async ($, on) => {
    mock.store(on)
    const seen: unknown[] = []
    on('config.set', ($, e) => {
      seen.push(e.value)
      return { value: e.value }
    })
    const h3Color = async () => {
      const ui = await $.ui.mount({ plugin: 'crayon', surface: 'terminal', component: 'AssistantMessage', props: reply('### Clouds') })
      const color = (await ui.find({ type: 'Text', text: /^Clouds$/ }))?.props.color
      await ui.unmount()
      return color
    }
    expect(await h3Color()).toBe(THEMES.crayon!.h3)
    await $.config.set({
      key: 'theme',
      value: 'light',
      previous: 'dark',
      provider: { plugin: 'engine', tier: 'core' },
      origin: { kind: 'composer' },
    })
    expect(seen).toEqual(['light'])
    expect(await h3Color()).toBe(forLight(THEMES.crayon!.h3))
  })
})
