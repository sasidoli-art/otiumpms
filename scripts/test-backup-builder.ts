/**
 * Test rapido del backup-builder: prende il bakup_originale.file del CF-AC101,
 * lo patcha con valori test, scrive il risultato e ne verifica l'integrità.
 *
 * Uso: npx tsx scripts/test-backup-builder.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import tar from 'tar-stream'
import { Readable } from 'node:stream'
import { buildPatchedBackup } from '@/lib/wifi/backup-builder'

const FACTORY = 'C:/PROGETTI/router_comfast/firmware_moddati/CF-AC101_172.16.0.1/bakup_originale.file'
const OUTPUT = 'C:/PROGETTI/router_comfast/firmware_moddati/CF-AC101_172.16.0.1/bakup_patched_ts_test.file'

async function inspectTar(buf: Buffer): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const extract = tar.extract()
    const names: string[] = []
    extract.on('entry', (h, s, next) => {
      names.push(`${h.type === 'directory' ? 'd' : '-'} ${h.mode?.toString(8).padStart(4,'0')} uid=${h.uid} ${h.name} (${h.size}B)`)
      s.resume()
      s.on('end', next)
    })
    extract.on('finish', () => resolve(names))
    extract.on('error', reject)
    Readable.from(buf).pipe(extract)
  })
}

async function main() {
  console.log('Leggo factory backup:', FACTORY)
  const factoryBuf = readFileSync(FACTORY)
  console.log(`  size: ${factoryBuf.length} bytes`)

  console.log('Patching...')
  const patched = await buildPatchedBackup({
    factoryBuf,
    apiToken: 'test1234567890abcdefghij_TS_TEST_TOKEN_xxx',
    deviceMac: 'PENDING-12345678',
    sshPubkey: 'ssh-rsa AAAAB3NzaC1ycEXAMPLEtestKey== operator@otium',
  })

  console.log(`  patched size: ${patched.length} bytes`)
  writeFileSync(OUTPUT, patched)
  console.log('Salvato in:', OUTPUT)

  // Verify: estrai e cerca file Otium
  const inner = gunzipSync(patched)
  const names = await inspectTar(inner)
  const otiumFiles = names.filter(n => /otium|authorized|shadow|crontabs/.test(n))
  console.log('\n=== File Otium nel patched ===')
  otiumFiles.forEach(n => console.log(' ', n))

  const hasAgent = names.some(n => n.includes('otium-agent.sh'))
  const hasConf = names.some(n => n.includes('otium-agent.conf'))
  const hasKeys = names.some(n => n.includes('authorized_keys'))
  const hasCron = names.some(n => n.includes('etc/crontabs/root'))

  console.log('\nCheck:')
  console.log('  agent script :', hasAgent ? '✓' : '✗')
  console.log('  agent.conf   :', hasConf ? '✓' : '✗')
  console.log('  ssh keys     :', hasKeys ? '✓' : '✗')
  console.log('  cron entry   :', hasCron ? '✓' : '✗')

  if (!hasAgent || !hasConf || !hasKeys || !hasCron) {
    process.exit(1)
  }
  console.log('\n✓ Backup-builder funzionante.')
}

main().catch(e => { console.error(e); process.exit(1) })
