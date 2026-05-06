# OTIUM WEEK — PROMPT DI ESECUZIONE COMPLETI
# 60 prompt dettagliati per Claude Code — Eseguire in ordine

> **Questo file contiene prompt PRATICI e COMPLETI.**
> Ogni prompt è pensato per essere incollato direttamente in Claude Code
> e produrre codice funzionante senza ambiguità.

---

## SEZIONE A — DATABASE & SCHEMA (Prompt 1-8)

### Prompt 1 — Migrazione Host god object

```
Leggi CLAUDE.md e prisma/schema.prisma. Conta i campi del modello Host.

ESEGUI questi step in ordine:

1. AGGIUNGI a schema.prisma questi 6 modelli 1:1 (SENZA rimuovere i campi da Host per ora):

model HostSmtpConfig {
  id String @id @default(cuid())
  hostId String @unique
  host Host @relation(fields: [hostId], references: [id], onDelete: Cascade)
  smtpHost String?
  smtpPort Int? @default(587)
  smtpUser String?
  smtpPass String?
  smtpFrom String?
  smtpNome String?
  verificato Boolean @default(false)
  @@map("host_smtp_config")
}

model HostConciergeConfig {
  id String @id @default(cuid())
  hostId String @unique
  host Host @relation(fields: [hostId], references: [id], onDelete: Cascade)
  attivo Boolean @default(false)
  apiKey String?
  modello String @default("claude-sonnet-4-20250514")
  temperatura Float @default(0.7)
  maxToken Int @default(500)
  promptSistema String? @db.Text
  knowledgeBase String? @db.Text
  linguaDefault String @default("it")
  autoEscalationMsg Int @default(10)
  orarioAttivo Boolean @default(false)
  orarioInizio String?
  orarioFine String?
  messaggioFuoriOrario String?
  @@map("host_concierge_config")
}

model HostWhatsAppConfig {
  id String @id @default(cuid())
  hostId String @unique
  host Host @relation(fields: [hostId], references: [id], onDelete: Cascade)
  accessToken String?
  phoneNumberId String?
  verifyToken String?
  webhookSecret String?
  configurato Boolean @default(false)
  @@map("host_whatsapp_config")
}

model HostBillingConfig {
  id String @id @default(cuid())
  hostId String @unique
  host Host @relation(fields: [hostId], references: [id], onDelete: Cascade)
  fattNomeAzienda String?
  fattPartitaIva String?
  fattCodiceFiscale String?
  fattIndirizzo String?
  fattCitta String?
  fattCap String?
  fattProvincia String?
  fattRegimeFiscale String? @default("RF01")
  sdiProvider String?
  sdiApiKey String?
  sdiCodice String?
  sdiPec String?
  prefissoFattura String @default("")
  prossimoNumero Int @default(1)
  @@map("host_billing_config")
}

model HostBrandingConfig {
  id String @id @default(cuid())
  hostId String @unique
  host Host @relation(fields: [hostId], references: [id], onDelete: Cascade)
  logo String?
  favicon String?
  colorePrimario String? @default("#6366f1")
  coloreSecondario String? @default("#818cf8")
  coloreSfondo String? @default("#ffffff")
  coloreTesto String? @default("#1a1625")
  fontFamily String? @default("Inter")
  borderRadius String? @default("12px")
  fotoHero String?
  messaggioBenvenuto String? @db.Text
  messaggioChiusura String? @db.Text
  regCardTerminiHtml String? @db.Text
  regCardPrivacyHtml String? @db.Text
  regCardCampiExtra Json?
  regCardSpaTerminiHtml String? @db.Text
  @@map("host_branding_config")
}

model HostWifiConfig {
  id String @id @default(cuid())
  hostId String @unique
  host Host @relation(fields: [hostId], references: [id], onDelete: Cascade)
  attivo Boolean @default(false)
  metodoAuth String @default("pin")
  durataSessMinuti Int @default(1440)
  bandaMaxMbps Int?
  ssid String?
  @@map("host_wifi_config")
}

2. AGGIUNGI le relazioni su Host:
  smtpConfig HostSmtpConfig?
  conciergeConfig HostConciergeConfig?
  whatsappConfig HostWhatsAppConfig?
  billingConfig HostBillingConfig?
  brandingConfig HostBrandingConfig?
  wifiConfig HostWifiConfig?

3. Esegui: npx prisma generate && npx prisma db push

4. CREA scripts/migrate-host-configs.ts che per ogni host:
   - Legge i campi corrispondenti dall'host
   - Crea le 6 config se non esistono già
   - Logga ogni migrazione
   - Eseguilo con: npx ts-node scripts/migrate-host-configs.ts

5. CREA lib/host-config.ts con getter tipizzati:
   export async function getSmtpConfig(hostId: string) { return prisma.hostSmtpConfig.findUnique({ where: { hostId } }) }
   export async function getBillingConfig(hostId: string) { ... }
   // uno per ogni config

6. CERCA nel progetto tutti i riferimenti a host.smtpHost, host.conciergeApiKey, host.whatsappAccessToken, ecc. e sostituiscili con le chiamate a lib/host-config.ts. Elenca i file modificati.
```

### Prompt 2 — Modello RigaFattura tipizzato

```
Leggi schema.prisma. Guarda il modello Fattura e il campo righe Json.

1. AGGIUNGI a schema.prisma:

model RigaFattura {
  id String @id @default(cuid())
  fatturaId String
  fattura Fattura @relation(fields: [fatturaId], references: [id], onDelete: Cascade)
  ordine Int
  descrizione String
  quantita Decimal @db.Decimal(10,2) @default(1)
  prezzoUnitario Decimal @db.Decimal(10,2)
  aliquotaIva Decimal @db.Decimal(5,2)
  naturaIva String?
  totaleRiga Decimal @db.Decimal(10,2)
  tipo String?
  prenotazioneId String?
  appuntamentoId String?
  @@index([fatturaId])
  @@map("righe_fattura")
}

2. Aggiungi su Fattura: righeRelation RigaFattura[]

3. npx prisma generate && npx prisma db push

4. CREA scripts/migrate-fattura-righe.ts:
   - Per ogni fattura con campo righe JSON non vuoto:
   - Parse JSON, crea RigaFattura per ogni riga
   - Logga: "{N} righe migrate per fattura {numero}"

5. AGGIORNA lib/fattura-elettronica.ts per usare righeRelation.
6. AGGIORNA i componenti UI fatture per creare/editare RigaFattura.
```

### Prompt 3 — Soft delete su entità critiche

```
Leggi schema.prisma.

1. AGGIUNGI deletedAt DateTime? su: Host, Struttura, Prenotazione, OspiteCRM, Fattura, AppuntamentoSpa, CanaleEsterno, StaffMember, ProdottoMagazzino.

Per ognuno aggiungi: @@index([deletedAt])

2. npx prisma generate && npx prisma db push

3. CREA lib/prisma-helpers.ts:

export const notDeleted = { deletedAt: null } as const

export async function softDelete(model: any, id: string, userId?: string) {
  const result = await model.update({ where: { id }, data: { deletedAt: new Date() } })
  if (userId) {
    await prisma.auditLog.create({ data: { azione: 'soft_delete', entita: model.name || 'unknown', entitaId: id, userId } })
  }
  return result
}

export async function restore(model: any, id: string) {
  return model.update({ where: { id }, data: { deletedAt: null } })
}

export function withHost(hostId: string, where?: any) {
  return { ...where, hostId, ...notDeleted }
}

export function paginate(page: number, size: number) {
  return { skip: (page - 1) * size, take: size }
}

4. CERCA nel progetto tutte le chiamate prisma.*.findMany e prisma.*.findFirst sotto app/api/host/ e aggiungi ...notDeleted al where. Elenca i file modificati.

5. SOSTITUISCI tutti i prisma.*.delete con softDelete(). Elenca i file.
```

