# Roadmap Otium Wi-Fi — Fasi di sviluppo e stime

> Piano di sviluppo dell'integrazione Wi-Fi in Otium PMS, dal POC tecnico alla scalabilità commerciale.
> Ultimo aggiornamento: 2026-04-13

---

## Stato attuale *(snapshot 2026-04-13)*

✅ **Quanto è già stato scoperto/validato tecnicamente**:
- Architettura controller Comfast CF-AC300 completamente mappata
- 90 sezioni API catalogate con struttura payload nota per le 5 critiche
- Propagazione SSID via `ac_group_config` testata live (2 AP, zero downtime)
- Formato backup patch testato (SSH key install + password reset)
- Modello remote management progettato (polling HTTP + auto-revert)
- Vendor compatibility chiarita (bundle Comfast per fase 1, RADIUS-agnostic per fase 2+)
- Catalogo API salvato offline per reference futura
- Captive portal nativo del firmware identificato (`wifilith_config` + `wifidog_config` + `portal_account_config`)

🔬 **Cose ancora da validare**:
- Creazione VLAN via API (non fatta per evitare network restart in scenario remoto)
- Test captive portal end-to-end con telefono (richiede VLAN)
- Bind captive portal a VLAN dedicata (`extiface` field di `wifilith_config`)
- Scrittura `portal_account_config` (da validare ma low-risk)
- Test auto-revert mechanism
- Comportamento preciso del `network restartall` trigger

---

## Fase 0: Setup lab permanente *(settimana 1-2, hardware 100-300€)*

**Obiettivo**: avere un ambiente di test rappresentativo del prodotto finale, isolato dalla rete di casa, replicabile.

**Azioni**:

1. **Acquisto secondo controller lab** — `CF-AC50` via AliExpress (~€80) + 1 AP aggiuntivo (~€40). Totale ~€130 con spedizione/IVA.
   - Motivazione: validare portabilità codebase tra x86 (AC300) e MIPS (AC50)
   - **Non** comprare CF-AC101 (stessa architettura x86, test ridondante)
   - **Non** comprare CF-RF105 (firmware V2.3.x incompatibile)

2. **Setup lab fisico**:
   - Switch PoE 5 porte (~€50) per alimentare gli AP
   - Connessione Internet separata: SIM 4G con router/hotspot dedicato (~€20/mese disdicibile) → garantisce isolamento reale dalla rete di casa
   - Spazio fisico: scrivania dedicata, alimentato solo quando serve

3. **Documentazione del lab** in `router_comfast/LAB_SETUP.md` con topologia, connessioni, credenziali.

**Budget totale Fase 0**: €200-300 una tantum + €20/mese 4G.

**Valore strategico**: permette di fare test **distruttivi** (VLAN, wifilith bind, restart network, auto-revert, ecc.) **senza rischi remoti** sulla rete di casa.

---

## Fase 1: POC tecnico end-to-end *(settimane 2-4, ~20-30 ore sviluppo)*

**Obiettivo**: dimostrare il flusso completo "prenotazione in PMS → credenziali Wi-Fi guest → ospite si connette → captive portal → navigazione". Funzionante sul lab, NON ancora in produzione.

### Step 1 — Creazione VLAN guest sul controller lab (1-2 ore)

Con il lab CF-AC50 e connessione 4G isolata, possiamo fare il test "rischioso" senza impatto remoto:

- Creazione VLAN 10 (`vid=10`) via `vlan_config` SET
- Verifica che il controller crei il bridge guest e il pool DHCP 192.168.100.0/24
- Verifica che la VLAN appaia nel dropdown `extiface` di `auth_portal.html`
- Test auto-revert: creare una config volutamente rotta, verificare che dopo 5 min torni indietro

### Step 2 — Attivazione captive portal su VLAN guest (1 ora)

- Abilitare `wifilith_config` con `type="hotel"`, `extiface="guest10"`, `enable="1"`
- Verificare che `wifidog` parta e che il splash page sia servito sulla porta 2060
- Personalizzare le immagini splash via `wifilith_pic_desc`

### Step 3 — Aggiunta SSID `Otium_Guest` con `vid=10` (30 min)

- Modifica `ac_group_config` del gruppo AP del lab
- Aggiunta vif con `vid=10` mappato alla VLAN
- Verifica propagazione CAPWAP agli AP

### Step 4 — Test manuale con telefono (1 ora)

