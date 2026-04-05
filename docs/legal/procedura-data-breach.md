# PROCEDURA DI GESTIONE VIOLAZIONI DATI PERSONALI
## (Data Breach — Art. 33-34 GDPR)

**Versione:** 1.0
**Data:** {{DATA}}

---

## 1. DEFINIZIONE

Per "violazione dei dati personali" (data breach) si intende qualsiasi violazione della sicurezza che comporta accidentalmente o in modo illecito la distruzione, la perdita, la modifica, la divulgazione non autorizzata o l'accesso ai dati personali trattati.

---

## 2. CLASSIFICAZIONE

| Livello | Descrizione | Esempi |
|---|---|---|
| **CRITICO** | Dati sanitari (SPA) o documenti identità esposti | Accesso DB non autorizzato, leak waiver |
| **ALTO** | Dati personali ospiti esposti su larga scala | SQL injection, backup rubato |
| **MEDIO** | Accesso non autorizzato limitato | Account staff compromesso |
| **BASSO** | Incidente senza esposizione dati | Tentativo di accesso fallito, errore log |

---

## 3. FASI DELLA PROCEDURA

### FASE 1 — RILEVAMENTO (0-1 ora)
- Il team rileva o viene informato dell'incidente
- Apertura ticket interno con timestamp
- Classificazione preliminare del livello

### FASE 2 — CONTENIMENTO (1-4 ore)
- Isolare il sistema compromesso (se applicabile)
- Revocare accessi compromessi
- Preservare log e prove forensi
- Attivare il team di risposta

### FASE 3 — VALUTAZIONE (4-24 ore)
- Determinare natura e portata della violazione
- Identificare categorie e numero di interessati coinvolti
- Valutare probabili conseguenze
- Determinare se la notifica al Garante è necessaria

### FASE 4 — NOTIFICA AL TITOLARE (entro 24 ore)
OtiumPMS (Responsabile) notifica al Titolare (Host):
- Natura della violazione
- Dati coinvolti
- Misure adottate
- Raccomandazioni

### FASE 5 — NOTIFICA AL GARANTE (entro 72 ore dalla scoperta)
Il Titolare (Host), assistito da OtiumPMS, notifica al Garante tramite:
- Portale: https://servizi.gpdp.it/databreach/s/
- Contenuto: modello Garante compilato

La notifica include:
- a) Natura della violazione (categorie, numero interessati)
- b) Dati di contatto DPO o referente
- c) Probabili conseguenze
- d) Misure adottate o proposte

### FASE 6 — NOTIFICA AGLI INTERESSATI (se rischio elevato)
Se la violazione presenta un rischio elevato per i diritti e le libertà delle persone:
- Comunicazione diretta agli interessati (email)
- Linguaggio chiaro e semplice
- Indicazione delle misure di protezione suggerite

### FASE 7 — DOCUMENTAZIONE
- Report completo dell'incidente
- Cause, effetti, misure correttive
- Conservazione per almeno 5 anni
- Aggiornamento DPIA se necessario

### FASE 8 — MIGLIORAMENTO
- Analisi root cause
- Implementazione misure correttive
- Aggiornamento procedure
- Formazione staff se necessario

---

## 4. CONTATTI DI EMERGENZA

| Ruolo | Contatto |
|---|---|
| Responsabile tecnico OtiumPMS | {{EMAIL_TECH}} |
| Privacy OtiumPMS | privacy@otiumweek.com |
| Garante Privacy | protocollo@gpdp.it / protocollo@pec.gpdp.it |
| Portale notifica breach | https://servizi.gpdp.it/databreach/s/ |

---

## 5. REGISTRO VIOLAZIONI

Ogni violazione, anche se non notificata al Garante, viene documentata nel registro interno con:
- Data e ora rilevamento
- Descrizione
- Classificazione
- Azioni intraprese
- Esito
- Notifiche effettuate

Il registro è accessibile da `/superadmin/audit` nella piattaforma.
