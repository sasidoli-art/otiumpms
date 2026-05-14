/**
 * Otium Wi-Fi — patcher TS-native per backup factory Comfast OrangeOS V2.6.x.
 *
 * Prende il file `.file` scaricato dal Web UI del device (gzip+tar di `/etc/`,
 * `/usr/`, ecc.) e lo trasforma in un backup "Otium-ready":
 *
 *   - Chiave SSH pubblica installata in /etc/dropbear/authorized_keys e
 *     /root/.ssh/authorized_keys (entrambi i path: controller usa il secondo,
 *     AP usano il primo)
 *   - Root password sostituita con hash di "cecilia" (documentato)
 *   - /etc/otium-agent.conf con MAC placeholder + bearer TOKEN
 *   - /usr/sbin/otium-agent.sh v0.4 installato (template embedded)
 *   - Cron entry per agent (modifica /etc/crontabs/root)
 *
 * Permessi corretti via tar-stream (uid=0 gid=0 mode=755 per script,
 * 600 per agent.conf, 700 per /root/.ssh, 644 per authorized_keys).
 *
 * Output: Buffer pronto da uppodare al device via Web UI "Manage Config → Restore".
 *
 * USO:
 *   import { buildPatchedBackup } from '@/lib/wifi/backup-builder'
 *   const patched = await buildPatchedBackup({
 *     factoryBuf,     // Buffer del .file factory scaricato dal Web UI
 *     apiToken,       // bearer in chiaro generato a provisioning (sarà hashato in DB)
 *     deviceMac,      // MAC LAN del controller (es. "E0E1A90E2DCF") oppure
 *                     // "PENDING-XXXXXXXX" se ancora ignoto (auto-detect al primo boot)
 *     sshPubkey,      // contenuto del id_rsa.pub operatore Otium
 *   })
 *   writeFileSync('backup.patched.file', patched)
 */

import { Readable } from 'node:stream'
import { gunzip, gzip } from 'node:zlib'
import { promisify } from 'node:util'
import tar from 'tar-stream'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const gunzipAsync = promisify(gunzip)
const gzipAsync = promisify(gzip)

// ─── Hash documentati (vedi `router_comfast/PASSWORDS.md`) ─────────────────
// Hash MD5-crypt di "cecilia" (documentato — è la password operatore Otium)
const OTIUM_SHADOW_HASH = '$1$Ae0K1uzW$7jHqK4eQ2b1GqVYPUpwjK0'
// Hash factory comune a tutta la linea Comfast V2.6.x — da sostituire
const COMFAST_FACTORY_HASH_PREFIX = '$1$Ae0K1uzW$cnfY6ItA1jFlTRaNtEnFU1'

export interface BackupBuilderOpts {
  /** Buffer del backup factory scaricato dal Web UI del device */
  factoryBuf: Buffer
  /** Bearer token in chiaro per l'agent (32 byte hex). Verrà salvato come hash in DB. */
  apiToken: string
  /** MAC LAN del controller. Es: "E0E1A90E2DCF". Se non noto, "PENDING-XXXXXXXX" → auto-detect al primo boot. */
  deviceMac: string
  /** Contenuto del id_rsa.pub operatore Otium da installare per accesso SSH */
  sshPubkey: string
  /** Path agent shell template (default: lib/wifi/agent-template.sh nel repo) */
  agentScriptPath?: string
  /** Sostituisce root password con hash "cecilia" (default true) */
  patchShadow?: boolean
}

interface TarEntry {
  headers: tar.Headers
  data: Buffer
}

/** Legge tutto lo stream tar in memoria come array di entry */
async function readTar(buf: Buffer): Promise<TarEntry[]> {
  return new Promise((resolveP, rejectP) => {
    const extract = tar.extract()
    const entries: TarEntry[] = []

    extract.on('entry', (headers, stream, next) => {
      const chunks: Buffer[] = []
      stream.on('data', c => chunks.push(c as Buffer))
      stream.on('end', () => {
        entries.push({ headers, data: Buffer.concat(chunks) })
        next()
      })
      stream.on('error', rejectP)
      stream.resume()
    })

    extract.on('finish', () => resolveP(entries))
    extract.on('error', rejectP)

    Readable.from(buf).pipe(extract)
  })
}