- Connettere telefono a `Otium_Guest`
- Apertura browser → redirect al captive portal
- Verifica che appaia lo splash page
- Tentativo di auth con credenziali pre-inserite via `portal_account_config`
- Verifica che l'ospite navighi (con accesso limitato solo a WAN, no LAN principale)

**Deliverable Fase 1 Step 1-4**: video-demo di 2 minuti che mostra il flusso completo end-to-end.

### Step 5 — Scrittura `otium-agent` shell script (4-6 ore)

Script in bash pronto per girare sul controller Comfast. Funzioni:

- **Init** — al primo boot, registrazione al cloud Otium con `device_id` + `token`
- **Heartbeat** — ogni 60s, POST metriche CPU/mem/client count al cloud
- **Command polling** — ogni 30s, GET commands pendenti dal cloud
- **Command execution** — per ogni comando:
  - Arm dead-man switch (backup config rilevanti)
  - Esegui chiamata interna a `/cgi-bin/mbox-config?method=SET&section=...`
  - Post-check: ping 1.1.1.1, verifica Internet OK
  - Report risultato al cloud
- **Deadman check** (cron separato ogni 1 min) — se armed e non disarmed entro 5 min → rollback + reboot

Complessità: ~200-300 righe di bash, niente di esoterico. Usa solo `curl`, `jq`-like alternative o `jsonfilter` che è già in OpenWrt.

### Step 6 — Mini backend Otium di test (4-8 ore)

Nel gestionale `Otium` aggiungere:

**Migrazione Prisma** (nuove tabelle):

```prisma
model WifiDevice {
  id              Int      @id @default(autoincrement())
  strutturaId     Int
  deviceMac       String   @unique
  deviceModel     String?
  deviceSerial    String?
  apiToken        String   // bearer token per l'agent polling
  lastSeenAt      DateTime?
  firmwareVersion String?
  status          String   @default("unknown")
  createdAt       DateTime @default(now())

  struttura       Struttura @relation(fields: [strutturaId], references: [id])
  guestUsers      WifiGuestUser[]
  commands        WifiDeviceCommand[]
  accessLogs      WifiAccessLog[]
}

model WifiGuestUser {
  id              Int      @id @default(autoincrement())
  prenotazioneId  Int?
  deviceId        Int
  username        String
  password        String
  validFrom       DateTime
  validTo         DateTime
  status          String   @default("pending") // pending/active/expired/revoked
  createdAt       DateTime @default(now())

  device          WifiDevice @relation(fields: [deviceId], references: [id])
  prenotazione    Prenotazione? @relation(fields: [prenotazioneId], references: [id])

  @@unique([deviceId, username])
}

model WifiDeviceCommand {
  id          Int      @id @default(autoincrement())
  deviceId    Int
  action      String   // create_user / revoke_user / set_ssid / push_config / ...
  params      Json
  status      String   @default("pending") // pending/sent/done/error
  createdAt   DateTime @default(now())
  executedAt  DateTime?
  result      Json?

  device      WifiDevice @relation(fields: [deviceId], references: [id])
}

model WifiAccessLog {
  id              Int      @id @default(autoincrement())
  deviceId        Int
  guestUserId     Int?
  clientMac       String
  clientIp        String?
  sessionStart    DateTime
  sessionEnd      DateTime?
  bytesIn         BigInt?
  bytesOut        BigInt?

  device          WifiDevice @relation(fields: [deviceId], references: [id])
  guestUser       WifiGuestUser? @relation(fields: [guestUserId], references: [id])
}
```

**API routes Next.js** (in `app/api/wifi/`):

- `POST /api/wifi/devices/[mac]/heartbeat` — agent manda metriche
- `GET  /api/wifi/devices/[mac]/pending-commands` — agent polling
- `POST /api/wifi/devices/[mac]/command-results` — agent manda risultati
- `POST /api/wifi/devices/[mac]/access-logs` — agent manda log sessioni (push bulk)
- `POST /api/wifi/internal/booking-created` — webhook dal flow prenotazione per generare credenziali + command in coda
- `POST /api/wifi/internal/booking-cancelled` — webhook per revocare

**UI operatore** (nuova tab in `app/host/strutture/[id]/` per Wi-Fi management):

- Widget stato device (online/offline, last seen, CPU/mem)
- Lista utenti guest attivi con scadenza
- Pulsante "Genera credenziali manuali" (per walk-in)
- Tab log accessi con filtri + export CSV (per compliance)
- Tab branding splash page (logo, colori, messaggio benvenuto)

