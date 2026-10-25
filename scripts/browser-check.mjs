// End-to-end smoke check in real Chrome (playwright-core, channel "chrome").
//
//   node scripts/browser-check.mjs            builds, starts `vite preview` on :4174, checks it, stops it
//   node scripts/browser-check.mjs <url>      checks an already running copy (e.g. the live Pages URL)
//
// Needs internet: the instruments stream from public sample CDNs. Prints `PASS n/13` and exits 0 only
// when all 13 checks pass.
import { spawn, execSync } from 'node:child_process'
import { statSync } from 'node:fs'
import { chromium } from 'playwright-core'

const PORT = 4174
const given = process.argv[2]
const BASE = given ?? `http://127.0.0.1:${PORT}/`
const TOTAL = 13
const LOAD_MS = 30_000

const results = []
const pageErrors = []
let server = null

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

async function check(n, name, fn) {
  const t0 = Date.now()
  try {
    await fn()
    results.push({ n, name, ok: true })
    console.log(`ok   ${n}. ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`)
  } catch (e) {
    results.push({ n, name, ok: false })
    console.log(`FAIL ${n}. ${name}: ${String(e?.message ?? e).split('\n')[0]}`)
  }
}

async function startServer() {
  console.log('Building…')
  execSync('npm run build', { stdio: 'ignore' })
  console.log(`Starting vite preview on :${PORT}…`)
  server = spawn(`npx vite preview --port ${PORT} --strictPort --host 127.0.0.1`, { shell: true, stdio: 'ignore' })
  const until = Date.now() + 30_000
  while (Date.now() < until) {
    try {
      if ((await fetch(BASE)).ok) return
    } catch {
      // not up yet
    }
    await sleep(300)
  }
  throw new Error('vite preview did not start')
}

function stopServer() {
  if (!server || server.exitCode !== null) return
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' })
    } catch {
      // already gone
    }
  } else {
    server.kill('SIGTERM')
  }
}

function watch(page) {
  page.on('pageerror', (e) => pageErrors.push(e.message))
  return page
}

// ---- page helpers ----
const panelState = (page, layer) => page.locator(`#panel-${layer}`).getAttribute('data-state')
// Both ends matter: mirrored steps (e.g. 2 and 6) share the same x2.
const playhead = async (page) => {
  const line = page.locator('.rings-svg line')
  return `${await line.getAttribute('x2', { timeout: 2000 })},${await line.getAttribute('y2', { timeout: 2000 })}`
}
async function waitAllReady(page, timeout = LOAD_MS) {
  await page.waitForFunction(
    () => {
      const panels = [...document.querySelectorAll('.studio-panel')]
      return panels.length === 4 && panels.every((p) => p.dataset.state === 'ready')
    },
    null,
    { timeout },
  )
}
// The playhead line moves while the clock runs.
async function assertAdvancing(page) {
  const seen = new Set()
  for (let i = 0; i < 4; i++) {
    seen.add(await playhead(page))
    await sleep(230)
  }
  assert(seen.size >= 3, `playhead did not move (${[...seen].join(' | ')})`)
}
const filledBeats = (page) =>
  page.$$eval('select[aria-label^="Beat "]', (els) => els.filter((e) => e.value !== '').map((e) => `${e.getAttribute('aria-label')}=${e.value}`))
const onCount = (page, ring) => page.getByRole('button', { name: new RegExp(`^${ring} step \\d+, on$`) }).count()

// Visible song state, read the same way on both pages for the Share check.
async function visibleSong(page) {
  return page.evaluate(() => ({
    tempo: document.querySelector('.playbar-field output')?.textContent,
    key: document.querySelector('select[aria-label="Key"]')?.value,
    chords: [...document.querySelectorAll('#panel-chords .lp-bar b')].map((b) => b.textContent),
    rhythm: document.querySelector('[aria-label="Chord rhythm"] [aria-pressed="true"]')?.textContent,
    bass: document.querySelector('[aria-label="Bass style"] [aria-pressed="true"]')?.textContent,
    kit: document.querySelector('select[aria-label="Drum kit"]')?.value,
    instruments: [...document.querySelectorAll('select[aria-label="Instrument"]')].map((s) => s.value),
    dots: [...document.querySelectorAll('.rings-dot')].map((d) => d.getAttribute('aria-pressed')).join(''),
    melody: [...document.querySelectorAll('select[aria-label^="Beat "]')].map((s) => s.value).join(','),
  }))
}

