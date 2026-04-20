# GDPR Compliance Checklist — Otium PMS

> Ultimo aggiornamento: 2026-04-20 · da rivedere periodicamente con DPO / consulente privacy

Questa checklist mappa ogni obbligo GDPR alle funzionalità tecniche implementate nel PMS e ai passi residui che richiedono verifica legale/organizzativa.

## Stato (al momento del rilascio 1.0)

### Art. 28 — Responsabile del trattamento
- [x] **DPA firmato da ogni host**
  - Implementazione: `lib/dpa-template.ts`, modello `DPAAccettazione`, guardia in `app/host/layout.tsx`
  - UX: prima del primo accesso al PMS, l'host è redirect a `/host/dpa` e deve firmare digitalmente
  - Ri-accettazione automatica al bump di `DPA_VERSIONE`
  - Prova legale: firma base64 + IP + userAgent + timestamp
- [ ] **Revisione legale del template DPA** — _richiede avvocato privacy_
- [x] **Sub-responsabili documentati** — sezione 8 del DPA_TEMPLATE

### Art. 13 — Informativa privacy
- [x] **Pagina /privacy-policy** pubblica
- [x] **Pagina /cookie-policy** pubblica
- [x] **Privacy by default**: opt-in esplicito per marketing, profilazione, Art. 9
- [ ] **Review informativa da legale** — _richiede avvocato privacy_

### Art. 30 — Registro delle attività di trattamento
- [x] **Registro generato automaticamente** da `lib/gdpr-retention.ts` > `RETENTION_POLICIES`
- [x] **Export PDF** via `GET /api/host/gdpr/registro-art30` (PDFKit)
- [x] **UI**: tab "Registro Art. 30" in `/host/gdpr`

### Art. 5(1)(e) — Limitazione conservazione (retention automatica)
- [x] **11 policy tipizzate** in `RETENTION_POLICIES`
- [x] **Cron notturno** `/api/cron/gdpr-retention` (daily 02:00 UTC)
  - Timeout-aware (50s budget + resume tramite `PlatformSettings.ultimaEsecuzioneRetentionCompletata`)
  - Audit log `gdpr.retention.eseguita`
  - Sentry + email SUPERADMIN su errori
- [x] **Cron notifiche** `/api/cron/gdpr-notifiche` (daily 08:00 UTC)
- [x] **Anonimizzazione vs cancellazione**: differenziata per policy (waiver SPA = hard delete Art. 9, prenotazioni = anonimizzazione mantenendo ISTAT per Alloggiati 5 anni)
- [x] **Trigger manuale** da `/host/gdpr` tab Retention
- [ ] **Verificare che il cron giri su Vercel Pro** — _Hobby limita a 1 cron/day, insufficiente_

### Art. 15-22 — Diritti dell'interessato
- [x] **Portale ospite self-service** `/privacy/[token]` (HMAC reversibile)
  - Art. 15 Accesso: visualizzazione dati + download JSON
  - Art. 16 Rettifica: form con whitelist campi (notifica host)
  - Art. 17 Oblio: `RichiestaCancellazione` con scadenza 30 giorni
  - Art. 20 Portabilità: `GET /api/privacy/[token]/export` JSON completo
  - Art. 21 Opposizione: toggle consensi revocabili
- [x] **Dashboard host** `/host/gdpr` tab Richieste con:
  - Preview pre-esecuzione (daCancellare vs conservatiPerLegge)
  - Banner rosso per richieste scadute >30gg
  - Download dati ospite (Art. 15) per riga
  - Rifiuto con motivo da whitelist + email automatica
  - Esecuzione atomica $transaction

### Art. 7 — Consenso
- [x] **Storico immutabile** in `UserConsent` (ogni cambio = nuovo record)
- [x] **Consensi granulari** (`CONSENT_TYPES` in `lib/consent.ts`):
  - privacy_ospite (contratto, non revocabile)
  - termini_servizio (contratto, non revocabile)
  - marketing_email / marketing_sms (consenso, revocabile)
  - spa_art9 (consenso_esplicito, revocabile → cancella waiver collegati)
  - profilazione_crm
  - cookie_analytics / cookie_marketing
- [x] **Metodo tracciato**: checkbox / firma_digitale / double_opt_in / api
- [x] **Versione documento** obbligatoria (al bump → ri-accettazione)
- [x] **IP + userAgent** come prova

### Art. 9 — Categorie particolari (dati sanitari)
- [x] **Consenso esplicito**: `spa_art9` con metodo `firma_digitale` nel waiver
- [x] **Hard delete** (non anonimizzazione) dopo 90gg
- [x] **Revoca immediata**: al revoca del consenso, i `WaiverSpa` collegati sono cancellati subito
- [x] **Log accessi waiver** (entità `waiver_spa`, solo se `dichiarazioneNessuna=false`)

