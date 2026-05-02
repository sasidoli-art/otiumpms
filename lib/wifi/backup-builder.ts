/**
 * Backup builder TypeScript-side per il provisioning self-service di un nuovo
 * device Comfast (CF-AC101 / CF-AC50 / CF-AC100 / CF-AC300).
 *
 * Prende un template tar.gz factory + opzioni per-device, applica patch in-memory
 * (senza usare bash/tar di sistema → funziona su Vercel serverless) e ritorna un
 * Buffer pronto da scaricare al browser.
 *
 * Patch applicate:
 *   - /etc/shadow: hash factory → hash di "cecilia"
 *   - /etc/config/login: password Web UI 'admin' → 'cecilia'
 *   - /etc/config/network: LAN 172.16.0.1/16 → 172.20.0.1/24
 *   - /etc/config/dhcp + dhcpd: dnsmasq + ISC dhcpd domain
 *   - /etc/config/system: hostname + dual SSID + staff WPA2 password
 *   - /etc/config/upnpd: UPnP+NAT-PMP off (security A1)
 *   - /etc/config/mwan3: track_ip Cloudflare/Quad9 (security A7)
 *   - /etc/config/wifidog: enabled + Otium prod hostname/path/gw_id
 *
 * File aggiunti:
 *   - /etc/otium/agent.conf (token + URL prod)
 *   - /usr/bin/otium-agent.sh (l'agent shell script)
 *   - /usr/bin/otium-check-alive.sh (deadman switch monitor)
 *   - /etc/crontabs/root (entry commentata pronta da abilitare)
 *   - /root/.ssh/authorized_keys + /etc/dropbear/authorized_keys (chiave SSH operatore)
 */

import { Buffer } from 'node:buffer'
import { gunzipSync, gzipSync } from 'node:zlib'
import { Readable } from 'node:stream'
import * as tar from 'tar-stream'
import { FACTORY_BACKUP_B64 } from './_templates/factory-bak.b64'
import { OTIUM_AGENT_SH_B64 } from './_templates/agent-script.b64'
import { OTIUM_CHECK_ALIVE_SH_B64 } from './_templates/check-alive-script.b64'

// MD5-crypt hashes (factory salt Comfast V2.6.x)
const SHADOW_FACTORY = '$1$Ae0K1uzW$cnfY6ItA1jFlTRaNtEnFU1'
const SHADOW_CECILIA = '$1$Ae0K1uzW$7jHqK4eQ2b1GqVYPUpwjK0'

const DEFAULT_API_URL_BASE = 'https://otium-pms.vercel.app/api/wifi'

export interface BuildBackupOpts {
  /** Token in chiaro (sarà nel agent.conf del device) */
  apiToken: string
  /** Placeholder MAC creato dal wizard (es. "PENDING-AB12CD34"). Usato come gateway_id wifidog + DEVICE_ID agent finché il device non rivela il MAC reale al primo heartbeat. */
  deviceMacPlaceholder: string
  /** SSID guest (open + captive portal). Es. "Mastroberardino", "Priamare" */
  ssidGuest: string
  /** SSID staff (WPA2-PSK). Es. "Mastroberardino-Staff" */
  ssidStaff: string
  /** Password WPA2 staff (8-63 char) */
  staffPassword: string
  /** Hostname del device. Es. "COMFAST-Mastroberardino" */
  hostname: string
  /** Chiave SSH pubblica da installare (operator + service mode) */
  sshPubkey: string
  /** Override URL base API Otium (default https://otium-pms.vercel.app/api/wifi) */
  apiUrlBase?: string
}

interface ParsedEntry {
  header: tar.Headers
  content: Buffer
}

