# Conformità GDPR — Otium Week PMS

> Ultimo aggiornamento: 2026-03-31

## 1. Panoramica

Otium Week gestisce dati personali di ospiti, operatori e titolari di strutture ricettive. La piattaforma implementa misure tecniche e organizzative per garantire la conformità al **Regolamento UE 2016/679 (GDPR)** e alla normativa italiana sulla privacy (**D.Lgs. 196/2003** come modificato dal D.Lgs. 101/2018).

### Ruoli

| Ruolo GDPR | Chi è | Responsabilità |
|-----------|-------|---------------|
| **Titolare del trattamento** | L'host (struttura ricettiva) | Determina finalità e mezzi del trattamento dati ospiti |
| **Responsabile del trattamento** | Otium Week SRL (piattaforma) | Tratta i dati per conto dell'host, fornisce gli strumenti |
| **Interessato** | L'ospite | Persona fisica i cui dati sono trattati |

---

## 2. Categorie di dati trattati

### 2.1 Dati personali comuni (Art. 6 GDPR)

| Dato | Finalità | Base giuridica | Conservazione |
|------|----------|---------------|---------------|
| Nome, cognome | Esecuzione contratto di soggiorno | Art. 6(1)(b) — Contratto | 5 anni dalla partenza |
| Email | Comunicazioni relative alla prenotazione | Art. 6(1)(b) — Contratto | 5 anni dalla partenza |
| Telefono | Contatto per la prenotazione | Art. 6(1)(b) — Contratto | 5 anni dalla partenza |
| Indirizzo | Fatturazione, comunicazioni | Art. 6(1)(c) — Obbligo legale | 10 anni (fiscale) |
| Documento identità (tipo, numero) | Obbligo Questura (Alloggiati Web) | Art. 6(1)(c) — Art. 109 TULPS | 5 anni |
| Data/luogo nascita, sesso | Schedina Alloggiati PS | Art. 6(1)(c) — Art. 109 TULPS | 5 anni |
| Nazionalità | Statistiche ISTAT obbligatorie | Art. 6(1)(c) — Obbligo legale | 5 anni |
| Firma digitale Registration Card | Prova del consenso ai T&C | Art. 6(1)(f) — Legittimo interesse | 2 anni dalla partenza |
| Preferenze (camera, allergie alimentari) | Personalizzazione servizio | Art. 6(1)(a) — Consenso | Fino a revoca / 5 anni inattività |
| Messaggi chat | Gestione richieste ospite | Art. 6(1)(b) — Contratto | 2 anni dalla partenza |
| Dati di navigazione (IP, user-agent) | Sicurezza, rate limiting | Art. 6(1)(f) — Legittimo interesse | 30 giorni |

### 2.2 Dati sensibili / categorie particolari (Art. 9 GDPR)

| Dato | Finalità | Base giuridica | Conservazione |
|------|----------|---------------|---------------|
| Condizioni mediche (waiver SPA) | Sicurezza trattamento | Art. 9(2)(a) — Consenso esplicito | **90 giorni** (piattaforma) |
| Allergie (SPA) | Prevenzione reazioni | Art. 9(2)(a) — Consenso esplicito | **90 giorni** (piattaforma) |
| Farmaci in uso | Controindicazioni | Art. 9(2)(a) — Consenso esplicito | **90 giorni** (piattaforma) |
| Stato di gravidanza | Controindicazioni | Art. 9(2)(a) — Consenso esplicito | **90 giorni** (piattaforma) |
| Zone corpo (trattare/evitare) | Personalizzazione | Art. 9(2)(a) — Consenso esplicito | **90 giorni** (piattaforma) |
| Firma waiver SPA | Prova consenso | Art. 9(2)(a) — Consenso esplicito | **90 giorni** (piattaforma) |

> **MODELLO DI CONSERVAZIONE DATI SANITARI SPA:**
>
> La piattaforma Otium Week adotta il principio di **minimizzazione** (Art. 5(1)(e) GDPR):
>
> 1. **La piattaforma conserva i dati sanitari per 90 giorni** dal trattamento
> 2. **15 giorni prima della scadenza**, l'host riceve una notifica: *"X waiver in scadenza, scaricali dalla pagina GDPR"*
> 3. **L'host (Titolare) può scaricare** i dati e conservarli autonomamente per la tutela legale (prescrizione 5 anni — Art. 2947 c.c.)
> 4. **Dopo 90 giorni la piattaforma cancella** irreversibilmente i dati sanitari
>
> **Scenario tutela legale:** Un ospite non dichiara una cervicale, riceve un massaggio, sta male e fa causa. L'host che ha scaricato il waiver firmato ha la prova che l'ospite ha omesso la condizione. La piattaforma ha il log che dimostra la notifica e l'avvenuto download.
>
> **Responsabilità:** La conservazione oltre i 90 giorni è responsabilità esclusiva dell'host (Titolare del trattamento), non della piattaforma (Responsabile del trattamento).