### Art. 32 — Sicurezza del trattamento
- [x] **Crittografia at-rest** AES-256-GCM per:
  - `Host.smtpPass`, `conciergeApiKey`, `whatsappAccessToken`, `sdiApiKey`
  - `PaymentProviderConfig.stripe/adyen/nexi/sumup ApiKey`
- [x] **`lib/host-secrets.ts`** layer con audit log su set
- [x] **`ENCRYPTION_KEY`** validata all'avvio via `instrumentation.ts`
- [x] **TLS 1.3** sul reverse proxy Vercel (automatico)
- [x] **Isolamento multi-tenant** via `hostId` filter su tutte le query
- [x] **Audit log accessi dati personali** (Art. 32 — misure di sicurezza):
  - `logAccesso()` su GET prenotazioni, CRM, waiver SPA, export Alloggiati
  - Filtro "Solo accessi dati personali" in `/host/audit`
  - Widget anomalie (>100 accessi/giorno) nella dashboard GDPR
- [x] **2FA** supportato per utenti staff (opzionale)
- [ ] **Verifica HSTS** sul dominio di produzione — _config DNS_
- [ ] **Backup crittografati** — _Neon dovrebbe gestirlo; verificare nel piano_

### Art. 33 — Notifica data breach
- [ ] **Procedura documentata 72h** — _doc operativo da scrivere_
- [ ] **Contatti di emergenza** (Titolare, Responsabile, Garante) — _da raccogliere_
- [x] Sentry per detection errori applicativi
- [ ] **Runbook per data breach** — _WIP_

### Art. 35 — DPIA (Data Protection Impact Assessment)
- [ ] **DPIA per AI Concierge WhatsApp** — _richiesta perché tratta dati di comunicazione_
- [ ] **DPIA per dati SPA Art. 9** — _sistematico, su larga scala_
- [ ] **DPIA per Wi-Fi Pisanu** — _log connessioni può essere considerato monitoraggio su larga scala_

### Art. 37 — DPO (Data Protection Officer)
- [ ] **Nomina DPO** _se applicabile_:
  - Obbligatorio se trattamenti su larga scala di dati sensibili (SPA) o monitoraggio sistematico
  - Per piccoli host di norma non obbligatorio, ma consigliato se >5 strutture o >10k ospiti/anno
- [x] Campo `conciergeGdprAcceptedAt` su Host (tracking consenso AI Concierge)

### Art. 44-49 — Trasferimento dati extra-UE
- [x] **Dichiarato nel DPA** (sezione 9)
- [x] **Dichiarato in informativa cookie policy**
- [x] **Vercel** (USA) — EU-US DPF + SCC
- [x] **Neon** (USA) — DPF certification
- [ ] **Verificare certificazioni aggiornate DPF** — _https://www.dataprivacyframework.gov/ (dicembre 2023+)_

### ePrivacy — Cookie
- [x] **Banner cookie conforme**:
  - Bottoni: "Accetta tutti" / "Solo necessari" / "Personalizza"
  - Toggle per categoria (tecnici bloccato, analytics opt-in, marketing opt-in)
  - Slide-up, mobile-friendly
  - Storage: cookie `otium_cookie_consent` JSON SameSite=Lax 12 mesi
- [x] **Dedup**: banner non riappare se il cookie esiste
- [x] **Event bus** `otium:analytics-enabled` per script consumer (carica analytics solo con consenso)
- [ ] **Tasto "Modifica preferenze cookie"** persistente in footer — _nice-to-have_

## Audit & Testing

- [x] **E2E test** `e2e/gdpr.spec.ts`:
  - Retention anonimizzazione prenotazioni 40gg
  - Waiver hard delete 90gg
  - Portale ospite (access + export + revoke + delete)
  - Consent tracking granulare con metodo
  - Isolamento multi-tenant (cancellazione host A non tocca host B)
  - Cookie banner (appare/salva/non riappare)

## Azioni residue (operative / legali)

Sezioni marcate `[ ]` richiedono:
1. **Intervento legale**: revisione DPA + informativa (avvocato privacy)
2. **DPIA dei trattamenti ad alto rischio**: AI Concierge, dati sanitari SPA, log Wi-Fi
3. **Documentazione operativa**: runbook data breach, procedura notifica 72h
4. **Configurazione infra**: HSTS, backup Neon, upgrade Vercel Pro per cron
5. **Decisione organizzativa**: valutare nomina DPO in base alla scala

## Contatti per richieste GDPR

- **Titolare del trattamento**: l'host (ogni struttura è titolare dei dati dei propri ospiti)
- **Responsabile del trattamento**: Otium (fornitore PMS)
- **Garante italiano**: https://www.garanteprivacy.it/ — Piazza Venezia 11, 00187 Roma
