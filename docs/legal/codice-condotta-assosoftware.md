# DICHIARAZIONE DI CONFORMITÀ AL CODICE DI CONDOTTA ASSOSOFTWARE
## Per il trattamento dei dati personali nel software gestionale
### (Approvato dal Garante Privacy — Provvedimento 17/10/2024, G.U. 27/11/2024)

**Produttore:** OtiumPMS — Otium Week S.r.l.
**Software:** OtiumPMS — Property Management System per strutture ricettive e SPA
**Versione:** 1.x
**Data:** {{DATA}}

---

## 1. DICHIARAZIONE DI IMPEGNO

Il produttore OtiumPMS dichiara di impegnarsi a sviluppare e mantenere il software gestionale OtiumPMS in conformità ai principi e alle prescrizioni del Codice di Condotta per il trattamento dei dati personali effettuato dalle imprese di sviluppo e produzione di software gestionale, approvato dal Garante per la protezione dei dati personali.

---

## 2. CONFORMITÀ ALL'ALLEGATO A — Privacy by Design e by Default

### 2.1 Minimizzazione dei dati (Art. 5.1.c GDPR)
| Requisito | Implementazione OtiumPMS |
|---|---|
| Raccolta limitata ai dati necessari | Solo dati richiesti per la finalità specifica (prenotazione, check-in, SPA) |
| Campi opzionali chiaramente marcati | Label con asterisco (*) per obbligatori, resto opzionale |
| Nessun dato raccolto in eccesso | Form dinamici in base a nazionalità (CF solo per italiani) |

### 2.2 Privacy by Default
| Requisito | Implementazione |
|---|---|
| Impostazioni privacy restrittive di default | Consenso marketing OFF di default |
| Accesso minimo ai dati | RBAC: 5 livelli, staff vede solo la sua sezione |
| Data retention automatizzata | Cancellazione/anonimizzazione automatica a scadenza |

### 2.3 Trasparenza verso il cliente (host)
| Requisito | Implementazione |
|---|---|
| Documentazione sicurezza del software | DPIA, DPA, Registro Trattamenti disponibili |
| Informazione sui sub-responsabili | Lista completa con DPA e garanzie |
| Log attività disponibili | Sezione Audit Log con 143 endpoint monitorati |

### 2.4 Cifratura e sicurezza
| Requisito | Implementazione |
|---|---|
| Cifratura in transito | TLS 1.3 via Vercel HTTPS |
| Cifratura a riposo | Neon PostgreSQL AES-256 |
| Password hashing | bcryptjs con salt automatico |
| Protezione sessioni | JWT 24h, httpOnly, secure, sameSite |

### 2.5 Controllo degli accessi
| Requisito | Implementazione |
|---|---|
| Account nominali | Ogni utente ha account individuale |
| Ruoli e permessi | SUPERADMIN → ADMIN → DIREZIONE → HOST → STAFF (7 sotto-ruoli) |
| Log accessi | Audit trail con userId, email, IP, timestamp, azione |
| Separazione ambienti | Multi-tenant: ogni host vede solo i propri dati |

### 2.6 Sezione Log (requisito esplicito del Codice)
| Operazione loggata | Stato |
|---|---|
| Login/logout | ✅ Tracciato via audit |
| Inserimento dati | ✅ 143 API con audit import |
| Modifica dati | ✅ Ogni PATCH/PUT loggato |
| Cancellazione dati | ✅ Ogni DELETE loggato |
| Export dati | ✅ GDPR export loggato |
| Operazioni GDPR (oblio) | ✅ Loggato con dettagli completi |

### 2.7 Gestione dei dati alla cessazione del servizio
| Requisito | Implementazione |
|---|---|
| Dati disponibili per almeno 30 giorni | DPA Art. 4.7: 30 giorni post-cessazione |
| Export in formato leggibile | JSON strutturato via /api/host/gdpr |
| Cancellazione su richiesta | API di cancellazione + anonimizzazione |

---

## 3. CONFORMITÀ ALL'ALLEGATO B — Misure di Sicurezza