### Prompt 4 — Indici database completi

```
Leggi schema.prisma.

VERIFICA e AGGIUNGI tutti gli indici mancanti. Lista completa:

Su Prenotazione:
@@index([hostId, stato])
@@index([hostId, dataArrivo])
@@index([hostId, dataPartenza])
@@index([hostId, statoCheckIn])
@@index([hostId, strutturaId, dataArrivo])
@@index([hostId, guestEmail])
@@index([unitaPrenotabileId, dataArrivo, dataPartenza])
@@index([checkInToken])
@@index([pin, hostId])

Su AppuntamentoSpa:
@@index([hostId, dataOra])
@@index([hostId, terapistaId, dataOra])
@@index([hostId, cabinaId, dataOra])

Su Incasso:
@@index([hostId, createdAt])
@@index([prenotazioneId])

Su Messaggio (o MessaggioWhatsApp):
@@index([conversazioneId, createdAt])

Su AuditLog:
@@index([hostId, createdAt])
@@index([hostId, entita, entitaId])

Su Notifica:
@@index([hostId, letta, createdAt])
@@index([userId, letta])

Su OspiteCRM:
@@index([hostId, email])
@@index([hostId, numSoggiorni])

Su Disponibilita:
@@index([strutturaId, data])
@@index([unitaPrenotabileId, data])

Su PrenotazioneCanale:
@@index([hostId, unitaPrenotabileId, dataInizio])
@@index([canaleEsternoId, uid])

Su TransazionePOS:
@@index([hostId, createdAt])

Su WaiverSpa:
@@index([appuntamentoId])
@@index([createdAt])

Su UserConsent:
@@index([guestEmail, tipo])
@@index([hostId, tipo])

Su TaskHK:
@@index([hostId, completato, dataScadenza])

Su SegnalazioneManutenzione:
@@index([hostId, stato, priorita])

Su Fattura:
@@index([hostId, dataEmissione])
@@index([hostId, stato])

Per ogni modello: verifica quali indici ci sono già, aggiungi solo quelli mancanti.
Esegui: npx prisma generate && npx prisma db push
```

### Prompt 5 — Encryption layer

```
Leggi CLAUDE.md.

CREA lib/crypto.ts:

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key && process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY is required in production')
  }
  if (!key) return Buffer.alloc(32, 0) // dev fallback
  return Buffer.from(key, 'hex')
}

export function encrypt(plaintext: string): string {
  if (!process.env.ENCRYPTION_KEY) return `plain:${plaintext}`
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${encrypted.toString('base64')}:${tag.toString('base64')}`
}