### Step 7 — Test end-to-end completo sul lab (2-3 ore)

Flusso:

1. Creo prenotazione di test in Otium UI
2. Otium backend genera credenziali, mette comando `create_user` in coda
3. Agent sul lab CF-AC50 polla entro 30s, riceve comando
4. Agent esegue: GET `portal_account_config`, append user, SET
5. Agent verifica che il nuovo user sia nella lista (ri-GET)
6. Agent POSTa risultato al cloud
7. Otium UI mostra "utente creato" + credenziali nel dashboard
8. Vado fisicamente col telefono al lab, mi connetto a `Otium_Guest`
9. Captive portal appare, inserisco credenziali
10. Autenticazione OK, navigo
11. Tempo totale dal booking al navigo: <2 minuti

**Deliverable Fase 1**: 
- ✅ Agent funzionante sul lab  
- ✅ Backend Otium con 5 endpoint REST + 4 tabelle DB
- ✅ UI operatore basic per gestione Wi-Fi
- ✅ Demo end-to-end registrata

---

## Fase 2: Produzione + primo cliente pilota *(mesi 2-3, ~40 ore sviluppo)*

**Obiettivo**: spedire il primo kit hardware a una struttura cliente reale, validare l'esperienza utente/ospite sul campo.

### Step 1 — Hardening POC per produzione (10 ore)

- **Auto-revert robusto**: test di scenario disastro (config rotta, network restart, kernel panic). Validare che dopo 5 min il router torna sempre online.
- **Agent cross-arch**: lo stesso script shell deve funzionare su x86 (CF-AC300) e MIPS (CF-AC50). Test.
- **Gestione errori**: ogni chiamata API deve avere retry con backoff, timeout configurabile, logging strutturato.
- **Secure boot / provisioning**: primo boot dell'agent genera `device_token` univoco, lo invia al cloud via endpoint `POST /register` protetto da "pre-shared key" iniziale (diversa per ogni spedizione).
- **Firmware update OTA**: meccanismo per inviare nuova versione dell'agent senza accedere al router. Può essere un semplice endpoint `GET /agent/current-version` + download script firmato.

### Step 2 — Setup struttura pilota (1 settimana)

- Scegli una struttura pilota: idealmente amica/conoscente, B&B 3-5 camere, con fibra FTTH decente
- Pre-configuri il kit in laboratorio (controller + 2 AP + switch PoE + cavi)
- Vai sul posto, colleghi il router all'Internet del cliente, accendi, verifica registrazione al cloud
- Installa gli AP nei punti concordati (stanze più occupate)
- Configura il branding (logo struttura, colori, benvenuto multilingua)
- Test con il cliente: una prenotazione finta, ospite simulato

**Obiettivo realistico**: in 2-3 settimane dal primo setup, avere 1 struttura pilota attiva con 5-20 ospiti veri che hanno usato il sistema.

### Step 3 — Feedback loop (2-4 settimane)

- Meeting settimanale con il cliente pilota: cosa funziona, cosa non funziona, UX
- Fix rapidi lato cloud (deploy daily)
- Fix agent via OTA quando necessario
- Metriche: uptime device, success rate auth, tempo medio "check-in → primo accesso Wi-Fi", satisfaction score ospiti

---

## Fase 3: Scalabilità commerciale *(mesi 4-12, effort continuo)*

**Obiettivo**: passare da 1 cliente pilota a 10-50 clienti, con processo di onboarding scalabile.

### Step 1 — Processo onboarding cliente (10 ore per documentazione + automazione)

- Template contratto + DPA GDPR
- Questionario pre-installazione (numero camere, tipo fibra, planimetria per posizionamento AP, ecc.)
- Script di provisioning automatico: inserisci `struttura_id` + `device_mac` → genera token + branding template + prima config
- Guida per installatore (che potresti essere tu i primi 5-10 clienti, poi un tecnico freelance)
- SLA di garanzia: "99% uptime, risposta supporto entro 24 ore"

### Step 2 — Dashboard operatore + UI cliente finale (20+ ore)

- **Dashboard operatore Otium** (tu): lista tutti i clienti, stato device real-time, alert se offline, log eventi, gestione firmware
- **UI cliente (singola struttura)**: il gestore della struttura vede solo la SUA struttura, può generare credenziali manuali per walk-in, vedere log per un periodo, cambiare branding

### Step 3 — Acquisizione clienti (marketing + vendita, ongoing)

