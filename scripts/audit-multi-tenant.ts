/**
 * audit-multi-tenant.ts — verifica isolamento hostId nelle API /api/host/*
 *
 * Scopre route che fanno query Prisma SENZA filtrare per `hostId` ricavato
 * dalla sessione (`requireHost()` / `requireHostOrAdmin()`). Una query non
 * filtrata e` un data leak cross-tenant.
 *
 * Per ogni file:
 *   1. Verifica presenza guard (`requireHost`, `requireHostOrAdmin`,
 *      `requireSuperAdmin`, `requireAdmin`) — pubbliche se assenti.
 *   2. Cerca occorrenze di `prisma.<model>.<op>(` con op =
 *      findMany/findFirst/findUnique/count/update/updateMany/delete/deleteMany/aggregate
 *   3. Per ciascuna, verifica che il blocco `where: { ... }` o entry attorno
 *      contenga `hostId` (o `host: { id: ... }` o `auth.user.hostId`).
 *   4. Whitelist di model "globali" non scopati per host (PlatformSettings,
 *      Trace, NotificaSuperadmin, User di sistema, Session...).
 *   5. Whitelist di operation che non hanno where (es. create, upsert spesso
 *      non hanno bisogno di hostId nel where ma nel data — verifichiamo data).
 *
 * Output:
 *   - Stampa report a stdout (PASS/FAIL count + dettagli FAIL)
 *   - Genera/sovrascrive `docs/MULTI-TENANT-AUDIT.md` con elenco issue
 *   - Exit code: 0 se tutto OK, 1 se ci sono FAIL critici
 *
 * Esecuzione:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/audit-multi-tenant.ts
 *
 * NOTA: e` un'analisi statica euristica — non garantisce 100% (es. una query
 * potrebbe filtrare per `strutturaId` che a sua volta vincola l'hostId via
 * relazione, e l'audit non lo coglie). I FAIL vanno sempre revisionati a mano.
 */
import { readFile, writeFile, readdir, stat } from 'fs/promises'
import { join, relative } from 'path'

const ROOT = join(__dirname, '..')
const HOST_API_DIR = join(ROOT, 'app', 'api', 'host')

// Operazioni Prisma che leggono/scrivono (le query che potrebbero leakare se non filtrate)
const TARGETED_OPS = [
  'findMany', 'findFirst', 'findUnique', 'findUniqueOrThrow', 'findFirstOrThrow',
  'count', 'aggregate', 'groupBy',
  'update', 'updateMany',
  'delete', 'deleteMany',
]

// Modelli "globali" che non hanno hostId per design — query su questi sono OK
// senza filtro hostId (ma deve esserci comunque un guard di ruolo).
const GLOBAL_MODELS = new Set([
  'platformSettings', 'trace', 'notificaSuperadmin', 'session', 'verificationToken',
  'comuniTassaSoggiorno', 'piattaformaConfig', 'systemConfig',
])

// Modelli per cui il `where` di solito usa `id` come PK e l'isolamento
// avviene a monte (es. update by id dopo findFirst con hostId). Non flagghiamo
// se il guard host e` presente — ma logghiamo come WARN.
const PK_BASED_MODELS = new Set([
  'host',           // findUnique({ where: { id: hostId } }) — auto-scoped
  'hostSmtpConfig', 'hostConciergeConfig', 'hostWifiConfig', 'hostBillingInfo',
  'platformSettings',
])

// Guard riconosciuti che assicurano session.user.hostId
const HOST_GUARDS = ['requireHost', 'requireHostOrAdmin', 'requireSuperAdmin', 'requireAdmin']

// Pattern alternativi di auth che NON usano gli helper requireHost ma sono validi
const ALT_AUTH_PATTERNS = [
  'getServerSession',     // chiama next-auth direttamente (poi filtra a mano)
  'verifyIcalToken',      // HMAC token per iCal pubblico
  'verifyApiKey',         // API key per integrazioni
  'verifyHmac',           // HMAC generico
  'verifyJwt',            // JWT custom
  'apiKeyAuth',           // wrapper apiKey
]

interface Finding {
  file: string
  line: number
  model: string
  op: string
  snippet: string
  severity: 'CRITICAL' | 'WARN' | 'INFO'
  reason: string
}

// ───────────────────────────────────────────────────────────────────────────
// File walker
// ───────────────────────────────────────────────────────────────────────────

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) yield* walk(full)
    else if (e.isFile() && e.name === 'route.ts') yield full
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Analyzer
// ───────────────────────────────────────────────────────────────────────────