export function decrypt(ciphertext: string): string {
  if (ciphertext.startsWith('plain:')) return ciphertext.slice(6)
  const [ivB64, encB64, tagB64] = ciphertext.split(':')
  const iv = Buffer.from(ivB64, 'base64')
  const encrypted = Buffer.from(encB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}

export function encryptNullable(v: string | null): string | null { return v ? encrypt(v) : null }
export function decryptNullable(v: string | null): string | null { return v ? decrypt(v) : null }

CREA lib/host-secrets.ts:

import { decrypt, encrypt } from './crypto'

const SECRET_FIELDS = ['smtpPass', 'apiKey', 'accessToken', 'verifyToken', 'webhookSecret', 'sdiApiKey'] as const

export async function getHostSecret(hostId: string, configType: 'smtp' | 'concierge' | 'whatsapp' | 'billing', field: string): Promise<string | null> {
  const configMap = {
    smtp: prisma.hostSmtpConfig,
    concierge: prisma.hostConciergeConfig,
    whatsapp: prisma.hostWhatsAppConfig,
    billing: prisma.hostBillingConfig,
  }
  const record = await configMap[configType].findUnique({ where: { hostId }, select: { [field]: true } })
  if (!record || !record[field]) return null
  try { return decrypt(record[field]) } catch { return record[field] }
}

export async function setHostSecret(hostId: string, configType: string, field: string, value: string | null) {
  const configMap = { smtp: prisma.hostSmtpConfig, concierge: prisma.hostConciergeConfig, whatsapp: prisma.hostWhatsAppConfig, billing: prisma.hostBillingConfig }
  await configMap[configType].update({ where: { hostId }, data: { [field]: value ? encrypt(value) : null } })
}

CREA scripts/encrypt-existing-secrets.ts:
- Per ogni host config con campi sensibili non ancora cifrati (non contengono ':'):
  Cifra il valore e aggiorna il record. Logga.

Aggiungi a .env.example:
# Genera con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=
```

### Prompt 6 — Modello PrenotazioneRistorante e ConfigRistorante

```
Leggi schema.prisma.

AGGIUNGI:

model PrenotazioneRistorante {
  id String @id @default(cuid())
  hostId String
  strutturaId String
  guestNome String
  guestCognome String
  guestEmail String
  guestTelefono String?
  dataOra DateTime
  numPersone Int
  note String?
  stato String @default("CONFERMATA")
  fonte String @default("diretto")
  prenotazioneId String?
  ospiteCrmId String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([hostId, dataOra])
  @@index([strutturaId, dataOra])
  @@map("prenotazioni_ristorante")
}

model ConfigRistorante {
  id String @id @default(cuid())
  hostId String
  strutturaId String @unique
  nomeRistorante String?
  oraApertura String @default("12:00")
  oraChiusura String @default("22:00")
  intervalloSlot Int @default(30)
  maxCopertiPerSlot Int @default(30)
  giorniChiusura Int[] @default([])
  prenotazioneOnline Boolean @default(true)
  confermaAutomatica Boolean @default(true)
  @@map("config_ristorante")
}

Se non esiste, aggiungi anche:

model ConfigEmail {
  id String @id @default(cuid())
  hostId String
  templateId String
  attiva Boolean @default(true)
  oggettoCustom String?
  messaggioCustom String?
  ritardoOre Int?
  @@unique([hostId, templateId])
  @@map("config_email")
}

model ExportAlloggiati {
  id String @id @default(cuid())
  hostId String
  strutturaId String
  dataExport DateTime @db.Date
  numOspiti Int
  numAccompagnatori Int
  numIncompleti Int
  fileNome String
  fileContenuto String @db.Text
  esportatoDa String?
  createdAt DateTime @default(now())
  @@index([hostId, dataExport])
  @@map("export_alloggiati")
}

model RichiestaCancellazione {
  id String @id @default(cuid())
  hostId String
  guestEmail String
  guestNome String
  motivo String?
  stato String @default("PENDENTE")
  motivoRifiuto String?
  datiCancellati Json?
  richiestaAt DateTime @default(now())
  scadenzaAt DateTime
  completataAt DateTime?
  completataDa String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([hostId, stato])
  @@map("richieste_cancellazione")
}

model DPAAccettazione {
  id String @id @default(cuid())
  hostId String
  versione String
  firmaBase64 String? @db.Text
  firmaNome String
  firmaRuolo String?
  ip String?
  userAgent String?
  accettatoAt DateTime @default(now())
  @@index([hostId])
  @@map("dpa_accettazioni")
}

model PagamentoPiattaforma {
  id String @id @default(cuid())
  hostId String
  importo Decimal @db.Decimal(10,2)
  valuta String @default("EUR")
  metodo String @default("MANUALE")
  stato String @default("PAGATO")
  riferimento String?
  note String?
  periodoInizio DateTime @db.Date
  periodoFine DateTime @db.Date
  createdAt DateTime @default(now())
  registratoDa String?
  @@index([hostId])
  @@map("pagamenti_piattaforma")
}

model TicketSupporto {
  id String @id @default(cuid())
  hostId String
  oggetto String
  descrizione String @db.Text
  categoria String
  priorita String @default("NORMALE")
  stato String @default("APERTO")
  assegnatoA String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  risposte TicketRisposta[]
  @@index([hostId, stato])
  @@map("ticket_supporto")
}

model TicketRisposta {
  id String @id @default(cuid())
  ticketId String
  ticket TicketSupporto @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  autoreId String
  autoreEmail String
  autoreRuolo String
  testo String @db.Text
  allegati Json?
  createdAt DateTime @default(now())
  @@map("ticket_risposte")
}

Aggiungi su Host se mancano:
  stripeCustomerId String? @unique
  stripeSubscriptionId String? @unique
  dpaAccettato Boolean @default(false)

Esegui: npx prisma generate && npx prisma db push
```

### Prompt 7 — Campo ospiteCrmId su Prenotazione

```
Leggi schema.prisma. Verifica se Prenotazione ha il campo ospiteCrmId.

Se non esiste:
1. Aggiungi su Prenotazione:
   ospiteCrmId String?
   ospiteCrm OspiteCRM? @relation(fields: [ospiteCrmId], references: [id])

2. Aggiungi su OspiteCRM la relazione inversa:
   prenotazioni Prenotazione[]

3. npx prisma generate && npx prisma db push

4. CREA scripts/link-prenotazioni-crm.ts:
   Per ogni prenotazione senza ospiteCrmId:
   - Cerca OspiteCRM con stesso hostId + guestEmail
   - Se trovato: aggiorna ospiteCrmId
   - Logga quante prenotazioni collegate
```

### Prompt 8 — Seed data completo

```
Leggi schema.prisma.

CREA prisma/seed.ts:

Script completo che popola il DB con dati realistici per sviluppo e test.

Deve creare:
- 1 user SUPERADMIN (admin@otiumweek.com / admin123)
- 1 PlatformSettings
- 2 host (Hotel 4 stelle completo + B&B piccolo)
- Per l'hotel: 8 camere, 20 prenotazioni (passate/presenti/future), 6 trattamenti SPA, 2 terapisti, 2 cabine, 10 ospiti CRM, 5 task HK, 3 segnalazioni manutenzione, 2 fatture, 10 prodotti magazzino, config ristorante
- Per il B&B: 3 camere, 5 prenotazioni, solo moduli base
- Nomi italiani realistici per ospiti

Usa createMany dove possibile per performance.
Genera PIN 4 cifre univoci, checkInToken con crypto.randomUUID().
Date distribuite: 10 prenotazioni passate (ultime 4 settimane), 5 in-house oggi, 5 future (prossime 2 settimane).

Aggiungi in package.json:
"prisma": { "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" }

Esegui: npx prisma db seed
```

---

## SEZIONE B — LIBRERIE CORE (Prompt 9-18)

### Prompt 9 — Pricing engine

```
Leggi schema.prisma. Guarda TariffaPeriodo, RegolaTariffa, UnitaPrenotabile.

CREA lib/pricing.ts con la funzione calcolaPrezzo() completa.

Input: { unitaId, hostId, strutturaId, dataArrivo, dataPartenza, adulti, bambini, lettoExtra, codicePromo? }

Output PriceBreakdown: { prezzoBaseNotte, tariffaPeriodoNotte, notti, subtotaleAlloggio, regoleApplicate[], supplementi[], subtotaleSconti, subtotaleSupplementi, tassaSoggiorno: { importoNotte, persone, notti, totale }, totale, valuta }

La funzione deve:
1. Caricare unità e prezzo base
2. Cercare TariffaPeriodo attiva per le date (la più specifica per priorità)
3. Applicare il prezzo override o la % modifica dalla tariffa
4. Caricare RegoleTariffa attive e applicarle per priorità:
   - WEEKEND: conta notti ven/sab, applica % supplemento
   - DURATA: se notti >= minNotti, applica % sconto
   - EARLY_BIRD: se giorni anticipo >= giorniMinimi, sconto
   - LAST_MINUTE: se giorni anticipo <= giorniMassimi, sconto
   - FESTIVO: conta giorni festivi italiani (1/1, 6/1, 25/4, 1/5, 2/6, 15/8, 1/11, 8/12, 25/12, 26/12 + Pasqua/Pasquetta), supplemento
5. Calcolare supplementi (letto extra, persona extra)
6. Calcolare tassa soggiorno (da config struttura, esenzione bambini < 14)
7. Arrotondare ogni importo a 2 decimali
8. Ritornare il breakdown completo

CREA anche helper functions: contaNottiWeekend(), contaGiorniFestivi(), calcolaEtaPasqua().

SCRIVI almeno 10 test in tests/unit/lib/pricing.test.ts.
```

### Prompt 10 — Availability engine

```
Leggi schema.prisma. Guarda Disponibilita, Prenotazione, PrenotazioneCanale, SegnalazioneManutenzione.

CREA lib/availability.ts con due funzioni:

1. calcolaDisponibilita({ strutturaId, hostId, dataInizio, dataFine, unitaId? }):
   Ritorna DisponibilitaGiornaliera[] con per ogni giorno, per ogni unità: disponibile boolean + motivo.
   Incrocia: prenotazioni confermate/richiesta + blocchi OTA + chiusure + manutenzioni urgenti.
   Carica TUTTO in 4 query parallele, calcola in memoria (non una query per giorno).

2. verificaDisponibilitaPrenotazione({ unitaId, hostId, strutturaId, dataArrivo, dataPartenza, escludiPrenotazioneId? }):
   Ritorna { disponibile: boolean, giorniOccupati: string[] }.
   Usata nel booking e nella modifica prenotazione.

SCRIVI almeno 8 test in tests/unit/lib/availability.test.ts.
```

### Prompt 11 — SPA availability

```
Leggi schema.prisma. Guarda DisponibilitaTerapista, TerapistaSpa, CabinaSpa, AppuntamentoSpa.

CREA lib/spa-availability.ts con:

1. calcolaSlotSpa({ hostId, strutturaId, data, durata, trattamentoId? }):
   Ritorna SpaSlot[] = Array<{ oraInizio, oraFine, terapisti[], cabineDisponibili }>.
   Per ogni slot 30min dalle 8 alle 20:
   - Verifica terapisti: disponibilità settimanale/specifica - blocchi - appuntamenti sovrapposti
   - Verifica cabine: totali - occupate nello slot (con buffer durataPuliziaMinuti)
   - Slot disponibile solo se >= 1 terapista E >= 1 cabina

2. assegnaCabina({ hostId, dataOra, durata }):
   Ritorna cabinaId | null della prima cabina libera.

SCRIVI almeno 5 test.
```

### Prompt 12 — Ristorante availability

```
Leggi schema.prisma. Guarda ConfigRistorante, PrenotazioneRistorante.

CREA lib/ristorante-availability.ts con:

calcolaSlotRistorante({ strutturaId, data, numPersone }):
Ritorna Array<{ ora: string, copertiDisponibili: number }>.
- Carica ConfigRistorante per la struttura
- Verifica giorno chiusura
- Per ogni slot (intervallo da config) nell'orario apertura-chiusura:
  - Conta coperti prenotati (sum numPersone delle prenotazioni ±30min dallo slot)
  - Disponibili = maxCopertiPerSlot - occupati
  - Mostra solo se disponibili >= numPersone richieste
```

### Prompt 13 — CRM sync e merge

```
Leggi schema.prisma. Guarda OspiteCRM, Prenotazione.

CREA lib/crm-sync.ts con 3 funzioni:

1. syncOspiteCRM({ hostId, guestEmail, guestNome, guestCognome, guestTelefono?, guestLingua?, prenotazioneId, importo? }):
   - Cerca OspiteCRM per email+hostId
   - Se esiste: aggiorna dati, incrementa numSoggiorni e totaleSpeso, aggiorna dataUltimoSoggiorno
   - Se non esiste: crea nuovo record
   - Collega prenotazione.ospiteCrmId

2. cercaDuplicatiCRM(hostId, ospiteId):
   - Cerca per email simile O nome+cognome simile O telefono uguale
   - Ritorna array di possibili duplicati

3. mergeCRM(hostId, keepId, mergeId, campiDaMerge?):
   - In $transaction: somma contatori, sposta relazioni (prenotazioni, appuntamenti, fedelta), soft delete del merged
```

### Prompt 14 — Consent management

```
Leggi schema.prisma. Guarda UserConsent.

CREA lib/consent.ts con:

CONSENT_TYPES definizione completa (privacy_ospite, termini_servizio, marketing_email, marketing_sms, spa_art9, profilazione_crm, cookie_analytics) con label, obbligatorio, baseGiuridica, revocabile.

registraConsenso({ hostId, guestEmail?, guestToken?, userId?, tipo, versione, accettato, ip?, userAgent?, metodo? }):
- Crea SEMPRE un nuovo record (storia immutabile)
- Se accettato=false: setta revocatoAt sul record precedente
- Se revoca spa_art9: cancella dati sanitari (WaiverSpa)
- Logga in AuditLog

consensoAttivo(guestEmail, hostId, tipo): boolean
getConsensiOspite(guestEmail, hostId): stato per ogni tipo
generaGuestToken(email, hostId): HMAC-SHA256
verificaGuestToken(token, email, hostId): boolean
```

### Prompt 15 — GDPR retention engine

```
Leggi schema.prisma.

CREA lib/gdpr-retention.ts con:

RETENTION_POLICIES array: 10 policy per ogni tipo di dato con giorniRetention, azione (anonimizza/cancella), baseGiuridica, riferimentoNormativo.

Funzioni di anonimizzazione: anonimizzaPrenotazione(), anonimizzaPrenotazioneAlloggiati() (dopo 5 anni), cancellaWaiverSpa() (DELETE), anonimizzaAccompagnatore(), anonimizzaOspiteCRM(), anonimizzaFattura().

eseguiRetention(): esegue tutte le policy, ritorna report.
notificaRetentionImminente(): avvisa host dei dati in scadenza.
```

### Prompt 16 — Alloggiati Web generator

```
Leggi schema.prisma. Guarda i campi guest* e ISTAT su Prenotazione e Accompagnatore.

CREA lib/alloggiati.ts con:

generaFileAlloggiati(struttura, prenotazioni[]): string
- Genera il file a record posizionali per la Questura
- Tipo 16/17/18 per ospite principale, 19 per accompagnatori
- Pad ogni campo alla larghezza corretta
- Formato: cognome 50 char, nome 20 char, sesso 1 char, date GGMMAAAA, codici ISTAT 9 cifre

validaPrenotazioneAlloggiati(prenotazione): { valido: boolean, campiMancanti: string[] }
- Verifica tutti i campi obbligatori
```

### Prompt 17 — Fattura elettronica XML

```
Leggi schema.prisma, lib/host-config.ts.

CREA lib/fattura-elettronica.ts con:

generaFatturaPA(fatturaId): string (XML FatturaPA 1.2.2)
- Carica fattura + righe + host billing config
- Genera XML conforme allo standard SDI:
  FatturaElettronicaHeader (DatiTrasmissione, CedentePrestatore, CessionarioCommittente)
  FatturaElettronicaBody (DatiGenerali, DatiBeniServizi con DettaglioLinee per ogni riga, DatiRiepilogo per aliquota)
- Gestisce: TD01 (fattura) e TD04 (nota credito), regime fiscale, CodiceDestinatario/PEC

generaPdfFattura(fatturaId): Buffer
- PDF leggibile con layout professionale: header logo+dati azienda, dati cliente, tabella righe, riepilogo IVA, totali
```

### Prompt 18 — Email templates e trigger

```
Leggi schema.prisma, lib/email.ts, lib/email-queue.ts.

CREA lib/email-templates.ts:

Definisci 12 template email con funzione renderEmail(templateId, data):

1. conferma_prenotazione — ospite, immediata
2. prenotazione_richiesta_host — host, immediata
3. pre_checkin — ospite, 72h prima
4. reminder_arrivo — ospite, 24h prima
5. benvenuto — ospite, dopo check-in verificato
6. follow_up — ospite, 24h dopo partenza
7. cancellazione — ospite, immediata
8. conferma_spa — ospite, immediata
9. reminder_spa — ospite, 24h prima
10. conferma_ristorante — ospite, immediata
11. invito_staff — staff, immediata
12. benvenuto_host — host, dopo registrazione

Ogni template:
- HTML responsive table-based (compatibile Gmail/Outlook)
- Header: logo struttura + foto hero
- Body: testo + CTA button con brand-primary della struttura
- Footer: indirizzo + social + link privacy
- Multilingua: usa oggetto messages.{lingua} per scegliere i testi

CREA lib/email-triggers.ts con una funzione per ogni trigger.

CREA/AGGIORNA app/api/cron/email-automatiche/route.ts:
Cron ogni ora, processa: pre_checkin (72h prima), reminder_arrivo (24h prima), follow_up (24h dopo), reminder_spa (24h prima).
```

---

## SEZIONE C — API ENDPOINTS (Prompt 19-30)

### Prompt 19 — API booking camere: disponibilità

```
CREA app/api/book/[strutturaId]/camere/disponibilita/route.ts:

GET pubblico, rate limit 60/min.
Query: arrivo, partenza, adulti, bambini.
Usa lib/availability.ts + lib/pricing.ts.
Ritorna: { struttura, ricerca, camere: Array<{ unitaId, nome, immagine, capacita, lettiExtra, piano, prezzo: PriceBreakdown }>, suggerimenti }
Cache-Control: max-age=30.
```

### Prompt 20 — API booking camere: prenotazione

```
CREA app/api/book/[strutturaId]/camere/prenota/route.ts:

POST pubblico, rate limit 10/min.
Body Zod: unitaId, dataArrivo, dataPartenza, adulti, bambini, lettoExtra, guestNome, guestCognome, guestEmail, guestTelefono?, guestNote?, guestLingua, codicePromo?, consensi.

$transaction:
1. Verifica disponibilità (409 se occupata)
2. Ricalcola prezzo server-side
3. Crea Prenotazione (stato CONFERMATA o RICHIESTA)
4. Genera checkInToken + PIN univoco
5. Aggiorna Disponibilita
6. Sync CRM
7. Registra consensi
8. Notifica host + email conferma ospite
9. AuditLog
```

### Prompt 21 — API booking SPA

```
CREA app/api/book/[strutturaId]/spa/trattamenti/route.ts:
GET: ritorna trattamenti attivi + prenotabiliOnline + percorsi.

CREA app/api/book/[strutturaId]/spa/disponibilita/route.ts:
GET: query data+trattamentoId+durata. Usa lib/spa-availability.ts.

CREA app/api/book/[strutturaId]/spa/prenota/route.ts:
POST: $transaction con lock ottimistico, crea AppuntamentoSpa + WaiverSpa + PagamentoSpa, assegna cabina, sync CRM, registra consensi Art.9, notifica + email.
```

### Prompt 22 — API booking ristorante

```
CREA app/api/book/[strutturaId]/ristorante/disponibilita/route.ts:
GET: query data+numPersone. Usa lib/ristorante-availability.ts.

CREA app/api/book/[strutturaId]/ristorante/prenota/route.ts:
POST: crea PrenotazioneRistorante, sync CRM, notifica, email conferma.
```

### Prompt 23 — API check-in online

```
CREA app/api/checkin/[token]/complete/route.ts:

POST con body: datiPersonali, documento (tipo, numero, luogoRilascio, fotoFronte base64, fotoRetro base64), accompagnatori[], firma (firmaBase64, accTermini, accPrivacy, accMarketing), campiExtra.

$transaction:
1. Valida token, carica prenotazione
2. Aggiorna campi guest* sulla prenotazione
3. Salva foto documento (base64 → campo o storage)
4. Crea/aggiorna Accompagnatore per ogni accompagnatore
5. Setta statoCheckIn='ONLINE_COMPLETATO', regCardFirmata=true, regCardFirmaBase64, regCardDataFirma
6. Registra consensi
7. Sync CRM
8. Notifica host
9. AuditLog
Ritorna: { success, pin, messaggio }
```

### Prompt 24 — API dashboard host

```
CREA app/api/host/dashboard/route.ts:

GET con requireHost(). Ritorna TUTTO in una chiamata con Promise.all:
- oggi: { arrivi lista con statoCheckIn, partenze lista con regCardFirmata, inHouse count }
- kpi: { ospiti, ospitiDelta, arrivi, arriviDelta, revenue oggi, revenueDelta%, spaAppuntamenti }
- azioni: { prenotazioniDaConfermare, checkinDaVerificare, taskHKAperti, manutenzioneUrgente, messaggiNonLetti, fattureDaEmettere }
- occupazione: { occupate, totali, percentuale, settimana 7 giorni }
- spaOggi: { appuntamenti, completati, prossimo } (null se modulo non attivo)
- attivitaRecente: ultimi 10 eventi (tipo, testo, tempo, linkUrl)

Select mirato su ogni query. Cache max-age=15.
```

### Prompt 25 — API sidebar badges

```
CREA app/api/host/sidebar-badges/route.ts:

GET con requireHost(). Promise.all di count queries:
{ prenotazioniNuove, arriviOggi, partenzeOggi, taskHKAperti, manutenzioneAperta, messaggiNonLetti, notificheNonLette, spaOggi }
Skip query per moduli non attivi. Cache max-age=30.
```

### Prompt 26 — API prenotazioni CRUD

```
CREA app/api/host/prenotazioni/route.ts:
GET: lista paginata con filtri (stato, search, dateRange, canale, page, pageSize, sort). Select mirato. withHost().

CREA app/api/host/prenotazioni/[id]/route.ts:
GET: dettaglio con include completo (unità, struttura, accompagnatori, addebiti, appuntamenti SPA, incassi).
PATCH: aggiorna campi.

CREA app/api/host/prenotazioni/[id]/conferma/route.ts:
POST: stato→CONFERMATA, notifica, email.

CREA app/api/host/prenotazioni/[id]/annulla/route.ts:
POST: stato→ANNULLATA, libera disponibilità, notifica, email.

CREA app/api/host/prenotazioni/[id]/send-checkin/route.ts:
POST: genera checkInToken se mancante, invia email pre_checkin.
```

### Prompt 27 — API calendario planning

```
CREA app/api/host/calendario/route.ts:

GET: query da, a, strutturaId.
Ritorna: { unita[], prenotazioni[] (select: id, unitaId, guestNome, guestCognome, dataArrivo, dataPartenza, stato, fonte), blocchiOTA[], tariffe[], chiusure[] }
Tutto filtrato per hostId + strutturaId. withHost().
```

### Prompt 28 — API CRM, HK, manutenzione

```
CREA app/api/host/crm/route.ts: GET lista paginata + POST crea.
CREA app/api/host/crm/[id]/route.ts: GET dettaglio + PATCH aggiorna + DELETE soft.
CREA app/api/host/crm/[id]/duplicati/route.ts: GET cerca duplicati.
CREA app/api/host/crm/merge/route.ts: POST merge.

CREA app/api/host/housekeeping/[unitaId]/stato/route.ts: PATCH cambio stato HK con optimistic.

CREA app/api/host/manutenzione/route.ts: GET lista + POST crea.
CREA app/api/host/manutenzione/[id]/route.ts: PATCH aggiorna (stato, assegnazione, risoluzione).
```

### Prompt 29 — API fatture e alloggiati

```
CREA app/api/host/fatture/route.ts: GET lista paginata + POST crea.
CREA app/api/host/fatture/[id]/route.ts: GET dettaglio + PATCH aggiorna.
CREA app/api/host/fatture/[id]/pdf/route.ts: GET genera PDF.
CREA app/api/host/fatture/[id]/xml/route.ts: GET genera XML FatturaPA.

CREA app/api/host/alloggiati/route.ts: GET arrivi per data con stato completezza.
CREA app/api/host/alloggiati/export/route.ts: POST genera file + salva ExportAlloggiati.
CREA app/api/host/alloggiati/completa/[prenotazioneId]/route.ts: PATCH aggiorna campi Alloggiati.
```

### Prompt 30 — API analytics e report

```
CREA app/api/host/analytics/route.ts:
GET: query da, a, strutturaId, granularita.
Usa Prisma.$queryRaw per aggregazioni:
- Revenue per periodo (GROUP BY date_trunc)
- Occupazione media per giorno
- Prenotazioni per canale (GROUP BY fonte)
- Top camere per notti vendute
Calcola KPI: revenue, occupazione%, ADR, RevPAR, durata media, delta vs periodo precedente.

CREA app/api/host/report/route.ts:
GET con query tipo (revenue_periodo, revenue_camera, incassi, tassa_soggiorno, iva) + periodo.
Ritorna dati tabellari + totali.

CREA app/api/host/report/export/route.ts:
GET: genera CSV del report richiesto. Content-Type: text/csv, Content-Disposition: attachment.
```

---

## SEZIONE D — CRON JOBS (Prompt 31-34)

### Prompt 31 — Cron email automatiche

```
CREA app/api/cron/email-automatiche/route.ts:

GET, autenticazione CRON_SECRET.
Ogni ora:
1. Pre check-in (72h prima): prenotazioni CONFERMATA, dataArrivo tra 71-73 ore, reminderInviato=false → invia + setta true
2. Reminder arrivo (24h prima): prenotazioni CONFERMATA, dataArrivo tra 23-25 ore → invia
3. Follow up (24h dopo): prenotazioni COMPLETATA, dataPartenza tra 23-25 ore fa, followUpInviato=false → invia + setta true
4. Reminder SPA (24h prima): appuntamenti CONFERMATO/PRENOTATO, dataOra tra 23-25 ore → invia
Logga: "Cron email: {N} inviate per {M} host"
```

### Prompt 32 — Cron GDPR retention

```
CREA app/api/cron/gdpr-retention/route.ts:

GET, autenticazione CRON_SECRET.
Ogni notte alle 03:00:
1. notificaRetentionImminente() — avvisa host 15gg prima
2. eseguiRetention() — anonimizza/cancella dati scaduti
3. Salva report in AuditLog
4. Se errori: logga in Sentry + notifica SUPERADMIN
Timeout: batch di 100 record per policy, max 50 secondi.
```

### Prompt 33 — Cron iCal sync

```
CREA app/api/cron/ical-sync/route.ts:

GET, autenticazione CRON_SECRET.
Ogni 15 minuti:
Per ogni CanaleEsterno attivo:
- Fetch feed iCal con timeout 10s
- Parse RFC 5545
- Sync: crea/aggiorna/elimina PrenotazioneCanale
- Se errore fetch: incrementa contatore fallimenti, se 3+: disattiva canale + notifica host
- Logga risultati per canale
```

### Prompt 34 — Cron backup e vercel.json

```
CREA .github/workflows/backup.yml per backup DB giornaliero (pg_dump → S3/R2).

CREA/AGGIORNA vercel.json con tutti i cron:
{
  "crons": [
    { "path": "/api/cron/email-automatiche", "schedule": "0 * * * *" },
    { "path": "/api/cron/gdpr-retention", "schedule": "0 2 * * *" },
    { "path": "/api/cron/ical-sync", "schedule": "*/15 * * * *" }
  ]
}
```

---

## SEZIONE E — NOTIFICHE E COMUNICAZIONE (Prompt 35-37)

### Prompt 35 — Sistema notifiche

```
CREA lib/notifications.ts:

18 tipi di notifica definiti. Funzione inviaNotifica({ tipo, hostId, titolo, messaggio, linkUrl?, urgente?, destinatarioUserId? }).
Crea record Notifica + push real-time se destinatario online + email se urgente.

Helper per ogni tipo: notificaNuovaPrenotazione(), notificaCheckinOnline(), notificaManutenzioneUrgente(), notificaEscalation(), ecc.

CREA app/api/host/notifiche/route.ts: GET lista paginata.
CREA app/api/host/notifiche/[id]/letta/route.ts: PATCH.
CREA app/api/host/notifiche/mark-all-read/route.ts: POST.
```

### Prompt 36 — iCal import/export

```
CREA lib/ical-import.ts: importaFeedICal(canaleEsternoId) + importaTuttiCanali(hostId).
Parse RFC 5545 con node-ical, sync per UID, rimozione blocchi scomparsi.

CREA lib/ical-export.ts: generaFeedICal(unitaId, token) + feed .ics RFC 5545.
Include prenotazioni dirette + blocchi altri canali, escludi lo stesso canale (no loop), SUMMARY "Occupato".

CREA app/api/ical/[unitaId]/route.ts: GET pubblico con token HMAC, Content-Type text/calendar, Cache-Control max-age=900.
```

### Prompt 37 — WhatsApp webhook e concierge AI

```
CREA lib/whatsapp-webhook.ts: processaWebhookWhatsApp() — parse Meta Cloud API payload, identifica ospite, trova/crea conversazione, se non escalata chiama AI, se escalata notifica host.

CREA lib/whatsapp-send.ts: inviaMessaggioWhatsApp() e inviaTemplateWhatsApp() tramite Meta Cloud API.

CREA lib/ai-provider.ts: generaRispostaConcierge() — costruisce system prompt con info struttura + ospite + knowledge base, chiama Anthropic API, detecta escalation.

CREA app/api/webhook/whatsapp/[hostId]/route.ts: GET verifica webhook, POST ricevi messaggi.

CREA app/api/host/concierge/config/route.ts: PATCH salva config concierge.
CREA app/api/host/concierge/test/route.ts: POST testa messaggio con settings attuali.
```

---

## SEZIONE F — PAGINE PUBBLICHE (Prompt 38-47)

### Prompt 38 — Branding engine e layout booking

```
CREA lib/branding.ts con getBrandTheme() e brandToCSS() che genera CSS custom properties dal tema struttura.

CREA components/book/booking-layout.tsx: wrapper white-label con header (logo, nav tabs, language switcher), footer (indirizzo, social, privacy link), CSS variables brand. Header glass on scroll.

CREA components/book/booking-stepper.tsx: stepper condiviso 2-5 step con pallini, linee, navigazione, bottoni sticky bottom. Animazione slide tra step.
```

### Prompt 39 — Landing struttura

```
CREA app/book/[strutturaId]/page.tsx:

Hero section (fotoHero con overlay + nome serif + CTA | header semplice se no foto).
Grid card servizi (camere/SPA/ristorante) con hover translateY.
Info struttura (indirizzo, check-in/out, telefono).
SEO metadata + JSON-LD LodgingBusiness.
Se 1 solo servizio attivo: redirect diretto.
```

### Prompt 40 — Booking camere: step 1 date e camere

```
CREA components/book/date-range-picker.tsx: calendario 2 mesi, selezione range, giorni disabilitati, mobile 1 mese.

CREA components/book/guest-counter.tsx: stepper adulti/bambini con età bambini.

CREA components/book/camere/step-date-camere.tsx: date picker + counter + griglia card camera (immagine + nome + capacità + prezzo PriceBreakdown + bottone Prenota). Fetch disponibilità al cambio date.
```

### Prompt 41 — Booking camere: step 2-3 dati e conferma

```
CREA components/book/camere/step-dati-ospite.tsx: form compatto (nome, cognome, email, telefono, note) + consensi + precompilazione da cookie.

CREA components/book/camere/step-conferma.tsx: card riepilogo tipo ricevuta con breakdown prezzi + policy cancellazione + bottone conferma + success-screen + gestione errore 409.

CREA components/book/price-summary.tsx: card sticky con riepilogo prezzo che si popola progressivamente.

CREA components/book/success-screen.tsx: check animato + riepilogo + messaggio + .ics download + link SPA.
```

### Prompt 42 — Check-in online: tutti gli step

```
CREA app/checkin/[token]/page.tsx: server component che valida token + carica dati.

CREA components/checkin/checkin-flow.tsx: client con useReducer, persistenza localStorage, skip logic accompagnatori.

CREA components/checkin/steps/step-dati-personali.tsx: dati precompilati + Alloggiati (sesso bottoni, data nascita 3 select, luogo nascita autocomplete comuni ISTAT, cittadinanza, CF).

CREA components/checkin/steps/step-documento.tsx: 4 card tipo documento + foto fronte/retro con camera + compressione client-side + numero + luogo rilascio.

CREA components/checkin/steps/step-accompagnatori.tsx: accordion per ogni accompagnatore, form compatto, minori con meno campi, skip se numOspiti=1.

CREA components/checkin/steps/step-firma.tsx: riepilogo + box T&C scrollabile + checkbox obbligatorie + pad firma canvas HiDPI.

CREA components/checkin/steps/step-conferma-checkin.tsx: loading animation + success con PIN grande + info utili + errore con retry.
```

### Prompt 43 — Booking SPA completo

```
CREA app/book/[strutturaId]/spa/page.tsx + components/book/spa/spa-booking-flow.tsx.

CREA components/book/spa/step-servizio.tsx: tab trattamenti/percorsi + filtro categorie pills + griglia card + selezione.

CREA components/book/spa/step-slot.tsx: pills giorni 14gg + grid slot orari + scelta terapista opzionale.

CREA components/book/spa/step-dati-waiver.tsx: dati ospite + waiver biforcato (bottone "sto bene" vs "ho qualcosa") + percorso segnalazioni (condizioni, allergie, body map semplificata, consenso Art.9) + preferenze + firma.

CREA components/book/spa/step-conferma-spa.tsx: riepilogo + 4 metodi pagamento (camera/contanti/carta/bonifico) + conferma + success.

CREA components/spa/body-map-simple.tsx: SVG 8 zone tappabili, solo "da evitare", solo frontale, chip rimovibili.
```

### Prompt 44 — Booking ristorante

```
CREA app/book/[strutturaId]/ristorante/page.tsx + components/book/ristorante/ristorante-flow.tsx.

Flusso 2 step:
Step 1: pills giorni + stepper persone + grid slot orari + note textarea.
Step 2: form dati (nome, cognome, telefono obbligatorio, email) + riepilogo + conferma + success.
```

### Prompt 45 — Kiosk checkout tablet

```
CREA app/kiosk/[token]/page.tsx:

3 schermate full-screen touch-only:
1. Attesa: logo grande + "Benvenuti" + polling 5s per prenotazione attiva
2. Benvenuto: "Buongiorno {nome}" + riepilogo + bottone "Inizia" gigante + language switcher
3. Firma: pad 60% schermo + "Cancella"/"Conferma firma" + mini riepilogo sopra
4. Completato: check animato + "Grazie e buon viaggio!" + auto-reset 8s

Font min 20px, bottoni min 60px, nessun hover, colori brand struttura.
```

### Prompt 46 — Portale privacy ospite

```
CREA app/privacy/[token]/page.tsx:

Server: decodifica token → email+hostId, carica dati.
Client: 4 sezioni:
1. I tuoi dati: grid campi + "Scarica dati" JSON
2. Consensi: toggle per tipo (revocabili on/off, obbligatori disabilitati)
3. Dati sanitari SPA: conteggio + revoca Art.9 con confirm
4. Cancellazione: richiesta con motivo opzionale → crea RichiestaCancellazione

API: GET /api/privacy/[token], PATCH /api/privacy/[token]/consenso, GET /api/privacy/[token]/export, POST /api/privacy/[token]/cancellazione.
```

### Prompt 47 — Wi-Fi captive portal + scelta pasti

```
CREA app/wifi/[strutturaId]/page.tsx:
Card glass su sfondo blurred. Input PIN 4 cifre (stile OTP) o email. POST /api/wifi/auth. Success: "Sei connesso!" + redirect 3s. Log Pisanu.

CREA app/book/[strutturaId]/pasti/page.tsx:
Pills giorni soggiorno + card pasto per tipo (colazione/pranzo/cena) + card piatti selezionabili per portata + tag allergeni + salva per giorno. API GET/POST /api/book/[strutturaId]/pasti.
```

---

## SEZIONE G — PAGINE HOST BACKEND (Prompt 48-55)

### Prompt 48 — Dashboard host completa

```
CREA components/dashboard/dashboard-page.tsx:

Usa useDashboard() hook con polling 30s.

Layout dall'alto al basso:
1. Header: "Buongiorno, {nome}" + data + struttura + bottoni (nuova prenotazione, notifiche)
2. KPI row 4 card con gradient (indigo ospiti, green arrivi, amber revenue, violet SPA) — icona su gradient, valore 28px 700, delta badge
3. Action chips pills con dot LED pulsante (solo se > 0)
4. Grid 2 col: Arrivi oggi (guest card con avatar, meta, StatusBadge checkin) | Occupazione (donut SVG gradient + breakdown + barchart settimanale con glow)
5. Partenze full-width (card orizzontali)
6. Grid 2 col: SPA oggi (card viola, prossimo appuntamento, progress) | Attività recente (timeline con dot glow)

Skeleton loading, responsive (1 col mobile), dark mode support.
Segui ESATTAMENTE il design del render approvato nella conversazione (tema chiaro con card KPI gradient, guest card con avatar squadrato, donut con gradient stroke).
```

### Prompt 49 — Pagina prenotazioni lista + dettaglio

```
CREA components/prenotazioni/prenotazioni-page.tsx:
PageHeader + filtri (pills stato con count, search, date range, canale) + DataTable (avatar+nome, camera, date compatte, ospiti, StatusBadge prenotazione, StatusBadge check-in, badge canale, importo, azioni menu). Paginazione server-side, bulk actions.

CREA app/host/prenotazioni/[id]/page.tsx + components/prenotazioni/prenotazione-dettaglio.tsx:
2 colonne: sinistra (ospite card, soggiorno grid, accompagnatori, note, storico timeline) | destra (riepilogo economico con incassi, check-in stato con azioni, documenti foto, canale OTA, bottoni azioni).
```

### Prompt 50 — Calendario planning

```
CREA components/calendario/planning-view.tsx:

Vista Gantt orizzontale: asse Y camere per piano, asse X 14 giorni.
Barre prenotazione colorate per stato (primary confermata, warning richiesta, pattern OTA).
Click barra → pannello dettaglio. Click cella vuota → nuova prenotazione.
Linea rossa "Oggi". Navigazione ←→ + "Oggi" + select range.
Filtri per piano e stato HK. Su mobile: messaggio "Usa desktop".
```

### Prompt 51 — CRM ospiti

```
CREA components/crm/lista-ospiti.tsx:
PageHeader + filtri (search, VIP/blacklist/ricorrenti pills, tag, periodo) + DataTable (avatar+nome, email, telefono, soggiorni, spesa formatValuta, ultimo soggiorno relativo, tag chip, badge VIP). Bulk: tag, export, VIP.

CREA components/crm/dettaglio-ospite.tsx:
2 colonne: sinistra (anagrafica editabile inline, note, tag, storico timeline) | destra (stats grandi, SPA preferenze, segmenti auto: Nuovo/Ricorrente/Fedele/Alto spendente/Dormiente).
Merge duplicati: modal confronto side-by-side.
```

### Prompt 52 — Housekeeping + manutenzione

```
CREA components/housekeeping/hk-task-list.tsx:
Mobile-first. Filtri pills + piano. Guest-card style con barra colore stato, camera grande, info contesto (partenza/arrivo), badge priorità, bottone azione rapida. Swipe gesture. Pull-to-refresh. Empty: "Tutte pulite!"

CREA components/manutenzione/manutenzione-page.tsx:
Vista Kanban 3 colonne (Da fare / In lavorazione / Completate) con drag-and-drop. Card con badge priorità, camera, foto thumbnail. Vista alternativa DataTable. Modal nuova segnalazione.
```

### Prompt 53 — SPA management host

```
CREA components/spa/spa-dashboard-host.tsx:
KPI row (appuntamenti, revenue, occupazione cabine). Calendario giornaliero slot. Lista appuntamenti oggi.

CREA pagine: /host/spa/appuntamenti (DataTable + modal nuovo), /host/spa/trattamenti (griglia card + toggle attivo/online), /host/spa/terapisti e /host/spa/cabine (DataTable standard).
```

### Prompt 54 — POS, cassa, fatture host

```
CREA components/pos/pos-terminal.tsx:
2 pannelli: catalogo griglia (tab categorie + card prodotto tap) | conto (lista voci stepper, IVA, totale). Modal incasso 4 metodi + tastierino contanti.

CREA components/pos/chiusura-cassa.tsx:
Riepilogo per metodo + form conteggio reale + discrepanza calcolata + "Chiudi cassa" confirm.

CREA components/fatture/fatture-page.tsx:
DataTable (numero, data, cliente, importi, StatusBadge fattura, SDI stato, azioni). Modal/pagina nuova fattura con righe dinamiche + preview PDF.
```

### Prompt 55 — Analytics, report, gestione varie

```
CREA components/analytics/analytics-dashboard.tsx:
Selettori periodo + 5 KPI con delta% + grafici Recharts (AreaChart revenue, BarChart occupazione, PieChart canali, BarChart top camere). Usa CSS variables per colori grafici.

CREA components/report/report-page.tsx:
5 tab (revenue periodo, revenue camera, incassi, tassa soggiorno, IVA). DataTable per ogni tab con totali + export CSV.

CREA pagine rimanenti con design system standard:
- /host/alloggiati: date picker + tabella arrivi stato completezza + genera file
- /host/canali: card per canale + wizard aggiungi 5 step + log sync
- /host/magazzino: tab prodotti/movimenti/ordini + alert scorta minima
- /host/concierge: 2 pannelli lista conversazioni + chat WA-like
- /host/utenti: DataTable staff + modal invito + matrice permessi
- /host/gdpr: 4 tab (richieste, retention, consensi, registro Art.30)
- /host/booking-engine: 3 card engine + personalizzazione branding + embed codes
- /host/tariffe: calendario annuale periodi + regole dinamiche + prezzi camera
```

---

## SEZIONE H — ADMIN E SUPERADMIN (Prompt 56-57)

### Prompt 56 — Admin panel completo

```
CREA layout admin con sidebar separata (colore ambra per distinguere da host).

/admin/dashboard: KPI (host totali, MRR, churn) + chart MRR 12 mesi + ultimi host + azioni.
/admin/host: DataTable host + filtri + dettaglio con impersonation + moduli toggle.
/admin/billing: MRR totale + host per piano chart + tabella abbonamenti + movimenti.
/admin/ticket: DataTable ticket + dettaglio con thread risposte.

API admin con requireAdmin() su tutto.
```

### Prompt 57 — SuperAdmin

```
CREA /superadmin/monitoring: health check servizi (DB ping, SMTP, cron status, Sentry errori 24h) + metriche piattaforma real-time.
CREA /superadmin/settings: config piattaforma (SMTP, AI, piani/prezzi, maintenance mode).

Sidebar admin: sezione SUPERADMIN visibile solo a ruolo SUPERADMIN (colore rosso).
```

---

## SEZIONE I — INFRA E QUALITÀ (Prompt 58-60)

### Prompt 58 — Error handling e rate limiting

```
CREA lib/errors.ts: ApiError, NotFoundError, ConflictError, ValidationError, ForbiddenError.

CREA lib/api-handler.ts: wrapper apiHandler() che cattura errori, gestisce Zod, logga in Sentry, ritorna JSON strutturato.

CREA lib/rate-limit.ts: rate limiter in-memory (Map con TTL) con config per endpoint (public:search 60/min, public:booking 10/min, host:read 120/min, auth:login 5/5min).
Funzione checkRateLimit(req, limiterName) che ritorna 429 se superato.

AGGIORNA tutte le API routes per usare apiHandler() + checkRateLimit() dove serve.
```

### Prompt 59 — Testing setup + test critici

```
Installa: vitest @testing-library/react @testing-library/jest-dom msw
Crea vitest.config.ts + vitest.setup.ts.

CREA test fixtures: createTestHost(), createTestStruttura(), createTestPrenotazione(), ecc.
CREA prisma mock helpers.

SCRIVI test per:
- lib/pricing.ts (10+ test: base, tariffa, regole, supplementi, tassa)
- lib/availability.ts (8+ test: libera, occupata, OTA, chiusa, manutenzione, overlap)
- lib/crypto.ts (5 test: encrypt/decrypt, nullable, chiave sbagliata)
- lib/gdpr-retention.ts (5 test: anonimizza 40gg, mantieni Alloggiati 5 anni, cancella waiver 90gg)
- lib/consent.ts (4 test: registra, revoca, attivo, token)
- Multi-tenant isolation (3 test: host A non vede B, admin vede tutti)

Aggiungi in package.json: "test": "vitest run", "test:watch": "vitest", "test:coverage": "vitest --coverage"
```

### Prompt 60 — CI/CD, monitoring, i18n, PWA

```
CREA .github/workflows/ci.yml: lint + type-check + unit test + build. Su PR: preview comment con link Vercel.

CONFIGURA Sentry: npm install @sentry/nextjs, sentry.client.config.ts + sentry.server.config.ts con beforeSend che rimuove PII.

CREA lib/logger.ts: logger strutturato (JSON in prod, formattato in dev) con withTiming() per misurare performance.

CREA app/api/health/route.ts: health check DB + servizi.

SETUP i18n: npm install next-intl. Crea messages/it.json completo (tutti i namespace: common, booking, checkin, spa, ristorante, pasti, privacy, wifi, kiosk, cookie). Crea messages/en.json, de.json, fr.json con traduzioni. Integra next-intl nelle pagine pubbliche.

CREA public/manifest.json PWA con icone, shortcuts (Oggi, HK, Nuova prenotazione). Service worker minimale. Banner install su mobile.

CREA pagine legali: /termini, /privacy, /cookie con struttura placeholder.

CREA docs/ARCHITECTURE.md con overview architettura, flussi principali, diagramma entità.
AGGIORNA CLAUDE.md con env vars, comandi, gotcha, naming conventions.
```

---

> **TOTALE: 60 prompt.**
>
> Ordine di esecuzione:
> - Sezione A (1-8): database e schema — le fondamenta
> - Sezione B (9-18): librerie core — il motore
> - Sezione C (19-30): API endpoints — le interfacce
> - Sezione D (31-34): cron jobs — l'automazione
> - Sezione E (35-37): notifiche e comunicazione
> - Sezione F (38-47): pagine pubbliche — ciò che vede l'ospite
> - Sezione G (48-55): pagine host — ciò che vede l'operatore
> - Sezione H (56-57): admin e superadmin
> - Sezione I (58-60): infra, test, CI/CD, i18n, PWA
>
> Se 2 persone lavorano in parallelo:
> - Persona 1: Sezioni A + B + C + D + E (backend, API, librerie)
> - Persona 2: Sezioni F + G + H (frontend, pagine, UI)
> - Sezione I: insieme alla fine
