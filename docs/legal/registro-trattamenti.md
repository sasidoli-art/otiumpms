# REGISTRO DEI TRATTAMENTI
## (Art. 30 GDPR — Reg. UE 2016/679)

**Responsabile del Trattamento:** OtiumPMS (Otium Week S.r.l.)
**Data ultimo aggiornamento:** {{DATA}}
**Versione:** 1.0

---

## 1. GESTIONE PRENOTAZIONI

| Campo | Valore |
|---|---|
| **Finalità** | Gestione prenotazioni, assegnazione camere, comunicazioni ospite |
| **Categorie di interessati** | Ospiti della struttura ricettiva |
| **Categorie di dati** | Anagrafica (nome, cognome, email, telefono), date soggiorno, preferenze, note |
| **Base giuridica** | Esecuzione contratto (Art. 6.1.b) + Obbligo legale Alloggiati Web (Art. 6.1.c) |
| **Destinatari** | Titolare (Host), Questura (via Alloggiati Web) |
| **Conservazione** | 40 giorni dalla partenza → anonimizzazione. Dati Alloggiati: 5 anni |
| **Misure di sicurezza** | HTTPS, RBAC, audit log, backup, cifratura DB |

---

## 2. CHECK-IN / ALLOGGIATI WEB

| Campo | Valore |
|---|---|
| **Finalità** | Registrazione ospiti, adempimento Art. 109 TULPS, generazione file Questura |
| **Categorie di dati** | Documento identità (tipo, numero), data/luogo nascita, cittadinanza, sesso, codice fiscale, foto documento (temporanea) |
| **Base giuridica** | Obbligo legale (Art. 6.1.c — Art. 109 TULPS R.D. 773/1931) |
| **Conservazione** | Dati schedina: 5 anni. Foto documento: 7 giorni. Firma reg card: 40 giorni |
| **Misure di sicurezza** | Cancellazione automatica foto, audit log accessi |

---

## 3. ACCOMPAGNATORI

| Campo | Valore |
|---|---|
| **Finalità** | Registrazione accompagnatori per Alloggiati Web |
| **Categorie di dati** | Anagrafica, documento, data nascita, nazionalità |
| **Base giuridica** | Obbligo legale (Art. 6.1.c) |
| **Conservazione** | 5 anni (Art. 109 TULPS) poi cancellazione |

---

## 4. DICHIARAZIONE CLINICA SPA (WELLNESS CARD)

| Campo | Valore |
|---|---|
| **Finalità** | Valutazione idoneità al trattamento SPA, sicurezza dell'ospite |
| **Categorie di dati** | **DATI PARTICOLARI Art. 9**: condizioni salute, gravidanza, allergie, patologie, farmaci, zone corporee, preferenze trattamento |
| **Base giuridica** | Consenso esplicito dell'interessato (Art. 9.2.a) |
| **Destinatari** | Terapista assegnato, responsabile SPA |
| **Conservazione** | 90 giorni dal trattamento → cancellazione (host notificato 15 gg prima) |
| **Misure di sicurezza** | Accesso limitato a ruolo SPA_OPERATOR, consenso esplicito con firma digitale, cancellazione automatica |

---

## 5. COMUNICAZIONI (CHAT/EMAIL)

| Campo | Valore |
|---|---|
| **Finalità** | Comunicazione host-ospite per gestione soggiorno |
| **Categorie di dati** | Messaggi di testo, email, canale di comunicazione |
| **Base giuridica** | Esecuzione contratto (Art. 6.1.b) + Legittimo interesse (Art. 6.1.f) |
| **Conservazione** | Durata del soggiorno + 40 giorni |

---

## 6. PAGAMENTI E FATTURAZIONE

| Campo | Valore |
|---|---|
| **Finalità** | Gestione addebiti, pagamenti, emissione fatture, tassa di soggiorno |
| **Categorie di dati** | Importi, metodo pagamento, ultime 4 cifre carta, dati fatturazione (P.IVA, C.F., SDI) |
| **Base giuridica** | Esecuzione contratto (Art. 6.1.b) + Obbligo legale fiscale (Art. 6.1.c) |
| **Conservazione** | 10 anni (Art. 2220 Codice Civile) |

---

## 7. HOUSEKEEPING / MANUTENZIONE

| Campo | Valore |
|---|---|
| **Finalità** | Gestione pulizie, stato camere, task manutenzione |
| **Categorie di dati** | Stato camera, operatore assegnato, timestamp operazioni |
| **Base giuridica** | Legittimo interesse (Art. 6.1.f) |
| **Conservazione** | 1 anno |

---

## 8. STAFF / UTENTI

| Campo | Valore |
|---|---|
| **Finalità** | Gestione accessi staff, inviti, ruoli |
| **Categorie di dati** | Nome, email, ruolo, ultimo accesso, IP |
| **Base giuridica** | Esecuzione contratto di lavoro (Art. 6.1.b) |
| **Conservazione** | Durata rapporto + 5 anni |

---

## 9. AUDIT LOG

| Campo | Valore |
|---|---|
| **Finalità** | Sicurezza, tracciabilità operazioni, conformità normativa |
| **Categorie di dati** | User ID, email, azione, entità, timestamp, IP, user agent |
| **Base giuridica** | Legittimo interesse (Art. 6.1.f) + Obbligo legale (Codice Condotta AssoSoftware) |
| **Conservazione** | 2 anni |

---

## 10. AI CONCIERGE (WhatsApp)

| Campo | Valore |
|---|---|
| **Finalità** | Assistenza automatizzata ospiti via AI |
| **Categorie di dati** | Messaggi conversazione, numero telefono, preferenze espresse |
| **Base giuridica** | Consenso (Art. 6.1.a) + Legittimo interesse (Art. 6.1.f) |
| **Conformità AI Act** | Sistema a rischio limitato — obbligo trasparenza: disclosure automatica che l'ospite interagisce con AI |
| **Conservazione** | Durata soggiorno + 40 giorni |

---

## MISURE TECNICHE E ORGANIZZATIVE (Art. 32 GDPR)

| Misura | Implementazione |
|---|---|
| Cifratura in transito | TLS 1.3 (HTTPS via Vercel) |
| Cifratura a riposo | Neon PostgreSQL (AES-256) |
| Controllo accessi | RBAC 5 livelli (SUPERADMIN→STAFF) |
| Autenticazione | JWT con sessione 30gg, bcrypt password |
| Audit trail | Log su tutte le operazioni CRUD |
| Backup | Backup automatici Neon (point-in-time recovery) |
| Data retention automatizzata | Cron GDPR con cancellazione/anonimizzazione |
| Hosting EU | Data center Francoforte (eu-central-1) |
| Minimizzazione | Solo dati necessari, foto documenti temporanee |
