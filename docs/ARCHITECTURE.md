# Architecture — Otium PMS

> Companion document to [CLAUDE.md](../CLAUDE.md). This file documents end-to-end flows, the core ER diagram, and the cron catalog. Code is the source of truth — paths below link to the files that implement each step.

## Sommario

- [1. Architettura ad alto livello](#1-architettura-ad-alto-livello)
- [2. Flussi end-to-end](#2-flussi-end-to-end)
  - [2.1 Prenotazione camere (booking pubblico)](#21-prenotazione-camere-booking-pubblico)
  - [2.2 Check-in self-service](#22-check-in-self-service)
  - [2.3 SPA booking + waiver + pagamento](#23-spa-booking--waiver--pagamento)
  - [2.4 Prenotazione ristorante](#24-prenotazione-ristorante)
  - [2.5 Fatturazione elettronica](#25-fatturazione-elettronica)
  - [2.6 Alloggiati Web](#26-alloggiati-web)
  - [2.7 GDPR: consent + retention + portale ospite](#27-gdpr-consent--retention--portale-ospite)
  - [2.8 AI Concierge WhatsApp](#28-ai-concierge-whatsapp)
- [3. ERD core](#3-erd-core)
- [4. Cron catalog](#4-cron-catalog)
- [5. Sicurezza e multi-tenancy](#5-sicurezza-e-multi-tenancy)

---

## 1. Architettura ad alto livello

```
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │   Ospite     │    │  Host staff  │    │  SuperAdmin  │
  │  (pubblico)  │    │ (venue mgr)  │    │ (piattaforma)│
  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
         │                   │                   │
         ▼                   ▼                   ▼
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │  /book/*     │    │  /host/*     │    │/superadmin/* │
  │  /checkin/*  │    │              │    │              │
  │  /kiosk/*    │    │   (NextAuth  │    │  (IP allow   │
  │  (pubblico)  │    │    HOST JWT) │    │   list + JWT)│
  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
         │                   │                   │
         └───────────────────┴───────────────────┘
                             │
                             ▼
                   ┌──────────────────┐
                   │  app/api/*       │  Next.js 16 App Router
                   │  Zod validation  │  (tutte le mutation qui;
                   │  requireHost()   │   no server actions)
                   │  audit()         │
                   └──────┬───────────┘
                          │
           ┌──────────────┼──────────────┐
           ▼              ▼              ▼
       ┌───────┐    ┌──────────┐   ┌──────────┐
       │Prisma │    │ Services │   │  Cron    │
       │  +    │    │  (lib/)  │   │ (Vercel) │
       │ Neon  │    │  SMTP    │   │          │
       │  PG   │    │  AI prov │   │          │
       └───────┘    │  FatturaPA│  └──────────┘
                    │  WhatsApp│
                    └──────────┘
```

**Stack**: Next.js 16 App Router · React 18 · TS 5 · Prisma 5 + `@prisma/adapter-neon` · NextAuth 4 JWT · Tailwind · Zod · next-intl · @sentry/nextjs.

**Boundary in/out piattaforma**:
- `in`: browser (pubblico + staff), webhook Stripe, webhook WhatsApp, webhook SDI/Aruba
- `out`: SMTP, WhatsApp Cloud API, Anthropic/OpenRouter/Ollama, Fatture in Cloud, Sentry

---

## 2. Flussi end-to-end

### 2.1 Prenotazione camere (booking pubblico)

**UI**: `/book/[strutturaId]` → `/book/[strutturaId]/camere` — flow 3 step (date+camera → dati → conferma).

```
Ospite (browser)
  │ GET /book/[strutturaId]/camere        → SSR carica StrutturaPubblica
  │                                          + resa iniziale StepDateCamere
  │
  │ GET /api/book/[strutturaId]/camere/disponibilita
  │    ?arrivo=...&partenza=...&adulti=N&bambini=M
  │                                         → calcola prezzo per unità
  │                                           (lib/pricing.ts: regole tariffa,
  │                                           stagionalità, durata, DoW)
  │
  │ POST /api/book/[strutturaId]/camere/prenota
  │    { unitaId, arrivo, partenza, guest, consensi }
  │
  │  ┌─► Zod validate                      (app/api/.../prenota/route.ts:20)
  │  ├─► prisma.$transaction:
  │  │     - lookup blocchi OTA (PrenotazioneCanale)
  │  │     - lookup overlap prenotazioni interne
  │  │     - check/incr Disponibilita per ogni giorno
  │  │     - crea Prenotazione (stato CONFERMATA|RICHIESTA
  │  │       in base a struttura.autoConferma)
  │  │   → se conflict: 409 UNAVAILABLE, no effetto laterale
  │  │
  │  ├─► generateUniquePin(hostId)         (lib/guest-pin.ts)
  │  ├─► create Chat (prenotazioneId)      → `/book/chat/[id]`
  │  ├─► upsertOspiteFromBooking           (lib/crm.ts → OspiteCRM)
  │  ├─► registraConsenso ×2..3            (tos, privacy, marketing?)
  │  ├─► Notifica in-app                   (sidebar badge incrementa)
  │  ├─► audit('prenotazione.creata_da_booking_engine')
  │  ├─► sendEmailConfermaRicezione(ospite) → link chat + checkin token
  │  └─► sendEmailNuovaPrenotazione(host)
  │
  └─► 201 { id, stato, pin, checkInToken }
```

**File chiave**:
- [app/api/book/[strutturaId]/camere/prenota/route.ts](../app/api/book/%5BstrutturaId%5D/camere/prenota/route.ts) — transazione + side-effects
- [lib/pricing.ts](../lib/pricing.ts) — calcolo prezzi
- [lib/crm.ts](../lib/crm.ts) — sync CRM
- [components/book/camere/camere-flow.tsx](../components/book/camere/camere-flow.tsx) — stepper UI

---

### 2.2 Check-in self-service

**UI**: `/checkin/[token]` — token generato alla creazione prenotazione (`Prenotazione.checkInToken`).

```
Ospite riceve email (pre-check-in cron, 72h prima dell'arrivo)
  │ apre link /checkin/[token]
  │
  │ GET /api/checkin/[token]               → carica prenotazione per token
  │                                           + dati precompilati
  │
  │ Step 1: dati anagrafici ospiti         (nome, cognome, sesso, nascita,
  │                                          documento, cittadinanza)
  │ Step 2: registration card T&C          → UserConsent (firma digitale)
  │ Step 3: firma digitale                 → base64 su Prenotazione.firma*
  │
  │ POST /api/checkin/[token]/registration-card
  │                                         → salva consensi + firma
  │
  │ POST /api/checkin/[token]/complete
  │  ┌─► update Prenotazione
  │  │     statoCheckIn: VERIFICATO
  │  │     campi Alloggiati popolati
  │  ├─► AuditLog
  │  └─► email conferma check-in completato
  │
  └─► redirect a pagina "completato + chat con host"
```

**File chiave**:
- [app/api/checkin/[token]/route.ts](../app/api/checkin/%5Btoken%5D/route.ts)
- [app/api/checkin/[token]/registration-card/route.ts](../app/api/checkin/%5Btoken%5D/registration-card/route.ts)
- [app/api/checkin/[token]/complete/route.ts](../app/api/checkin/%5Btoken%5D/complete/route.ts)
- Campi Alloggiati sulla `Prenotazione`: `guestSesso`, `guestDataNascita`, `guestTipoDocumento`, `guestNumeroDocumento`, `guestComuneNascitaIstat`, `guestCittadinanza`, …

---

### 2.3 SPA booking + waiver + pagamento

**UI**: `/book/[strutturaId]/spa` — flow 5 step. Waiver + pagamento sono OBBLIGATORI prima di avanzare.

```
Ospite (browser)
  │ Step 1 — Scegli servizio (trattamento | percorso)
  │ Step 2 — Data + slot + preferenza terapista
  │ Step 3 — Dati ospite (+ prefill da PIN se in-house)
  │ Step 4 — Dichiarazione clinica (waiver) + firma + pagamento
  │ Step 5 — Conferma
  │
  │ GET  /api/book/[strutturaId]/spa/disponibilita
  │     → slot filtrati per disp. terapista + cabina +
  │       trattamento.durata; blocchi waiting list
  │
  │ POST /api/book/[strutturaId]/spa/prenota
  │  ┌─► crea AppuntamentoSpa (stato CONFERMATO|PRENOTATO)
  │  ├─► (se in-house) linking prenotazioneId
  │  └─► email conferma + notifica host
  │
  │ POST /api/spa/waiver { appuntamentoId, zone, patologie, firma... }
  │    → crea WaiverSpa (dati sanitari: 90gg retention)
  │
  │ POST /api/spa/pagamento { appuntamentoId, metodo, importo... }
  │    → crea PagamentoSpa
  │    metodo: CAMERA_CREDIT | CONTANTI | CARTA | TRANSFERWISE
```

**Varianti di ingresso**:
- **Ospite in-house** via `?pin=...` → prefill dati + pagamento possibile su camera
- **Walk-in desk** → reception usa `/reception/spa-concierge/[strutturaId]`
- **Kiosk cabina** (`/kiosk/spa/[cabinaId]`) → ospite firma waiver su tablet in cabina prima del trattamento

**File chiave**:
- [app/api/book/[strutturaId]/spa/prenota/route.ts](../app/api/book/%5BstrutturaId%5D/spa/prenota/route.ts)
- [app/api/spa/waiver/route.ts](../app/api/spa/waiver/route.ts)
- [app/api/spa/pagamento/route.ts](../app/api/spa/pagamento/route.ts)
- [components/spa/booking/](../components/spa/booking/) — flow stepper + 4 steps
- [lib/spa/validations.ts](../lib/spa/validations.ts) — schemi Zod

---

### 2.4 Prenotazione ristorante

**UI**: `/book/[strutturaId]/ristorante` — flow 2 step.

```
Ospite (browser)
  │ GET /api/book/[strutturaId]/ristorante/disponibilita
  │    ?data=YYYY-MM-DD&numPersone=2
  │
  │ lib/book/ristorante.ts::getSlotsDisponibilita
  │   ├─ legge ConfigPastoStruttura (tipoPasto PRANZO/CENA)
  │   ├─ genera slot 30 min
  │   └─ sottrae coperti prenotati (finestra 90 min overlap)
  │
  │ POST /api/book/[strutturaId]/ristorante/prenota
  │  ┌─► re-check disponibilità (race)
  │  ├─► (se pin) linking prenotazioneId
  │  ├─► crea PrenotazioneRistorante (stato CONFERMATA)
  │  ├─► audit + notifica
  │  └─► email ospite + email host (sendEmailGeneric con branding)
  │
  └─► 201 { id, data, ora, inHouse }
```

Host gestisce su `/host/ristorazione/prenotazioni` (Conferma/Completata/No-show/Annulla).

**File chiave**:
- [lib/book/ristorante.ts](../lib/book/ristorante.ts) — slot gen + availability
- [app/api/book/[strutturaId]/ristorante/prenota/route.ts](../app/api/book/%5BstrutturaId%5D/ristorante/prenota/route.ts)

---

### 2.5 Fatturazione elettronica

Dominio italiano: FatturaPA XML via SDI (Sistema di Interscambio), provider integrabili Fatture in Cloud o Aruba.

```
Host crea fattura da /host/fatture/nuova
  │ (oppure auto-emessa al checkout da /api/book/.../checkout-payment)
  │
  │ POST /api/host/fatture
  │  ├─► calcolaTotali(righe, aliquotaIVA)       (lib/fattura-righe.ts,
  │  │                                              lib/iva.ts)
  │  ├─► crea Fattura (numero progressivo per hostId/anno)
  │  └─► crea RigaFattura[]                       (dual-write JSON legacy)
  │
  │ GET /api/host/fatture/[id]/pdf                → React-PDF (lib/pdf.tsx)
  │ GET /api/host/fatture/[id]/xml                → XML FatturaPA
  │                                                  (lib/fattura-elettronica.ts)
  │
  │ POST /api/host/fatture/[id]/invia-sdi
  │  ├─► serializza XML 1.2.2
  │  ├─► chiama Fatture in Cloud API OR Aruba API
  │  │   (in base a host.fattIntegrazione)
  │  └─► salva stato SDI + ricevuta
  │
  │ (notifiche da SDI)
  │ webhook provider → update stato Fattura
  │                    (CONSEGNATA / SCARTATA / MANCATA_CONSEGNA)
  │
  └─► fatture conservate per 10 anni (Art. 2220 c.c.)
```

**Dati fatturazione host** su `Host.fatt*` (NomeAzienda, PartitaIva, CodiceFiscale, Indirizzo, Regime, CodiceSDI, PEC).

**File chiave**:
- [lib/fattura-elettronica.ts](../lib/fattura-elettronica.ts) — XML FatturaPA
- [lib/fattura-righe.ts](../lib/fattura-righe.ts) — calcolo totali + storage
- [lib/iva.ts](../lib/iva.ts) — aliquote e arrotondamenti
- [lib/pdf.tsx](../lib/pdf.tsx) — render PDF

---

### 2.6 Alloggiati Web

Obbligo legale: Art. 109 TULPS — comunicazione giornaliera schedine alloggiati a Polizia di Stato.

```
Ospite completa check-in
  │ → Prenotazione popolata con dati Alloggiati
  │   (guestSesso, guestTipoDocumento, guestNumeroDocumento,
  │    guestComuneNascitaIstat, guestCittadinanza, …)
  │
Host su /host/alloggiati
  │ seleziona giorno + genera file TXT
  │
  │ GET /api/host/alloggiati/export?data=YYYY-MM-DD
  │
  │ lib/alloggiati.ts:
  │   ├─ per ogni Prenotazione con dataArrivo = data
  │   ├─ formatta record a LARGHEZZA FISSA POSIZIONALE
  │   │   (es. cognome = 50 char padded spaces;
  │   │    data = ddmmyyyy senza separatori;
  │   │    comune = codice ISTAT 4 char)
  │   └─ restituisce file .txt ASCII
  │
Host scarica + upload manuale su portale ALLOGGIATI WEB
  │
  │ crea ExportAlloggiati con timestamp + contenuto
  │ audit('alloggiati.export_generato')
  │
  └─► conservazione ≥5 anni (policy retention)
```

**Attenzione**: il padding conta. Un carattere fuori posto invalida l'intero file lato Questura. Non "format-on-the-fly" — sempre passare da `lib/alloggiati.ts`.

---

### 2.7 GDPR: consent + retention + portale ospite

Documento compagno: [GDPR.md](GDPR.md) · [GDPR-CHECKLIST.md](GDPR-CHECKLIST.md).

**Ruoli GDPR**: Host = **Titolare del trattamento** · Otium = **Responsabile** (DPA su `DPAAccettazione[]`).

#### Consent

```
Ospite accetta privacy/tos/marketing
  │ → registraConsenso(tipo, versione, ip, userAgent, metodo)
  │   INSERT UserConsent (append-only)
  │
Ospite revoca (/gdpr/guest/[token])
  │ → revocaConsenso()
  │   UPDATE prev UserConsent: revocatoAt = now
  │   INSERT new UserConsent con accettato=false
  │   (per spa_art9 revoke: DELETE WaiverSpa associati
  │    → "Right to erasure" Art. 17 GDPR)
  │
Sempre: audit('consenso.dato' | 'consenso.revocato')
```

#### Retention (cron notturno)

```
/api/cron/gdpr-retention  (schedule: 0 2 * * *, budget 50s)
  │
  ├─► Ospite personal data: 40 giorni dopo checkout
  │     → anonymize (hash email, clear nome/tel/doc)
  │
  ├─► Waiver SPA (dati sanitari Art. 9): 90 giorni
  │     → purge (host riceve notifica 14gg prima)
  │
  ├─► Alloggiati: 5 anni (Art. 109 TULPS)
  │
  ├─► Fatture + contabilità: 10 anni (Art. 2220 c.c.)
  │
  ├─► Consent log: mantenuti finché serve prova (min 10 anni)
  │
  └─► checkpoint PlatformSettings.ultimaEsecuzioneRetention*
      → se Vercel killa a 50s+, riprende dal punto in cui è
        stato interrotto alla chiamata successiva
```

#### Portale ospite

`/gdpr/guest/[token]` — ospite può scaricare propri dati (Art. 15 portabilità) e revocare consensi.

**File chiave**:
- [lib/consent.ts](../lib/consent.ts) — `registraConsenso`, `revocaConsenso`
- [lib/gdpr-retention.ts](../lib/gdpr-retention.ts) — policy enforcement
- [app/api/cron/gdpr-retention/route.ts](../app/api/cron/gdpr-retention/route.ts)

---

### 2.8 AI Concierge WhatsApp

Host abilita concierge → ospite in-house comunica via WhatsApp.

```
Ospite manda msg su WhatsApp al numero dell'host
  │
  │ Meta WhatsApp Cloud API → webhook /api/whatsapp/webhook
  │
  │  ┌─► verify signature (WHATSAPP_APP_SECRET)
  │  ├─► match numero → host.whatsappNumeroId
  │  ├─► match telefono mittente → Prenotazione (soggiorno attivo)
  │  │   → altrimenti conversazione "sconosciuta"
  │  ├─► upsert ConversazioneWhatsApp
  │  ├─► append MessaggioWhatsApp
  │  │
  │  └─► IF host.conciergeAttivo && dpa AI accettata:
  │        ├─ lib/concierge.ts::rispondi()
  │        ├─ carica contesto:
  │        │    - host.conciergeSystemPrompt
  │        │    - prenotazione + struttura info
  │        │    - ultimi N messaggi conversazione
  │        │    - cataloghi disponibili (orari colazione,
  │        │      menu del giorno, trattamenti SPA…)
  │        │
  │        ├─ lib/ai-provider.ts → Platform Key:
  │        │    Anthropic / OpenRouter / Ollama
  │        │    (PlatformSettings.aiApiKey cifrata;
  │        │     NON è l'API key dell'host in prod)
  │        │
  │        ├─ genera risposta + eventuali "azioni":
  │        │    - AzioneConcierge.tipo:
  │        │      RICHIESTA_HK | RICHIESTA_MANUTENZIONE |
  │        │      PRENOTAZIONE_SPA | ESCALATION_UMANA
  │        │
  │        └─ se AZIONE_UMANA: non risponde, notifica host
  │
  │ Meta WhatsApp Cloud API ← risposta
  │
  └─► Host monitora da /host/concierge + /host/concierge/[id]
```

**File chiave**:
- [lib/concierge.ts](../lib/concierge.ts) — orchestrazione risposta
- [lib/ai-provider.ts](../lib/ai-provider.ts) — provider abstraction
- [lib/whatsapp.ts](../lib/whatsapp.ts) — API helper
- [app/api/whatsapp/webhook/route.ts](../app/api/whatsapp/webhook/route.ts)

---

## 3. ERD core

Schema semplificato — 10 entità centrali (su ~78 modelli totali). Campi elencati sono quelli business-critical, non esaustivi.

```
                ┌─────────────┐
                │    User     │
                │─────────────│
                │ id          │
                │ email ★     │
                │ password    │
                │ role        │ ← ADMIN|HOST|SUPERADMIN|STAFF
                └──────┬──────┘
                       │ 1
                       │
                       ▼ 0..1
                ┌─────────────────────┐
                │       Host          │
                │─────────────────────│
                │ id                  │
                │ userId ★ unique     │
                │ nomeAzienda         │
                │ piano               │ ← LIGHT|EVENTO_SINGOLO|
                │ moduliAttivi (Json) │    VISIBILITA|PARTNER_PREMIUM
                │ dpaAccettato        │
                │ conciergeAttivo     │
                │ whatsapp*           │
                │ fatt*               │ ← dati fatturazione
                └──────┬──────────────┘
                       │ 1
                       │
                       ▼ N
                ┌─────────────────────┐       ┌───────────────────────┐
                │    Struttura        │──1┬─N─│   UnitaPrenotabile    │
                │─────────────────────│   │   │───────────────────────│
                │ id                  │   │   │ id                    │
                │ hostId              │   │   │ strutturaId           │
                │ nome                │   │   │ nome, capacita,       │
                │ citta, regione      │   │   │ lettiExtra, piano,    │
                │ colorePrimario      │   │   │ prezzoBase            │
                │ customDomain unique │   │   │ statoHK               │
                │ fontFamily, radius  │   │   └──────────┬────────────┘
                └──────┬──────────────┘   │              │
                       │                  │              │
                       │                  │              │ N
                       ▼ N                │              │
                ┌─────────────────────┐   │              ▼
                │ ConfigPastoStruttur │   │   ┌───────────────────────┐
                │─────────────────────│   │   │    Prenotazione       │
                │ tipoPasto (enum)    │   │   │───────────────────────│
                │ orarioInizio/Fine   │   │   │ id                    │
                │ maxCoperti          │   │   │ hostId                │
                └─────────────────────┘   │   │ strutturaId           │
                                          └──►│ unitaId               │
                                              │ guestNome, Cognome,   │
                                              │   Email, Telefono     │
                                              │ dataArrivo/Partenza   │
                                              │ stato                 │ ←CONFERMATA|
                                              │ statoCheckIn          │  RICHIESTA|
                                              │ pin (unique+hostId)   │  COMPLETATA|
                                              │ checkInToken          │  ANNULLATA
                                              │ guest* (Alloggiati)   │
                                              └──────┬────────────────┘
                                                     │
                            ┌────────────────────────┼──────────────────────┐
                            │                        │                      │
                            ▼ 0..1                   ▼ N                    ▼ N
                     ┌──────────────┐       ┌────────────────┐     ┌──────────────────┐
                     │AppuntamentoS │       │    Fattura     │     │ PrenotazioneRist.│
                     │pa            │       │────────────────│     │──────────────────│
                     │──────────────│       │ numero         │     │ dataOra          │
                     │ terapistaId  │       │ destinatario   │     │ numPersone       │
                     │ cabinaId     │       │ imponibile,IVA │     │ stato            │
                     │ trattamentoId│       │ totale         │     └──────────────────┘
                     │ percorsoId   │       │ statoSdi       │
                     │ dataOra      │       │ xml, pdf       │
                     │ stato        │       └────────────────┘
                     └──┬───────────┘
                        │
         ┌──────────────┼───────────┐
         ▼              ▼           ▼
    ┌──────────┐  ┌──────────┐  ┌───────────┐
    │WaiverSpa │  │Pagamento │  │TerapistaSp│
    │          │  │Spa       │  │a /        │
    │firmaBase64│ │metodo    │  │CabinaSpa /│
    │zone*      │ │importo   │  │Trattamento│
    │allergie   │ │stato     │  │Spa /      │
    │ART9 data  │ │ultime4   │  │Percorso   │
    └──────────┘  └──────────┘  └───────────┘
          (90 giorni retention — purge via cron gdpr-retention)
                            
                                              
         ┌───────────┐
         │OspiteCRM  │  (sync da Prenotazione via lib/crm.ts)
         │───────────│
         │ hostId ★  │
         │ email ★   │
         │ numSoggi. │
         │ totSpeso  │
         │ vip, tags │
         └───────────┘
```

**Regole di cascata**:
- `User` → `Host`: delete Host se User eliminato (cascade)
- `Host` → `Struttura` → `UnitaPrenotabile`: cascade
- `Prenotazione` → `AppuntamentoSpa`: nullable setNull (ospite esterno può prenotare SPA)
- `AppuntamentoSpa` → `WaiverSpa` / `PagamentoSpa`: cascade

**Vincoli univocità cross-tenant chiave**:
- `Host.userId` unique
- `Prenotazione [hostId, pin]` unique
- `Struttura.customDomain` unique globale

---

## 4. Cron catalog

Registrati in [vercel.json](../vercel.json) (piano Vercel Hobby → max 1 esecuzione/giorno per cron — motivo per cui quelli che idealmente sarebbero orari girano giornalmente e iterano chunk a chunk):

| Path | Schedule | Purpose | Note |
|------|----------|---------|------|
| `/api/cron/email-automatiche` | `0 8 * * *` | Trigger email pre-checkin, reminder arrivo, follow-up post-soggiorno | Legge `HostEmailTemplate` + scheduling da `Prenotazione` |
| `/api/cron/wifi-heartbeat-check` | `0 9 * * *` | Monitora CF-AC101/CF-AC300 provisioned: alert se offline > 24h | Invia notifica in-app + email |
| `/api/cron/gdpr-retention` | `0 2 * * *` | Anonymize ospite (40gg), purge waiver (90gg) | Budget **50s**, checkpoint `PlatformSettings.ultimaEsecuzioneRetention*` |
| `/api/cron/gdpr-notifiche` | `0 8 * * *` | Email all'host 14gg prima della purga waiver SPA | Per permettere download preventivo |
| `/api/cron/ical-sync` | `0 6 * * *` | Pull iCal da Booking/Airbnb/VRBO → `PrenotazioneCanale` | Budget **50s**, chunk per host |

**Altri cron presenti nel codice MA non ancora registrati su Vercel** (file esistono, attesa promozione di piano o trigger manuale):

| Path | Purpose |
|------|---------|
| `/api/cron/sync-canali` | Alias / variante di `ical-sync` (candidato di deprecation) |
| `/api/cron/biancheria` | Genera richieste biancheria per il giorno dopo |
| `/api/cron/check-abbonamenti` | Segnala abbonamenti in scadenza (7gg) → email + notifica |
| `/api/cron/reminder-spa` | Email reminder ospiti con appuntamento domani |
| `/api/cron/inbound-email` | IMAP polling → chat in-app |

Tutti i cron sono protetti da header `Authorization: Bearer $CRON_SECRET`.

---

## 5. Sicurezza e multi-tenancy

### Gate di accesso

| Scope | Guard | File |
|-------|-------|------|
| `/host/*`, `/api/host/*` | `requireHost()` | `lib/auth-middleware.ts` |
| `/admin/*`, `/api/admin/*` | `requireAdmin()` | `lib/auth-middleware.ts` |
| `/superadmin/*`, `/api/superadmin/*` | `requireSuperAdmin()` + IP allowlist | `lib/superadmin-guard.ts` |
| `/api/cron/*` | Bearer CRON_SECRET | per-route |
| `/api/whatsapp/webhook` | Meta signature (WHATSAPP_APP_SECRET) | `lib/whatsapp.ts` |

### Isolamento multi-tenant

Ogni entità host-owned ha `hostId` NOT NULL. Pattern obbligatorio in ogni query `/api/host/*`:

```ts
const auth = await requireHost()
if (isUnauthorized(auth)) return auth
const { hostId } = auth.user       // ← garantito non-null

const records = await prisma.xxx.findMany({
  where: { hostId, /* altri filtri */ },
})
```

**Mai** fidarsi di `hostId` passato dal client. **Mai** `findUnique({ where: { id } })` senza verifica host dopo.

### Cifratura secret

Campi cifrati (AES-256-GCM, chiave `ENCRYPTION_KEY`):
- `Host.smtpPass`, `Host.conciergeApiKey`, `Host.whatsappAccessToken`, `Host.whatsappVerifyToken`
- `PlatformSettings.smtpPass`, `PlatformSettings.aiApiKey`
- `HostSmtpConfig.smtpPass`, `HostConciergeConfig.conciergeApiKey` (dual-write in corso)
- `RegistratoreRtConfig.*`

Access layer: [lib/host-secrets.ts](../lib/host-secrets.ts) (`getHostSecret` / `setHostSecret` con audit log). Primitives: [lib/crypto.ts](../lib/crypto.ts).

### Audit log

Ogni mutation rilevante chiama `audit({ hostId, azione, entita, entitaId, dettagli, ip, userAgent })` → `AuditLog` append-only, visualizzato in `/host/audit`. Rientrano: prenotazioni create/modificate, fatture emesse, consensi dati/revocati, accessi SuperAdmin, modifiche branding, verifica custom domain.

---

> Per modifiche a questo documento: il codice è la verità. Se trovi divergenze, aggiorna il file **dopo** aver verificato nel codice — non "ripulire" il doc assumendo il codice sia sbagliato.