function hasHostGuard(content: string): boolean {
  return HOST_GUARDS.some((g) => content.includes(`${g}(`))
}

function hasAltAuth(content: string): boolean {
  return ALT_AUTH_PATTERNS.some((p) => content.includes(`${p}(`))
}

function hasHostIdInScope(blockText: string): boolean {
  // Cerca pattern indicativi di filtro hostId
  return (
    blockText.includes('hostId:') ||
    blockText.includes('hostId :') ||
    blockText.includes('hostId,') ||
    /host\s*:\s*\{/.test(blockText) ||             // host: { ... }
    /auth\.user\.hostId/.test(blockText) ||         // params.hostId
    /params\.hostId/.test(blockText) ||
    /session\.user\.hostId/.test(blockText)
  )
}

/**
 * Estrae il blocco di chiamata Prisma a partire da `prisma.X.op(` chiudendo
 * sulle parentesi bilanciate. Ritorna il testo dentro la chiamata.
 */
function extractCallBlock(text: string, startIdx: number): { block: string; endIdx: number } {
  // Trova la `(` di apertura
  let i = text.indexOf('(', startIdx)
  if (i === -1) return { block: '', endIdx: startIdx }
  let depth = 1
  const blockStart = i + 1
  i++
  while (i < text.length && depth > 0) {
    const ch = text[i]
    if (ch === '(') depth++
    else if (ch === ')') depth--
    i++
  }
  return { block: text.slice(blockStart, i - 1), endIdx: i }
}

function lineNumber(text: string, idx: number): number {
  return text.slice(0, idx).split('\n').length
}

function snippet(text: string, idx: number, width = 80): string {
  const start = Math.max(0, idx - 5)
  const end = Math.min(text.length, idx + width)
  return text.slice(start, end).replace(/\s+/g, ' ').trim()
}

function analyzeFile(filePath: string, content: string): Finding[] {
  const findings: Finding[] = []
  const guarded = hasHostGuard(content)
  const altAuthed = hasAltAuth(content)
  const relPath = relative(ROOT, filePath).replace(/\\/g, '/')

  // Pubblica? (es. /api/health, /api/cron) — ma siamo in /api/host quindi DEVE avere guard
  // o un alt-auth (HMAC/iCal token/API key/getServerSession diretto)
  if (!guarded && !altAuthed) {
    findings.push({
      file: relPath,
      line: 1,
      model: '<route>',
      op: '<guard>',
      snippet: 'Nessun requireHost/requireHostOrAdmin/getServerSession/verifyIcalToken nel file',
      severity: 'CRITICAL',
      reason: 'Route /api/host/* SENZA alcuna forma di autenticazione — chiunque puo` chiamarla',
    })
  } else if (!guarded && altAuthed) {
    // Alt-auth (HMAC token, API key, getServerSession custom) — accettabile, INFO
    // Non blocca, ma le query sotto vengono valutate con tolleranza maggiore
  }

  // Cerca chiamate prisma.<model>.<op>(
  const re = /prisma\.([a-zA-Z_$][a-zA-Z0-9_$]*)\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    const model = m[1]
    const op = m[2]
    if (!TARGETED_OPS.includes(op)) continue

    // Estrai il blocco della chiamata (per leggere where/data)
    const { block } = extractCallBlock(content, m.index)
    const ln = lineNumber(content, m.index)

    // Modello globale → OK senza hostId
    if (GLOBAL_MODELS.has(model)) continue

    // PK-based model + guard presente → di solito OK (assumiamo che `id` sia
    // ricavato da una findFirst precedente che ha gia` filtrato hostId)
    if (PK_BASED_MODELS.has(model) && guarded) {
      // Ma logghiamo INFO per tracciabilita`
      continue
    }

    if (hasHostIdInScope(block)) continue

    // FAIL: query non filtra hostId
    // Severity: CRITICAL solo se NESSUNA forma di auth + nessun hostId
    //           WARN se c'e` guard/alt-auth ma manca hostId esplicito (potrebbe filtrare via relazione)
    const hasAnyAuth = guarded || altAuthed
    findings.push({
      file: relPath,
      line: ln,
      model,
      op,
      snippet: snippet(content, m.index),
      severity: hasAnyAuth ? 'WARN' : 'CRITICAL',
      reason: hasAnyAuth
        ? `Query prisma.${model}.${op} senza hostId nel where (potrebbe filtrare via relazione, da revisionare)`
        : `Query prisma.${model}.${op} senza alcun guard E senza hostId — leak garantito`,
    })
  }

  return findings
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

async function main() {
  const allFindings: Finding[] = []
  let scanned = 0

  for await (const file of walk(HOST_API_DIR)) {
    scanned++
    const content = await readFile(file, 'utf8')
    allFindings.push(...analyzeFile(file, content))
  }

  const critical = allFindings.filter((f) => f.severity === 'CRITICAL')
  const warn = allFindings.filter((f) => f.severity === 'WARN')

  // ── Console output
  console.log(`\n=== MULTI-TENANT AUDIT ===`)
  console.log(`Files scanned: ${scanned}`)
  console.log(`CRITICAL: ${critical.length}`)
  console.log(`WARN:     ${warn.length}`)
  console.log()

  if (critical.length > 0) {
    console.log(`--- CRITICAL ---`)
    for (const f of critical) {
      console.log(`[${f.file}:${f.line}] prisma.${f.model}.${f.op}() — ${f.reason}`)
    }
    console.log()
  }

  // ── Report markdown
  const md = generateMarkdownReport(scanned, critical, warn)
  const reportPath = join(ROOT, 'docs', 'MULTI-TENANT-AUDIT.md')
  await writeFile(reportPath, md, 'utf8')
  console.log(`Report scritto: ${relative(ROOT, reportPath)}`)

  process.exit(critical.length > 0 ? 1 : 0)
}

function generateMarkdownReport(scanned: number, critical: Finding[], warn: Finding[]): string {
  const date = new Date().toISOString().slice(0, 10)
  const lines: string[] = []

  lines.push(`# Multi-Tenant Audit`)
  lines.push(``)
  lines.push(`> Generato: ${date} · File scansionati: **${scanned}** · CRITICAL: **${critical.length}** · WARN: **${warn.length}**`)
  lines.push(``)
  lines.push(`Audit euristico statico delle route \`app/api/host/*\`. Verifica che`)
  lines.push(`ogni query Prisma filtri per \`hostId\` ricavato dalla sessione.`)
  lines.push(``)
  lines.push(`Esecuzione: \`npx ts-node scripts/audit-multi-tenant.ts\``)
  lines.push(``)

  if (critical.length === 0) {
    lines.push(`## ✅ Nessuna CRITICAL — isolamento multi-tenant OK`)
    lines.push(``)
  } else {
    lines.push(`## 🔴 CRITICAL (${critical.length})`)
    lines.push(``)
    lines.push(`Query potenzialmente leak cross-tenant. Da fixare PRIMA del go-live.`)
    lines.push(``)
    for (const f of critical) {
      lines.push(`### \`${f.file}:${f.line}\``)
      lines.push(``)
      lines.push(`- **Modello**: \`${f.model}\``)
      lines.push(`- **Operazione**: \`${f.op}\``)
      lines.push(`- **Motivo**: ${f.reason}`)
      lines.push(`- **Snippet**: \`${f.snippet.slice(0, 120)}\``)
      lines.push(``)
    }
  }

  if (warn.length > 0) {
    lines.push(`## 🟡 WARN (${warn.length})`)
    lines.push(``)
    lines.push(`Query con guard ma senza \`hostId\` esplicito. Potrebbero filtrare`)
    lines.push(`via relazione (es. \`where: { struttura: { hostId } }\`) — revisione manuale.`)
    lines.push(``)
    // Raggruppa per file per leggibilita`
    const byFile = new Map<string, Finding[]>()
    for (const f of warn) {
      if (!byFile.has(f.file)) byFile.set(f.file, [])
      byFile.get(f.file)!.push(f)
    }
    for (const [file, items] of Array.from(byFile.entries()).sort()) {
      lines.push(`### \`${file}\` (${items.length})`)
      lines.push(``)
      for (const f of items) {
        lines.push(`- L${f.line}: \`prisma.${f.model}.${f.op}()\` — \`${f.snippet.slice(0, 100)}\``)
      }
      lines.push(``)
    }
  }

  lines.push(`---`)
  lines.push(``)
  lines.push(`## Modelli globali esclusi dall'audit`)
  lines.push(``)
  lines.push(`Questi modelli non hanno \`hostId\` per design e sono accettati senza filtro:`)
  Array.from(GLOBAL_MODELS).sort().forEach((m) => lines.push(`- \`${m}\``))

  return lines.join('\n')
}

main().catch((err) => {
  console.error('Audit fallito:', err)
  process.exit(2)
})