### 2.3 Dati contabili e fiscali

| Dato | Finalità | Base giuridica | Conservazione |
|------|----------|---------------|---------------|
| Fatture (importi, date, descrizioni) | Adempimenti fiscali | Art. 6(1)(c) — Art. 2220 c.c. | **10 anni** |
| Dati fatturazione (P.IVA, ragione sociale) | Emissione fatture | Art. 6(1)(c) — Obbligo legale | **10 anni** |
| Pagamenti (importi, metodo, date) | Contabilità | Art. 6(1)(c) — Obbligo legale | **10 anni** |

---

## 3. Policy di retention automatica

Il sistema esegue una pulizia automatica **ogni notte alle 03:00** tramite cron job (`/api/cron/gdpr-retention`). L'host può anche eseguirla manualmente dalla pagina GDPR & Privacy.

### 3.1 Dati sanitari SPA — 90 giorni (con notifica host)

**Modello di responsabilità:**
- La **piattaforma** (Responsabile del trattamento) conserva i dati sanitari per **90 giorni**
- L'**host** (Titolare del trattamento) viene notificato **15 giorni prima** della cancellazione
- L'host può **scaricare** i dati dalla pagina GDPR per conservarli autonomamente (sua responsabilità legale — Art. 2947 c.c., prescrizione 5 anni)
- Dopo 90 giorni la piattaforma **cancella irreversibilmente** i dati sanitari

**Flusso:**
```
Giorno 0:   Trattamento SPA completato, waiver compilato
Giorno 75:  🔔 Notifica all'host: "X waiver in scadenza, scaricali dalla pagina GDPR"
Giorno 90:  🗑️ Cancellazione automatica dati sanitari dalla piattaforma
```

**Cosa viene cancellato a 90 giorni:**
- Allergie, patologie, farmaci
- Condizioni mediche selezionate
- Stato di gravidanza
- Zone del corpo (trattate/evitate)
- Pressione preferita, temperatura, aromi
- Firma digitale del waiver
- Note preferenze

**Cosa viene mantenuto permanentemente:**
- Record dell'appuntamento (data, durata, prezzo)
- Flag `confermato: true` (prova che il waiver è stato compilato)
- Data di registrazione
- Nota `[DATI SANITARI RIMOSSI — GDPR 90gg — data]`

**Perché questo modello:**
- La piattaforma minimizza i dati (Art. 5(1)(e) GDPR) — non conserva dati sensibili oltre il necessario
- L'host è il Titolare: se vuole conservare per 5 anni (tutela legale), scarica e gestisce lui
- In caso di contenzioso, l'host ha i dati; la piattaforma ha il log che dimostra la notifica e il download

**Trigger:** Appuntamento SPA con stato `COMPLETATO` e waiver registrato da più di 90 giorni.

### 3.2 Firma Registration Card — 2 anni

**Cosa viene cancellato:**
- Firma digitale base64 (`regCardFirmaBase64`)

**Cosa viene mantenuto:**
- Flag `regCardFirmata: true`
- Flag consensi (termini, privacy, marketing)
- Data della firma

**Trigger:** Prenotazione con data di partenza > 2 anni fa.

### 3.3 Dati personali ospite — 5 anni

**Cosa viene anonimizzato:**
- Nome → "ANONIMO"
- Cognome → "GDPR"
- Email → "{id}@anonimizzato.gdpr"
- Telefono, note, sesso, data/luogo nascita → null
- Documento (tipo, numero, rilascio) → null
- Token check-in → null
- Firma registration card → null
- Messaggi chat → cancellati
- Accompagnatori → cancellati

**Cosa viene mantenuto:**
- Record prenotazione (date, importi, struttura, stato)
- Dati contabili (per obbligo fiscale)
- ID prenotazione (per riferimento fatture)

