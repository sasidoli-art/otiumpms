/**
 * GDPR compliance E2E tests.
 *
 * Copre: retention, portale ospite, consent tracking, isolamento multi-tenant,
 * cookie banner. I test scrivono direttamente via Prisma per creare dati
 * "vecchi" (dataPartenza > 40gg) che altrimenti servirebbero settimane di
 * soggiorno reale.
 *
 * Isolamento dati reali: tutti i record usano email con marker
 * `TEST_MARKER` unico per esecuzione, ripuliti in `afterAll`.
 */

import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { eseguiRetention, cancellaTuttiDatiOspite } from '../lib/gdpr-retention'
import { generaPortaleToken, registraConsenso } from '../lib/consent'

const prisma = new PrismaClient()

// Marker univoco per questa esecuzione → cleanup sicuro
const TEST_MARKER = `e2e-gdpr-${Date.now()}`
const email = (suffix: string) => `${TEST_MARKER}-${suffix}@test.local`

async function createTestHost(nome: string) {
  const user = await prisma.user.create({
    data: {
      email: email(nome.toLowerCase().replace(/\W/g, '-')),
      password: '$2b$10$dummy',
      nome,
      cognome: 'Test',
      role: 'HOST',
    },
  })
  const host = await prisma.host.create({
    data: {
      userId: user.id,
      nomeAzienda: `${nome} ${TEST_MARKER}`,
      dpaAccettato: true,
      onboardingCompletato: true,
      onboardingStep: 5,
    },
  })
  return { user, host }
}

async function createTestStruttura(hostId: string) {
  return prisma.struttura.create({
    data: {
      hostId,
      nome: `Struttura ${TEST_MARKER}`,
      tipo: 'ALLOGGIO',
      regione: 'Toscana',
      citta: 'Siena',
      attiva: true,
    },
  })
}

async function cleanupTestData() {
  const hosts = await prisma.host.findMany({
    where: { nomeAzienda: { contains: TEST_MARKER } },
    select: { id: true, userId: true },
  })
  const hostIds = hosts.map((h) => h.id)
  const userIds = hosts.map((h) => h.userId)
  // Cascade di Prisma pulisce la maggior parte
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  // Pulisci record orfani
  await prisma.userConsent.deleteMany({ where: { hostId: { in: hostIds } } })
  await prisma.auditLog.deleteMany({ where: { hostId: { in: hostIds } } })
}

test.afterAll(async () => {
  await cleanupTestData()
  await prisma.$disconnect()
})

// ─── TEST 1: RETENTION ──────────────────────────────────────────────────────

test.describe('GDPR: retention automatica', () => {
  test('anonimizza prenotazione con dataPartenza > 40gg, conserva importi', async () => {
    const { host } = await createTestHost('Host-Retention')
    const struttura = await createTestStruttura(host.id)

    const dataPartenza = new Date()
    dataPartenza.setDate(dataPartenza.getDate() - 41)
    const dataArrivo = new Date(dataPartenza)
    dataArrivo.setDate(dataArrivo.getDate() - 3)

    const pren = await prisma.prenotazione.create({
      data: {
        hostId: host.id,
        strutturaId: struttura.id,
        guestNome: 'Mario',
        guestCognome: 'Rossi',
        guestEmail: email('mario'),
        guestTelefono: '+391234567890',
        dataArrivo,
        dataPartenza,
        numOspiti: 2,
        prezzoTotale: 450,
        stato: 'COMPLETATA',
      },
    })

    await eseguiRetention(host.id)

    const after = await prisma.prenotazione.findUnique({ where: { id: pren.id } })
    expect(after).not.toBeNull()
    expect(after!.guestNome).toBe('Ospite')
    expect(after!.guestCognome).toBe('Anonimizzato')
    expect(after!.guestTelefono).toBeNull()
    // Dati economici intatti
    expect(after!.prezzoTotale).toBe(450)
    expect(after!.dataArrivo).toEqual(dataArrivo)
    expect(after!.dataPartenza).toEqual(dataPartenza)
  })
})