export async function buildPatchedBackup(opts: BuildBackupOpts): Promise<Buffer> {
  // 1. Decode + decompress factory template
  const factoryGz = Buffer.from(FACTORY_BACKUP_B64, 'base64')
  const factoryTar = gunzipSync(factoryGz)

  // 2. Parse all entries into memory
  const entries: ParsedEntry[] = await parseTarEntries(factoryTar)

  // 3. Apply patches to existing entries
  for (const e of entries) {
    if (e.header.type !== 'file') continue
    const text = e.content.toString('utf8')
    const patched = patchByName(e.header.name, text, opts)
    if (patched !== null) {
      e.content = Buffer.from(patched, 'utf8')
      e.header.size = e.content.length
      // /etc/shadow stricter mode
      if (e.header.name === 'etc/shadow') {
        e.header.mode = 0o600
      }
    }
  }

  // 4. Add Otium-specific files
  const apiUrl = opts.apiUrlBase ?? DEFAULT_API_URL_BASE
  const agentConfText = generateAgentConf(apiUrl, opts.apiToken, opts.deviceMacPlaceholder)
  const cronText = generateCronEntry()
  const agentSh = Buffer.from(OTIUM_AGENT_SH_B64, 'base64').toString('utf8')
  const checkAliveSh = Buffer.from(OTIUM_CHECK_ALIVE_SH_B64, 'base64').toString('utf8')
  const sshKey = opts.sshPubkey.trim() + '\n'

  pushNewFile(entries, 'etc/otium/agent.conf', agentConfText, 0o644)
  pushNewFile(entries, 'usr/bin/otium-agent.sh', agentSh, 0o755)
  pushNewFile(entries, 'usr/bin/otium-check-alive.sh', checkAliveSh, 0o755)
  pushNewFile(entries, 'etc/crontabs/root', cronText, 0o644)
  pushNewFile(entries, 'root/.ssh/authorized_keys', sshKey, 0o600)
  pushNewFile(entries, 'etc/dropbear/authorized_keys', sshKey, 0o600)

  // Directory entries per /root/.ssh/ e /etc/dropbear/ (perms 700)
  // Nota: tar-stream gestisce automaticamente le dir parent quando estrai,
  // ma includere esplicitamente le dir con mode corretto è più robusto
  // per dropbear che fa un check di stat() sulla dir prima del file.
  pushDirEntry(entries, 'root/.ssh/', 0o700)
  pushDirEntry(entries, 'etc/dropbear/', 0o700)

  // 5. Repack + gzip
  return packAndGzip(entries)
}

// ─── Patch logic per file ─────────────────────────────────────────────────────

