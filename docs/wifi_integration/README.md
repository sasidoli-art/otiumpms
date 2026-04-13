# Wi-Fi Integration — gestione rete ospiti per strutture clienti

> **Stato**: ✅ Ricerca tecnica completata — pronti per Fase 1 POC (lab setup + dev)
> **Cartella tecnica router**: `C:\PROGETTI\router_comfast\`
> **Ultimo aggiornamento**: 2026-04-13

## 📚 Documenti di questa cartella

| File | Contenuto |
|---|---|
| **README.md** *(questo)* | Vision prodotto, mercato, architettura target, status generale |
| [**API_REFERENCE.md**](./API_REFERENCE.md) | Catalogo completo delle 90 sezioni API del controller Comfast, con payload format verificato per le sezioni critiche |
| [**REMOTE_MANAGEMENT.md**](./REMOTE_MANAGEMENT.md) | Architettura di gestione remota: 4 modelli (polling HTTP, reverse SSH, WireGuard, MQTT), auto-revert deadman switch, security checklist |
| [**HARDWARE_COMPATIBILITY.md**](./HARDWARE_COMPATIBILITY.md) | Analisi compatibilità Comfast vs Cisco/Aruba/Ubiquiti/altri, strategia bundle vs RADIUS-agnostic, raccomandazione per Fase 1 |
| [**ROADMAP_FASI.md**](./ROADMAP_FASI.md) | Piano di sviluppo Fase 0-4, stime effort, budget, ricavi realistici anno 1, rischi |

---

## Il prodotto in una frase

Otium PMS gestirà, oltre alle prenotazioni e al check-in, anche **la Wi-Fi ospiti delle strutture clienti**: ogni struttura riceve un kit hardware (router controller + access point) preconfigurato, e Otium genera/gestisce automaticamente le credenziali guest per ogni prenotazione, con captive portal brandizzato e log di accesso compliant Pisanu/GDPR.

## Perché ha senso (mercato)

I B&B / agriturismi / piccole strutture italiane hanno tre dolori veri:
1. **Compliance Wi-Fi**: legge Pisanu + GDPR richiedono identificazione utente e log accessi 6 mesi. Quasi nessuno è in regola.
2. **Costo soluzioni enterprise**: UniFi/Meraki costano 500-700€ una tantum + competenze tecniche per installarli.
3. **Nessuna integrazione gestionale**: nessuna soluzione Wi-Fi gestita conosce il dominio "prenotazione → ospite → check-out". Tutto manuale.

Otium è l'unico player italiano che può portare **gestionale + Wi-Fi gestito** in un'unica offerta verticale.

## Architettura target

```
┌────────────────────────────────────────────────────┐
│ OTIUM CLOUD (questo gestionale)                    │
│  - DB prenotazioni                                 │
│  - DB credenziali guest (lifecycle by booking)     │
│  - REST API per device on-site                     │
│  - UI operatore "Wi-Fi" per ogni struttura         │
│  - Log accessi 6 mesi (Pisanu compliance)          │
└────────────────────┬───────────────────────────────┘
                     │ HTTPS polling (otium-agent)
                     │ ogni ~30s, in uscita
                     ▼
┌────────────────────────────────────────────────────┐
│ DEVICE ON-SITE PER STRUTTURA                       │
│  - 1× controller Comfast (CF-AC50/100/300)         │
│  - 2-4× AP Comfast (CF-E385AC o equivalenti)       │
│  - 1× switch PoE (per alimentare gli AP)           │
│  - VLAN guest separata da rete principale          │
│  - Captive portal locale (auth = wifidog/wifilith) │
│  - otium-agent (script shell) gestisce il sync     │
└────────────────────┬───────────────────────────────┘
                     │ Wi-Fi guest dedicata
                     ▼
                  Ospiti