**Trigger:** Prenotazione con data di partenza > 5 anni fa.

### 3.4 Messaggi chat — 2 anni

**Cosa viene cancellato:**
- Tutti i messaggi della conversazione

**Cosa viene mantenuto:**
- Record chat (ID, date creazione)

**Trigger:** Prenotazione con data di partenza > 2 anni fa.

### 3.5 Dati CRM ospite — 5 anni inattività

**Cosa viene cancellato:**
- Profilo CRM (preferenze, tag, note, storico)

**Trigger:** Nessun soggiorno negli ultimi 5 anni (cancellazione manuale tramite pagina GDPR).

---

## 4. Diritti dell'interessato

### 4.1 Diritto di accesso (Art. 15)

L'ospite può richiedere copia di tutti i propri dati personali.

**Implementazione:** Pagina `/host/gdpr` → Cerca per email → Scarica dati (JSON).

Il file JSON contiene:
- Dati prenotazione (date, importi, stato)
- Dati personali (nome, email, telefono, documento)
- Profilo CRM (preferenze, tag)
- Appuntamenti SPA
- Messaggi chat

### 4.2 Diritto di rettifica (Art. 16)

L'ospite può richiedere la correzione di dati inesatti.

**Implementazione:** L'host modifica i dati dalla pagina prenotazione o dal CRM.

### 4.3 Diritto alla cancellazione / oblio (Art. 17)

L'ospite può richiedere la cancellazione di tutti i propri dati.

**Implementazione:** Pagina `/host/gdpr` → Cerca per email → Anonimizza dati.

**Eccezioni** (la cancellazione NON può essere eseguita per):
- Dati necessari per adempiere obblighi di legge (schedine PS: 5 anni)
- Dati contabili/fiscali (fatture: 10 anni)
- Accertamento/esercizio/difesa di diritti in sede giudiziaria

In questi casi il sistema **anonimizza** i dati personali mantenendo i record contabili.

### 4.4 Diritto alla portabilità (Art. 20)

L'ospite può richiedere i propri dati in formato leggibile dalla macchina.

**Implementazione:** Export JSON dalla pagina GDPR.

### 4.5 Diritto di opposizione (Art. 21)

L'ospite può opporsi al trattamento per marketing diretto.

**Implementazione:** 
- Checkbox "Consenso marketing" opzionale nella Registration Card
- Flag `regCardAccMarketing` sulla prenotazione
- L'ospite può revocare il consenso contattando la struttura

---

## 5. Misure di sicurezza tecniche

### 5.1 Crittografia

| Misura | Implementazione |
|--------|----------------|
| Trasporto | HTTPS obbligatorio (HSTS in produzione) |
| Password | Bcrypt con 12 round di salt |
| Sessioni | JWT con scadenza 24h, secret da env var |
| Database | SSL/TLS verso Neon PostgreSQL |

### 5.2 Controllo accessi

| Misura | Implementazione |
|--------|----------------|
| Autenticazione | NextAuth con CredentialsProvider |
| Autorizzazione | Middleware ruolo-based (HOST, ADMIN, SUPERADMIN) |
| Multi-tenant | Ogni query filtrata per `hostId` — un host non può accedere ai dati di un altro |
| Rate limiting | Sliding window su endpoint pubblici (login, booking, chat) |
| CSRF | Token CSRF su tutte le mutazioni |

### 5.3 Minimizzazione dati

| Misura | Implementazione |
|--------|----------------|
| Retention automatica | Cron job notturno cancella dati scaduti |
| Dati sanitari | Cancellazione entro 24h dal trattamento |
| Anonimizzazione | Sostituzione dati con placeholder, non cancellazione record |
| Consenso granulare | Checkbox separati per T&C, privacy, marketing |

### 5.4 Logging e audit

| Misura | Implementazione |
|--------|----------------|
| Audit trail | Modulo `/host/audit` con log operazioni |
| Error tracking | Sentry per errori applicativi |
| Structured logging | `lib/logger.ts` con livelli info/warn/error |

---

## 6. Registration Card digitale

### 6.1 Hotel Registration Card

Presentata all'ospite durante il check-in online (`/checkin/[token]`), dopo la compilazione dei dati personali.

