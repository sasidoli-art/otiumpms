/**
 * Smoke test del builder backup self-service.
 *
 * Verifica che buildPatchedBackup produca un tar.gz valido con tutte le
 * patch applicate e i file Otium aggiunti.
 *
 * Uso: npx tsx scripts/test-wifi-build-backup.ts [output.file]
 */

import { buildPatchedBackup, generatePlaceholderMac, structureToSlug } from '@/lib/wifi/backup-builder'
import { gunzipSync } from 'node:zlib'
import { Readable } from 'node:stream'
import * as tar from 'tar-stream'
import { writeFileSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

async function main() {
  const apiToken = 'TestTokenForSmokeTest_______________xyz'
  const apiTokenHash = createHash('sha256').update(apiToken).digest('hex')
  const placeholder = generatePlaceholderMac(apiTokenHash)
  const sshPubkey = readFileSync(`${process.env.USERPROFILE}/.ssh/id_router.pub`, 'utf8').trim()

  console.log('Building patched backup with:')
  console.log('  apiToken:', apiToken.slice(0, 16) + '…')
  console.log('  placeholder MAC:', placeholder)
  console.log('  ssidGuest: Mastroberardino')
  console.log('  ssidStaff: Mastroberardino-Staff')
  console.log('  hostname:', `COMFAST-${structureToSlug('Masseria MastroBerardino')}`)

  const buf = await buildPatchedBackup({
    apiToken,
    deviceMacPlaceholder: placeholder,
    ssidGuest: 'Mastroberardino',
    ssidStaff: 'Mastroberardino-Staff',
    staffPassword: 'TestStaffPwd-2026!',
    hostname: `COMFAST-${structureToSlug('Masseria MastroBerardino')}`,
    sshPubkey,
  })

  const outPath = process.argv[2] || 'C:/PROGETTI/router_comfast/tmp/build_v2_test.tar.gz'
  writeFileSync(outPath, buf)
  console.log(`\nWritten ${buf.length} bytes to ${outPath}`)

  // Verify structure
  console.log('\nTar contents:')
  const decompressed = gunzipSync(buf)
  const found = new Set<string>()
  await new Promise<void>((resolve, reject) => {
    const extract = tar.extract()
    extract.on('entry', (header, stream, next) => {
      found.add(header.name)
      const mode = (header.mode ?? 0o644).toString(8)
      console.log(`  ${header.type === 'directory' ? 'd' : '-'}${mode.padStart(4, '0')} ${header.name}`)
      stream.on('end', next)
      stream.resume()
    })
    extract.on('finish', () => resolve())
    extract.on('error', reject)
    Readable.from(decompressed).pipe(extract)
  })

  const required = [
    'etc/shadow',
    'etc/config/login',
    'etc/config/network',
    'etc/config/system',
    'etc/config/wifidog',
    'etc/otium/agent.conf',
    'usr/bin/otium-agent.sh',
    'usr/bin/otium-check-alive.sh',
    'etc/crontabs/root',
    'root/.ssh/authorized_keys',
    'etc/dropbear/authorized_keys',
  ]
  const missing = required.filter(r => !found.has(r))
  if (missing.length > 0) {
    console.error('\n❌ MISSING entries:', missing)
    process.exit(1)
  } else {
    console.log('\n✅ All required entries present.')
  }

  // Spot-check: verify shadow patch
  const shadowEntry = await readEntryFromTar(decompressed, 'etc/shadow')
  if (shadowEntry?.toString('utf8').includes('$1$Ae0K1uzW$7jHqK4eQ2b1GqVYPUpwjK0')) {
    console.log('✅ /etc/shadow patched (cecilia hash)')
  } else {
    console.error('❌ /etc/shadow NOT patched')
    process.exit(1)
  }

  const sysEntry = await readEntryFromTar(decompressed, 'etc/config/system')
  const sys = sysEntry?.toString('utf8') ?? ''
  if (sys.includes("option group1_wlan0_ssid 'Mastroberardino'") &&
      sys.includes("option group1_wlan7_ssid 'Mastroberardino-Staff'") &&
      sys.includes("option group1_wlan7_disabled '0'") &&
      sys.includes("TestStaffPwd-2026!")) {
    console.log('✅ /etc/config/system patched (dual SSID + staff password)')
  } else {
    console.error('❌ /etc/config/system NOT properly patched')
    process.exit(1)
  }

  const wifidogEntry = await readEntryFromTar(decompressed, 'etc/config/wifidog')
  const wifidog = wifidogEntry?.toString('utf8') ?? ''
  if (wifidog.includes("option enabled '1'") &&
      wifidog.includes("option hostname 'otium-pms.vercel.app'") &&
      wifidog.includes(`option gateway_id '${placeholder}'`)) {
    console.log('✅ /etc/config/wifidog patched (enabled + Otium target + gw_id)')
  } else {
    console.error('❌ /etc/config/wifidog NOT properly patched')
    console.error(wifidog.slice(0, 500))
    process.exit(1)
  }

  // Walled garden default (OS captive portal probe URLs + Otium backend)
  const expectedDomains = ['captive.apple.com', 'connectivitycheck.gstatic.com', 'otium-pms.vercel.app']
  const missingDomains = expectedDomains.filter(d => !wifidog.includes(`list trusted_web_list '${d}'`))
  if (missingDomains.length === 0) {
    console.log('✅ Walled garden default domains presenti (Apple + Google + Otium probe URLs)')
  } else {
    console.error('❌ Walled garden missing domains:', missingDomains)
    process.exit(1)
  }

  const agentConfEntry = await readEntryFromTar(decompressed, 'etc/otium/agent.conf')
  const agentConf = agentConfEntry?.toString('utf8') ?? ''
  if (agentConf.includes(`API_TOKEN="${apiToken}"`) &&
      agentConf.includes(`DEVICE_ID="${placeholder}"`)) {
    console.log('✅ /etc/otium/agent.conf has correct token + device_id')
  } else {
    console.error('❌ /etc/otium/agent.conf wrong content:')
    console.error(agentConf)
    process.exit(1)
  }

  console.log('\n🎉 All smoke tests passed.')
}

async function readEntryFromTar(tarBuf: Buffer, name: string): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const extract = tar.extract()
    let result: Buffer | null = null
    extract.on('entry', (header, stream, next) => {
      if (header.name === name) {
        const chunks: Buffer[] = []
        stream.on('data', (c: Buffer) => chunks.push(c))
        stream.on('end', () => {
          result = Buffer.concat(chunks)
          next()
        })
      } else {
        stream.on('end', next)
      }
      stream.resume()
    })
    extract.on('finish', () => resolve(result))
    extract.on('error', reject)
    Readable.from(tarBuf).pipe(extract)
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