/** Scrive un array di entry come Buffer tar */
async function writeTar(entries: TarEntry[]): Promise<Buffer> {
  return new Promise((resolveP, rejectP) => {
    const pack = tar.pack()
    const chunks: Buffer[] = []

    pack.on('data', c => chunks.push(c as Buffer))
    pack.on('end', () => resolveP(Buffer.concat(chunks)))
    pack.on('error', rejectP)

    for (const { headers, data } of entries) {
      // Normalizza ownership (CRITICO: NTFS perms su Windows producono uid 1002 → Dropbear rifiuta)
      const safe: tar.Headers = {
        ...headers,
        uid: 0,
        gid: 0,
        uname: 'root',
        gname: 'root',
      }
      pack.entry(safe, data, err => {
        if (err) rejectP(err)
      })
    }
    pack.finalize()
  })
}

/** Trova entry per nome (gestisce variazioni `./etc/...` vs `etc/...`) */
function findEntry(entries: TarEntry[], name: string): TarEntry | undefined {
  const candidates = [name, `./${name}`, name.replace(/^\.\//, '')]
  return entries.find(e =>
    candidates.includes(e.headers.name) ||
    candidates.includes(e.headers.name.replace(/^\.\//, ''))
  )
}

/** Rimuovi entry per path (idempotente) */
function removeEntry(entries: TarEntry[], name: string): void {
  const candidates = [name, `./${name}`, name.replace(/^\.\//, '')]
  for (let i = entries.length - 1; i >= 0; i--) {
    if (candidates.includes(entries[i].headers.name) ||
        candidates.includes(entries[i].headers.name.replace(/^\.\//, ''))) {
      entries.splice(i, 1)
    }
  }
}

/** Aggiungi/sostituisci un file regolare */
function upsertFile(
  entries: TarEntry[],
  path: string,
  content: string | Buffer,
  mode: number,
): void {
  removeEntry(entries, path)
  const data = typeof content === 'string' ? Buffer.from(content, 'utf8') : content
  entries.push({
    headers: {
      name: path,
      type: 'file',
      mode,
      size: data.length,
      uid: 0,
      gid: 0,
      uname: 'root',
      gname: 'root',
      mtime: new Date(),
    },
    data,
  })
}

/** Aggiungi/sostituisci una directory (mode tipicamente 0755 o 0700) */
function upsertDir(entries: TarEntry[], path: string, mode: number): void {
  // Normalizza: path dir senza trailing slash, salviamo CON slash come fa tar
  const dirPath = path.endsWith('/') ? path : `${path}/`
  removeEntry(entries, dirPath)
  removeEntry(entries, path)
  entries.push({
    headers: {
      name: dirPath,
      type: 'directory',
      mode,
      size: 0,
      uid: 0,
      gid: 0,
      uname: 'root',
      gname: 'root',
      mtime: new Date(),
    },
    data: Buffer.alloc(0),
  })
}

/** Patcha /etc/shadow sostituendo l'hash factory con quello di "cecilia" */
function patchShadow(content: string): string {
  return content
    .split('\n')
    .map(line => {
      if (line.startsWith('root:')) {
        // Sostituisci hash root con il nostro noto
        return line.replace(/^root:[^:]+:/, `root:${OTIUM_SHADOW_HASH}:`)
      }
      return line
    })
    .join('\n')
}

/** Genera contenuto /etc/otium-agent.conf */
function buildAgentConf(mac: string, token: string, apiUrl: string): string {
  return `# Otium Wi-Fi agent config — DO NOT EDIT manually
# Generato dal backup-builder, ${new Date().toISOString()}
MAC=${mac}
TOKEN=${token}
API_URL=${apiUrl}
`
}

/** Patcha /etc/crontabs/root aggiungendo l'entry agent (idempotente) */
function patchCrontab(existing: string | null): string {
  const lines = (existing ?? '').split('\n').filter(l => !l.includes('otium-agent'))
  lines.push('*/1 * * * * /usr/sbin/otium-agent.sh')
  // Manteniamo riga vuota finale
  if (lines[lines.length - 1] !== '') lines.push('')
  return lines.join('\n')
}

// ─── slug structure name → filesystem-safe ────────────────────────────────
export function structureToSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
}

/** Main builder */
export async function buildPatchedBackup(opts: BackupBuilderOpts): Promise<Buffer> {
  const {
    factoryBuf,
    apiToken,
    deviceMac,
    sshPubkey,
    agentScriptPath,
    patchShadow: doPatchShadow = true,
  } = opts

  // Validazioni
  if (!factoryBuf || factoryBuf.length === 0) throw new Error('factoryBuf is empty')
  if (!apiToken || apiToken.length < 16) throw new Error('apiToken too short (min 16 chars)')
  if (!deviceMac) throw new Error('deviceMac required (use "PENDING-XXXXXXXX" if unknown)')
  if (!sshPubkey || !sshPubkey.startsWith('ssh-')) throw new Error('sshPubkey not a valid SSH key')

  // 1. Decompress gzip → tar buffer
  const tarBuf = await gunzipAsync(factoryBuf)

  // 2. Read tar entries
  const entries = await readTar(tarBuf)

  // 3. Patch /etc/shadow se richiesto
  if (doPatchShadow) {
    const shadow = findEntry(entries, 'etc/shadow')
    if (shadow) {
      const patched = patchShadow(shadow.data.toString('utf8'))
      shadow.data = Buffer.from(patched, 'utf8')
      shadow.headers.size = shadow.data.length
    }
  }

  // 4. SSH pubkey in /etc/dropbear/authorized_keys (AP) e /root/.ssh/authorized_keys (controller)
  const pubkey = sshPubkey.trim() + '\n'
  upsertDir(entries, 'etc/dropbear', 0o700)
  upsertFile(entries, 'etc/dropbear/authorized_keys', pubkey, 0o600)
  upsertDir(entries, 'root', 0o700)
  upsertDir(entries, 'root/.ssh', 0o700)
  upsertFile(entries, 'root/.ssh/authorized_keys', pubkey, 0o600)

  // 5. /etc/otium-agent.conf con MAC + TOKEN
  // API_URL default punta al backend produzione — il deploy-from-pc.sh lo aggiornerà se diverso
  const apiUrl = process.env.OTIUM_AGENT_API_URL || 'http://otiumpms.duckdns.org/api/wifi'
  upsertFile(entries, 'etc/otium-agent.conf', buildAgentConf(deviceMac, apiToken, apiUrl), 0o600)

  // 6. /usr/sbin/otium-agent.sh (agent v0.4 template)
  // Path default: lib/wifi/agent-template.sh nel monorepo
  const agentPath = agentScriptPath
    || resolve(process.cwd(), 'lib/wifi/agent-template.sh')
  const agentContent = readFileSync(agentPath, 'utf8')
  upsertFile(entries, 'usr/sbin/otium-agent.sh', agentContent, 0o755)

  // 7. Cron entry per agent
  const cronEntry = findEntry(entries, 'etc/crontabs/root')
  const existingCron = cronEntry ? cronEntry.data.toString('utf8') : null
  upsertDir(entries, 'etc/crontabs', 0o755)
  upsertFile(entries, 'etc/crontabs/root', patchCrontab(existingCron), 0o644)

  // 8. Re-tar + re-gzip
  const newTar = await writeTar(entries)
  const newGz = await gzipAsync(newTar, { level: 9 })

  return newGz
}