async function main() {
  if (!given) await startServer()
  const browser = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] })
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true })
    const page = watch(await ctx.newPage())
    let hash = ''

    await check(1, 'Home renders', async () => {
      await page.goto(BASE)
      await page.getByRole('heading', { name: 'Beatmaker 2', level: 1 }).waitFor({ timeout: 10_000 })
      assert(await page.getByRole('button', { name: 'Start' }).isVisible(), 'no Learn button')
      assert(await page.getByRole('button', { name: 'Open studio' }).isVisible(), 'no Open studio button')
    })

    await check(2, 'Studio loads all four layers within 30 s', async () => {
      await page.getByRole('button', { name: 'Open studio' }).click()
      await page.getByRole('heading', { name: 'Melody' }).waitFor()
      await page.getByRole('button', { name: 'Play' }).click()
      await waitAllReady(page)
      await page.getByText('All instruments ready').waitFor({ timeout: 2000 })
    })

    await check(3, 'Play / Stop', async () => {
      await page.getByRole('button', { name: 'Stop' }).waitFor({ timeout: 2000 })
      await assertAdvancing(page)
      await page.getByRole('button', { name: 'Stop' }).click()
      await page.getByRole('button', { name: 'Play' }).waitFor({ timeout: 2000 })
      assert((await page.locator('.rings-svg line').count()) === 0, 'playhead still shown after Stop')
    })

    await check(4, 'Kick hits change', async () => {
      await page.getByLabel('Kick hits').fill('6')
      await page.getByText('hits 6').waitFor({ timeout: 2000 })
      const n = await onCount(page, 'Kick')
      assert(n === 6, `expected 6 kick dots on, got ${n}`)
    })

    await check(5, 'A chord pick', async () => {
      await page.locator('#panel-chords .lp-bar').nth(1).click()
      await page.getByRole('button', { name: /^Dm / }).click()
      const name = await page.locator('#panel-chords .lp-bar b').nth(1).textContent()
      assert(name === 'Dm', `bar 2 shows ${name}`)
    })

    await check(6, 'Bass style', async () => {
      await page.getByRole('button', { name: 'Walking' }).click()
      assert((await page.getByRole('button', { name: 'Walking' }).getAttribute('aria-pressed')) === 'true', 'Walking not pressed')
    })

    await check(7, 'A melody stroke', async () => {
      await page.getByRole('button', { name: 'Clear' }).click()
      assert((await filledBeats(page)).length === 0, 'Clear left notes')
      const box = await page.locator('.lp-canvas').boundingBox()
      await page.mouse.move(box.x + box.width * 0.05, box.y + box.height * 0.7)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5, { steps: 8 })
      await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.3, { steps: 8 })
      await page.mouse.up()
      const beats = await filledBeats(page)
      assert(beats.length >= 5, `stroke wrote ${beats.length} notes`)
    })

    await check(8, 'Instrument switch while playing', async () => {
      await page.getByRole('button', { name: 'Play' }).click()
      await page.getByRole('button', { name: 'Stop' }).waitFor({ timeout: 2000 })
      const sel = page.locator('#panel-melody select[aria-label="Instrument"]')
      const cur = await sel.inputValue()
      const values = await sel.locator('option').evaluateAll((os) => os.map((o) => o.value))
      const next = values.includes('vibraphone') && cur !== 'vibraphone' ? 'vibraphone' : values.find((v) => v !== cur)
      await sel.selectOption(next)
      // A cached sample can be ready at once, so the loading state is optional.
      await page.waitForFunction(() => document.querySelector('#panel-melody').dataset.state !== 'ready', null, { timeout: 3000 }).catch(() => {})
      await waitAllReady(page)
      assert((await sel.inputValue()) === next, 'instrument did not stick')
      await page.getByRole('button', { name: 'Stop' }).waitFor({ timeout: 1000 })
      await assertAdvancing(page)
      assert((await panelState(page, 'melody')) === 'ready', 'melody not ready')
      await page.getByRole('button', { name: 'Stop' }).click()
    })

    await check(9, 'Share link round-trips in a new page', async () => {
      await page.getByLabel('Tempo').fill('118')
      await page.locator('#panel-chords').getByRole('button', { name: 'Strum' }).click()
      await page.getByRole('button', { name: 'Share' }).click()
      hash = await page.evaluate(() => location.hash)
      assert(hash.length > 10, 'no song in the URL hash')
      const before = await visibleSong(page)
      assert(before.tempo === '118' && before.chords[1] === 'Dm' && before.bass === 'Walking', 'edits not visible before sharing')
      // A fresh context: no shared localStorage, so the song can only come from the link.
      const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } })
      const p2 = watch(await ctx2.newPage())
      await p2.goto(BASE + hash)
      await p2.getByRole('heading', { name: 'Melody' }).waitFor({ timeout: 10_000 })
      const after = await visibleSong(p2)
      // The app re-encodes the decoded song into the hash, so equal hashes mean an equal song.
      const hash2 = await p2.evaluate(() => location.hash)
      await ctx2.close()
      assert(JSON.stringify(after) === JSON.stringify(before), `songs differ:\n${JSON.stringify(before)}\n${JSON.stringify(after)}`)
      assert(hash2 === hash, 're-encoded hash differs')
    })

    await check(10, 'Save WAV download is at least 1 MB', async () => {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 90_000 }),
        page.getByRole('button', { name: 'Save WAV' }).click(),
      ])
      const file = await download.path()
      const size = statSync(file).size
      assert(download.suggestedFilename().endsWith('.wav'), `file is ${download.suggestedFilename()}`)
      assert(size >= 1024 * 1024, `WAV is only ${size} bytes`)
    })
    await ctx.close()

    await check(11, 'At 375 px the tablist works with no horizontal overflow', async () => {
      const c = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })
      const p = watch(await c.newPage())
      try {
        await p.goto(BASE)
        await p.getByRole('button', { name: 'Open studio' }).click()
        const tabs = p.getByRole('tab')
        assert((await tabs.count()) === 4, 'expected 4 tabs')
        const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        for (const name of ['Chords', 'Bass', 'Melody', 'Drums']) {
          await p.getByRole('tab', { name }).tap()
          await p.getByRole('heading', { name }).waitFor({ timeout: 2000 })
          assert((await p.getByRole('tab', { name }).getAttribute('aria-selected')) === 'true', `${name} not selected`)
          const box = await p.getByRole('tab', { name }).boundingBox()
          assert(box.height >= 44 && box.width >= 44, `${name} tab is ${box.width}x${box.height}`)
          const o = await overflow()
          assert(o <= 0, `${name} tab overflows by ${o}px`)
        }
        await p.getByRole('tab', { name: 'Drums' }).focus()
        await p.keyboard.press('ArrowRight')
        assert((await p.getByRole('tab', { name: 'Chords' }).getAttribute('aria-selected')) === 'true', 'ArrowRight did not move to Chords')
      } finally {
        await c.close()
      }
    })

    await check(12, 'Learn levels 1 and 2 completed through the UI', async () => {
      const c = await browser.newContext({ viewport: { width: 1280, height: 900 } })
      const p = watch(await c.newPage())
      try {
        await p.goto(BASE)
        await p.getByRole('button', { name: 'Start' }).click()
        await p.getByRole('button', { name: 'Level 1, current' }).click()
        await p.getByLabel('Kick hits').fill('4')
        const done = p.getByRole('region', { name: 'Level complete' })
        await done.waitFor({ timeout: 3000 })
        await done.getByRole('button', { name: /Next level/ }).click()

        await p.getByRole('button', { name: 'Level 2, current' }).click()
        await p.getByRole('button', { name: 'Snare step 5, off' }).click()
        await p.getByRole('button', { name: 'Snare step 13, off' }).click()
        await done.waitFor({ timeout: 3000 })
        await done.getByRole('button', { name: /Next level/ }).click()

        await p.getByRole('button', { name: 'Level 3, current' }).waitFor({ timeout: 3000 })
        assert(await p.getByRole('button', { name: /^Level 1, Heartbeat, \d stars?$/ }).isVisible(), 'level 1 has no stars')
        assert(await p.getByRole('button', { name: /^Level 2, Clap back, \d stars?$/ }).isVisible(), 'level 2 has no stars')
        const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('bm2.progress')))
        assert(saved?.stars?.[1] >= 1 && saved?.stars?.[2] >= 1 && saved.current === 3, `progress not saved: ${JSON.stringify(saved)}`)
      } finally {
        await c.close()
      }
    })

    await check(13, 'Zero page errors', async () => {
      assert(pageErrors.length === 0, `${pageErrors.length} page error(s): ${pageErrors.slice(0, 3).join(' | ')}`)
    })
  } finally {
    await browser.close()
  }
}

let crashed = null
try {
  await main()
} catch (e) {
  crashed = e
  console.error('browser-check crashed:', e?.message ?? e)
} finally {
  stopServer()
}
const passed = results.filter((r) => r.ok).length
console.log(`PASS ${passed}/${TOTAL}`)
process.exit(!crashed && passed === TOTAL ? 0 : 1)