```

**Doppio controllo**: tutte le credenziali sono generate in cloud, ma vivono replicate sul device locale → resilient anche se Internet del cliente cade temporaneamente (ospiti già autenticati continuano a navigare, nuovi accessi tornano disponibili al ripristino).

## Flow end-to-end

1. **Prenotazione creata** in Otium (Booking webhook, Airbnb API, manuale)
2. **Generazione credenziali**: PIN 6 cifre o coppia user/pwd, validità = check-in→check-out
3. **Email all'ospite** con istruzioni Wi-Fi insieme al welcome
4. **Push al device on-site** via comando in coda + polling agent
5. **Ospite arriva**, si connette a SSID `NomeStruttura-Guest`
6. **Captive portal** intercetta, mostra splash brandizzato, chiede credenziali
7. **wifidog autentica** contro il DB locale (sync da cloud)
8. **MAC autorizzato** sul firewall, ospite naviga
9. **Log sessione** salvato locale + sync cloud
10. **Check-out**: revoca automatica, ospite scollegato

## Hardware target

| Modello | Prezzo target | Capienza | Caso d'uso |
|---|---|---|---|
| Comfast CF-AC50 | ~€80 | 10-20 client, 24-48 AP | B&B 2-5 camere |
| Comfast CF-AC100 | ~€120 | 50-150 client, 128 AP | Hotel 10-25 camere |
| Comfast CF-AC101 | ~€180 | 200+ client | Premium x86 |
| Comfast CF-AC300 | ~€280 | 500+ client | Hotel 30+ camere |

Tutta la linea condivide il firmware **OrangeOS V2.6.x**, quindi un solo `otium-agent` copre l'intera gamma.

## Componenti backend Otium da costruire

### Schema DB *(tabelle nuove)*

```sql
-- registry dei device hardware (uno per struttura cliente)
CREATE TABLE wifi_devices (
  id SERIAL PRIMARY KEY,
  struttura_id INT REFERENCES strutture(id),
  device_mac TEXT UNIQUE NOT NULL,
  device_model TEXT,
  device_serial TEXT,
  api_token TEXT NOT NULL,           -- bearer token per polling
  last_seen_at TIMESTAMP,
  firmware_version TEXT,
  status TEXT DEFAULT 'unknown',     -- online/offline/error
  created_at TIMESTAMP DEFAULT NOW()
);

-- credenziali guest legate a una prenotazione
CREATE TABLE wifi_guest_users (
  id SERIAL PRIMARY KEY,
  prenotazione_id INT REFERENCES prenotazioni(id),
  device_id INT REFERENCES wifi_devices(id),
  username TEXT NOT NULL,            -- generato (es. "cam5-20260413")
  password TEXT NOT NULL,            -- generato (PIN 6 cifre o random)
  valid_from TIMESTAMP NOT NULL,
  valid_to TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'pending',     -- pending/active/expired/revoked
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(device_id, username)
);

-- coda comandi cloud → device
CREATE TABLE wifi_device_commands (
  id SERIAL PRIMARY KEY,
  device_id INT REFERENCES wifi_devices(id),
  action TEXT NOT NULL,              -- create_user / revoke_user / set_ssid / ...
  params JSONB NOT NULL,
  status TEXT DEFAULT 'pending',     -- pending/sent/done/error
  created_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP,
  result JSONB
);

-- log accessi (compliance Pisanu, 6 mesi minimo)
CREATE TABLE wifi_access_logs (
  id SERIAL PRIMARY KEY,
  device_id INT REFERENCES wifi_devices(id),
  guest_user_id INT REFERENCES wifi_guest_users(id),
  client_mac TEXT NOT NULL,
  client_ip TEXT,
  session_start TIMESTAMP NOT NULL,
  session_end TIMESTAMP,
  bytes_in BIGINT,
  bytes_out BIGINT
);
```

### Endpoint REST API *(da implementare)*

```
# device → cloud (chiamati dall'otium-agent sul controller)
GET  /api/v1/wifi-devices/:mac/pending-commands
POST /api/v1/wifi-devices/:mac/command-results
POST /api/v1/wifi-devices/:mac/heartbeat
POST /api/v1/wifi-devices/:mac/access-logs

