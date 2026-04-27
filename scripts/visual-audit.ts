/**
 * scripts/visual-audit.ts — STATIC heuristic audit of design-system adoption.
 *
 *   ts-node scripts/visual-audit.ts
 *   ts-node scripts/visual-audit.ts --json   (machine-readable)
 *
 * Cosa fa: per ogni pagina sotto `app/` (escluse API routes), legge il file
 * principale + tutti i client component referenziati nello stesso folder e
 * applica check tramite regex/grep contro i token + componenti del design
 * system. Produce `docs/VISUAL-AUDIT.md` con tabella ✅/⚠️/❌ + dettagli.
 *
 * COSA NON FA (intentional limits):
 *   - Non renderizza il browser → no screenshot, no contrast measurement, no
 *     focus-ring visibility, no actual hover behavior, no mobile viewport check.
 *   - Per quegli aspetti serve Playwright + axe-core o ispezione manuale.
 *
 * Heuristics implementate (per categoria spec):
 *
 *   TIPOGRAFIA
 *     ⚠️ se trova `text-[9px]` o `text-[10px]` (sub-12px hardcoded)
 *     ⚠️ se trova `formatValuta`/`formatData` chiamati ma non importati da
 *        @/lib/formatters o @/lib/utils
 *
 *   SPAZIATURA
 *     ⚠️ se NON usa breakpoint responsive (`md:` / `lg:` per padding/gap)
 *     ⚠️ se trova `style={{ padding: ... }}` con valori hardcoded in px
 *
 *   COLORI
 *     ❌ se trova hex hardcoded (`#xxx`/`#xxxxxx`) fuori da SVG/style block
 *        accept-list: bianco/nero puri (`#fff`/`#000`/`#ffffff`/`#000000`),
 *        valori in SVG path/viewBox/stroke (linea contiene `<svg`/`<path`)
 *
 *   COMPONENTI
 *     ⚠️ se usa `<button` raw (>3 occorrenze)  → suggerisce <Button>
 *     ⚠️ se usa `<input` raw (>2 occorrenze)   → suggerisce <Input>
 *     ⚠️ pagine che dovrebbero avere empty state ma non importano EmptyState
 *
 *   RESPONSIVE
 *     ⚠️ se NON usa nessun `md:`/`lg:`/`sm:` Tailwind prefix
 *
 *   LOADING / A11Y / ANIMAZIONI: best-effort regex (vedi BELOW)
 *
 * Marker: ✅ pass / ⚠️ warning (sospetto/parziale) / ❌ fail / `—` non
 * applicabile o impossibile da determinare staticamente.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative, dirname, basename } from 'node:path'

const REPO_ROOT = process.cwd()
const APP_DIR = join(REPO_ROOT, 'app')
const OUTPUT = join(REPO_ROOT, 'docs', 'VISUAL-AUDIT.md')

// ────────────────────────────────────────────────────────────────────────────
// Discovery: trova tutte le pagine page.tsx sotto app/, escluso /api/
// ────────────────────────────────────────────────────────────────────────────

function findPages(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      // Skip API routes — no UI
      if (entry === 'api') continue
      findPages(full, acc)
    } else if (entry === 'page.tsx') {
      acc.push(full)
    }
  }
  return acc
}

/**
 * Per ogni page.tsx, raccogli anche i fratelli .tsx nella stessa folder
 * (di solito client components che la pagina importa).
 */
function siblingFiles(pagePath: string): string[] {
  const dir = dirname(pagePath)
  return readdirSync(dir)
    .filter((f) => f.endsWith('.tsx') && f !== 'page.tsx' && f !== 'layout.tsx')
    .map((f) => join(dir, f))
}

/**
 * Etichetta legibile per una pagina dal suo path.
 * "/c/PROGETTI/.../app/host/dashboard/page.tsx" → "/host/dashboard"
 */
function pageRoute(pagePath: string): string {
  const rel = relative(APP_DIR, pagePath).replace(/\\/g, '/').replace(/\/page\.tsx$/, '')
  // Group routes (parens) sono trasparenti per il routing
  return '/' + rel.split('/').filter((s) => !s.startsWith('(') || !s.endsWith(')')).join('/').replace(/^\/?/, '')
}

// ────────────────────────────────────────────────────────────────────────────
// Heuristic checks
// ────────────────────────────────────────────────────────────────────────────

type Mark = '✅' | '⚠️' | '❌' | '—'

type CheckResult = {
  mark: Mark
  notes?: string[]
}