// ─── TEST 2: WAIVER CANCELLAZIONE (Art. 9) ─────────────────────────────────

test.describe('GDPR: waiver SPA retention', () => {
  test('cancella waiver con dataRegistrazione > 90gg (hard delete)', async () => {
    const { host } = await createTestHost('Host-Waiver')
    const struttura = await createTestStruttura(host.id)

    const trattamento = await prisma.trattamentoSpa.create({
      data: {
        hostId: host.id,
        nome: 'Massaggio test',
        categoria: 'MASSAGGIO',
        durata: 60,
        prezzo: 80,
      },
    })

    const dataAppuntamento = new Date()
    dataAppuntamento.setDate(dataAppuntamento.getDate() - 95)

    const app = await prisma.appuntamentoSpa.create({
      data: {
        hostId: host.id,
        trattamentoId: trattamento.id,
        guestNome: 'Paola',
        guestCognome: 'Verdi',
        guestEmail: email('paola'),
        dataOra: dataAppuntamento,
        durata: 60,
        prezzoTotale: 80,
        stato: 'COMPLETATO',
      },
    })

    const dataWaiver = new Date()
    dataWaiver.setDate(dataWaiver.getDate() - 91)

    const waiver = await prisma.waiverSpa.create({
      data: {
        appuntamentoId: app.id,
        dataRegistrazione: dataWaiver,
        incinta: false,
        allergie: 'Nessuna',
        accettazioneTermini: true,
        accettazionePrivacy: true,
        confermato: true,
      },
    })

    await eseguiRetention(host.id)

    const afterWaiver = await prisma.waiverSpa.findUnique({ where: { id: waiver.id } })
    expect(afterWaiver).toBeNull() // hard delete

    // L'appuntamento deve restare
    const afterApp = await prisma.appuntamentoSpa.findUnique({ where: { id: app.id } })
    expect(afterApp).not.toBeNull()
  })
})

// ─── TEST 3: PORTALE OSPITE ─────────────────────────────────────────────────

test.describe('GDPR: portale ospite self-service', () => {
  test('il portale mostra dati e permette revoca/cancellazione', async ({ page, request }) => {
    const { host } = await createTestHost('Host-Portal')
    const struttura = await createTestStruttura(host.id)
    const guestEmail = email('portal-user')

    await prisma.prenotazione.create({
      data: {
        hostId: host.id,
        strutturaId: struttura.id,
        guestNome: 'Luca',
        guestCognome: 'Bianchi',
        guestEmail,
        guestTelefono: '+393334445566',
        dataArrivo: new Date(Date.now() - 10 * 86400000),
        dataPartenza: new Date(Date.now() - 5 * 86400000),
        numOspiti: 2,
        prezzoTotale: 320,
        stato: 'COMPLETATA',
      },
    })

    await prisma.ospiteCRM.create({
      data: {
        hostId: host.id,
        email: guestEmail,
        nome: 'Luca',
        cognome: 'Bianchi',
        telefono: '+393334445566',
        numSoggiorni: 1,
        totaleSpeso: 320,
      },
    })

    await registraConsenso({
      hostId: host.id,
      tipo: 'marketing_email',
      versione: '2026-04-01',
      accettato: true,
      guestEmail,
    })

    const token = generaPortaleToken(guestEmail, host.id)

    // 3a. Pagina portale carica
    await page.goto(`/privacy/${token}`)
    await expect(page.getByText(`Host-Portal ${TEST_MARKER}`)).toBeVisible()
    await expect(page.getByText(guestEmail)).toBeVisible()

    // 3b. API export ritorna JSON con dati
    const exportRes = await request.get(`/api/privacy/${token}/export`)
    expect(exportRes.ok()).toBe(true)
    const body = await exportRes.json()
    expect(body.ospite.email).toBe(guestEmail)
    expect(Array.isArray(body.prenotazioni)).toBe(true)
    expect(body.prenotazioni.length).toBeGreaterThan(0)
    expect(body.prenotazioni[0].prezzoTotale).toBe(320)

    // 3c. Revoca consenso marketing via API
    const revokeRes = await request.patch(`/api/privacy/${token}/consenso`, {
      data: { tipo: 'marketing_email', accettato: false, versione: '2026-04-01' },
    })
    expect(revokeRes.ok()).toBe(true)

    const ultimoConsenso = await prisma.userConsent.findFirst({
      where: { hostId: host.id, guestEmail, tipo: 'marketing_email' },
      orderBy: { createdAt: 'desc' },
    })
    expect(ultimoConsenso?.accettato).toBe(false)

    // 3d. Richiesta cancellazione
    const cancelRes = await request.post(`/api/privacy/${token}/cancellazione`, {
      data: { motivo: 'test e2e' },
    })
    expect(cancelRes.ok()).toBe(true)

    const richiesta = await prisma.richiestaCancellazione.findFirst({
      where: { hostId: host.id, guestEmail },
    })
    expect(richiesta).not.toBeNull()
    expect(richiesta!.stato).toBe('PENDENTE')
    // Scadenza 30gg
    const gg = Math.round(
      (richiesta!.scadenzaAt.getTime() - richiesta!.richiestaAt.getTime()) / 86400000,
    )
    expect(gg).toBeGreaterThanOrEqual(29)
    expect(gg).toBeLessThanOrEqual(31)
  })
})