# operatore (UI Otium) → cloud
GET  /api/v1/strutture/:id/wifi/users           # lista utenti attivi
POST /api/v1/strutture/:id/wifi/users           # crea credenziali manuali
POST /api/v1/strutture/:id/wifi/users/:id/revoke
GET  /api/v1/strutture/:id/wifi/access-logs

# webhook automatici (trigger del lifecycle)
POST /api/v1/internal/booking-created  # genera credenziali quando booking arriva
POST /api/v1/internal/booking-cancelled # revoca credenziali al cancel
```

### UI operatore

Aggiungere alla sezione struttura nel gestionale:

- **Tab "Wi-Fi"** per ogni struttura
  - Card "Device": modello, status, last seen, firmware
  - Card "Credenziali attive": lista user, scadenza, MAC connessi
  - Bottone "Genera credenziali manuali" (per walk-in / non-booking)
  - Tab "Log accessi" con filtri e export CSV (per richieste autorità)
  - Tab "Branding splash page" con upload logo + colori + testo benvenuto

## Stato della ricerca tecnica (2026-04-13)

### ✅ Cose validate
- Hardware Comfast CF-AC300 testato: SSH/key access funzionante, password root sostituibile via patch backup, accesso completo
- 2 AP CF-E385AC testati: SSH key + password, accesso completo, web UI password `admin`
- Architettura: il controller gestisce gli AP via CAPWAP (`wtpd`), gli AP sono "mute antenne"
- **API REST del controller completamente mappata**: `POST /cgi-bin/mbox-config?method=GET|SET&section=<nome>` + `POST /cgi-bin/login` per auth IP-based. Dettagli in [API_REFERENCE.md](./API_REFERENCE.md)
- **90 sezioni API catalogate**, formato payload verificato per le 5 critiche (`ac_group_config`, `portal_account_config`, `wifilith_config`, `wifidog_config`, `vlan_config`)
- **Propagazione SSID validata live** (2026-04-13): aggiunta di un nuovo SSID `Otium_Guest` al gruppo `homenet` via `ac_group_config` SET → wtpd push automatica a 2 AP in real-time, zero downtime, nessuna modifica a SSID esistenti (homenet, homenet_5g, homenet_dom intatte)
- Captive portal nativo nel firmware: sezione **Authentication → Local Auth** con campo **`Bind local interface`** (`wifilith_config.extiface`) → conferma fattibilità del flusso "captive portal solo su VLAN guest"
- Modalità auth supportate: `hotel` (username+password per ospite), `code` (PIN singolo), `user`, `password`, `onekey`, `traffic`, `weixin`, `wxpay` — modalità `hotel` è target per Otium
- **Hash di fabbrica Comfast** identico tra modelli x86 e MIPS → stessa procedura di patch firmware funziona sull'intera linea
- **Dump offline completo** del `/www-comfast/` (5 MB, 477 file) in `router_comfast/controller_dump/` per analisi future senza toccare il device
- **Snapshot API 90 sezioni** in `router_comfast/controller_dump/snapshot_20260413_145508/api_full/` per reference
- **Modello remote management progettato** (vedi [REMOTE_MANAGEMENT.md](./REMOTE_MANAGEMENT.md)): HTTP polling outbound + reverse SSH tunnel come service mode + auto-revert deadman switch per safety
- **Classificazione sezioni SAFE vs UNSAFE** per operazioni remote, vedi API_REFERENCE.md. `ac_group_config` è SAFE, `vlan_config`/`network_config`/`wan_config` sono UNSAFE (triggerano `/etc/init.d/network restartall` che wipa DHCP lease e restarta bridge)

### ⚠️ Limitazioni scoperte

1. **Modifiche a `vlan_config`, `network_config`, `wan_config` triggerano `/etc/init.d/network restartall`** (hardcoded nel binario `webmgnt`). Questo:
   - Cancella tutti i lease DHCP (`rm -f /tmp/dhcpd.leases`)
   - Restarta dhcpd, bridge, firewall, mwan3
   - **Downtime tipico 10-30 secondi** con flap Wi-Fi e possibile disconnessione remota
   - ⚠️ **NON FARE IN REMOTO** senza auto-revert implementato, rischio di lockout
2. **Modifica diretta UCI sugli AP wipata da wtpd al sync**: gli AP sono "muti", la config va sempre dal controller via `ac_group_config` SET
3. **Path di `authorized_keys` diverso tra controller e AP**:
   - CF-AC300: `/root/.ssh/authorized_keys`
   - AP CF-E385AC: `/etc/dropbear/authorized_keys`
   - Workaround: pacchettizzare patch firmware con la chiave in entrambi i path per massima portabilità
4. **Tar di backup costruiti su Windows** perdono ownership/perms: usare sempre Linux nativo (es. costruire i tar sul controller stesso via SSH)
5. **VLAN guest non esiste nativamente**: la rete del controller è un singolo `br-lan` 172.16.0.0/16 piatto. Per il captive portal scoped serve creare una VLAN via `vlan_config` (ma è UNSAFE in remoto)
6. **Hardware Comfast-only**: il controller non gestisce AP di altre marche (Cisco, Ubiquiti, Aruba). Vedi [HARDWARE_COMPATIBILITY.md](./HARDWARE_COMPATIBILITY.md) per strategia bundle vs RADIUS agnostic.

### 🎯 Prossimi step

Vedere [ROADMAP_FASI.md](./ROADMAP_FASI.md) per il piano completo in 4 fasi. Riassunto:

- **Fase 0** *(in corso)*: setup lab permanente separato dalla rete di casa per test distruttivi. Budget €200-300.
- **Fase 1**: POC end-to-end sul lab — creazione VLAN guest, bind captive portal, test telefono, `otium-agent` shell script, backend Otium con 4 endpoint REST + 4 tabelle DB, UI operatore basic. Effort ~20-30 ore.
- **Fase 2**: primo cliente pilota, hardening produzione, auto-revert robust, processo di onboarding. Effort ~40 ore.
- **Fase 3**: scalabilità commerciale 10-20 clienti, dashboard operatore, acquisizione clienti.
- **Fase 4**: espansione prodotto (modalità RADIUS agnostic, analytics, white label).

## Riferimenti

- **Cartella tecnica router** (separata dal gestionale per isolare segreti hw): `C:\PROGETTI\router_comfast\`
- **Documentazione hardware**, password router/AP, file backup originali e patchati, scripts: vedere [`router_comfast/README.md`](file:///C:/PROGETTI/router_comfast/README.md) e [`router_comfast/PASSWORDS.md`](file:///C:/PROGETTI/router_comfast/PASSWORDS.md)
- **Firmware moddati**: `router_comfast/firmware_moddati/` (con originali + patchati + procedura standard)

## Note di compliance (Italia)

- **Legge Pisanu** (DL 144/2005, modificato 2013): identificazione utente per accesso Wi-Fi pubblico. Forma "leggera" oggi, ma raccomandata best practice.
- **GDPR**: log accessi sono dati personali → devono essere conservati con base giuridica chiara, accesso limitato, retention policy esplicita (6 mesi standard).
- **Conservazione log**: sul device locale + cloud Otium, con backup. Eliminazione automatica dopo 6 mesi.
- **Trasparenza**: l'ospite deve sapere che i suoi dati di accesso vengono registrati. Da inserire nei T&C del captive portal.
- **DPA con il cliente struttura**: Otium è data processor, la struttura è data controller. Va firmato un DPA standard.
