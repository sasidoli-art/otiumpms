# CONFORMITÀ AL REGOLAMENTO UE SULL'INTELLIGENZA ARTIFICIALE
## (AI Act — Reg. UE 2024/1689)

**Versione:** 1.0
**Data:** {{DATA}}
**Scadenza conformità:** 2 agosto 2026

---

## 1. SISTEMI AI UTILIZZATI

### 1.1 AI Concierge (WhatsApp/Chat)

| Campo | Valore |
|---|---|
| **Descrizione** | Assistente AI che risponde agli ospiti via WhatsApp e chat per informazioni sulla struttura, servizi, prenotazioni |
| **Classificazione AI Act** | **Rischio limitato** (Art. 50 — sistema che interagisce con persone fisiche) |
| **Provider AI** | Anthropic (Claude) / OpenAI (GPT) — configurabile dall'host |
| **Deployer** | Il Titolare (Host) è il deployer; OtiumPMS è il provider della piattaforma |
| **Dati trattati** | Messaggi conversazione, preferenze espresse, numero telefono |

### 1.2 OCR Documenti (Tesseract.js)

| Campo | Valore |
|---|---|
| **Descrizione** | Riconoscimento ottico caratteri per auto-compilazione dati da foto documento |
| **Classificazione AI Act** | **Rischio minimo** — strumento ausiliario senza decisioni automatizzate |
| **Provider** | Tesseract.js (open source, esecuzione locale nel browser) |
| **Dati trattati** | Immagine documento (temporanea, solo nel browser dell'utente) |

---

## 2. OBBLIGHI DI TRASPARENZA (Art. 50)

### 2.1 AI Concierge
L'ospite **deve essere informato** che sta interagendo con un sistema AI e non con una persona. 

**Implementazione richiesta:**
- Messaggio iniziale automatico: *"Ciao! Sono l'assistente virtuale di [Nome Struttura]. Posso aiutarti con informazioni, prenotazioni e servizi. Per parlare con il personale, scrivi 'operatore'."*
- Badge "AI" visibile nella chat
- Possibilità di richiedere intervento umano in qualsiasi momento

### 2.2 OCR
Nessun obbligo specifico — rischio minimo, l'utente è consapevole dell'uso (clicca "Scansiona documento").

---

## 3. OBBLIGHI DEL DEPLOYER (Host)

L'host che attiva il modulo AI Concierge deve:

3.1 **Informare gli ospiti** che il servizio utilizza intelligenza artificiale (trasparenza)

3.2 **Supervisionare** le risposte AI — il sistema deve consentire intervento umano

3.3 **Conservare i log** delle conversazioni AI per verificabilità

3.4 **Non utilizzare l'AI per decisioni automatizzate** che producono effetti legali (es. rifiuto prenotazione automatico)

---

## 4. OBBLIGHI DEL PROVIDER (OtiumPMS)

4.1 **Documentazione tecnica** del sistema AI utilizzato

4.2 **Garantire trasparenza** by design nella piattaforma (disclosure automatica)

4.3 **Consentire supervisione umana** — bottone "parla con operatore"

4.4 **Non implementare sistemi vietati** (Art. 5):
- ❌ Nessun social scoring degli ospiti
- ❌ Nessuna manipolazione subliminale
- ❌ Nessun riconoscimento biometrico in tempo reale
- ❌ Nessuna categorizzazione biometrica per dati sensibili

---

## 5. MISURE IMPLEMENTATE

| Requisito | Stato | Note |
|---|---|---|
| Disclosure AI in chat | DA IMPLEMENTARE | Messaggio automatico inizio conversazione |
| Badge "AI" visibile | DA IMPLEMENTARE | Nella UI chat ospite |
| Escalation a operatore umano | IMPLEMENTATO | Concierge routes to human |
| Log conversazioni | IMPLEMENTATO | Modello ConversazioneWhatsApp + MessaggioWhatsApp |
| Documentazione tecnica | QUESTO DOCUMENTO | Da aggiornare |
| Divieto decisioni automatizzate | RISPETTATO | AI suggerisce, host decide |

---

## 6. SANZIONI AI ACT

| Violazione | Sanzione massima |
|---|---|
| Sistemi vietati (Art. 5) | €35M o 7% fatturato globale |
| Sistemi ad alto rischio non conformi | €15M o 3% fatturato globale |
| Obblighi trasparenza (Art. 50) — nostro caso | €7,5M o 1,5% fatturato globale |

---

## 7. RIESAME

Riesame annuale o in caso di:
- Aggiornamento del modello AI utilizzato
- Nuove funzionalità AI nella piattaforma
- Modifiche normative
- Linee guida dall'AI Office EU