### 3.1 Ambiente Cloud (SaaS)
| Misura | Implementazione |
|---|---|
| Hosting certificato | Vercel (SOC 2 Type II), Neon (SOC 2 Type II) |
| Data center EU | Neon Francoforte (eu-central-1) |
| Backup automatici | Neon point-in-time recovery |
| Monitoraggio errori | Sentry per error tracking |
| Aggiornamenti di sicurezza | Dipendenze aggiornate, Next.js latest |

### 3.2 Protezione endpoint
| Misura | Implementazione |
|---|---|
| CSRF | Double-submit cookie pattern, 32 byte token |
| Rate limiting | Login 5/5min, API pubbliche limitate |
| Input validation | Zod schema su tutti gli endpoint |
| Error handling sicuro | Nessun leak di stack trace o dati interni |

### 3.3 Gestione incidenti
| Misura | Implementazione |
|---|---|
| Procedura data breach | Documentata in 8 fasi |
| Notifica entro 72h | Procedura + contatti Garante |
| Registro violazioni | Audit Log + report incidenti |

---

## 4. CONFORMITÀ ALL'ALLEGATO C — Schema DPA

Il DPA (Data Processing Agreement) di OtiumPMS è conforme allo schema dell'Allegato C del Codice di Condotta e include:
- Oggetto e durata del trattamento
- Natura e finalità
- Tipologie di dati e interessati
- Obblighi del responsabile (OtiumPMS)
- Sub-responsabili autorizzati
- Misure di sicurezza
- Procedura data breach
- Restituzione/cancellazione dati a fine servizio

Documento: `docs/legal/DPA-template.md`

---

## 5. QUESTIONARIO DI AUTOVALUTAZIONE

### Privacy by Design
- [x] Il software è progettato con la privacy integrata fin dalla fase di design
- [x] I principi di minimizzazione sono applicati a tutti i form e raccolta dati
- [x] Le impostazioni di default sono privacy-friendly

### Sicurezza
- [x] Cifratura in transito (TLS)
- [x] Cifratura a riposo (AES-256)
- [x] Controllo accessi RBAC
- [x] Password hashing (bcrypt)
- [x] Protezione CSRF
- [x] Rate limiting
- [x] Input validation (Zod)
- [x] Audit trail completo

### Trasparenza
- [x] Privacy Policy completa e aggiornata
- [x] Cookie Policy con banner consenso
- [x] Informativa Art. 9 per dati sanitari
- [x] Log attività consultabile dall'host
- [x] Lista sub-responsabili aggiornata

### Diritti degli interessati
- [x] Accesso ai dati (Art. 15)
- [x] Rettifica (Art. 16) — via comunicazione
- [x] Cancellazione/oblio (Art. 17) — con anonimizzazione
- [x] Portabilità (Art. 20) — export JSON
- [x] Opposizione (Art. 21) — via comunicazione

### Data Retention
- [x] Politiche di conservazione documentate per ogni categoria
- [x] Cancellazione/anonimizzazione automatizzata
- [x] Notifica al titolare prima della cancellazione

---

## 6. PROCEDURA DI ADESIONE FORMALE

Per completare l'adesione formale al Codice di Condotta:

1. **Compilare il questionario di autovalutazione** dell'Allegato E ✅ (sopra)
2. **Inviare domanda all'OdM** (Organismo di Monitoraggio) presso AssoSoftware
3. **Allegare documentazione**: DPA, DPIA, Registro Trattamenti, misure tecniche
4. **Attendere verifica** da parte dell'OdM
5. **Ottenere attestazione di conformità**

### Contatti OdM
- AssoSoftware: https://www.assosoftware.it/servizi-offerti/codice-di-condotta/
- Sportello Privacy per assessment preliminare

### Note
- L'adesione è possibile anche per aziende NON associate ad AssoSoftware
- L'OdM verifica regolarità, completezza, requisiti di conformità
- Riesame periodico della conformità richiesto

---

## 7. FIRMA

Il sottoscritto, in qualità di legale rappresentante del Produttore, dichiara la conformità del software OtiumPMS ai requisiti del Codice di Condotta e si impegna a mantenere tale conformità nel tempo.

Nome: _________________________

Ruolo: _________________________

Data: _________________________

Firma: _________________________