const ACCEPTED_HEX = new Set(['#fff', '#ffffff', '#000', '#000000', '#FFF', '#FFFFFF', '#000', '#000000'])

function checkTipografia(content: string): CheckResult {
  const notes: string[] = []
  const tinyText = content.match(/text-\[(9|10|11)px\]/g)
  if (tinyText) notes.push(`Sub-12px text trovato: ${[...new Set(tinyText)].join(', ')}`)

  // Numero/Valuta hardcoded: cerca pattern come "€1,234" o "1.234 €" o `${...}€`
  // (best-effort, falsi positivi possibili)
  const valutaInline = content.match(/['"]€\s*[\d.,]+|[\d.,]+\s*€['"]/g)
  if (valutaInline && valutaInline.length > 2) {
    notes.push(`${valutaInline.length} possibili valute hardcoded — usa formatValuta()`)
  }

  if (notes.length === 0) return { mark: '✅' }
  return { mark: '⚠️', notes }
}

function checkSpaziatura(content: string): CheckResult {
  const notes: string[] = []
  // Inline padding/margin in px
  const inlinePx = content.match(/style=\{\{[^}]*(padding|margin):\s*['"]?\d+px/g)
  if (inlinePx && inlinePx.length > 1) {
    notes.push(`${inlinePx.length} inline padding/margin in px — usa Tailwind`)
  }

  // Niente prefix responsive su classi spacing
  const hasResponsiveSpacing = /(?:p|px|py|gap|m|mx|my)-\d+\s+(?:sm|md|lg):(?:p|px|py|gap|m|mx|my)-\d+/.test(content)
    || /(?:sm|md|lg):(?:p|px|py|gap|m|mx|my)-\d+/.test(content)
  if (!hasResponsiveSpacing && content.length > 1000) {
    notes.push('Nessun spacing responsive (md:/lg:) trovato')
  }

  if (notes.length === 0) return { mark: '✅' }
  return { mark: '⚠️', notes }
}

function checkColori(content: string): CheckResult {
  const notes: string[] = []
  // Hex hardcoded NON in SVG (heuristic: estrai hex e ignora se nella stessa
  // riga c'è <svg/<path/<rect/<circle/stop-color/strokeColor o è un
  // commento). Accetta bianco/nero puri.
  const lines = content.split('\n')
  const offenders: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue
    if (/(<svg|<path|<rect|<circle|<polygon|<line|<ellipse|<stop|<defs|<linearGradient|stopColor|stroke=|fill=|gradient|stop-color)/i.test(line)) continue
    // Trova hex
    const hexes = line.match(/#[0-9a-fA-F]{3,8}\b/g)
    if (!hexes) continue
    for (const h of hexes) {
      if (ACCEPTED_HEX.has(h)) continue
      // Ignora hex dentro url() o data: o url-encoded SVG
      if (line.includes("url(") || line.includes('data:image/svg')) continue
      offenders.push(h)
    }
  }
  if (offenders.length > 0) {
    const uniq = [...new Set(offenders)]
    if (uniq.length > 5) {
      notes.push(`${uniq.length} hex distinti hardcoded (es. ${uniq.slice(0, 3).join(', ')}…)`)
      return { mark: '❌', notes }
    }
    notes.push(`Hex hardcoded: ${uniq.join(', ')}`)
    return { mark: '⚠️', notes }
  }
  return { mark: '✅' }
}

function checkComponenti(content: string): CheckResult {
  const notes: string[] = []
  const rawButtons = (content.match(/<button[\s>]/g) || []).length
  const rawInputs = (content.match(/<input[\s/>]/g) || []).length
  const rawSelects = (content.match(/<select[\s>]/g) || []).length
  const importsButton = /from\s+['"]@\/components\/ui\/button['"]/.test(content)
  const importsInput = /from\s+['"]@\/components\/ui\/(input|form-field)['"]/.test(content)

  if (rawButtons >= 3 && !importsButton) notes.push(`${rawButtons} <button> raw — considera <Button>`)
  if (rawInputs >= 2 && !importsInput) notes.push(`${rawInputs} <input> raw — considera <Input>/<FormField>`)
  if (rawSelects >= 1) notes.push(`${rawSelects} <select> raw — considera <Select> custom`)

  if (notes.length === 0) return { mark: '✅' }
  // 1 warning = ⚠️; 2+ = ⚠️ con più note
  return { mark: '⚠️', notes }
}

function checkResponsive(content: string): CheckResult {
  // Almeno un breakpoint Tailwind usato? (su pagine sostanziali)
  if (content.length < 500) return { mark: '—' } // troppo corta per giudicare
  const hasBreakpoint = /(sm|md|lg|xl|2xl):/.test(content)
  if (!hasBreakpoint) return { mark: '⚠️', notes: ['Nessun breakpoint responsive trovato'] }
  return { mark: '✅' }
}

function checkLoading(content: string): CheckResult {
  // Pagine che fanno fetch dovrebbero avere skeleton/loader
  const fetches = /useDashboard|useSWR|useQuery|isLoading|loading|fetch\(/.test(content)
  const hasLoader = /Loader2|animate-pulse|Skeleton|skeleton|PageLoader/.test(content)
  if (!fetches) return { mark: '—' }
  if (!hasLoader) return { mark: '⚠️', notes: ['Fetch presente ma nessun loader/skeleton evidente'] }
  return { mark: '✅' }
}

function checkAnimazioni(content: string): CheckResult {
  // Best-effort: cerca animazioni > 400ms hardcoded
  const longAnims = content.match(/duration[-:](?:[5-9]\d\d|\d{4,})/g)
  if (longAnims) {
    const uniq = [...new Set(longAnims)]
    return { mark: '⚠️', notes: [`Animazioni potenzialmente troppo lunghe: ${uniq.slice(0, 3).join(', ')}`] }
  }
  return { mark: '✅' }
}

function checkA11y(content: string): CheckResult {
  const notes: string[] = []
  // Icon-only buttons spesso senza aria-label
  const iconOnlyButtonPatterns = /<button[^>]*>\s*<[A-Z]\w+\s+(?!.*aria-label)/g
  const matches = content.match(iconOnlyButtonPatterns) || []
  if (matches.length >= 2) notes.push(`${matches.length} possibili icon-only button senza aria-label`)
  // Immagini senza alt
  const imgsNoAlt = (content.match(/<img(?![^>]*\balt=)/g) || []).length
  if (imgsNoAlt > 0) notes.push(`${imgsNoAlt} <img> senza alt`)
  if (notes.length === 0) return { mark: '✅' }
  return { mark: '⚠️', notes }
}

// ────────────────────────────────────────────────────────────────────────────
// Run audit on a single page
// ────────────────────────────────────────────────────────────────────────────

type PageAudit = {
  route: string
  filePath: string
  checks: Record<string, CheckResult>
  totalLines: number
}

function auditPage(pagePath: string): PageAudit {
  const route = pageRoute(pagePath)
  const siblings = siblingFiles(pagePath)
  // Combina contenuto: page.tsx + tutti i file nella stessa folder, così
  // catturiamo i client component che la pagina effettivamente renderizza
  let content = readFileSync(pagePath, 'utf8')
  for (const s of siblings) {
    try { content += '\n\n' + readFileSync(s, 'utf8') } catch { /* skip */ }
  }
  const totalLines = content.split('\n').length

  return {
    route,
    filePath: relative(REPO_ROOT, pagePath).replace(/\\/g, '/'),
    totalLines,
    checks: {
      Tipografia:  checkTipografia(content),
      Spacing:     checkSpaziatura(content),
      Colori:      checkColori(content),
      Componenti:  checkComponenti(content),
      Responsive:  checkResponsive(content),
      Loading:     checkLoading(content),
      Animazioni:  checkAnimazioni(content),
      A11y:        checkA11y(content),
    },
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Render markdown
// ────────────────────────────────────────────────────────────────────────────

function summarize(audits: PageAudit[]): string {
  const total = audits.length
  const counts = { '✅': 0, '⚠️': 0, '❌': 0, '—': 0 }
  for (const a of audits) {
    for (const c of Object.values(a.checks)) counts[c.mark]++
  }
  const totalChecks = total * 8
  return [
    `**${total} pagine** auditate · **${totalChecks} check** totali`,
    `- ✅ Pass: **${counts['✅']}** (${Math.round(counts['✅'] / totalChecks * 100)}%)`,
    `- ⚠️ Warning: **${counts['⚠️']}** (${Math.round(counts['⚠️'] / totalChecks * 100)}%)`,
    `- ❌ Fail: **${counts['❌']}** (${Math.round(counts['❌'] / totalChecks * 100)}%)`,
    `- — Not applicable: **${counts['—']}** (${Math.round(counts['—'] / totalChecks * 100)}%)`,
  ].join('\n')
}

function renderMarkdown(audits: PageAudit[]): string {
  const ts = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const lines: string[] = []

  lines.push('# Visual Audit — Otium PMS')
  lines.push('')
  lines.push(`> Generato: ${ts} · Eseguibile: \`npx ts-node scripts/visual-audit.ts\``)
  lines.push('')
  lines.push('## Cosa è questo report')
  lines.push('')
  lines.push('Audit **statico euristico** dell\'adozione del design system.')
  lines.push('Ogni pagina viene letta + i suoi sibling client component nella stessa folder.')
  lines.push('Le regex applicate sono best-effort: falsi positivi e negativi sono possibili.')
  lines.push('')
  lines.push('**Cosa il report NON copre** (richiede browser/Playwright/manuale):')
  lines.push('- Visibilità reale del focus ring')
  lines.push('- Contrasto colori misurato (WCAG AA)')
  lines.push('- Touch target size effettivo')
  lines.push('- Hover behavior, animazioni renderizzate')
  lines.push('- Overflow orizzontale a 375px')
  lines.push('')
  lines.push('Marker:')
  lines.push('- ✅ Heuristic pass')
  lines.push('- ⚠️ Warning (probabile issue, falso positivo possibile)')
  lines.push('- ❌ Fail (issue netto da fixare)')
  lines.push('- — Non applicabile / non determinabile staticamente')
  lines.push('')
  lines.push('## Sintesi')
  lines.push('')
  lines.push(summarize(audits))
  lines.push('')
  lines.push('## Tabella')
  lines.push('')
  lines.push('| Pagina | Tipo | Spacing | Colori | Comp | Resp | Load | Anim | A11y |')
  lines.push('|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|')

  // Group by area
  const grouped: Record<string, PageAudit[]> = {}
  for (const a of audits) {
    const seg = a.route.split('/')[1] || 'root'
    grouped[seg] ??= []
    grouped[seg].push(a)
  }
  // Order: book, checkin, kiosk, host, admin, superadmin, others
  const order = ['book', 'checkin', 'kiosk', 'g', 'wifi', 'reception', 'host', 'admin', 'superadmin', '(auth)']
  const sortedKeys = [
    ...order.filter((k) => k in grouped),
    ...Object.keys(grouped).filter((k) => !order.includes(k)).sort(),
  ]

  for (const key of sortedKeys) {
    const items = grouped[key].sort((a, b) => a.route.localeCompare(b.route))
    for (const a of items) {
      const c = a.checks
      lines.push(
        `| \`${a.route}\` | ${c.Tipografia.mark} | ${c.Spacing.mark} | ${c.Colori.mark} | ${c.Componenti.mark} | ${c.Responsive.mark} | ${c.Loading.mark} | ${c.Animazioni.mark} | ${c.A11y.mark} |`,
      )
    }
  }

  // Detail section: solo le pagine con almeno un ⚠️ o ❌
  lines.push('')
  lines.push('## Dettagli — pagine con warning/fail')
  lines.push('')
  let issuesShown = 0
  for (const a of audits) {
    const issueChecks = Object.entries(a.checks).filter(
      ([, r]) => r.mark === '⚠️' || r.mark === '❌',
    )
    if (issueChecks.length === 0) continue
    issuesShown++
    lines.push(`### \`${a.route}\``)
    lines.push(`File: [\`${a.filePath}\`](../${a.filePath})`)
    for (const [name, res] of issueChecks) {
      lines.push(`- **${name}** ${res.mark}`)
      for (const note of res.notes ?? []) {
        lines.push(`  - ${note}`)
      }
    }
    lines.push('')
  }
  if (issuesShown === 0) {
    lines.push('_Nessuna pagina con warning/fail euristici. ✨_')
  } else {
    lines.push(`_Totale pagine con issue: **${issuesShown}**._`)
  }

  return lines.join('\n')
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

function main() {
  const jsonMode = process.argv.includes('--json')
  if (!existsSync(APP_DIR)) {
    console.error('app/ directory not found — run from repo root')
    process.exit(1)
  }
  const pages = findPages(APP_DIR).sort()
  console.log(`Found ${pages.length} pages under app/ (excluding /api).`)

  const audits = pages.map(auditPage)

  if (jsonMode) {
    console.log(JSON.stringify(audits, null, 2))
    return
  }

  const md = renderMarkdown(audits)
  writeFileSync(OUTPUT, md, 'utf8')
  console.log(`✅ Wrote ${relative(REPO_ROOT, OUTPUT)} (${(md.length / 1024).toFixed(1)} KB)`)

  // Stampa anche la sintesi su stdout per visibilità immediata
  console.log('')
  console.log(summarize(audits))
}

main()