Canali realistici per un prodotto hospitality italiano:
- **Associazioni di categoria** (Federalberghi, Assohotel): partnership per sponsorizzazione newsletter
- **Sagre/fiere del settore** (TTG Rimini, BIT Milano): stand piccolo con demo dal vivo
- **Social selling** su gruppi Facebook di gestori B&B italiani (molto attivi)
- **Case study** dal cliente pilota (video testimonial 2 min, blog post)
- **Referral program**: il cliente che porta un altro cliente ha sconto su 1 mese

**Target realistico** fine anno 1: **10-20 clienti paganti** a ~50€/mese medi = **600-1200€/mese ricorrenti**. Non diventi ricco, ma inizi a validare il business.

---

## Fase 4: Espansione prodotto *(anno 2)*

Quando il core è stabile e hai 20+ clienti:

### Possibili direzioni (non mutuamente esclusive)

1. **Modalità RADIUS vendor-agnostic** per aprirsi ai clienti con hardware Cisco/Ubiquiti/Aruba esistente (vedi `HARDWARE_COMPATIBILITY.md`)

2. **Analytics avanzate** per i clienti: visit count, time spent, ospiti ripetitivi, mappe heatmap di dove si connettono, traffic per device/per struttura

3. **Marketing automation integrato**: email follow-up post-soggiorno, offerte promozionali via email a ospiti, review request automatiche

4. **Integrazione multi-PMS**: Otium è il tuo, ma alcuni clienti usano già altri gestionali (Smoobu, Beddy, Krossbooking). Offrire "Otium Wi-Fi" come modulo standalone integrabile via API in questi PMS → mercato più grande senza forzare migrazione

5. **White label per agenzie**: consulenti IT per hospitality potrebbero rivendere "Otium Wi-Fi" brandizzato come proprio servizio

6. **Compliance avanzata**: export log automatico per autorità, audit trail conforme a richieste Pisanu, certificazione ISO27001 quando raggiungi scala rilevante

---

## Budget totale stimato anno 1

| Voce | Costo |
|---|---|
| Hardware lab (Fase 0) | €200-300 una tantum |
| SIM 4G lab (Fase 0-ongoing) | €240/anno |
| VPS cloud Otium (Contabo VPS S o Hetzner CX21) | €60-120/anno |
| Domini + TLS (Let's Encrypt gratis, dominio €15/anno) | €15/anno |
| Hardware pre-acquistato per primi 10 clienti bundle (CF-AC50 + 2 AP + switch × 10) | €2500-3000 |
| Sviluppo: il tuo tempo | ~200-400 ore spalmate su 12 mesi (valore ~20-40k€ se fatturato) |
| Marketing (fiera, stampe, piccola pubblicità) | €500-1500 |
| **Totale "out-of-pocket"** (esclusa ora tua) | **~€3500-5500** |

## Revenue potenziale anno 1 (realistico)

- **Prezzo**: €40-60/mese per struttura tutto incluso (hardware + cloud + support)
- **Clienti realistici fine anno 1**: 10-20
- **MRR target**: €400-1200/mese
- **ARR target**: €5000-15000 anno 1

**ROI**: il breakeven dipende da quanto conti "il tuo tempo". Se conti solo out-of-pocket, breakeven fine anno 1. Se conti il tuo tempo come investimento startup, ROI al anno 2-3 quando avrai 30-80 clienti.

## Rischi principali

1. **Supply chain Comfast** — se Comfast cambia firmware drasticamente o interrompe il modello, devi ri-validare tutto. Mitigazione: Fase 4 "RADIUS agnostic" riduce la dipendenza.

2. **Compliance Pisanu evolution** — la legge potrebbe inasprirsi (richiesta documento d'identità obbligatorio). Mitigazione: progetta il portal per supportare upload documento fin dall'inizio.

3. **Competitor** — Cucumber Tony, Zone WiFi, Purple potrebbero entrare nel mercato italiano. Mitigazione: integrazione profonda col PMS (Otium) è il tuo vero differenziatore.

4. **Supporto tecnico** — con 50 clienti, riceverai chiamate "Wi-Fi non va" ad ogni orario. Mitigazione: dashboard dettagliata + auto-diagnostica + documento FAQ scritto + contratto SLA chiaro (orari, tempi di risposta).

5. **Regulatory** — decreto in arrivo su retention obbligatoria? GDPR audit? Mitigazione: consulenza legale una tantum a inizio anno 2 quando il fatturato lo giustifica.