**Contenuto:**
- Riepilogo prenotazione (struttura, date, camera, ospiti)
- Termini e Condizioni del soggiorno (personalizzabili dall'host)
- Informativa Privacy GDPR (personalizzabile dall'host)
- Checkbox obbligatori: accettazione T&C + accettazione privacy
- Checkbox opzionale: consenso marketing
- Firma digitale (canvas)

**Personalizzazione:** L'host può modificare i testi T&C e privacy dalla pagina `/host/impostazioni-regcard`. Se non personalizzati, vengono usati i testi predefiniti conformi alla normativa italiana.

### 6.2 SPA Registration Card

Presentata all'ospite prima del trattamento SPA.

**Contenuto:**
- Step 1 — Scheda clinica: gravidanza, condizioni mediche (12 opzioni), allergie, farmaci, pressione preferita, zone corpo (mappa interattiva)
- Step 2 — Consenso: T&C SPA + accettazione rischio + privacy dati sanitari (Art. 9)
- Step 3 — Firma digitale

**Importante:** I dati sanitari raccolti in Step 1 vengono **cancellati automaticamente entro 24 ore** dal completamento del trattamento. Vedere sezione 3.1.

---

## 7. Configurazione per l'host

### 7.1 Pagina GDPR & Privacy (`/host/gdpr`)

- **Ricerca ospite**: cerca per email, visualizza tutti i dati
- **Export dati (Art. 15/20)**: download JSON con tutti i dati dell'ospite
- **Anonimizzazione (Art. 17)**: cancellazione irreversibile dei dati identificativi
- **Policy retention**: tabella con tutte le policy e relativi tempi
- **Pulizia manuale**: pulsante per eseguire la retention on-demand

### 7.2 Impostazioni Registration Card (`/host/impostazioni-regcard`)

- **Tab T&C Hotel**: editor testo per termini e condizioni del soggiorno
- **Tab T&C SPA**: editor testo per termini e condizioni del centro benessere
- **Tab Campi personalizzati**: aggiunta di campi custom (testo, checkbox, select) alla Registration Card

### 7.3 Indicatori in reception

- **Pagina prenotazione**: badge "Reg Card firmata" (verde) o "Reg Card da firmare" (giallo)
- **Front desk (Oggi)**: indicatore per ogni arrivo

---

## 8. Cron job di retention

### Endpoint

```
GET /api/cron/gdpr-retention
Authorization: Bearer {CRON_SECRET}
```

### Schedulazione consigliata

| Provider | Configurazione |
|----------|---------------|
| Vercel Cron | `vercel.json` → `"crons": [{ "path": "/api/cron/gdpr-retention", "schedule": "0 3 * * *" }]` |
| External cron | `curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/gdpr-retention` |

### Output esempio

```json
{
  "hostsProcessed": 5,
  "totalProcessed": 12,
  "totalErrors": 0,
  "details": [
    {
      "host": "Agriturismo Il Poggio",
      "policies": [
        { "policy": "spa_health_data", "processed": 3, "errors": 0 },
        { "policy": "reg_card_signatures", "processed": 0, "errors": 0 },
        { "policy": "guest_personal_data", "processed": 2, "errors": 0 },
        { "policy": "chat_messages", "processed": 7, "errors": 0 }
      ]
    }
  ]
}
```

---

## 9. Responsabilità e contatti

### Data Protection Officer (DPO)

Se l'host è tenuto a nominare un DPO (Art. 37 GDPR), i dati di contatto del DPO devono essere inseriti nel profilo host e comunicati agli interessati.

### Contatto per richieste GDPR

Gli ospiti possono esercitare i propri diritti contattando direttamente la struttura ricettiva (Titolare del trattamento) all'indirizzo email configurato nel profilo host.

### Registro dei trattamenti (Art. 30)

Il presente documento, insieme alla configurazione del sistema, costituisce parte integrante del Registro dei trattamenti che ogni host è tenuto a mantenere se ricadente nell'obbligo di cui all'Art. 30 GDPR.

---

## 10. Checklist pre-lancio

- [ ] Configurare i testi T&C e Privacy personalizzati per la struttura
- [ ] Verificare che il cron job di retention sia attivo
- [ ] Nominare il DPO se necessario (> 250 dipendenti o trattamento su larga scala)
- [ ] Predisporre la procedura di gestione Data Breach (Art. 33-34)
- [ ] Formare il personale sulla gestione richieste GDPR
- [ ] Inserire l'informativa privacy sul sito web della struttura
- [ ] Verificare la conformità del server SMTP (se personalizzato)