// ─── TEST 4: CONSENSI GRANULARI ─────────────────────────────────────────────

test.describe('GDPR: consent tracking', () => {
  test('consensi registrati separatamente con metodo appropriato', async () => {
    const { host } = await createTestHost('Host-Consent')
    const guestEmail = email('consent-user')

    await registraConsenso({
      hostId: host.id, tipo: 'privacy_ospite', versione: '2026-04-01',
      accettato: true, guestEmail, metodo: 'checkbox',
    })
    await registraConsenso({
      hostId: host.id, tipo: 'termini_servizio', versione: '2026-04-01',
      accettato: true, guestEmail, metodo: 'checkbox',
    })
    await registraConsenso({
      hostId: host.id, tipo: 'spa_art9', versione: '2026-04-01',
      accettato: true, guestEmail, metodo: 'firma_digitale',
    })
    await registraConsenso({
      hostId: host.id, tipo: 'marketing_email', versione: '2026-04-01',
      accettato: false, guestEmail, metodo: 'checkbox',
    })

    const records = await prisma.userConsent.findMany({
      where: { hostId: host.id, guestEmail },
    })
    expect(records.length).toBe(4)

    const spa = records.find((r) => r.tipo === 'spa_art9')
    expect(spa?.metodo).toBe('firma_digitale')
    expect(spa?.accettato).toBe(true)

    const marketing = records.find((r) => r.tipo === 'marketing_email')
    expect(marketing?.accettato).toBe(false)
  })
})

// ─── TEST 5: ISOLAMENTO MULTI-TENANT ───────────────────────────────────────