function patchByName(name: string, text: string, opts: BuildBackupOpts): string | null {
  switch (name) {
    case 'etc/shadow':
      return text.replace(SHADOW_FACTORY.replace(/\$/g, '\\$'), SHADOW_CECILIA)
        // fallback se il primo replace non matcha (testo è plain, non regex)
        .replace(SHADOW_FACTORY, SHADOW_CECILIA)
    case 'etc/config/login':
      return text.replace("option password 'admin'", "option password 'cecilia'")
    case 'etc/config/network':
      return text
        .replace("option ipaddr '172.16.0.1'", "option ipaddr '172.20.0.1'")
        .replace("option netmask '255.255.0.0'", "option netmask '255.255.255.0'")
    case 'etc/config/dhcp':
      return text.replace(/option domain\s+'COMFAST'/g, `option domain\t'${escapeUci(opts.hostname)}'`)
    case 'etc/config/dhcpd':
      return text.replace(/option domain 'COMFAST'/g, `option domain '${escapeUci(opts.hostname)}'`)
    case 'etc/config/system':
      return text
        .replace("option hostname 'COMFAST'", `option hostname '${escapeUci(opts.hostname)}'`)
        .replace("option group1_wlan0_ssid 'COMFAST'", `option group1_wlan0_ssid '${escapeUci(opts.ssidGuest)}'`)
        .replace("option group1_wlan8_ssid 'COMFAST'", `option group1_wlan8_ssid '${escapeUci(opts.ssidGuest)}'`)
        .replace("option group1_wlan7_disabled '1'", "option group1_wlan7_disabled '0'")
        .replace("option group1_wlan15_disabled '1'", "option group1_wlan15_disabled '0'")
        .replace("option group1_wlan7_ssid 'COMFAST_ADMIN_2G'", `option group1_wlan7_ssid '${escapeUci(opts.ssidStaff)}'`)
        .replace("option group1_wlan15_ssid 'COMFAST_ADMIN_5G'", `option group1_wlan15_ssid '${escapeUci(opts.ssidStaff)}'`)
        .replace("option group1_wlan7_key '12345678'", `option group1_wlan7_key '${escapeUci(opts.staffPassword)}'`)
        .replace("option group1_wlan15_key '12345678'", `option group1_wlan15_key '${escapeUci(opts.staffPassword)}'`)
    case 'etc/config/upnpd':
      return text
        .replace("option enable_upnp '1'", "option enable_upnp '0'")
        .replace("option enable_natpmp '1'", "option enable_natpmp '0'")
    case 'etc/config/mwan3':
      return text.replace(/'180\.76\.76\.76'/g, "'1.1.1.1'").replace(/'119\.29\.29\.29'/g, "'9.9.9.9'")
    case 'etc/config/wifidog':
      return text
        .replace("option enabled '0'", "option enabled '1'")
        .replace("option hostname 'c.weifeinet.com'", "option hostname 'otium-pms.vercel.app'")
        .replace("option httpport '80'", "option httpport '443'")
        .replace("option path '/'", "option path '/api/wifi/wifidog/'")
        .replace(/option gateway_id '[^']*'/, `option gateway_id '${opts.deviceMacPlaceholder}'`)
        .replace("option gateway_address '172.16.0.1'", "option gateway_address '172.20.0.1'")
    default:
      return null
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateAgentConf(apiUrl: string, token: string, deviceId: string): string {
  return [
    '# Otium Agent — generato dal wizard self-service',
    '# NON modificare manualmente: rigenerare via /superadmin/wifi/onboard',
    `API_URL="${apiUrl}"`,
    `API_TOKEN="${token}"`,
    `DEVICE_ID="${deviceId}"`,
    'CONTROLLER_URL="http://127.0.0.1"',
    'CONTROLLER_USER="admin"',
    'CONTROLLER_PASS="cecilia"',
    'POLL_INTERVAL=30',
    '',
  ].join('\n')
}

function generateCronEntry(): string {
  return [
    '# Otium agent — abilita togliendo il "#" dalle righe sottostanti',
    '# */1 * * * * /usr/bin/otium-agent.sh tick > /dev/null 2>&1',
    '# */1 * * * * /usr/bin/otium-check-alive.sh > /dev/null 2>&1',
    '',
  ].join('\n')
}

function escapeUci(s: string): string {
  // UCI single-quoted strings: no apostrofi, no backslash, no newline
  return s.replace(/['\\\n\r]/g, '')
}

function pushNewFile(entries: ParsedEntry[], name: string, content: string, mode: number) {
  // Rimuovi eventuale entry esistente (override)
  const existing = entries.findIndex(e => e.header.name === name)
  if (existing >= 0) entries.splice(existing, 1)

  const buf = Buffer.from(content, 'utf8')
  entries.push({
    header: {
      name,
      mode,
      type: 'file',
      size: buf.length,
      uid: 0,
      gid: 0,
      uname: 'root',
      gname: 'root',
      mtime: new Date(),
    },
    content: buf,
  })
}

function pushDirEntry(entries: ParsedEntry[], name: string, mode: number) {
  const existing = entries.findIndex(e => e.header.name === name)
  if (existing >= 0) entries.splice(existing, 1)

  entries.push({
    header: {
      name,
      mode,
      type: 'directory',
      size: 0,
      uid: 0,
      gid: 0,
      uname: 'root',
      gname: 'root',
      mtime: new Date(),
    },
    content: Buffer.alloc(0),
  })
}

async function parseTarEntries(tarBuf: Buffer): Promise<ParsedEntry[]> {
  const entries: ParsedEntry[] = []
  const extract = tar.extract()

  return await new Promise((resolve, reject) => {
    extract.on('entry', (header, stream, next) => {
      const chunks: Buffer[] = []
      stream.on('data', (c: Buffer) => chunks.push(c))
      stream.on('end', () => {
        entries.push({ header: { ...header }, content: Buffer.concat(chunks) })
        next()
      })
      stream.on('error', reject)
      stream.resume()
    })
    extract.on('finish', () => resolve(entries))
    extract.on('error', reject)
    Readable.from(tarBuf).pipe(extract)
  })
}

async function packAndGzip(entries: ParsedEntry[]): Promise<Buffer> {
  const pack = tar.pack()
  const chunks: Buffer[] = []

  pack.on('data', (c: Buffer) => chunks.push(c))

  for (const e of entries) {
    await new Promise<void>((resolve, reject) => {
      pack.entry(
        {
          name: e.header.name,
          mode: e.header.mode,
          uid: e.header.uid ?? 0,
          gid: e.header.gid ?? 0,
          uname: 'root',
          gname: 'root',
          size: e.header.type === 'directory' ? 0 : e.content.length,
          mtime: e.header.mtime ?? new Date(),
          type: e.header.type,
        },
        e.content,
        (err) => (err ? reject(err) : resolve()),
      )
    })
  }

  pack.finalize()
  await new Promise<void>((resolve, reject) => {
    pack.on('end', resolve)
    pack.on('error', reject)
  })

  return gzipSync(Buffer.concat(chunks))
}

// ─── Generazione MAC placeholder + slugify ────────────────────────────────────

/**
 * Genera un placeholder MAC univoco basato sul token. Formato:
 *   PENDING-XXXXXXXX (12 char totale, prefix obbligatorio per la logica
 *   bootstrap in lib/wifi/auth.ts → requireWifiDeviceWithBootstrap)
 */
export function generatePlaceholderMac(apiTokenHash: string): string {
  return `PENDING-${apiTokenHash.slice(0, 8).toUpperCase()}`
}

/**
 * Converte un nome struttura in uno slug usabile come hostname/SSID.
 * Esempi:
 *   "Masseria MastroBerardino" → "Mastroberardino"
 *   "Agriturismo Il Poggio"   → "IlPoggio"
 *   "Fiseri Village"          → "FiseriVillage"
 */
export function structureToSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacritics
    .replace(/^(masseria|agriturismo|hotel|b&b|villa|villaggio|residence)\s+/i, '')
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .slice(0, 32)
}