test.describe('GDPR: isolamento multi-tenant', () => {
  test('cancellaTuttiDatiOspite scoped per host non tocca altri tenant', async () => {
    const { host: hostA } = await createTestHost('Host-A')
    const { host: hostB } = await createTestHost('Host-B')
    const struttA = await createTestStruttura(hostA.id)
    const struttB = await createTestStruttura(hostB.id)
    const sharedEmail = email('shared-guest') // stesso ospite su 2 host

    await prisma.prenotazione.create({
      data: {
        hostId: hostA.id, strutturaId: struttA.id,
        guestNome: 'Carlo', guestCognome: 'A',
        guestEmail: sharedEmail,
        dataArrivo: new Date(), dataPartenza: new Date(Date.now() + 86400000),
        numOspiti: 1, prezzoTotale: 100,
      },
    })
    await prisma.prenotazione.create({
      data: {
        hostId: hostB.id, strutturaId: struttB.id,
        guestNome: 'Carlo', guestCognome: 'B',
        guestEmail: sharedEmail,
        dataArrivo: new Date(), dataPartenza: new Date(Date.now() + 86400000),
        numOspiti: 1, prezzoTotale: 200,
      },
    })

    // Cancellazione dati ospite da host A
    await cancellaTuttiDatiOspite(hostA.id, sharedEmail)

    const dopoA = await prisma.prenotazione.findMany({
      where: { hostId: hostA.id, guestCognome: 'A' },
    })
    const dopoB = await prisma.prenotazione.findMany({
      where: { hostId: hostB.id, guestCognome: 'B' },
    })

    // Host A: dati anonimizzati
    expect(dopoA.length).toBe(1)
    expect(dopoA[0].guestNome).toBe('Ospite')
    expect(dopoA[0].guestCognome).toBe('Anonimizzato')

    // Host B: dati intatti (isolamento riuscito)
    expect(dopoB.length).toBe(1)
    expect(dopoB[0].guestNome).toBe('Carlo')
    expect(dopoB[0].guestCognome).toBe('B')
    expect(dopoB[0].guestEmail).toBe(sharedEmail)
  })

  test('token portale di host A non sblocca dati di host B', async ({ request }) => {
    const { host: hostA } = await createTestHost('Host-A2')
    const { host: hostB } = await createTestHost('Host-B2')
    const struttB = await createTestStruttura(hostB.id)
    const emailB = email('only-in-B')

    await prisma.prenotazione.create({
      data: {
        hostId: hostB.id, strutturaId: struttB.id,
        guestNome: 'Segreto', guestCognome: 'B',
        guestEmail: emailB,
        dataArrivo: new Date(), dataPartenza: new Date(Date.now() + 86400000),
        numOspiti: 1,
      },
    })

    // Tokenizzo email di B ma contro host A (simulazione attacco)
    const tokenMalformato = generaPortaleToken(emailB, hostA.id)
    const res = await request.get(`/api/privacy/${tokenMalformato}`)
    expect(res.ok()).toBe(true) // token valido per hostA, ma hostA non ha quell'ospite

    const data = await res.json()
    // Le prenotazioni ritornate devono essere vuote (ospite non esiste su hostA)
    expect(data.prenotazioni?.length ?? 0).toBe(0)
  })
})

// ─── TEST 6: COOKIE BANNER ─────────────────────────────────────────────────

test.describe('GDPR: cookie banner', () => {
  test('appare su /book, memorizza scelta, non riappare dopo', async ({ page, context }) => {
    // Pulisci eventuali cookie precedenti
    await context.clearCookies()

    // Trova una struttura pubblica — usa quella appena creata
    const { host } = await createTestHost('Host-Cookie')
    const struttura = await createTestStruttura(host.id)

    await page.goto(`/book/${struttura.id}`)

    // Banner appare dopo 1s (lazy-show). Aspetta fino a 3s.
    const banner = page.getByRole('dialog', { name: /cookie|privacy/i })
    await expect(banner).toBeVisible({ timeout: 4000 })

    // Click "Solo necessari"
    await page.getByRole('button', { name: /solo necessari/i }).click()

    // Verifica cookie settato con analytics=false
    const cookies = await context.cookies()
    const consent = cookies.find((c) => c.name === 'otium_cookie_consent')
    expect(consent).toBeDefined()
    const parsed = JSON.parse(decodeURIComponent(consent!.value))
    expect(parsed.tecnici).toBe(true)
    expect(parsed.analytics).toBe(false)
    expect(parsed.marketing).toBe(false)

    // Ricarica: banner NON deve riapparire
    await page.reload()
    await page.waitForTimeout(1500)
    await expect(banner).not.toBeVisible()
  })
})
